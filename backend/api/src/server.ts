import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { connectPostgres, createMemoryStore, createPgStore, migrate } from "@sachet/db";
import type { Channel } from "@sachet/core";
import { buildApp } from "./app.js";
import { createConversation } from "./bots/conversation.js";
import { runFollowups, type Sender } from "./bots/followup.js";
import { createTelegramBot, registerTelegramWebhook } from "./bots/telegram.js";
import { createWhatsAppSender, registerWhatsAppWebhook } from "./bots/whatsapp.js";
import { createMemoryCache, createRedisCache } from "./cache.js";
import { loadConfig } from "./config.js";
import { logSerializers } from "./security.js";
import { createAiCheck } from "./services/ai-check.js";
import { createDomainAge } from "./services/domain-age.js";
import { createSafeBrowsing } from "./services/safe-browsing.js";

// Local dev: read the repo-root .env. In production the host sets env vars.
const envFile = fileURLToPath(new URL("../../../.env", import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const config = loadConfig();

const sql = config.DATABASE_URL
  ? connectPostgres(config.DATABASE_URL, { caCert: config.DATABASE_CA_CERT })
  : null;
if (sql) await migrate(sql, (msg) => console.log(`[migrate] ${msg}`));
const store = sql ? createPgStore(sql) : createMemoryStore();
const cache = config.REDIS_URL ? createRedisCache(config.REDIS_URL) : createMemoryCache();

const domainAge =
  config.DOMAIN_AGE_LOOKUP === "on"
    ? createDomainAge({
        cache,
        onError: (err) => app.log.warn({ err }, "website registration lookup failed"),
      })
    : undefined;

const app = buildApp(
  {
    store,
    cache,
    salt: config.HASH_SALT,
    corsOrigins: config.CORS_ORIGINS.split(",").map((s) => s.trim()),
    trustProxyHops: config.TRUST_PROXY_HOPS,
    adminToken: config.ADMIN_TOKEN,
    safeBrowsing: createSafeBrowsing({
      apiKey: config.SAFE_BROWSING_API_KEY,
      onError: (err) => app.log.warn({ err }, "Safe Browsing check failed"),
    }),
    domainAge,
    aiCheck:
      config.AI_CHECK === "on"
        ? createAiCheck({
            cache,
            apiKey: config.ANTHROPIC_API_KEY,
            model: config.AI_CHECK_MODEL,
            waitMs: config.AI_CHECK_WAIT_MS,
            log: { info: (o, m) => app.log.info(o, m), warn: (o, m) => app.log.warn(o, m) },
          })
        : undefined,
  },
  { logger: { level: config.LOG_LEVEL, serializers: logSerializers } },
);

// Fetched now so the first check doesn't wait for it. Its errors log through `app`.
void domainAge?.warmUp?.();

// Bots: each switches on when its keys are in the environment.
const conversation = createConversation({
  checker: app.checker,
  cache,
  store,
  salt: config.HASH_SALT,
});
const senders: Partial<Record<Channel, Sender>> = {};
let pollTelegram: (() => void) | null = null;

if (config.TELEGRAM_BOT_TOKEN) {
  const tg = createTelegramBot(config.TELEGRAM_BOT_TOKEN, conversation, app.log);
  senders.telegram = tg.send;
  if (config.TELEGRAM_WEBHOOK_SECRET) {
    // Ask Telegram who the bot is now, not on the first update: a wrong token
    // shows up in the deploy log at once, and updates aren't slowed down.
    await tg.bot
      .init()
      .then(() => app.log.info(`Telegram bot @${tg.bot.botInfo.username} ready for webhooks`))
      .catch((err) => app.log.error({ err }, "Telegram bot token rejected; bot is off"));
    registerTelegramWebhook(app, tg.bot, config.TELEGRAM_WEBHOOK_SECRET);
  } else {
    // No webhook secret (local dev): ask Telegram for updates ourselves, so
    // the bot works on your phone without a public URL.
    pollTelegram = () => {
      void tg.bot.api.deleteWebhook().then(() => tg.bot.start());
      app.log.info("Telegram bot running in polling mode");
    };
  }
}

if (
  config.WHATSAPP_TOKEN &&
  config.WHATSAPP_PHONE_NUMBER_ID &&
  config.WHATSAPP_VERIFY_TOKEN &&
  config.WHATSAPP_APP_SECRET
) {
  senders.whatsapp = createWhatsAppSender({
    token: config.WHATSAPP_TOKEN,
    phoneNumberId: config.WHATSAPP_PHONE_NUMBER_ID,
  });
  registerWhatsAppWebhook(app, {
    conversation,
    cache,
    send: senders.whatsapp,
    verifyToken: config.WHATSAPP_VERIFY_TOKEN,
    appSecret: config.WHATSAPP_APP_SECRET,
  });
}

// "Did you pay?" follow-ups: check every 30 minutes for risky checks from ~a day ago.
const followupTimer = setInterval(
  () =>
    void runFollowups({
      store,
      cache,
      senders,
      log: (msg, err) => app.log.warn({ err }, msg),
    }).catch((err) => app.log.error({ err }, "follow-up job failed")),
  30 * 60_000,
);

if (!sql) app.log.warn("DATABASE_URL not set: using an in-memory store (data is lost on restart)");
if (!config.REDIS_URL) app.log.warn("REDIS_URL not set: using an in-memory cache");
if (sql && !config.DATABASE_CA_CERT && config.NODE_ENV === "production")
  app.log.warn("DATABASE_CA_CERT not set: database TLS is encrypted but the server isn't verified");
if (config.AI_CHECK === "on")
  app.log.info(
    `AI second opinion on: ${config.AI_CHECK_MODEL}, waits ${config.AI_CHECK_WAIT_MS} ms`,
  );
if (!config.SAFE_BROWSING_API_KEY)
  app.log.warn("SAFE_BROWSING_API_KEY not set: link check uses seed lists only");

const shutdown = async () => {
  clearInterval(followupTimer);
  await app.close();
  await cache.close();
  await sql?.close?.();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

try {
  await app.listen({ port: config.PORT, host: "0.0.0.0" });
  pollTelegram?.();
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
