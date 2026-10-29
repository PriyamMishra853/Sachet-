import { describe, expect, it } from "vitest";
import { combineShared } from "../lib/share";

describe("combineShared", () => {
  it("uses WhatsApp's shared message as is", () => {
    expect(combineShared({ text: "Pay ₹2,999 to customs.clear@ybl" })).toBe(
      "Pay ₹2,999 to customs.clear@ybl",
    );
  });

  it("joins a title, text and link from a browser share", () => {
    expect(
      combineShared({ title: "SBI KYC", text: "Update now", url: "https://sbi-kyc.xyz" }),
    ).toBe("SBI KYC\nUpdate now\nhttps://sbi-kyc.xyz");
  });

  it("does not repeat a link that is already in the text", () => {
    expect(
      combineShared({ text: "Claim prize at https://kbc.xyz now", url: "https://kbc.xyz" }),
    ).toBe("Claim prize at https://kbc.xyz now");
  });

  it("drops a title that is just the start of the text", () => {
    expect(combineShared({ title: "Your parcel", text: "Your parcel is held" })).toBe(
      "Your parcel is held",
    );
  });

  it("ignores empty and missing fields", () => {
    expect(combineShared({ title: "  ", text: null, url: undefined })).toBe("");
  });

  it("caps very long shares at 4000 characters (the API limit)", () => {
    expect(combineShared({ text: "a".repeat(5000) })).toHaveLength(4000);
  });
});
