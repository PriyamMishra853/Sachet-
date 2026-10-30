import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createMemoryStore,
  createPgStore,
  migrate,
  parseFeed,
  type NewAppeal,
  type NewReport,
  type Sql,
  type Store,
} from "../src/index.js";

// PGlite is real Postgres compiled to WebAssembly: these tests run the
// actual SQL from pg-store.ts and the migration, with no server or Docker.
async function makePgStore(): Promise<Store> {
  const db = new PGlite();
  const sql: Sql = {
    query: (text, params) => db.query(text, params) as never,
    exec: (text) => db.exec(text),
  };
  await migrate(sql);
  return createPgStore(sql);
}

const report = (over: Partial<NewReport> = {}): NewReport => ({
  channel: "telegram",
  reporterHash: "reporter-a",
  scamType: "parcel",
  textRedacted: "Pay customs duty to customs.clear@ybl",
  amountInr: 2999,
  idempotencyKey: crypto.randomUUID(),
  identifiers: [{ kind: "upi", value: "customs.clear@ybl" }],
  ...over,
});

const UPI = { kind: "upi", value: "customs.clear@ybl" } as const;

describe.each([
  ["memory", async () => createMemoryStore()],
  ["postgres (PGlite)", makePgStore],
])("Store contract: %s", (_name, make) => {
  let store: Store;
  beforeEach(async () => {
    store = await make();
  });

  it("returns nothing for an identifier never seen", async () => {
    expect(await store.lookup([UPI])).toEqual([]);
  });

  it("stores a report and finds its identifier", async () => {
    const { duplicate } = await store.createReport(report());
    expect(duplicate).toBe(false);
    expect(await store.lookup([UPI])).toEqual([
      {
        ...UPI,
        reportCount: 1,
        riskBand: "unknown",
        source: "user",
        scamType: "parcel",
        review: null,
      },
    ]);
  });

  it("is idempotent: the same key twice creates one report", async () => {
    const r = report({ idempotencyKey: "tg-update-12345" });
    const first = await store.createReport(r);
    const second = await store.createReport(r);
    expect(second).toEqual({ reportId: first.reportId, duplicate: true });
    expect((await store.stats()).reports).toBe(1);
  });

  it("counts different reporters, not reports", async () => {
    await store.createReport(report({ reporterHash: "a" }));
    await store.createReport(report({ reporterHash: "a" }));
    await store.createReport(report({ reporterHash: "b" }));
    const [found] = await store.lookup([UPI]);
    expect(found?.reportCount).toBe(2);
  });

  it("links several identifiers from one report", async () => {
    await store.createReport(
      report({
        identifiers: [
          UPI,
          { kind: "phone", value: "+919876543210" },
          { kind: "domain", value: "x.xyz" },
        ],
      }),
    );
    const found = await store.lookup([
      UPI,
      { kind: "phone", value: "+919876543210" },
      { kind: "domain", value: "x.xyz" },
      { kind: "domain", value: "unknown.com" },
    ]);
    expect(found.map((f) => f.value).sort()).toEqual([
      "+919876543210",
      "customs.clear@ybl",
      "x.xyz",
    ]);
  });

  it("reports the most common scam type", async () => {
    await store.createReport(report({ reporterHash: "a", scamType: "parcel" }));
    await store.createReport(report({ reporterHash: "b", scamType: "kyc" }));
    await store.createReport(report({ reporterHash: "c", scamType: "kyc" }));
    expect((await store.lookup([UPI]))[0]?.scamType).toBe("kyc");
  });

  it("seeds phishing domains as high risk", async () => {
    const n = await store.upsertSeed([
      { kind: "domain", value: "evil.xyz", source: "seed", riskBand: "high" },
      { kind: "domain", value: "evil.xyz", source: "seed", riskBand: "high" },
    ]);
    expect(n).toBe(1);
    expect(await store.lookup([{ kind: "domain", value: "evil.xyz" }])).toEqual([
      {
        kind: "domain",
        value: "evil.xyz",
        reportCount: 0,
        riskBand: "high",
        source: "seed",
        scamType: null,
        review: null,
      },
    ]);
  });

  it("finds risky checks due for a 'Did you pay?' follow-up", async () => {
    const risky = await store.recordCheck({
      channel: "telegram",
      userHash: "u1",
      verdictBand: "high",
      scamType: "parcel",
      amountInr: 2999,
    });
    await store.recordCheck({
      channel: "telegram",
      userHash: "u1",
      verdictBand: "unknown",
      scamType: null,
      amountInr: null,
    });
    const future = new Date(Date.now() + 60_000);
    expect(await store.dueFollowups(future, 10)).toEqual([risky]);
    expect(await store.dueFollowups(new Date(Date.now() - 3_600_000), 10)).toEqual([]);

    await store.markFollowupSent(risky);
    expect(await store.dueFollowups(future, 10)).toEqual([]);
  });

  it("counts money protected only when the user did not pay", async () => {
    const a = await store.recordCheck({
      channel: "web",
      userHash: "u1",
      verdictBand: "high",
      scamType: "lottery",
      amountInr: 15_000,
    });
    const b = await store.recordCheck({
      channel: "web",
      userHash: "u2",
      verdictBand: "high",
      scamType: "lottery",
      amountInr: 5_000,
    });
    await store.setUserPaid(a, "u1", "no");
    await store.setUserPaid(b, "u2", "yes");
    expect(await store.stats()).toEqual({ checks: 2, reports: 0, moneyProtectedInr: 15_000 });
  });

  it("lets only the person who made a check answer 'Did you pay?'", async () => {
    const id = await store.recordCheck({
      channel: "web",
      userHash: "owner",
      verdictBand: "high",
      scamType: "lottery",
      amountInr: 9_000,
    });
    expect(await store.setUserPaid(id, "someone-else", "no")).toBe(false);
    expect((await store.stats()).moneyProtectedInr).toBe(0);
    expect(await store.setUserPaid(id, "owner", "no")).toBe(true);
    expect((await store.stats()).moneyProtectedInr).toBe(9_000);
  });

  it("deletes a user's data and their reports stop counting", async () => {
    await store.createReport(report({ reporterHash: "a" }));
    await store.createReport(report({ reporterHash: "b" }));
    await store.recordCheck({
      channel: "web",
      userHash: "a",
      verdictBand: "high",
      scamType: null,
      amountInr: null,
    });
    expect(await store.deleteUserData("a")).toEqual({ reports: 1, checks: 1, appeals: 0 });
    expect((await store.lookup([UPI]))[0]?.reportCount).toBe(1);
  });

  describe("appeals", () => {
    const appeal = (over: Partial<NewAppeal> = {}): NewAppeal => ({
      ...UPI,
      appellantHash: "owner",
      reason: "This is my shop's UPI ID; a customer who didn't get a refund reported it.",
      contact: "owner@example.com",
      ...over,
    });

    it("can't appeal something Sachet doesn't warn about", async () => {
      expect(await store.createAppeal(appeal())).toEqual({ ok: false, error: "not_listed" });
    });

    it("keeps one open appeal per identifier and shows it as under review", async () => {
      await store.createReport(report());
      const first = await store.createAppeal(appeal());
      expect(first.ok).toBe(true);
      expect(await store.createAppeal(appeal({ appellantHash: "x" }))).toEqual({
        ok: false,
        error: "already_open",
      });
      expect((await store.lookup([UPI]))[0]?.review).toBe("open");
    });

    it("lists open appeals with the newest reports for the reviewer", async () => {
      await store.createReport(report({ reporterHash: "a" }));
      await store.createReport(report({ reporterHash: "b", textRedacted: "second report" }));
      await store.createAppeal(appeal());
      const [a] = await store.listAppeals("open", 10);
      expect(a).toMatchObject({
        identifier: { ...UPI, reportCount: 2, riskBand: "unknown", source: "user" },
        contact: "owner@example.com",
        status: "open",
        resolvedAt: null,
      });
      expect(a!.recentReports.map((r) => r.textRedacted)).toEqual([
        "second report",
        "Pay customs duty to customs.clear@ybl",
      ]);
      expect(await store.listAppeals("upheld", 10)).toEqual([]);
    });

    it("upheld: earlier reports stop counting, later ones still count", async () => {
      for (const who of ["a", "b", "c"]) await store.createReport(report({ reporterHash: who }));
      const created = await store.createAppeal(appeal());
      if (!created.ok) throw new Error("appeal not created");

      expect(await store.resolveAppeal(created.appealId, "upheld", "honest shop")).toEqual(UPI);
      const [after] = await store.lookup([UPI]);
      expect(after).toMatchObject({ reportCount: 0, scamType: null, review: "cleared" });

      await store.createReport(report({ reporterHash: "d" }));
      expect((await store.lookup([UPI]))[0]?.reportCount).toBe(1);
    });

    it("upheld: a blocklist entry drops to unknown", async () => {
      const site = { kind: "domain", value: "fixed-shop.in" } as const;
      await store.upsertSeed([{ ...site, source: "seed", riskBand: "high" }]);
      const created = await store.createAppeal(appeal({ ...site }));
      if (!created.ok) throw new Error("appeal not created");
      await store.resolveAppeal(created.appealId, "upheld", null);
      expect((await store.lookup([site]))[0]).toMatchObject({ riskBand: "unknown" });
    });

    it("rejected: reports keep counting; the contact is dropped; it can't be decided twice", async () => {
      await store.createReport(report());
      const created = await store.createAppeal(appeal());
      if (!created.ok) throw new Error("appeal not created");
      await store.resolveAppeal(created.appealId, "rejected", "reports look genuine");
      expect(await store.resolveAppeal(created.appealId, "upheld", null)).toBeNull();

      expect((await store.lookup([UPI]))[0]).toMatchObject({ reportCount: 1, review: null });
      const [done] = await store.listAppeals("rejected", 10);
      expect(done).toMatchObject({ contact: null, decisionNote: "reports look genuine" });
      // Decided, so the owner can ask again.
      expect((await store.createAppeal(appeal())).ok).toBe(true);
    });

    it("'Delete my data' removes the appellant's appeals", async () => {
      await store.createReport(report());
      await store.createAppeal(appeal());
      expect(await store.deleteUserData("owner")).toEqual({ reports: 0, checks: 0, appeals: 1 });
      expect(await store.listAppeals("open", 10)).toEqual([]);
    });

    it("an unknown appeal id resolves to null", async () => {
      expect(await store.resolveAppeal(crypto.randomUUID(), "upheld", null)).toBeNull();
    });
  });

  it("answers ping", async () => {
    expect(await store.ping()).toBe(true);
  });
});

