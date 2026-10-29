import { describe, expect, it } from "vitest";
import { createConversation } from "../src/bots/conversation.js";
import { createTelegramBot, registerTelegramWebhook } from "../src/bots/telegram.js";
import { makeTestApp } from "./helpers.js";

const LATENCY_MS = 100;
type Call = { method: string; start: number; end: number; payload: Record<string, unknown> };

// A bot whose Telegram API is replaced by a fake that answers every call
// after LATENCY_MS, like a real round trip but without the network.
async function makeBot() {
  const t = makeTestApp();
  const conversation = createConversation({
    checker: t.app.checker,
    cache: t.cache,
    store: t.store,
    salt: "test-salt-0123456789",
  });
  const { bot } = createTelegramBot("123:fake-token", conversation);
  const calls: Call[] = [];

  bot.api.config.use(async (_prev, method, payload) => {
    const start = Date.now();
    await new Promise((r) => setTimeout(r, LATENCY_MS));
    calls.push({ method, start, end: Date.now(), payload: payload as Record<string, unknown> });
    const result =
      method === "getMe"
        ? { id: 1, is_bot: true, first_name: "Sachet", username: "SachetTestBot" }
        : method === "sendMessage"
          ? { message_id: 99, date: 0, chat: { id: 111, type: "private", first_name: "T" } }
          : true;
    return { ok: true, result } as never;
  });
  await bot.init();
  calls.length = 0; // ignore getMe

  return { bot, calls, app: t.app };
}

const buttonPress = (data: string) => ({
  update_id: 1,
  callback_query: {
    id: "cb-1",
    from: { id: 111, is_bot: false, first_name: "T" },
    chat_instance: "ci",
    data,
    message: {
      message_id: 5,
      date: 0,
      chat: { id: 111, type: "private" as const, first_name: "T" },
      text: "result card",
    },
  },
});

describe("Telegram button press", () => {
  it("acknowledges the tap and replies at the same time, not one after the other", async () => {
    const { bot, calls } = await makeBot();
    const started = Date.now();
    await bot.handleUpdate(buttonPress("lang:hi"));
    const took = Date.now() - started;

    const ack = calls.find((c) => c.method === "answerCallbackQuery")!;
    const reply = calls.find((c) => c.method === "sendMessage")!;
    expect(ack).toBeDefined();
    expect(reply.payload.text).toBe("भाषा हिंदी कर दी गई है।");
    // The reply started before the acknowledgement finished: they overlapped.
    expect(reply.start).toBeLessThan(ack.end);
    // One round trip, not two (with some slack for slow CI machines).
    expect(took).toBeLessThan(LATENCY_MS * 2 - 20);
  });

  it("still replies when the acknowledgement fails", async () => {
    const { bot, calls } = await makeBot();
    bot.api.config.use(async (prev, method, payload, signal) => {
      if (method === "answerCallbackQuery") throw new Error("query is too old");
      return prev(method, payload, signal);
    });
    await bot.handleUpdate(buttonPress("lang:en"));
    expect(calls.map((c) => c.method)).toContain("sendMessage");
  });
});

describe("Telegram webhook (production)", () => {
  const SECRET = "webhook-secret-123456";
  const update = {
    update_id: 7,
    message: {
      message_id: 1,
      date: 0,
      chat: { id: 111, type: "private", first_name: "T" },
      from: { id: 111, is_bot: false, first_name: "T" },
      text: "Your parcel is held by customs. Pay ₹2,999 to customs.clear@ybl within 2 hours.",
    },
  };

  async function webhookApp() {
    const t = await makeBot();
    registerTelegramWebhook(t.app, t.bot, SECRET);
    const post = (headers: Record<string, string>) =>
      t.app.inject({
        method: "POST",
        url: "/webhooks/telegram",
        headers: { "content-type": "application/json", ...headers },
        payload: update,
      });
    return { ...t, post };
  }

  it("rejects updates without the secret header, so nobody can fake messages", async () => {
    const { post, calls } = await webhookApp();
    expect((await post({})).statusCode).toBe(401);
    expect((await post({ "x-telegram-bot-api-secret-token": "wrong" })).statusCode).toBe(401);
    expect(calls).toEqual([]);
  });

  it("answers a real update with a verdict card", async () => {
    const { post, calls } = await webhookApp();
    const res = await post({ "x-telegram-bot-api-secret-token": SECRET });
    expect(res.statusCode).toBe(200);
    const reply = calls.find((c) => c.method === "sendMessage");
    expect(String(reply?.payload.text)).toMatch(/^🔴 HIGH RISK/);
  });
});
