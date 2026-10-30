import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createConversation, type BotReply, type Incoming } from "../src/bots/conversation.js";
import { runFollowups } from "../src/bots/followup.js";
import { registerWhatsAppWebhook, verifySignature } from "../src/bots/whatsapp.js";
import { makeTestApp } from "./helpers.js";

const SCAM = "Your parcel is held by customs. Pay ₹2,999 to customs.clear@ybl within 2 hours.";

function setup() {
  const t = makeTestApp();
  const conversation = createConversation({
    checker: t.app.checker,
    cache: t.cache,
    store: t.store,
    salt: "test-salt-0123456789",
  });
  let n = 0;
  const msg = (userId = "111"): Incoming => ({
    channel: "telegram",
    userId,
    messageKey: `tg:${userId}:${++n}`,
  });
  return { ...t, conversation, msg };
}

describe("conversation", () => {
  it("welcomes in both languages and offers a language choice", async () => {
    const { conversation, msg } = setup();
    const [welcome, choose] = await conversation.handleText(msg(), "/start");
    expect(welcome!.text).toContain("Sachet");
    expect(welcome!.text).toContain("नमस्ते");
    expect(choose!.buttons?.map((b) => b.id)).toEqual(["lang:en", "lang:hi"]);
  });

  it("checks a forwarded message and offers a Report button", async () => {
    const { conversation, msg } = setup();
    const [card] = await conversation.handleText(msg(), SCAM);
    expect(card!.text.startsWith("🔴 HIGH RISK")).toBe(true);
    expect(card!.text).toContain("1930");
    expect(card!.buttons).toEqual([{ id: "report", title: "🚩 Report scam" }]);
  });

  it("reads the SMS sender from a 'From:' first line", async () => {
    const { conversation, msg } = setup();
    const [card] = await conversation.handleText(
      msg(),
      "From: 98765 43210\nDear customer, your SBI account KYC is pending. Update at sbi-kyc.xyz",
    );
    expect(card!.text).toContain("Sender: An ordinary mobile number");
    expect(card!.text).toContain("came from an ordinary phone number");
  });

  it("shows the privacy notice in the chosen language", async () => {
    const { conversation, msg } = setup();
    const [en] = await conversation.handleText(msg(), "/privacy");
    expect(en!.text).toContain("salted hash");
    expect(en!.text).toContain("/delete");
    await conversation.handleButton(msg(), "lang:hi");
    const [hi] = await conversation.handleText(msg(), "/privacy");
    expect(hi!.text).toContain("गोपनीयता");
  });

  it("switches to Hindi", async () => {
    const { conversation, msg } = setup();
    expect((await conversation.handleButton(msg(), "lang:hi"))[0]!.text).toBe(
      "भाषा हिंदी कर दी गई है।",
    );
    const [card] = await conversation.handleText(msg(), SCAM);
    expect(card!.text.startsWith("🔴 उच्च जोखिम")).toBe(true);
  });

  it("reports the last checked message with the Report button", async () => {
    const { conversation, msg, store } = setup();
    await conversation.handleText(msg(), SCAM);
    const [done] = await conversation.handleButton(msg(), "report");
    expect(done!.text).toMatch(/report is saved/);
    const [found] = await store.lookup([{ kind: "upi", value: "customs.clear@ybl" }]);
    expect(found?.reportCount).toBe(1);
  });

  it("a retried delivery of the same message is reported once", async () => {
    const { conversation, store } = setup();
    const same: Incoming = { channel: "telegram", userId: "111", messageKey: "tg:111:42" };
    await conversation.handleText(same, `/report ${SCAM}`);
    const [again] = await conversation.handleText(same, `/report ${SCAM}`);
    expect(again!.text).toMatch(/already reported/);
    expect((await store.stats()).reports).toBe(1);
  });

  it("/report with nothing to report explains how", async () => {
    const { conversation, msg } = setup();
    const [r] = await conversation.handleText(msg(), "/report");
    expect(r!.text).toMatch(/Send \/report/);
  });

  it("/delete removes the user's data", async () => {
    const { conversation, msg, store } = setup();
    await conversation.handleText(msg(), `/report ${SCAM}`);
    const [r] = await conversation.handleText(msg(), "/delete");
    expect(r!.text).toMatch(/deleted/);
    expect((await store.stats()).reports).toBe(0);
  });
});

