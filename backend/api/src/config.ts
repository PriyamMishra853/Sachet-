import { z } from "zod";

// All settings come from environment variables (.env locally, the host's
// secret settings in production). Optional ones switch features on: no
// DATABASE_URL means an in-memory store, no TELEGRAM_BOT_TOKEN means no bot.
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(3000),
  LOG_LEVEL: z.string().default("info"),
  DATABASE_URL: z.string().url().optional(),
  // Supabase's CA certificate (PEM, or base64 of it), so the API can check it
  // really talks to Supabase. Download it from Database settings → SSL.
  DATABASE_CA_CERT: z.string().optional(),
  REDIS_URL: z.string().url().optional(),
  // Salt for hashing user IDs. Changing it later breaks report counting.
  HASH_SALT: z.string().min(16).optional(),
  SAFE_BROWSING_API_KEY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  // Telegram allows A-Z, a-z, 0-9, _ and -. Short secrets can be guessed.
  TELEGRAM_WEBHOOK_SECRET: z
    .string()
    .regex(/^[A-Za-z0-9_-]{24,256}$/, "use 24+ letters/digits: openssl rand -hex 24")
    .optional(),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().min(16).optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),
  // Comma-separated web origins allowed to call the API from a browser.
  CORS_ORIGINS: z.string().default("http://localhost:3001"),
  // Proxies in front of the API. Default: 1 in production (Railway/Render), 0 locally.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).optional(),
});

export type Config = z.infer<typeof schema> & { HASH_SALT: string; TRUST_PROXY_HOPS: number };

const DEV_SALT = "dev-only-salt-change-me-in-production";

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // Empty strings in .env ("DATABASE_URL=") mean "not set".
  const cleaned = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== ""));
  const parsed = schema.parse(cleaned);
  const production = parsed.NODE_ENV === "production";
  if (production && (!parsed.HASH_SALT || parsed.HASH_SALT.length < 32)) {
    throw new Error("HASH_SALT must be set in production, 32+ characters: openssl rand -hex 32");
  }
  if (production && parsed.CORS_ORIGINS.split(",").some((o) => o.trim() === "*")) {
    throw new Error("CORS_ORIGINS can't be * in production; list the web app's address");
  }
  return {
    ...parsed,
    HASH_SALT: parsed.HASH_SALT ?? DEV_SALT,
    TRUST_PROXY_HOPS: parsed.TRUST_PROXY_HOPS ?? (production ? 1 : 0),
  };
}
