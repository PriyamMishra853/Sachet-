import { describe, expect, it } from "vitest";
import { makeTestApp } from "./helpers.js";

const TOKEN = "admin-token-0123456789abcdef0123456789";
const UPI = "shop.refunds@ybl";
const REASON = "This is my shop's UPI ID. An unhappy customer asked friends to report it.";

// Three different people on three different networks: enough for HIGH RISK.
async function flagUpi(app: ReturnType<typeof makeTestApp>["app"]) {
  for (const n of [1, 2, 3]) {
    await app.inject({
      method: "POST",
      url: "/v1/reports",
      remoteAddress: `203.0.113.${n}`,
      headers: { "idempotency-key": `key-${n}-0000`, "x-client-id": `client-${n}`.padEnd(20, "0") },
      payload: { identifiers: [{ type: "upi", value: UPI }] },
    });
  }
}

const appeal = (app: ReturnType<typeof makeTestApp>["app"], payload: object, ip = "198.51.100.7") =>
  app.inject({
    method: "POST",
    url: "/v1/appeals",
    remoteAddress: ip,
    headers: { "x-client-id": "owner-client-0000000" },
    payload,
  });

const check = async (app: ReturnType<typeof makeTestApp>["app"]) =>
  (await app.inject({ url: `/v1/check?type=upi&value=${UPI}` })).json();

const admin = (
  app: ReturnType<typeof makeTestApp>["app"],
  opts: { method?: "GET" | "POST"; url: string; payload?: object; token?: string; ip?: string },
) =>
  app.inject({
    method: opts.method ?? "GET",
    url: opts.url,
    remoteAddress: opts.ip ?? "192.0.2.10",
    headers: { authorization: `Bearer ${opts.token ?? TOKEN}` },
    payload: opts.payload,
  });

describe("POST /v1/appeals", () => {
  it("refuses an appeal for something with no reports", async () => {
    const { app } = makeTestApp();
    const res = await appeal(app, { type: "upi", value: UPI, reason: REASON });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("not_listed");
  });

  it("opens a review that shows on the next check without lowering the band", async () => {
    const { app } = makeTestApp();
    await flagUpi(app);
    expect((await check(app)).band).toBe("high");

    const res = await appeal(app, { type: "upi", value: UPI.toUpperCase(), reason: REASON });
    expect(res.statusCode).toBe(202);
    expect(res.json().appealId).toMatch(/^[0-9a-f-]{36}$/);

    const after = await check(app);
    expect(after.band).toBe("high");
    expect(after.reasons.map((r: { en: string }) => r.en)).toContain(
      "Its owner says these reports are wrong. Sachet is reviewing them.",
    );

    const again = await appeal(app, { type: "upi", value: UPI, reason: REASON });
    expect(again.statusCode).toBe(409);
  });

  it("needs a real reason and a readable identifier", async () => {
    const { app } = makeTestApp();
    expect((await appeal(app, { type: "upi", value: UPI, reason: "wrong" })).statusCode).toBe(400);
    const bad = await appeal(app, { type: "upi", value: "me@gmail.com", reason: REASON });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().reason).toMatch(/email/);
  });

  it("limits appeals per network per day", async () => {
    const { app } = makeTestApp();
    const codes = [];
    for (let i = 0; i < 6; i++) {
      codes.push(
        (await appeal(app, { type: "upi", value: `x${i}@ybl`, reason: REASON })).statusCode,
      );
    }
    expect(codes.slice(0, 5).every((c) => c === 404)).toBe(true);
    expect(codes[5]).toBe(429);
  });
});

describe("admin routes", () => {
  it("don't exist without ADMIN_TOKEN", async () => {
    const { app } = makeTestApp();
    expect((await admin(app, { url: "/v1/admin/appeals" })).statusCode).toBe(404);
  });

  it("refuse a wrong token, then lock the network out for the hour", async () => {
    const { app } = makeTestApp({ adminToken: TOKEN });
    for (let i = 0; i < 10; i++) {
      const res = await admin(app, { url: "/v1/admin/appeals", token: "guess" + i });
      expect(res.statusCode).toBe(401);
    }
    expect((await admin(app, { url: "/v1/admin/appeals" })).statusCode).toBe(429);
    // Another network is not affected.
    expect((await admin(app, { url: "/v1/admin/appeals", ip: "192.0.2.99" })).statusCode).toBe(200);
  });

  it("refuse a missing Authorization header", async () => {
    const { app } = makeTestApp({ adminToken: TOKEN });
    const res = await app.inject({ url: "/v1/admin/appeals" });
    expect(res.statusCode).toBe(401);
  });

  it("list an appeal with its reports, uphold it, and the check shows it cleared", async () => {
    const { app, logs } = makeTestApp({ adminToken: TOKEN });
    await flagUpi(app);
    await appeal(app, { type: "upi", value: UPI, reason: REASON, contact: " owner@example.com " });

    const list = (await admin(app, { url: "/v1/admin/appeals?status=open" })).json();
    expect(list.appeals).toHaveLength(1);
    const [a] = list.appeals;
    expect(a.identifier).toMatchObject({ kind: "upi", value: UPI, reportCount: 3 });
    expect(a.contact).toBe("owner@example.com");
    expect(a.recentReports).toHaveLength(3);

    const decided = await admin(app, {
      method: "POST",
      url: `/v1/admin/appeals/${a.id}`,
      payload: { decision: "upheld", note: "Reports came from one customer's friends" },
    });
    expect(decided.statusCode).toBe(200);
    expect(decided.json()).toEqual({ status: "upheld", identifier: { kind: "upi", value: UPI } });

    const after = await check(app);
    expect(after.band).toBe("unknown");
    expect(after.reportCount).toBe(0);
    expect(after.reasons[0].en).toMatch(/set aside after a review/);

    // Deciding twice finds nothing open.
    const twice = await admin(app, {
      method: "POST",
      url: `/v1/admin/appeals/${a.id}`,
      payload: { decision: "rejected" },
    });
    expect(twice.statusCode).toBe(404);

    // The decision is logged without the UPI ID itself.
    const line = logs.find((l) => l.admin === "appeal_decided");
    expect(line).toMatchObject({ decision: "upheld", kind: "upi" });
    expect(JSON.stringify(logs)).not.toContain(UPI);
  });

  it("reject keeps the band and validates input", async () => {
    const { app } = makeTestApp({ adminToken: TOKEN });
    await flagUpi(app);
    await appeal(app, { type: "upi", value: UPI, reason: REASON });
    const [a] = (await admin(app, { url: "/v1/admin/appeals" })).json().appeals;

    const bad = await admin(app, {
      method: "POST",
      url: `/v1/admin/appeals/${a.id}`,
      payload: { decision: "maybe" },
    });
    expect(bad.statusCode).toBe(400);
    const notUuid = await admin(app, {
      method: "POST",
      url: "/v1/admin/appeals/123",
      payload: { decision: "rejected" },
    });
    expect(notUuid.statusCode).toBe(400);

    await admin(app, {
      method: "POST",
      url: `/v1/admin/appeals/${a.id}`,
      payload: { decision: "rejected" },
    });
    const after = await check(app);
    expect(after.band).toBe("high");
    expect(after.reasons.map((r: { en: string }) => r.en).join(" ")).not.toMatch(/review/);
  });
});
