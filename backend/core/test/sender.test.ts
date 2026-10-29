import { describe, expect, it } from "vitest";
import { analyzeText, buildVerdict, classifySender, formatVerdictCard } from "../src/index.js";

describe("classifySender", () => {
  it.each([
    ["VM-HDFCBK-P", "promotional", "HDFCBK"],
    ["AD-SBIINB-S", "service", "SBIINB"],
    ["JD-ICICIT-T", "transactional", "ICICIT"],
    ["VK-UIDAI-G", "government", "UIDAI"],
    ["bz-amazon-p", "promotional", "AMAZON"],
    ["VM HDFCBK S", "service", "HDFCBK"],
    ["VM-HDFCBK", "business", "HDFCBK"],
    ["HDFCBK", "business", "HDFCBK"],
    ["VM-650011", "promotional", "650011"],
  ] as const)("%s is a %s sender", (raw, kind, value) => {
    expect(classifySender(raw)).toMatchObject({ kind, value });
  });

  it("reads Indian and foreign numbers", () => {
    expect(classifySender("+91 98765 43210")).toMatchObject({
      kind: "mobile",
      value: "+919876543210",
    });
    expect(classifySender("09876543210")).toMatchObject({ kind: "mobile" });
    expect(classifySender("+92 300 1234567")).toMatchObject({ kind: "international" });
  });

  it("gives up on things it can't read", () => {
    expect(classifySender("")).toBeNull();
    expect(classifySender("Mom")).toBeNull();
    expect(classifySender("Ramesh")).toBeNull();
    expect(classifySender("12345")).toBeNull();
    expect(classifySender("x".repeat(50))).toBeNull();
  });

  it("has every label and note in both languages", () => {
    for (const raw of ["VM-A1B2C3-P", "VM-ABCDEF-S", "VM-ABCDEF-T", "VM-ABCDEF-G", "ABCDEF"]) {
      const s = classifySender(raw)!;
      expect(s.label.hi).toBeTruthy();
      expect(s.note.hi).toBeTruthy();
    }
  });
});

describe("messages with a known sender", () => {
  const KYC = "Dear customer, your SBI account KYC is pending. Update now: sbi-kyc.xyz";

  it("flags a bank message sent from an ordinary number", () => {
    const a = analyzeText(KYC, { sender: "9876543210" });
    expect(a.signals).toContain("official_from_mobile");
    expect(a.sender?.kind).toBe("mobile");
  });

  it("does not flag the same words from a registered sender", () => {
    const a = analyzeText(KYC, { sender: "VM-SBIINB-S" });
    expect(a.signals).not.toContain("official_from_mobile");
  });

  it("never lowers the risk because a registered name sent it", () => {
    const scam = "Your parcel is held by customs. Pay ₹2,999 to customs.clear@ybl within 2 hours.";
    expect(analyzeText(scam, { sender: "VM-INDPST-G" }).band).toBe(analyzeText(scam).band);
    expect(analyzeText(scam, { sender: "VM-INDPST-G" }).band).toBe("high");
  });

  it("flags a foreign number even for a friendly-looking message", () => {
    const a = analyzeText("Hi, earn ₹3000 daily from home by liking videos", {
      sender: "+84 912 345 678",
    });
    expect(a.signals).toContain("foreign_number");
  });

  it("is the same as before when no sender is given", () => {
    expect(analyzeText(KYC).sender).toBeNull();
    expect(analyzeText(KYC).signals).not.toContain("official_from_mobile");
  });

  it("labels an ad as promotional on the bot card, in Hindi too", () => {
    const v = buildVerdict({
      text: analyzeText("Flat 50% off on shoes this weekend! Shop now at myntra.com", {
        sender: "VM-MYNTRA-P",
      }),
    });
    expect(v.sender?.kind).toBe("promotional");
    expect(formatVerdictCard(v, "en")).toContain("Sender: Promotional (marketing) SMS");
    expect(formatVerdictCard(v, "hi")).toContain("भेजने वाला: प्रचार (मार्केटिंग) SMS");
    // Still not a clean chit.
    expect(v.band).not.toBe("low");
  });
});

describe("cybercrime.gov.in suspect search", () => {
  const mentionsPortal = (advice: { en: string }[]) =>
    advice.some((a) => a.en.includes("Report & Check Suspect"));

  it("is suggested when a number or UPI ID is involved", () => {
    expect(
      mentionsPortal(buildVerdict({ text: analyzeText("Pay ₹500 to win.big@ybl") }).advice),
    ).toBe(true);
    const lookup = {
      kind: "phone" as const,
      value: "+919876543210",
      reportCount: 0,
      storedBand: "unknown" as const,
      source: null,
    };
    expect(mentionsPortal(buildVerdict({ lookups: [lookup] }).advice)).toBe(true);
  });

  it("is not suggested for a link alone, and 1930 always stays last", () => {
    const v = buildVerdict({ text: analyzeText("Claim your prize at bit.ly/xyz") });
    expect(mentionsPortal(v.advice)).toBe(false);
    expect(v.advice.at(-1)?.en).toContain("1930");
  });
});
