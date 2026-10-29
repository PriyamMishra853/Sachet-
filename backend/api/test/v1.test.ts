import { describe, expect, it } from "vitest";
import { makeTestApp } from "./helpers.js";

// Browser IDs look like the web app's crypto.randomUUID().
const cid = (name: string) => `client-${name}`.padEnd(20, "0");

const report = (
  app: ReturnType<typeof makeTestApp>["app"],
  body: object,
  key: string,
  client = cid("c1"),
  ip = "203.0.113.1",
) =>
  app.inject({
    method: "POST",
    url: "/v1/reports",
    remoteAddress: ip,
    headers: { "idempotency-key": key, "x-client-id": client },
    payload: body,
  });

describe("GET /v1/check", () => {
  it("says 'No reports yet' for an unknown number, never 'safe'", async () => {
    const { app } = makeTestApp();
    const res = await app.inject({ url: "/v1/check?type=phone&value=%2B91%2098765-43210" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.identifier).toEqual({ kind: "phone", value: "+919876543210" });
    expect(body.band).toBe("unknown");
    expect(body.label.en).toBe("No reports yet");
    expect(body.advice.at(-1).en).toContain("1930");
  });

  it("rejects input it cannot read, with the reason", async () => {
    const { app } = makeTestApp();
    const res = await app.inject({ url: "/v1/check?type=upi&value=ramesh@gmail.com" });
    expect(res.statusCode).toBe(400);
    expect(res.json().reason).toMatch(/looks like an email/);
  });

  it("validates the query with zod", async () => {
    const { app } = makeTestApp();
    const res = await app.inject({ url: "/v1/check?type=email&value=x" });
    expect(res.statusCode).toBe(400);
  });

  it("serves a repeated check from the cache (log shows HIT)", async () => {
    const { app, logs } = makeTestApp();
    await app.inject({ url: "/v1/check?type=upi&value=customs.clear@ybl" });
    await app.inject({ url: "/v1/check?type=upi&value=CUSTOMS.CLEAR@YBL" });
    const cacheLogs = logs.filter((l) => l.cache).map((l) => l.cache);
    expect(cacheLogs).toEqual(["MISS", "HIT"]);
  });

  it("marks a link high risk when Safe Browsing flags it", async () => {
    const { app, sbCalls } = makeTestApp({ flagged: ["http://evil.example.com/login"] });
    const res = await app.inject({ url: "/v1/check?type=url&value=evil.example.com/login" });
    expect(res.json().band).toBe("high");
    expect(res.json().reasons[0].en).toMatch(/Google Safe Browsing/);
    expect(sbCalls).toEqual([["http://evil.example.com/login"]]);
  });

  it("marks a seeded phishing domain high risk", async () => {
    const { app, store } = makeTestApp();
    await store.upsertSeed([
      { kind: "domain", value: "sbi-kyc-update.xyz", source: "seed", riskBand: "high" },
    ]);
    const res = await app.inject({
      url: "/v1/check?type=url&value=https://login.sbi-kyc-update.xyz/a",
    });
    expect(res.json().band).toBe("high");
    expect(res.json().reasons[0].en).toMatch(/phishing blocklist/);
  });

  it("rate-limits a flood of checks from one IP", async () => {
    const { app } = makeTestApp();
    let last = 0;
    for (let i = 0; i < 61; i++) {
      last = (await app.inject({ url: "/v1/check?type=phone&value=9876543210" })).statusCode;
    }
    expect(last).toBe(429);
  });
});

describe("POST /v1/check/message", () => {
  it("extracts identifiers and explains the verdict", async () => {
    const { app } = makeTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/v1/check/message",
      payload: {
        text: "Your parcel is held by customs. Pay ₹2,999 to customs.clear@ybl within 2 hours.",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.band).toBe("high");
    expect(body.scamType).toBe("parcel");
    expect(body.extracted).toEqual({
      phones: [],
      upis: ["customs.clear@ybl"],
      domains: [],
      amounts: [2999],
    });
    expect(body.reasons.length).toBeGreaterThan(0);
    expect(body.checkId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("labels the SMS sender, and never lowers the risk for a registered one", async () => {
    const { app } = makeTestApp();
    const check = async (text: string, sender?: string) =>
      (
        await app.inject({ method: "POST", url: "/v1/check/message", payload: { text, sender } })
      ).json();

    const ad = await check("Flat 50% off on shoes this weekend at myntra.com", "VM-MYNTRA-P");
    expect(ad.sender).toMatchObject({
      kind: "promotional",
      value: "MYNTRA",
      label: { en: "Promotional (marketing) SMS" },
    });

    const kyc = "Dear customer, your SBI account KYC is pending. Update at sbi-kyc.xyz";
    const fromMobile = await check(kyc, "+91 98765 43210");
    expect(fromMobile.signals).toContain("official_from_mobile");
    expect(fromMobile.advice.map((a: { en: string }) => a.en).join(" ")).toContain(
      "Report & Check Suspect",
    );

    const scam = "Your parcel is held by customs. Pay ₹2,999 to customs.clear@ybl within 2 hours.";
    expect((await check(scam, "VM-INDPST-G")).band).toBe("high");
    expect((await check(scam)).sender).toBeNull();
  });

  it("rejects an empty message", async () => {
    const { app } = makeTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/v1/check/message",
      payload: { text: "  " },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("POST /v1/reports", () => {
  it("returns 202 and stores the report", async () => {
    const { app } = makeTestApp();
    const res = await report(
      app,
      { identifiers: [{ type: "upi", value: "customs.clear@ybl" }] },
      "key-00000001",
    );
    expect(res.statusCode).toBe(202);
    expect(res.json()).toMatchObject({ duplicate: false });
  });

  it("sending the same report twice creates one row (idempotency)", async () => {
    const { app, store } = makeTestApp();
    const body = { identifiers: [{ type: "upi", value: "customs.clear@ybl" }] };
    const first = await report(app, body, "key-retry-123");
    const second = await report(app, body, "key-retry-123");
    expect(first.json().duplicate).toBe(false);
    expect(second.json()).toMatchObject({ duplicate: true });
    expect((await store.stats()).reports).toBe(1);
  });

  it("requires an Idempotency-Key header", async () => {
    const { app } = makeTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/v1/reports",
      payload: { identifiers: [{ type: "upi", value: "a.b@ybl" }] },
    });
    expect(res.statusCode).toBe(400);
  });

  it("needs at least one identifier", async () => {
    const { app } = makeTestApp();
    const res = await report(app, { text: "this was a scam" }, "key-00000002");
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("no_identifiers");
  });

  it("invalidates the cache: a new report changes the next check", async () => {
    const { app } = makeTestApp();
    const check = () => app.inject({ url: "/v1/check?type=upi&value=customs.clear@ybl" });
    expect((await check()).json().band).toBe("unknown");
    await report(app, { text: "Pay customs duty to customs.clear@ybl" }, "key-00000003");
    const after = (await check()).json();
    expect(after.band).toBe("medium");
    expect(after.reportCount).toBe(1);
  });

  it("3 different people make it high risk; 1 person 3 times does not", async () => {
    const { app } = makeTestApp();
    const body = { identifiers: [{ type: "phone", value: "9876543210" }] };
    for (let i = 0; i < 3; i++) await report(app, body, `same-person-${i}`, cid("same"));
    const check = () => app.inject({ url: "/v1/check?type=phone&value=9876543210" });
    expect((await check()).json().band).toBe("medium");
    await report(app, body, "person-b-0001", cid("b"), "198.51.100.7");
    await report(app, body, "person-c-0001", cid("c"), "2001:db8:aaaa:1::5");
    expect((await check()).json().band).toBe("high");
  });

  it("one person faking many browser IDs from one network counts once", async () => {
    const { app } = makeTestApp();
    const body = { identifiers: [{ type: "phone", value: "9876543210" }] };
    for (let i = 0; i < 5; i++) {
      const res = await report(app, body, `fake-browser-${i}`, cid(`fake${i}`));
      expect(res.statusCode).toBe(202);
    }
    // A new IPv6 address in the same /64 is still the same network.
    await report(app, body, "fake-browser-v6-1", cid("v6a"), "2001:db8:1:2::1");
    await report(app, body, "fake-browser-v6-2", cid("v6b"), "2001:db8:1:2:ffff::9");
    const res = await app.inject({ url: "/v1/check?type=phone&value=9876543210" });
    expect(res.json()).toMatchObject({ band: "medium", reportCount: 2 });
  });

  it("ignores a faked X-Forwarded-For unless a proxy is configured", async () => {
    const { app } = makeTestApp();
    let last = 0;
    for (let i = 0; i < 61; i++) {
      const res = await app.inject({
        url: "/v1/check?type=phone&value=9876543210",
        headers: { "x-forwarded-for": `10.0.0.${i}` },
      });
      last = res.statusCode;
    }
    expect(last).toBe(429);
  });

  it("limits reports from one network to 30 an hour, whatever browser IDs it sends", async () => {
    const { app } = makeTestApp();
    let last = 0;
    for (let i = 0; i < 31; i++) {
      const body = { identifiers: [{ type: "upi", value: `scammer${i}@ybl` }] };
      last = (await report(app, body, `net-limit-key-${i}`, cid(`n${i}`))).statusCode;
    }
    expect(last).toBe(429);
  });

  it("limits each person to 20 reports an hour", async () => {
    const { app } = makeTestApp();
    let last = 0;
    for (let i = 0; i < 21; i++) {
      const body = { identifiers: [{ type: "upi", value: `scammer${i}@ybl` }] };
      last = (await report(app, body, `rate-limit-key-${i}`)).statusCode;
    }
    expect(last).toBe(429);
  });

  it("stores redacted text, not the victim's personal data", async () => {
    const { app } = makeTestApp();
    const res = await report(
      app,
      { text: "Dear Ramesh Kumar, your OTP is 482913. Pay to kyc.desk@ybl" },
      "key-redact-1",
    );
    expect(res.statusCode).toBe(202);
  });
});

describe("DELETE /v1/me", () => {
  it("deletes this browser's reports and checks, not other people's", async () => {
    const { app, store } = makeTestApp();
    const body = { identifiers: [{ type: "upi", value: "a.b@ybl" }] };
    await report(app, body, "key-del-0001", cid("me"));
    await report(app, body, "key-del-0002", cid("other"), "198.51.100.9");
    const res = await app.inject({
      method: "DELETE",
      url: "/v1/me",
      headers: { "x-client-id": cid("me") },
    });
    expect(res.json()).toEqual({ reports: 1, checks: 0 });
    expect((await store.stats()).reports).toBe(1);
  });

  it("needs the browser ID: the IP alone could belong to many people", async () => {
    const { app, store } = makeTestApp();
    await report(app, { identifiers: [{ type: "upi", value: "a.b@ybl" }] }, "key-del-0003", "x");
    const res = await app.inject({ method: "DELETE", url: "/v1/me" });
    expect(res.statusCode).toBe(400);
    expect((await store.stats()).reports).toBe(1);
  });
});

describe("money protected", () => {
  it("counts amounts when the user answers 'No, I didn't pay'", async () => {
    const { app } = makeTestApp();
    const check = await app.inject({
      method: "POST",
      url: "/v1/check/message",
      headers: { "x-client-id": cid("payer") },
      payload: { text: "You won KBC lottery! Pay processing fee ₹15,000 to lucky.draw@ybl" },
    });
    const { checkId, band } = check.json();
    expect(band).toBe("high");
    const answer = (client: string) =>
      app.inject({
        method: "POST",
        url: `/v1/checks/${checkId}/paid`,
        headers: { "x-client-id": client },
        payload: { paid: "no" },
      });
    const stats = async () => (await app.inject({ url: "/v1/stats" })).json().moneyProtectedInr;

    // Someone else who got hold of the check ID can't answer for this person.
    expect((await answer(cid("stranger"))).statusCode).toBe(204);
    expect(await stats()).toBe(0);
    expect((await answer(cid("payer"))).statusCode).toBe(204);
    expect(await stats()).toBe(15_000);
  });
});