describe("migrate", () => {
  it("applies each migration once", async () => {
    const db = new PGlite();
    const sql: Sql = { query: (t, p) => db.query(t, p) as never, exec: (t) => db.exec(t) };
    expect(await migrate(sql)).toEqual([
      "001_init.sql",
      "002_android_channel.sql",
      "003_appeals.sql",
    ]);
    expect(await migrate(sql)).toEqual([]);
  });

  it("accepts the android channel and still rejects unknown ones", async () => {
    const db = new PGlite();
    const sql: Sql = { query: (t, p) => db.query(t, p) as never, exec: (t) => db.exec(t) };
    await migrate(sql);
    const insert = (channel: string) =>
      sql.query("INSERT INTO checks (channel, user_hash, verdict_band) VALUES ($1, 'u', 'high')", [
        channel,
      ]);
    await expect(insert("android")).resolves.toBeDefined();
    await expect(insert("ios")).rejects.toThrow(/check constraint/);
  });

  it("rejects a bad enum value through the CHECK constraint", async () => {
    const db = new PGlite();
    const sql: Sql = { query: (t, p) => db.query(t, p) as never, exec: (t) => db.exec(t) };
    await migrate(sql);
    await expect(
      sql.query("INSERT INTO identifiers (kind, value_norm) VALUES ('email', 'a@b.com')"),
    ).rejects.toThrow(/check constraint/);
  });
});

describe("parseFeed", () => {
  it("keeps phishing domains and skips platforms, comments and junk", () => {
    const feed = [
      "# URLhaus online URLs",
      "https://login.sbi-kyc-update.xyz/verify",
      "http://sbi-kyc-update.xyz/other",
      "https://sites.google.com/view/fake-bank",
      "https://raw.githubusercontent.com/x/y/main/a.exe",
      "http://103.21.45.67/bins/x",
      "https://scam-page.vercel.app/",
      "not a url",
      "",
    ].join("\n");
    expect(parseFeed(feed).map((e) => e.value)).toEqual([
      "sbi-kyc-update.xyz",
      "103.21.45.67",
      "scam-page.vercel.app",
    ]);
  });
});
