import { describe, expect, it } from "vitest";
import { createMemoryCache } from "../src/cache.js";
import { RDAP_BOOTSTRAP_URL, createDomainAge } from "../src/services/domain-age.js";
import { makeTestApp } from "./helpers.js";

const NOW = Date.parse("2026-10-31T00:00:00Z");
const BOOTSTRAP = {
  services: [
    [["xyz"], ["https://rdap.centralnic.com/xyz/"]],
    [["in"], ["http://insecure.example/", "https://rdap.nixiregistry.in/rdap/"]],
    [["com", "net"], ["https://rdap.verisign.com/com/v1"]],
  ],
};

// A fake internet: IANA's list plus registries that answer from `registered`.
function fakeRdap(registered: Record<string, string | 404 | 500>, opts: { slowMs?: number } = {}) {
  const calls: string[] = [];
  const fetchFn = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    if (opts.slowMs) await new Promise((r) => setTimeout(r, opts.slowMs));
    if (url === RDAP_BOOTSTRAP_URL) return Response.json(BOOTSTRAP);
    const domain = url.split("/domain/")[1]!;
    const answer = registered[domain];
    if (answer === undefined || answer === 404) return new Response("", { status: 404 });
    if (answer === 500) return new Response("", { status: 500 });
    return Response.json({
      events: [
        { eventAction: "last changed", eventDate: "2026-10-30T00:00:00Z" },
        { eventAction: "registration", eventDate: answer },
      ],
    });
  }) as typeof fetch;
  return { fetchFn, calls };
}

const make = (rdap: ReturnType<typeof fakeRdap>, timeoutMs = 1000) => {
  const errors: unknown[] = [];
  const domainAge = createDomainAge({
    cache: createMemoryCache(() => NOW),
    fetchFn: rdap.fetchFn,
    now: () => NOW,
    timeoutMs,
    onError: (e) => errors.push(e),
  });
  return { domainAge, errors };
};

describe("domain age (RDAP)", () => {
  it("gives days since registration, asking the right registry", async () => {
    const rdap = fakeRdap({
      "sbi-rewards.xyz": "2026-10-28T09:00:00Z",
      "example.co.in": "2002-10-30T19:05:33.000Z",
      "oldshop.com": "2010-01-01T00:00:00Z",
    });
    const { domainAge } = make(rdap);
    const ages = await domainAge.check(["sbi-rewards.xyz", "example.co.in", "oldshop.com"]);
    expect(ages.get("sbi-rewards.xyz")).toBe(2);
    expect(ages.get("example.co.in")).toBeGreaterThan(8000);
    expect(rdap.calls).toContain("https://rdap.centralnic.com/xyz/domain/sbi-rewards.xyz");
    // Only the https server is used, and a missing "/" is added.
    expect(rdap.calls).toContain("https://rdap.nixiregistry.in/rdap/domain/example.co.in");
    expect(rdap.calls).toContain("https://rdap.verisign.com/com/v1/domain/oldshop.com");
  });

  it("remembers answers, including 'not found', and downloads IANA's list once", async () => {
    const rdap = fakeRdap({ "new-site.xyz": "2026-10-30T00:00:00Z" });
    const { domainAge } = make(rdap);
    await domainAge.check(["new-site.xyz", "gone.xyz"]);
    const before = rdap.calls.length;
    const again = await domainAge.check(["new-site.xyz", "gone.xyz"]);
    expect(again.get("new-site.xyz")).toBe(1);
    expect(again.has("gone.xyz")).toBe(false);
    expect(rdap.calls.length).toBe(before);
    expect(rdap.calls.filter((u) => u === RDAP_BOOTSTRAP_URL)).toHaveLength(1);
  });

  it("does not remember a registry error", async () => {
    const rdap = fakeRdap({ "flaky.xyz": 500 });
    const { domainAge, errors } = make(rdap);
    expect((await domainAge.check(["flaky.xyz"])).size).toBe(0);
    await domainAge.check(["flaky.xyz"]);
    expect(rdap.calls.filter((u) => u.endsWith("/flaky.xyz"))).toHaveLength(2);
    expect(errors).toHaveLength(2);
  });

  it("skips names whose age means nothing, without asking anyone", async () => {
    const rdap = fakeRdap({});
    const { domainAge } = make(rdap);
    const ages = await domainAge.check([
      "bit.ly",
      "google.com",
      "103.21.45.67",
      "scam-page.vercel.app",
      "incometax.gov.in",
    ]);
    expect(ages.size).toBe(0);
    expect(rdap.calls).toEqual([]);
  });

  it("asks about at most 3 names per check", async () => {
    const rdap = fakeRdap({});
    const { domainAge } = make(rdap);
    await domainAge.check(["a1.xyz", "a2.xyz", "a3.xyz", "a4.xyz", "a5.xyz"]);
    expect(rdap.calls.filter((u) => u.includes("/domain/"))).toHaveLength(3);
  });

  it("gives up after the deadline instead of holding up the answer", async () => {
    const rdap = fakeRdap({ "slow.xyz": "2026-10-30T00:00:00Z" }, { slowMs: 300 });
    const { domainAge } = make(rdap, 100);
    const started = Date.now();
    expect((await domainAge.check(["slow.xyz"])).size).toBe(0);
    expect(Date.now() - started).toBeLessThan(450);
  });

  it("fails open when IANA's list can't be downloaded", async () => {
    const fetchFn = (async () => new Response("", { status: 503 })) as typeof fetch;
    const errors: unknown[] = [];
    const domainAge = createDomainAge({
      cache: createMemoryCache(),
      fetchFn,
      onError: (e) => errors.push(e),
    });
    expect((await domainAge.check(["x.xyz"])).size).toBe(0);
    // Not retried on every check.
    await domainAge.check(["x.xyz"]);
    expect(errors).toHaveLength(1);
  });
});

describe("checks with a new website", () => {
  it("warns that a link's website is days old", async () => {
    const { app, ageCalls } = makeTestApp({ domainAges: { "sbi-rewards.xyz": 3 } });
    const res = await app.inject({ url: "/v1/check?type=url&value=https://sbi-rewards.xyz/claim" });
    const body = res.json();
    expect(body.band).toBe("medium");
    expect(body.reasons[0].en).toBe(
      "This website (sbi-rewards.xyz) was registered 3 days ago. Scam websites are usually new.",
    );
    expect(ageCalls).toEqual([["sbi-rewards.xyz"]]);
  });

  it("says nothing about an old website and never asks about phones or UPI IDs", async () => {
    const { app, ageCalls } = makeTestApp({ domainAges: { "oldshop.com": 4000 } });
    const res = await app.inject({
      method: "POST",
      url: "/v1/check/message",
      payload: { text: "Order from oldshop.com, call 9876543210 or pay oldshop@ybl" },
    });
    expect(
      res
        .json()
        .reasons.map((r: { en: string }) => r.en)
        .join(" "),
    ).not.toMatch(/registered/);
    expect(ageCalls).toEqual([["oldshop.com"]]);
  });
});
