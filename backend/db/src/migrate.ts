import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Sql } from "./sql.js";

const MIGRATIONS_DIR = fileURLToPath(new URL("../migrations/", import.meta.url));

// Applies every migrations/NNN_name.sql file not yet recorded in
// schema_migrations, in file-name order. Each file runs exactly once.
export async function migrate(sql: Sql, log: (msg: string) => void = () => {}): Promise<string[]> {
  await sql.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`,
  );
  const { rows } = await sql.query<{ name: string }>("SELECT name FROM schema_migrations");
  const done = new Set(rows.map((r) => r.name));

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort();
  const applied: string[] = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const body = readFileSync(MIGRATIONS_DIR + file, "utf8");
    // BEGIN/COMMIT around the file: a half-applied migration rolls back.
    await sql.exec(
      `BEGIN;\n${body}\nINSERT INTO schema_migrations (name) VALUES ('${file}');\nCOMMIT;`,
    );
    log(`applied ${file}`);
    applied.push(file);
  }
  return applied;
}
