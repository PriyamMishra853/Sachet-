import { describe, expect, it } from "vitest";
import { normalizeUrl } from "../../src/index.js";

describe("normalizeUrl: reduces links to the registered domain", () => {
  it.each([
    ["HTTPS://Bit.ly/x", "bit.ly"],
    ["bit.ly/3xYz", "bit.ly"],
    ["www.sbi.co.in", "sbi.co.in"],
    ["https://login.sbi-kyc-update.xyz/verify?id=1", "sbi-kyc-update.xyz"],
    ["sbi-kyc-update.xyz", "sbi-kyc-update.xyz"],
    ["http://onlinesbi.sbi.bank.in/", "sbi.bank.in"],
    ["https://indiapost.gov.in/track", "indiapost.gov.in"],
    ["https://example.com:8443/a", "example.com"],
    ["https://user:pass@example.com/", "example.com"],
    ["example.com.", "example.com"],
    ["(https://example.com/offer).", "example.com"],
    ['"bit.ly/abc"', "bit.ly"],
    ["https://evil.com/a,", "evil.com"],
    ["hxxps://evil[.]com/login", "evil.com"],
    ["evil(.)co(.)in", "evil.co.in"],
    ["https://scam.github.io/page", "scam.github.io"],
    ["sbi-kyc-update.vercel.app/login", "sbi-kyc-update.vercel.app"],
    ["https://kbc-lottery.blogspot.com", "kbc-lottery.blogspot.com"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeUrl(input)).toMatchObject({ ok: true, kind: "domain", value: expected });
  });

  it("keeps the full hostname and URL for display and Safe Browsing", () => {
    expect(normalizeUrl("Login.SBI-kyc.xyz/Path?q=1")).toEqual({
      ok: true,
      kind: "domain",
      value: "sbi-kyc.xyz",
      hostname: "login.sbi-kyc.xyz",
      url: "http://login.sbi-kyc.xyz/Path?q=1",
      isIp: false,
    });
  });

  it("converts Unicode look-alike domains to punycode", () => {
    // Cyrillic "а" instead of Latin "a": looks like paytm.com, isn't.
    const result = normalizeUrl("https://pаytm.com");
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.value.startsWith("xn--")).toBe(true);
  });

  it("flags bare IP addresses", () => {
    expect(normalizeUrl("http://192.168.1.10/pay")).toMatchObject({
      ok: true,
      value: "192.168.1.10",
      isIp: true,
    });
  });
});

describe("normalizeUrl: rejects things that are not web links", () => {
  it.each([
    ["", "empty"],
    ["hello", "no known top-level domain"],
    ["KYC_update.apk", "no known top-level domain"],
    ["two words.com", "contains spaces"],
    ["ftp://files.example.com", "unsupported link type ftp:"],
    ["javascript://alert(1)", "unsupported link type javascript:"],
    ["http://", "not a valid link"],
  ])("%j -> %s", (input, reason) => {
    expect(normalizeUrl(input)).toEqual({ ok: false, kind: "domain", input, reason });
  });
});
