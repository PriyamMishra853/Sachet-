import { describe, expect, it } from "vitest";
import { analyzeText, detectSignals, extract, lookalikeBrand } from "../src/index.js";
import { evaluate } from "../scripts/eval.js";
import messages from "../../../data/test-messages/messages.json";

describe("analyzeText", () => {
  it("flags the digital arrest + payment example from the plan as high risk", () => {
    const a = analyzeText(
      "CBI officer here. You are under digital arrest. Transfer ₹50,000 now and don't tell anyone.",
    );
    expect(a.band).toBe("high");
    expect(a.scamType).toBe("digital_arrest");
    expect(a.signals).toEqual(expect.arrayContaining(["payment_demand", "secrecy"]));
  });

  it("says unknown (never safe) for a normal family message", () => {
    const a = analyzeText("Beta, dinner ready hai, jaldi ghar aao");
    expect(a.band).toBe("unknown");
    expect(a.scamType).toBeNull();
  });

  it("does not flag a bank's 'do not share your OTP' warning", () => {
    const a = analyzeText("Your OTP is 482913. Do not share it with anyone. -SBI");
    expect(a.signals).not.toContain("otp_or_pin");
    expect(a.band).toBe("unknown");
  });

  it("does not flag 'OTP kisi ko mat batana' (Hinglish warning)", () => {
    expect(analyzeText("OTP kisi ko mat batana").signals).not.toContain("otp_or_pin");
  });

  it("flags a request for the OTP in Hinglish word order", () => {
    const a = analyzeText("Bhaiya OTP bata do jo abhi aaya");
    expect(a.signals).toContain("otp_or_pin");
    expect(a.scamType).toBe("fake_support");
  });

  it("needs more than topic words: a real electricity bill is not flagged", () => {
    const a = analyzeText(
      "Your electricity bill of Rs 1,240 is generated. Pay on the official app.",
    );
    expect(a.band).toBe("unknown");
  });

  it("returns warning signs even when no scam type matches", () => {
    const a = analyzeText("Send 500 rs immediately");
    expect(a.scamType).toBeNull();
    expect(a.signals).toEqual(["urgency", "payment_demand"]);
    expect(a.band).toBe("medium");
  });
});

describe("detectSignals: links", () => {
  const signalsFor = (text: string) => detectSignals(text, extract(text));

  it("spots short links", () => {
    expect(signalsFor("open bit.ly/abc")).toContain("short_link");
  });

  it("spots look-alike brand domains", () => {
    expect(signalsFor("login at sbi-kyc-update.xyz")).toContain("lookalike_domain");
  });

  it("does not call the real SBI site a look-alike", () => {
    expect(signalsFor("visit https://sbi.co.in")).not.toContain("lookalike_domain");
  });

  it("spots links to bare IP addresses and .apk files", () => {
    expect(signalsFor("get http://103.21.45.67/x and install app.apk")).toEqual(
      expect.arrayContaining(["ip_link", "apk"]),
    );
  });
});

describe("lookalikeBrand", () => {
  it.each([
    ["sbi-kyc-update.xyz", "sbi"],
    ["hdfcbank-secure.top", "hdfc"],
    ["paytmreward.in", "paytm"],
    ["sbi.co.in", null],
    ["incometax.gov.in", null],
    ["bobcatgear.com", null],
    ["example.com", null],
  ])("%s -> %s", (domain, brand) => {
    expect(lookalikeBrand(domain)).toBe(brand);
  });
});

describe("labelled test set (V1 baseline)", () => {
  const r = evaluate(messages);

  it("has 50+ scam and 20+ normal messages", () => {
    expect(r.scams).toBeGreaterThanOrEqual(50);
    expect(r.normals).toBeGreaterThanOrEqual(20);
  });

  // Regression guard: a rule change that drops below these fails CI.
  it("catches at least 90% of scams", () => {
    expect(r.hitRate).toBeGreaterThanOrEqual(0.9);
  });

  it("flags at most 10% of normal messages", () => {
    expect(r.falseAlarmRate).toBeLessThanOrEqual(0.1);
  });
});
