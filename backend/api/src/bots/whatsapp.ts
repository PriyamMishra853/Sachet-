import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { Cache } from "../cache.js";
import { safeEqual } from "../security.js";
import type { Conversation } from "./conversation.js";
import type { Sender } from "./followup.js";

const GRAPH = "https://graph.facebook.com/v21.0";
const WA_BODY_LIMIT = 1024; // interactive message body limit
const WA_BUTTON_TITLE_LIMIT = 20;

// Meta signs every webhook POST with our app secret:
// X-Hub-Signature-256: sha256=<HMAC of the raw body>. Without this check,
// anyone who finds the URL could fake messages and make the bot spam people
// or fill the database with fake reports.
export function verifySignature(
  rawBody: string,
  header: string | undefined,
  appSecret: string,
): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  const given = Buffer.from(header.slice(7), "hex");
  // timingSafeEqual: comparing byte by byte with === leaks, through timing,
  // how many leading bytes were right.
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function createWhatsAppSender(opts: {
  token: string;
  phoneNumberId: string;
  fetchFn?: typeof fetch;
}): Sender {
  const { token, phoneNumberId, fetchFn = fetch } = opts;
  const post = async (payload: object) => {
    const res = await fetchFn(`${GRAPH}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
    });
    if (!res.ok) throw new Error(`WhatsApp send failed: ${res.status} ${await res.text()}`);
  };

  return async (to, reply) => {
    const buttons = reply.buttons?.slice(0, 3) ?? [];
    if (buttons.length === 0) {
      return post({ to, type: "text", text: { body: reply.text } });
    }
    // Interactive messages have a short body limit; send long cards as text
    // first, then the buttons under a short prompt.
    let body = reply.text;
    if (body.length > WA_BODY_LIMIT) {
      await post({ to, type: "text", text: { body } });
      body = "👇";
    }
    await post({
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body },
        action: {
          buttons: buttons.map((b) => ({
            type: "reply",
            reply: { id: b.id, title: b.title.slice(0, WA_BUTTON_TITLE_LIMIT) },
          })),
        },
      },
    });
  };
}

type WaMessage = {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  interactive?: { button_reply?: { id: string } };
};
type WaWebhook = { entry?: { changes?: { value?: { messages?: WaMessage[] } }[] }[] };

export function registerWhatsAppWebhook(
  app: FastifyInstance,
  deps: {
    conversation: Conversation;
    cache: Cache;
    send: Sender;
    verifyToken: string;
    appSecret: string;
  },
) {
  const { conversation, cache, send, verifyToken, appSecret } = deps;

  // Own plugin scope, so the raw-body JSON parser only applies here.
  void app.register(async (scope) => {
    scope.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
      (req as { rawBody?: string }).rawBody = body as string;
      try {
        done(null, JSON.parse(body as string));
      } catch {
        done(Object.assign(new Error("Body is not valid JSON"), { statusCode: 400 }), undefined);
      }
    });

    // Meta calls this once when you save the webhook URL in the dashboard.
    scope.get<{ Querystring: Record<string, string> }>("/webhooks/whatsapp", async (req, reply) => {
      const q = req.query;
      if (q["hub.mode"] === "subscribe" && safeEqual(q["hub.verify_token"], verifyToken)) {
        return reply.type("text/plain").send(q["hub.challenge"] ?? "");
      }
      return reply.code(403).send();
    });

    scope.post("/webhooks/whatsapp", async (req, reply) => {
      const raw = (req as { rawBody?: string }).rawBody ?? "";
      if (
        !verifySignature(raw, req.headers["x-hub-signature-256"] as string | undefined, appSecret)
      ) {
        return reply.code(401).send({ error: "bad_signature" });
      }
      const messages = ((req.body as WaWebhook).entry ?? []).flatMap((e) =>
        (e.changes ?? []).flatMap((c) => c.value?.messages ?? []),
      );
      for (const msg of messages) {
        // Meta retries deliveries; handle each message ID once.
        if (!(await cache.setIfAbsent(`wa:seen:${msg.id}`, "1", 24 * 3600))) continue;
        const incoming = {
          channel: "whatsapp" as const,
          userId: msg.from,
          messageKey: `wa:${msg.id}`,
        };
        try {
          const buttonId = msg.interactive?.button_reply?.id;
          const replies = buttonId
            ? await conversation.handleButton(incoming, buttonId)
            : msg.text?.body
              ? await conversation.handleText(incoming, msg.text.body)
              : [{ text: "Please send text. कृपया टेक्स्ट भेजें।" }];
          for (const r of replies) await send(msg.from, r);
        } catch (err) {
          req.log.error({ err }, "whatsapp message failed");
        }
      }
      // Always 200 for a valid signature, or Meta keeps retrying.
      return reply.code(200).send();
    });
  });
}
