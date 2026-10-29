import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import type { FastifyInstance } from "fastify";
import { safeEqual } from "../security.js";
import type { BotReply, Conversation } from "./conversation.js";
import type { Sender } from "./followup.js";

const keyboard = (reply: BotReply) =>
  reply.buttons?.length
    ? new InlineKeyboard(reply.buttons.map((b) => [InlineKeyboard.text(b.title, b.id)]))
    : undefined;

type Log = { info(obj: object, msg: string): void; error(obj: object, msg: string): void };

// Telegram adapter: turns updates into conversation calls and replies back.
export function createTelegramBot(token: string, conversation: Conversation, log?: Log) {
  const bot = new Bot(token);

  // One log line per update with how long the reply took (the Day 9 target
  // is under 2 seconds). No message text or chat ID: those are personal data.
  bot.use(async (ctx, next) => {
    const started = Date.now();
    const kind = ctx.callbackQuery
      ? "button"
      : ctx.message?.text?.startsWith("/")
        ? "command"
        : "message";
    try {
      await next();
      log?.info({ telegram: kind, ms: Date.now() - started }, "telegram update handled");
    } catch (err) {
      log?.error({ telegram: kind, ms: Date.now() - started, err }, "telegram update failed");
      throw err;
    }
  });

  bot.on(["message:text", "message:caption"], async (ctx) => {
    const text = ctx.message.text ?? ctx.message.caption ?? "";
    const replies = await conversation.handleText(
      {
        channel: "telegram",
        userId: String(ctx.chat.id),
        messageKey: `tg:${ctx.chat.id}:${ctx.message.message_id}`,
      },
      text,
    );
    for (const r of replies) {
      await ctx.reply(r.text, {
        reply_markup: keyboard(r),
        reply_parameters: { message_id: ctx.message.message_id, allow_sending_without_reply: true },
      });
    }
  });

  bot.on("callback_query:data", async (ctx) => {
    // Each Telegram call is a ~450 ms round trip from India. Acknowledging the
    // tap (which stops the button's loading spinner) doesn't need to finish
    // before we reply, so both calls run at the same time instead of in a row.
    const ack = ctx.answerCallbackQuery().catch((err) => {
      log?.error({ err }, "answerCallbackQuery failed");
    });
    const chatId = ctx.chat?.id ?? ctx.from.id;
    const replies = await conversation.handleButton(
      { channel: "telegram", userId: String(chatId), messageKey: `tg:cb:${ctx.callbackQuery.id}` },
      ctx.callbackQuery.data,
    );
    for (const r of replies) await ctx.reply(r.text, { reply_markup: keyboard(r) });
    await ack;
  });

  bot.on("message", (ctx) =>
    ctx.reply(
      "Please send text: forward the message or paste the number, UPI ID or link.\nकृपया टेक्स्ट भेजें।",
    ),
  );

  bot.catch((err) => console.error("telegram bot error", err.error));

  const send: Sender = async (userId, reply) => {
    await bot.api.sendMessage(Number(userId), reply.text, { reply_markup: keyboard(reply) });
  };

  return { bot, send };
}

// Production: Telegram POSTs each update here. The secret token (set when
// registering the webhook) proves the request really comes from Telegram;
// without it anyone could fake messages and make the bot spam people.
export function registerTelegramWebhook(app: FastifyInstance, bot: Bot, secretToken: string) {
  const handle = webhookCallback(bot, "fastify");
  app.post("/webhooks/telegram", async (req, reply) => {
    const given = req.headers["x-telegram-bot-api-secret-token"];
    if (!safeEqual(typeof given === "string" ? given : undefined, secretToken)) {
      return reply.code(401).send({ error: "bad_secret" });
    }
    return handle(req, reply);
  });
}
