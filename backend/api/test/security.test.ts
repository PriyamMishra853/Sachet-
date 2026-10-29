import { createMemoryStore } from "@sachet/db";
import { describe, expect, it } from "vitest";
import { createConversation } from "../src/bots/conversation.js";
import { loadConfig } from "../src/config.js";
import { networkOf, safeEqual } from "../src/security.js";
import { makeTestApp } from "./helpers.js";

describe("security headers", () => {
  it("are on every API response", async () => {
    const { app } = makeTestApp();
    const res = await app.inject({ url: "/v1/stats" });
    expect(res.headers).toMatchObject({
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
      "referrer-policy": "no-referrer",
      "cache-control": "no-store",
    });
    expect(res.headers["strict-transport-security"]).toMatch(/max-age=\d+/);
  });
});

describe("logs", () => {
  it("never contain the checked value or the client IP", async () => {
    const { app, logs } = makeTestApp();
    await app.inject({
      url: "/v1/check?type=phone&value=9876543210",
      remoteAddress: "203.0.113.77",
    });
    const all = JSON.stringify(logs);
    expect(all).toContain("/v1/check");
    expect(all).not.toMatch(/9876543210|203\.0\.113\.77/);
  });
});

describe("errors", () => {
  it("never send server error details to the client", async () => {
    const store = createMemoryStore();
    store.stats = async () => {
      throw new Error("connect ECONNREFUSED db.internal:5432 user=postgres");
    };
    const { app, logs } = makeTestApp({ store });
    const res = await app.inject({ url: "/v1/stats" });
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toMatch(/ECONNREFUSED|postgres|5432/);
    expect(res.json().error).toBe("internal_error");
    // ...but the log has them, for us.
    expect(JSON.stringify(logs)).toMatch(/ECONNREFUSED/);
  });

  it("refuse bodies over 64 KB", async () => {
    const { app } = makeTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/v1/check/message",
      payload: { text: "a".repeat(70 * 1024) },
    });
    expect(res.statusCode).toBe(413);
  });

  it("say what was wrong with broken JSON", async () => {
    const { app } = makeTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/v1/check/message",
      headers: { "content-type": "application/json" },
      payload: "{not json",
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("client IP behind a proxy", () => {
  it("takes the address the proxy saw, not one the client wrote in the header", async () => {
    const { app } = makeTestApp({ trustProxyHops: 1 });
    let last = 0;
    // The client fakes a new first address every time; the proxy appends the real one.
    for (let i = 0; i < 61; i++) {
      const res = await app.inject({
        url: "/v1/check?type=phone&value=9876543210",
        headers: { "x-forwarded-for": `10.0.0.${i}, 203.0.113.50` },
      });
      last = res.statusCode;
    }
    expect(last).toBe(429);
  });
});

describe("networkOf", () => {
  it("keeps IPv4 whole and cuts IPv6 to its /64", () => {
    expect(networkOf("203.0.113.9")).toBe("203.0.113.9");
    expect(networkOf("::ffff:203.0.113.9")).toBe("203.0.113.9");
    expect(networkOf("2001:db8:1:2:3:4:5:6")).toBe("2001:db8:1:2::/64");
    expect(networkOf("2001:db8:1:2::9")).toBe("2001:db8:1:2::/64");
    expect(networkOf("2001:db8::1")).toBe("2001:db8:0:0::/64");
  });
});

describe("safeEqual", () => {
  it("matches only the exact secret", () => {
    expect(safeEqual("s3cret-value", "s3cret-value")).toBe(true);
    expect(safeEqual("s3cret-valuX", "s3cret-value")).toBe(false);
    expect(safeEqual("short", "s3cret-value")).toBe(false);
    expect(safeEqual(undefined, "s3cret-value")).toBe(false);
  });
});

describe("production config", () => {
  const base = { NODE_ENV: "production", HASH_SALT: "x".repeat(32) };

  it("needs a long HASH_SALT", () => {
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow(/HASH_SALT/);
    expect(() => loadConfig({ ...base, HASH_SALT: "too-short-salt-1234" })).toThrow(/HASH_SALT/);
    expect(loadConfig(base).HASH_SALT).toHaveLength(32);
  });

  it("refuses CORS for every site", () => {
    expect(() => loadConfig({ ...base, CORS_ORIGINS: "*" })).toThrow(/CORS_ORIGINS/);
  });

  it("refuses a short Telegram webhook secret", () => {
    expect(() => loadConfig({ ...base, TELEGRAM_WEBHOOK_SECRET: "abc" })).toThrow();
  });

  it("trusts one proxy in production and none locally", () => {
    expect(loadConfig(base).TRUST_PROXY_HOPS).toBe(1);
    expect(loadConfig({}).TRUST_PROXY_HOPS).toBe(0);
  });
});

describe("bot flood", () => {
  it("answers 20 checks a minute, says 'slow down' once, then stays quiet", async () => {
    const t = makeTestApp();
    const conversation = createConversation({
      checker: t.app.checker,
      cache: t.cache,
      store: t.store,
      salt: "test-salt-0123456789",
    });
    const send = (i: number) =>
      conversation.handleText(
        { channel: "telegram", userId: "42", messageKey: `tg:42:${i}` },
        `Pay ₹500 to scammer${i}@ybl`,
      );
    for (let i = 0; i < 20; i++) expect((await send(i))[0]?.text).toMatch(/RISK|reports/i);
    expect((await send(20))[0]?.text).toMatch(/very fast/);
    expect(await send(21)).toEqual([]);
    expect((await t.store.stats()).checks).toBe(20);
  });
});
