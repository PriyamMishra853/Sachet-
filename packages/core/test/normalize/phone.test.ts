import { describe, expect, it } from "vitest";
import { normalizePhone } from "../../src/index.js";

describe("normalizePhone: accepts messy Indian numbers", () => {
  it.each([
    ["9876543210", "plain 10 digits"],
    ["+91 98765-43210", "plus, space and dash"],
    ["+91-98765-43210", "dashes"],
    ["(+91) 98765 43210", "brackets"],
    ["098765 43210", "leading trunk zero"],
    ["919876543210", "country code without plus"],
    ["0091 9876543210", "00 international prefix"],
    ["  98765\u00A043210  ", "non-breaking space and padding"],
    ["98765\u200B43210", "zero-width space pasted in"],
    ["९८७६५४३२१०", "Devanagari digits"],
    ["tel:+919876543210", "tel: link"],
    ["+91 98765.43210", "dot separator"],
  ])("%s (%s) -> +919876543210", (input) => {
    expect(normalizePhone(input)).toEqual({ ok: true, kind: "phone", value: "+919876543210" });
  });

  it("keeps a landline with its STD code", () => {
    expect(normalizePhone("0512 2259 012")).toMatchObject({ ok: true, value: "+915122259012" });
  });

  it("keeps a foreign number in its own country code", () => {
    expect(normalizePhone("+1 650 253 0000")).toMatchObject({ ok: true, value: "+16502530000" });
  });
});

describe("normalizePhone: rejects things that are not phone numbers", () => {
  it.each([
    ["", "empty"],
    ["call me", "no digits"],
    ["12345", "too short"],
    ["98765432101234", "too long"],
    ["₹2,999", "an amount"],
  ])("%j (%s)", (input) => {
    const result = normalizePhone(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.input).toBe(input);
  });
});
