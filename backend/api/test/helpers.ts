import { createMemoryStore, type Store } from "@sachet/db";
import { buildApp } from "../src/app.js";
import { createMemoryCache, type Cache } from "../src/cache.js";
import { logSerializers } from "../src/security.js";
import type { SafeBrowsing } from "../src/services/safe-browsing.js";

// A test app with in-memory store and cache. `flagged` URLs act as if Google
// Safe Browsing listed them.
export function makeTestApp(
  opts: { flagged?: string[]; store?: Store; cache?: Cache; trustProxyHops?: number } = {},
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
  const logs: Record<string, unknown>[] = [];
  const app = buildApp(
    {
      store,
      cache,
      safeBrowsing,
      salt: "test-salt-0123456789",
      trustProxyHops: opts.trustProxyHops,
    },
    {
      logger: {
        level: "info",
        serializers: logSerializers,
        stream: { write: (line: string) => void logs.push(JSON.parse(line)) },
      },
    },
  );
  return { app, store, cache, sbCalls, logs };
}
