import { describe, expect, it } from "vitest";
import { normalizeUpi } from "../../src/index.js";

describe("normalizeUpi: accepts UPI IDs", () => {
  it.each([
    ["customs.clear@ybl", "customs.clear@ybl"],
    ["Customs.Clear@YBL", "customs.clear@ybl"],
    ["  ramesh_k@okaxis ", "ramesh_k@okaxis"],
    ["9876543210@paytm", "9876543210@paytm"],
    ["refund-desk@axl", "refund-desk@axl"],
    ["upi://pay?pa=customs.clear@ybl&pn=Customs&am=2999", "customs.clear@ybl"],
    ["UPI://pay?pn=X&pa=Fraud.Guy@oksbi", "fraud.guy@oksbi"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeUpi(input)).toEqual({ ok: true, kind: "upi", value: expected });
  });
});

describe("normalizeUpi: rejects non-UPI text", () => {
  it.each([
    ["ramesh@gmail.com", "looks like an email, not a UPI ID"],
    ["ramesh", "not a UPI ID"],
    ["@ybl", "not a UPI ID"],
    ["a@ybl", "not a UPI ID"],
    ["ramesh@@ybl", "not a UPI ID"],
    ["ram esh@ybl", "not a UPI ID"],
    ["ramesh@9bank", "not a UPI ID"],
    ["upi://pay?pn=NoPayee&am=10", "UPI link has no payee (pa)"],
  ])("%j -> %s", (input, reason) => {
    expect(normalizeUpi(input)).toEqual({ ok: false, kind: "upi", input, reason });
  });
});
