import { describe, expect, it } from "vitest";
import {
  analyzeText,
  buildVerdict,
  formatVerdictCard,
  identifierBand,
  redact,
  registrationLookupDomain,
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

describe("newly registered websites", () => {
  const site = (domainAgeDays: number | null) =>
    lookup({ kind: "domain", value: "sbi-rewards.xyz", domainAgeDays });

  it.each([
    [0, "medium"],
    [29, "medium"],
    [30, "unknown"],
    [4000, "unknown"],
    [null, "unknown"],
  ] as const)("%s days old -> %s", (age, band) => {
    expect(identifierBand(site(age))).toBe(band);
  });

  it("says how new it is, in both languages", () => {
    const v = buildVerdict({ lookups: [site(3)] });
    expect(v.reasons[0]).toEqual({
      en: "This website (sbi-rewards.xyz) was registered 3 days ago. Scam websites are usually new.",
      hi: "यह वेबसाइट (sbi-rewards.xyz) 3 दिन पहले ही बनी है। धोखाधड़ी वाली वेबसाइटें अक्सर नई होती हैं।",
    });
    expect(buildVerdict({ lookups: [site(0)] }).reasons[0]!.en).toContain("registered today");
  });

  it("never lowers a high band", () => {
    expect(identifierBand({ ...site(4000), reportCount: 3 })).toBe("high");
  });

  it.each([
    ["sbi-kyc-update.xyz", "sbi-kyc-update.xyz"],
    ["mail.example.co.in", "example.co.in"],
    ["bit.ly", null],
    ["103.21.45.67", null],
    ["google.com", null],
    ["scam-page.vercel.app", null],
    ["onlinesbi.sbi", null],
    ["incometax.gov.in", null],
  ] as const)("looks up %s as %s", (domain, expected) => {
    expect(registrationLookupDomain(domain)).toBe(expected);
  });
});

describe("AI second opinion", () => {
  const plain = analyzeText("Hello, your order is ready. Please collect it from the counter.");

  it("raises a quiet message to medium with the AI's scam type", () => {
    const v = buildVerdict({
      text: plain,
      ai: { scam: true, scamType: "parcel", confidence: "high" },
    });
    expect(v.band).toBe("medium");
    expect(v.scamType).toBe("parcel");
    expect(v.reasons.at(-1)).toEqual({
      en: "An AI check also reads this as a likely courier / customs parcel scam.",
      hi: "AI जांच भी इसे संभावित कूरियर / कस्टम पार्सल धोखाधड़ी मानती है।",
    });
  });

  it("is ignored when unsure, and never lowers or clears a verdict", () => {
    expect(
      buildVerdict({ text: plain, ai: { scam: true, scamType: null, confidence: "low" } }).band,
    ).toBe("unknown");
    const scam = analyzeText("Your parcel is held by customs. Pay ₹2,999 to customs.clear@ybl now");
    const v = buildVerdict({
      text: scam,
      ai: { scam: false, scamType: null, confidence: "high" },
    });
    expect(v.band).toBe("high");
    expect(v.reasons.map((r) => r.en).join(" ")).not.toMatch(/AI check/);
  });

  it("can't make anything high risk on its own", () => {
    const v = buildVerdict({
      text: plain,
      ai: { scam: true, scamType: "digital_arrest", confidence: "high" },
    });
    expect(v.band).toBe("medium");
  });
});

describe("owner reviews", () => {
  it("says a review is pending but keeps the band", () => {
    const v = buildVerdict({ lookups: [lookup({ reportCount: 3, review: "open" })] });
    expect(v.band).toBe("high");
    expect(v.reasons.map((r) => r.en)).toContain(
      "Its owner says these reports are wrong. Sachet is reviewing them.",
    );
  });

  it("explains a cleared identifier and still never says safe", () => {
    const v = buildVerdict({ lookups: [lookup({ review: "cleared" })] });
    expect(v.band).toBe("unknown");
    expect(v.reasons[0]!.en).toMatch(/set aside after a review/);
    expect(v.reasons[0]!.hi).toBeTruthy();
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
