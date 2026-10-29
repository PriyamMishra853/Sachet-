// Usage: pnpm --filter @sachet/db migrate   (reads DATABASE_URL from .env)
import { connectPostgres } from "../sql.js";
import { migrate } from "../migrate.js";
import { requireDatabaseUrl } from "./env.js";

const sql = connectPostgres(requireDatabaseUrl(), {
  caCert: process.env.DATABASE_CA_CERT || undefined,
});
try {
  const applied = await migrate(sql, console.log);
  console.log(applied.length ? `done: ${applied.length} migration(s)` : "already up to date");
} finally {
  await sql.close?.();
}
