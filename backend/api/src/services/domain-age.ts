import { registrationLookupDomain } from "@sachet/core";
import type { Cache } from "../cache.js";

// Asks the public registration records (RDAP, the successor to WHOIS) when a
// website's name was registered. IANA publishes which server answers for each
// ending (.com, .in, .xyz ...); no key is needed. It fails open: no answer
// means no warning, never a clean chit.

export interface DomainAge {
  /** Days since each domain was registered. Domains with no answer are left out. Never throws. */
  check(domains: string[]): Promise<Map<string, number>>;
  /** Downloads IANA's server list now, so the first check doesn't wait for it. */
  warmUp?(): Promise<void>;
}

export const RDAP_BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json";
const BOOTSTRAP_TTL_MS = 24 * 3600_000;
// After a failed download, try again in 10 minutes, not on every check.
const BOOTSTRAP_RETRY_MS = 10 * 60_000;
const FOUND_TTL = 7 * 24 * 3600; // a registration date doesn't change
const MISSING_TTL = 24 * 3600; // not registered, or the registry has no date: ask tomorrow
// A message rarely has more links than this; each one is a request.
const MAX_PER_CHECK = 3;
const DAY_MS = 86_400_000;
const NONE = "none";

type RdapDomain = { events?: { eventAction?: string; eventDate?: string }[] };

export function createDomainAge(opts: {
  cache: Cache;
  fetchFn?: typeof fetch;
  /** The whole lookup, list download included. The user is waiting. */
  timeoutMs?: number;
  now?: () => number;
  onError?: (err: unknown) => void;
}): DomainAge {
  const { cache, fetchFn = fetch, timeoutMs = 1000, now = Date.now, onError = () => {} } = opts;
  let servers: { byTld: Map<string, string>; fresh: number } | null = null;
  let loading: Promise<Map<string, string> | null> | null = null;

  // IANA's list of RDAP servers, kept in memory for a day.
  function bootstrap(): Promise<Map<string, string> | null> {
    if (servers && now() < servers.fresh) return Promise.resolve(servers.byTld);
    loading ??= (async () => {
      try {
        const res = await fetchFn(RDAP_BOOTSTRAP_URL, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(`IANA RDAP list answered ${res.status}`);
        const body = (await res.json()) as { services?: [string[], string[]][] };
        const byTld = new Map<string, string>();
        for (const [tlds, urls] of body.services ?? []) {
          const https = urls.find((u) => u.startsWith("https://"));
          if (!https) continue;
          for (const t of tlds)
            byTld.set(t.toLowerCase(), https.endsWith("/") ? https : `${https}/`);
        }
        servers = { byTld, fresh: now() + BOOTSTRAP_TTL_MS };
      } catch (err) {
        onError(err);
        servers = { byTld: servers?.byTld ?? new Map(), fresh: now() + BOOTSTRAP_RETRY_MS };
      } finally {
        loading = null;
      }
      return servers.byTld.size ? servers.byTld : null;
    })();
    return loading;
  }

  // The longest ending with a server: "shop.co.in" -> "co.in" if listed, else "in".
  function serverFor(byTld: Map<string, string>, domain: string): string | null {
    const labels = domain.split(".");
    for (let i = 1; i < labels.length; i++) {
      const server = byTld.get(labels.slice(i).join("."));
      if (server) return server;
    }
    return null;
  }

  // The registration date, null when the registry has none, undefined on error.
  async function registered(server: string, domain: string): Promise<string | null | undefined> {
    try {
      const res = await fetchFn(`${server}domain/${domain}`, {
        headers: { accept: "application/rdap+json, application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`RDAP server answered ${res.status}`);
      const body = (await res.json()) as RdapDomain;
      const date = body.events?.find((e) => e.eventAction === "registration")?.eventDate;
      return date && !Number.isNaN(Date.parse(date)) ? date : null;
    } catch (err) {
      onError(err);
      return undefined;
    }
  }

  async function lookup(domains: string[]): Promise<Map<string, number>> {
    // Which name to ask about for each input ("mail.shop.in" -> "shop.in").
    const asked = new Map<string, string>();
    for (const d of domains) {
      const name = registrationLookupDomain(d);
      // Normalized names are already punycode; anything else never reaches a URL.
      if (name && /^[a-z0-9.-]+$/.test(name)) asked.set(d, name);
    }
    const names = [...new Set(asked.values())].slice(0, MAX_PER_CHECK);
    const dates = new Map<string, string>();

    const misses: string[] = [];
    for (const name of names) {
      const hit = await cache.get(`age:${name}`).catch(() => null);
      if (hit === NONE) continue;
      if (hit) dates.set(name, hit);
      else misses.push(name);
    }

    if (misses.length) {
      const byTld = await bootstrap();
      if (byTld) {
        await Promise.all(
          misses.map(async (name) => {
            const server = serverFor(byTld, name);
            if (!server) return;
            const date = await registered(server, name);
            if (date === undefined) return; // an error: don't remember it
            await cache
              .set(`age:${name}`, date ?? NONE, date ? FOUND_TTL : MISSING_TTL)
              .catch(() => {});
            if (date) dates.set(name, date);
          }),
        );
      }
    }

    const out = new Map<string, number>();
    for (const [d, name] of asked) {
      const date = dates.get(name);
      if (date) out.set(d, Math.max(0, Math.floor((now() - Date.parse(date)) / DAY_MS)));
    }
    return out;
  }

  return {
    async warmUp() {
      await bootstrap();
    },

    async check(domains) {
      if (domains.length === 0) return new Map();
      // A deadline for everything: a slow registry must not hold up the answer.
      // Work that finishes later still fills the cache for the next check.
      let timer: ReturnType<typeof setTimeout> | undefined;
      const late = new Promise<Map<string, number>>((resolve) => {
        timer = setTimeout(() => resolve(new Map()), timeoutMs + 200);
      });
      try {
        return await Promise.race([lookup(domains).catch(() => new Map<string, number>()), late]);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
