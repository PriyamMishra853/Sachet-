import { describe, expect, it } from "vitest";
import {
  analyzeText,
  buildVerdict,
  formatVerdictCard,
  identifierBand,
  redact,
  type IdentifierLookup,
} from "../src/index.js";

const lookup = (over: Partial<IdentifierLookup> = {}): IdentifierLookup => ({
  kind: "upi",
  value: "customs.clear@ybl",
  reportCount: 0,
  storedBand: "unknown",
  source: null,
  ...over,
});

describe("identifierBand", () => {
  it.each([
    [0, "unknown"],
    [1, "medium"],
    [2, "medium"],
    [3, "high"],
    [14, "high"],
  ] as const)("%i reports -> %s", (reportCount, band) => {
    expect(identifierBand(lookup({ reportCount }))).toBe(band);
  });

  it("is high for a seeded phishing domain with no reports", () => {
    expect(identifierBand(lookup({ storedBand: "high", source: "seed" }))).toBe("high");
  });

  it("is high when Safe Browsing lists it", () => {
    expect(identifierBand(lookup({ safeBrowsingHit: true }))).toBe("high");
  });
});

describe("buildVerdict", () => {
  it("never says safe: unknown items get 'no reports' reason and advice", () => {
    const v = buildVerdict({ lookups: [lookup()] });
    expect(v.band).toBe("unknown");
    expect(v.reasons).toHaveLength(1);
    expect(v.reasons[0]!.en).toMatch(/No one has reported/);
    expect(JSON.stringify(v).toLowerCase()).not.toMatch(/"[^"]*\bis safe\b/);
  });

  it("always includes the 1930 helpline in both languages", () => {
    for (const v of [
      buildVerdict({}),
      buildVerdict({ lookups: [lookup({ reportCount: 5 })] }),
      buildVerdict({ text: analyzeText("You won KBC lottery, pay processing fee ₹5,000") }),
    ]) {
      expect(v.advice.some((a) => a.en.includes("1930") && a.hi.includes("1930"))).toBe(true);
    }
  });

  it("explains report counts", () => {
    const v = buildVerdict({ lookups: [lookup({ reportCount: 14 })] });
    expect(v.band).toBe("high");
    expect(v.reportCount).toBe(14);
    expect(v.reasons[0]!.en).toBe("This UPI ID was reported as a scam by 14 people.");
  });

  it("takes the worst band from the identifiers and the text", () => {
    const v = buildVerdict({
      lookups: [lookup({ reportCount: 1 })],
      text: analyzeText(
        "Your parcel is held. Customs duty ₹2,999 to customs.clear@ybl within 2 hours",
      ),
    });
    expect(v.band).toBe("high");
    expect(v.scamType).toBe("parcel");
    expect(v.advice.map((a) => a.en).join(" ")).toMatch(/Courier companies/);
  });

  it("lists warning signs when nothing is known about the sender", () => {
    const v = buildVerdict({ text: analyzeText("Send 500 rs immediately") });
    expect(v.reasons.map((r) => r.en)).toEqual(["Pushes you to act fast", "Asks you to pay money"]);
  });
});

describe("formatVerdictCard", () => {
  const v = buildVerdict({ lookups: [lookup({ reportCount: 14 })] });

  it("renders an English card", () => {
    const card = formatVerdictCard(v, "en");
    expect(card.startsWith("🔴 HIGH RISK")).toBe(true);
    expect(card).toContain("• This UPI ID was reported as a scam by 14 people.");
    expect(card).toContain("1930");
  });

  it("renders a Hindi card", () => {
    const card = formatVerdictCard(v, "hi");
    expect(card.startsWith("🔴 उच्च जोखिम")).toBe(true);
    expect(card).toContain("क्या करें:");
  });

  it("shows 'No reports yet' for unknown", () => {
    expect(formatVerdictCard(buildVerdict({}), "en").startsWith("⚪ NO REPORTS YET")).toBe(true);
  });
});

describe("redact", () => {
  it.each([
    ["Dear Ramesh Kumar, your account is blocked", "Dear [name], your account is blocked"],
    ["Dear Customer, your KYC expired", "Dear Customer, your KYC expired"],
    ["Your OTP is 482913", "Your OTP is [code]"],
    ["mail ramesh.k@gmail.com", "mail [email]"],
    ["Aadhaar 2345 6789 0123 linked", "Aadhaar [aadhaar] linked"],
    ["PAN ABCDE1234F", "PAN [pan]"],
    ["card 4111 1111 1111 1111", "card [card]"],
    ["a/c 123456789012 debited", "a/c [account] debited"],
    ["प्रिय रमेश, आपका खाता बंद", "प्रिय [name], आपका खाता बंद"],
  ])("%s", (input, expected) => {
    expect(redact(input)).toBe(expected);
  });

  it("keeps the scammer's number, UPI ID and link", () => {
    const text = "Pay to customs.clear@ybl or call 9876543210, see bit.ly/x";
    expect(redact(text)).toBe(text);
  });
});
