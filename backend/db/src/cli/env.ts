import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Loads the repo-root .env (Node 20.12+ has this built in) and returns DATABASE_URL.
export function requireDatabaseUrl(): string {
  const envFile = fileURLToPath(new URL("../../../../.env", import.meta.url));
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Add your Supabase connection string to .env.");
    process.exit(1);
  }
  return url;
}