describe("Did you pay? follow-up", () => {
  it("asks the next day and counts money protected on 'No'", async () => {
    const { conversation, msg, store, cache } = setup();
    await conversation.handleText(msg("777"), SCAM);

    const sent: { userId: string; reply: BotReply }[] = [];
    const tomorrow = new Date(Date.now() + 21 * 3600_000);
    const n = await runFollowups({
      store,
      cache,
      now: tomorrow,
      senders: { telegram: async (userId, reply) => void sent.push({ userId, reply }) },
    });
    expect(n).toBe(1);
    expect(sent[0]!.userId).toBe("777");
    expect(sent[0]!.reply.text).toMatch(/Did you pay/);

    const noButton = sent[0]!.reply.buttons!.find((b) => b.id.startsWith("paid:no"))!;
    const [thanks] = await conversation.handleButton(msg("777"), noButton.id);
    expect(thanks!.text).toMatch(/You stopped a scam/);
    expect((await store.stats()).moneyProtectedInr).toBe(2999);

    // Never asked twice.
    expect(await runFollowups({ store, cache, now: tomorrow, senders: {} })).toBe(0);
  });

  it("does not follow up too early", async () => {
    const { conversation, msg, store, cache } = setup();
    await conversation.handleText(msg(), SCAM);
    expect(await runFollowups({ store, cache, senders: { telegram: async () => {} } })).toBe(0);
  });
});

describe("WhatsApp webhook", () => {
  const SECRET = "wa-app-secret";
  const sign = (body: string) =>
    `sha256=${createHmac("sha256", SECRET).update(body).digest("hex")}`;
  const waBody = (id: string, text: string) =>
    JSON.stringify({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [{ from: "919800000001", id, type: "text", text: { body: text } }],
              },
            },
          ],
        },
      ],
    });

  function waApp() {
    const t = setup();
    const sent: { to: string; reply: BotReply }[] = [];
    registerWhatsAppWebhook(t.app, {
      conversation: t.conversation,
      cache: t.cache,
      send: async (to, reply) => void sent.push({ to, reply }),
      verifyToken: "verify-me",
      appSecret: SECRET,
    });
    return { ...t, sent };
  }

  it("answers Meta's verification request", async () => {
    const { app } = waApp();
    const ok = await app.inject({
      url: "/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=12345",
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.body).toBe("12345");
    const bad = await app.inject({
      url: "/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1",
    });
    expect(bad.statusCode).toBe(403);
  });

  it("rejects a message without a valid signature", async () => {
    const { app, sent } = waApp();
    const body = waBody("wamid.1", SCAM);
    const res = await app.inject({
      method: "POST",
      url: "/webhooks/whatsapp",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": sign(body + "tampered"),
      },
      payload: body,
    });
    expect(res.statusCode).toBe(401);
    expect(sent).toEqual([]);
  });

  it("replies with a verdict, and ignores Meta's retry of the same message", async () => {
    const { app, sent } = waApp();
    const body = waBody("wamid.2", SCAM);
    const post = () =>
      app.inject({
        method: "POST",
        url: "/webhooks/whatsapp",
        headers: { "content-type": "application/json", "x-hub-signature-256": sign(body) },
        payload: body,
      });
    expect((await post()).statusCode).toBe(200);
    expect((await post()).statusCode).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe("919800000001");
    expect(sent[0]!.reply.text).toContain("HIGH RISK");
  });

  it("verifySignature rejects missing and malformed headers", () => {
    expect(verifySignature("{}", undefined, SECRET)).toBe(false);
    expect(verifySignature("{}", "sha256=abc", SECRET)).toBe(false);
    expect(verifySignature("{}", sign("{}"), SECRET)).toBe(true);
  });
});
