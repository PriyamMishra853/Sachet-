// Usage: pnpm --filter @sachet/db seed   (reads DATABASE_URL from .env)
// Downloads the public phishing feeds and marks their domains as high risk.
import { FEEDS, fetchFeed, parseFeed } from "../feeds.js";
import { createPgStore } from "../pg-store.js";
import { connectPostgres } from "../sql.js";
import { requireDatabaseUrl } from "./env.js";

const BATCH = 1000;
const sql = connectPostgres(requireDatabaseUrl(), {
  caCert: process.env.DATABASE_CA_CERT || undefined,
});
const store = createPgStore(sql);
try {
  for (const feed of FEEDS) {
    try {
      const entries = parseFeed(await fetchFeed(feed.url));
      let saved = 0;
      for (let i = 0; i < entries.length; i += BATCH) {
        saved += await store.upsertSeed(entries.slice(i, i + BATCH));
      }
      console.log(`${feed.name}: ${saved} domains saved`);
    } catch (err) {
      // One feed being down should not stop the other.
      console.error(`${feed.name}: failed (${(err as Error).message})`);
    }
  }
} finally {
  await sql.close?.();
}
