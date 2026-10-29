import { PLATFORM_DOMAINS, normalizeUrl } from "@sachet/core";
import type { SeedEntry } from "./store.js";

// Public phishing/malware URL lists we seed from. Both are free text files
// with one URL per line. OpenPhish's community feed is for non-commercial
// use; check the terms again before Sachet earns money.
export const FEEDS = [
  { name: "openphish", url: "https://openphish.com/feed.txt" },
  { name: "urlhaus", url: "https://urlhaus.abuse.ch/downloads/text_online/" },
] as const;

// Turns a feed file into domain entries. Skips comments, bad lines, and big
// shared platforms (a phishing page on sites.google.com must not mark all of
// google.com as high risk).
export function parseFeed(text: string): SeedEntry[] {
  const seen = new Set<string>();
  const out: SeedEntry[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const link = normalizeUrl(line);
    if (!link.ok || PLATFORM_DOMAINS.has(link.value) || seen.has(link.value)) continue;
    seen.add(link.value);
    out.push({ kind: "domain", value: link.value, source: "seed", riskBand: "high" });
  }
  return out;
}

export async function fetchFeed(url: string, timeoutMs = 30_000): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "user-agent": "sachet-seed-import/0.1" },
  });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res.text();
}
