import type { AiOpinion } from "@sachet/core";
import { createMemoryStore, type Store } from "@sachet/db";
import { buildApp } from "../src/app.js";
import { createMemoryCache, type Cache } from "../src/cache.js";
import { logSerializers } from "../src/security.js";
import type { DomainAge } from "../src/services/domain-age.js";
import type { SafeBrowsing } from "../src/services/safe-browsing.js";

// A test app with in-memory store and cache. `flagged` URLs act as if Google
// Safe Browsing listed them; `domainAges` as if RDAP gave those registration
// ages; `ai` answers in place of the AI second opinion (off when not given).
export function makeTestApp(
  opts: {
    flagged?: string[];
    store?: Store;
    cache?: Cache;
    trustProxyHops?: number;
    adminToken?: string;
    domainAges?: Record<string, number>;
    ai?: (text: string) => AiOpinion | null;
  } = {},
) {
  const store = opts.store ?? createMemoryStore();
  const cache = opts.cache ?? createMemoryCache();
  const sbCalls: string[][] = [];
  const safeBrowsing: SafeBrowsing = {
    async check(urls) {
      sbCalls.push(urls);
      return new Set(urls.filter((u) => opts.flagged?.includes(u)));
    },
  };
  const ageCalls: string[][] = [];
  const domainAge: DomainAge = {
    async check(domains) {
      ageCalls.push(domains);
      const ages = opts.domainAges ?? {};
      return new Map(domains.filter((d) => d in ages).map((d) => [d, ages[d]!]));
    },
  };
  const aiCalls: string[] = [];
  const aiCheck = opts.ai
    ? {
        async opinion(text: string) {
          aiCalls.push(text);
          return opts.ai!(text);
        },
      }
    : undefined;
  const logs: Record<string, unknown>[] = [];
  const app = buildApp(
    {
      store,
      cache,
      safeBrowsing,
      domainAge,
      aiCheck,
      salt: "test-salt-0123456789",
      trustProxyHops: opts.trustProxyHops,
      adminToken: opts.adminToken,
    },
    {
      logger: {
        level: "info",
        serializers: logSerializers,
        stream: { write: (line: string) => void logs.push(JSON.parse(line)) },
      },
    },
  );
  return { app, store, cache, sbCalls, ageCalls, aiCalls, logs };
}
