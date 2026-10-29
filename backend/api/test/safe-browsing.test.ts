import { describe, expect, it } from "vitest";
import { createSafeBrowsing } from "../src/services/safe-browsing.js";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("createSafeBrowsing", () => {
  it("does nothing without an API key", async () => {
    let called = false;
    const sb = createSafeBrowsing({ fetchFn: async () => ((called = true), json({})) });
    expect(await sb.check(["http://x.com"])).toEqual(new Set());
    expect(called).toBe(false);
  });

  it("returns the URLs Google matched", async () => {
    let sent: { threatInfo: { threatEntries: { url: string }[] } } | undefined;
    const sb = createSafeBrowsing({
      apiKey: "test-key",
      fetchFn: async (_url, init) => {
        sent = JSON.parse(String(init?.body));
        return json({ matches: [{ threat: { url: "http://bad.com/" } }] });
      },
    });
    const flagged = await sb.check(["http://bad.com/", "http://good.com/"]);
    expect(flagged).toEqual(new Set(["http://bad.com/"]));
    expect(sent?.threatInfo.threatEntries).toEqual([
      { url: "http://bad.com/" },
      { url: "http://good.com/" },
    ]);
  });

  it("returns no matches (and reports the error) when Google fails", async () => {
    const errors: unknown[] = [];
    const sb = createSafeBrowsing({
      apiKey: "k",
      fetchFn: async () => json({ error: "quota" }, 429),
      onError: (e) => errors.push(e),
    });
    expect(await sb.check(["http://x.com"])).toEqual(new Set());
    expect(errors).toHaveLength(1);
  });

  it("gives up after the timeout so the user is not kept waiting", async () => {
    const sb = createSafeBrowsing({
      apiKey: "k",
      timeoutMs: 50,
      fetchFn: (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    });
    const started = Date.now();
    expect(await sb.check(["http://slow.com"])).toEqual(new Set());
    expect(Date.now() - started).toBeLessThan(500);
  });
});
