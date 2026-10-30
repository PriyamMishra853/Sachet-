import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { createMemoryCache } from "../src/cache.js";
import { createAiCheck } from "../src/services/ai-check.js";
import { makeTestApp } from "./helpers.js";

const TASK_SCAM =
  "Dear Ramesh, earn Rs 3000 daily by liking YouTube videos. Join our Telegram group and pay Rs 500 registration to start. OTP is 482913";

type Sent = { headers: Headers; body: Record<string, unknown> };

// The real SDK with a fake network: each call answers with `answers[i]`.
function fakeClaude(answers: (object | "refusal" | 500)[], delayMs = 0) {
  const sent: Sent[] = [];
  const fetchFn = (async (_url: string | URL | Request, init?: RequestInit) => {
    sent.push({
      headers: new Headers(init?.headers),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    const answer = answers[Math.min(sent.length - 1, answers.length - 1)]!;
    if (answer === 500) {
      return Response.json(
        { type: "error", error: { type: "api_error", message: "boom" } },
        { status: 500 },
      );
    }
    return Response.json({
      id: "msg_test",
      type: "message",
      role: "assistant",
      model: "claude-opus-5-5",
      content: answer === "refusal" ? [] : [{ type: "text", text: JSON.stringify(answer) }],
      stop_reason: answer === "refusal" ? "refusal" : "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 420, output_tokens: 60 },
    });
  }) as typeof fetch;
  const client = new Anthropic({ apiKey: "test-key", fetch: fetchFn, maxRetries: 0 });
  return { client, sent };
}

const make = (claude: ReturnType<typeof fakeClaude>, waitMs = 2000) =>
  createAiCheck({
    cache: createMemoryCache(),
    model: "claude-opus-5-5",
    waitMs,
    client: claude.client,
  });

describe("AI check", () => {
  it("sends only redacted text, with a fixed answer format and fallback", async () => {
    const claude = fakeClaude([{ is_scam: true, scam_type: "task_job", confidence: "high" }]);
    const opinion = await make(claude).opinion(TASK_SCAM);
    expect(opinion).toEqual({ scam: true, scamType: "task_job", confidence: "high" });

    const [{ body, headers }] = claude.sent as [Sent];
    const content = JSON.stringify(body.messages);
    expect(content).toContain("Dear [name]");
    expect(content).toContain("[code]");
    expect(content).not.toContain("Ramesh");
    expect(content).not.toContain("482913");
    expect(body.model).toBe("claude-opus-5-5");
    expect(body.fallbacks).toBe("default");
    expect(headers.get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");
    expect(body.output_config).toMatchObject({ effort: "low", format: { type: "json_schema" } });
  });

  it("asks once per message: repeats come from the cache", async () => {
    const claude = fakeClaude([{ is_scam: true, scam_type: "task_job", confidence: "high" }]);
    const ai = make(claude);
    await Promise.all([ai.opinion(TASK_SCAM), ai.opinion(TASK_SCAM)]);
    await ai.opinion(TASK_SCAM);
    expect(claude.sent).toHaveLength(1);
  });

  it("maps 'other' to no type and skips messages too short to read", async () => {
    const claude = fakeClaude([{ is_scam: true, scam_type: "other", confidence: "medium" }]);
    const ai = make(claude);
    expect(await ai.opinion("9876543210")).toBeNull();
    expect(await ai.opinion(TASK_SCAM)).toEqual({
      scam: true,
      scamType: null,
      confidence: "medium",
    });
    expect(claude.sent).toHaveLength(1);
  });

  it("gives no opinion on a refusal, and remembers it", async () => {
    const claude = fakeClaude(["refusal"]);
    const ai = make(claude);
    expect(await ai.opinion(TASK_SCAM)).toBeNull();
    expect(await ai.opinion(TASK_SCAM)).toBeNull();
    expect(claude.sent).toHaveLength(1);
  });

  it("fails open on an API error (after one retry) and asks again next time", async () => {
    const claude = fakeClaude([
      500,
      500,
      { is_scam: false, scam_type: "none", confidence: "high" },
    ]);
    const ai = make(claude);
    expect(await ai.opinion(TASK_SCAM)).toBeNull();
    expect(await ai.opinion(TASK_SCAM)).toEqual({
      scam: false,
      scamType: null,
      confidence: "high",
    });
  });

  it("doesn't hold up the answer, but a late opinion is kept for the next check", async () => {
    const claude = fakeClaude([{ is_scam: true, scam_type: "task_job", confidence: "high" }], 200);
    const ai = make(claude, 50);
    expect(await ai.opinion(TASK_SCAM)).toBeNull();
    await new Promise((r) => setTimeout(r, 250));
    expect(await ai.opinion(TASK_SCAM)).toMatchObject({ scam: true });
    expect(claude.sent).toHaveLength(1);
  });
});

describe("checks with an AI opinion", () => {
  const QUIET = "Hello sir, kindly confirm your details for the government scheme benefit today.";

  it("adds the AI's reason to a message the rules don't catch", async () => {
    const { app, aiCalls } = makeTestApp({
      ai: () => ({ scam: true, scamType: "lottery", confidence: "high" }),
    });
    const res = await app.inject({
      method: "POST",
      url: "/v1/check/message",
      payload: { text: QUIET },
    });
    const body = res.json();
    expect(body.band).toBe("medium");
    expect(body.scamType).toBe("lottery");
    expect(body.reasons.at(-1).en).toBe(
      "An AI check also reads this as a likely lottery / prize / KBC scam.",
    );
    expect(aiCalls).toEqual([QUIET]);
  });

  it("isn't asked when the rules already say high risk", async () => {
    const { app, aiCalls } = makeTestApp({
      ai: () => ({ scam: true, scamType: "parcel", confidence: "high" }),
    });
    await app.inject({
      method: "POST",
      url: "/v1/check/message",
      payload: {
        text: "Your parcel is held by customs. Pay ₹2,999 to customs.clear@ybl within 2 hours.",
      },
    });
    expect(aiCalls).toEqual([]);
  });

  it("never runs for a single number, UPI ID or link", async () => {
    const { app, aiCalls } = makeTestApp({ ai: () => null });
    await app.inject({ url: "/v1/check?type=phone&value=9876543210" });
    expect(aiCalls).toEqual([]);
  });
});
