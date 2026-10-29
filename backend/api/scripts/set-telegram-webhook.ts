// Points Telegram at the deployed API, so the bot works without your laptop.
// Usage (from the repo root, with TELEGRAM_BOT_TOKEN and
// TELEGRAM_WEBHOOK_SECRET in .env, the same values as on Railway):
//   pnpm telegram:webhook https://your-api.up.railway.app
// Undo (to go back to local polling): pnpm telegram:webhook --delete
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const envFile = fileURLToPath(new URL("../../../.env", import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const arg = process.argv[2];
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set in .env");

const call = async (method: string, body: object) => {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as { ok: boolean; description?: string; result?: unknown };
};

if (arg === "--delete") {
  console.log(await call("deleteWebhook", {}));
} else {
  if (!arg?.startsWith("https://")) throw new Error("Pass the API's https:// URL");
  if (!secret || secret.length < 16) {
    throw new Error("Set TELEGRAM_WEBHOOK_SECRET in .env (16+ random characters) first");
  }
  const url = `${arg.replace(/\/$/, "")}/webhooks/telegram`;
  // Telegram sends the secret back in a header on every update; the API
  // rejects updates without it, so nobody else can feed the bot fake messages.
  console.log(await call("setWebhook", { url, secret_token: secret, drop_pending_updates: true }));
  const info = (await call("getWebhookInfo", {})) as { result?: { url?: string } };
  console.log("Telegram now sends updates to:", info.result?.url);
}
