import { parsePhoneNumberFromString } from "libphonenumber-js";
import { fail, type NormalizeResult } from "./result.js";
import { cleanInput } from "./text.js";

// Turns any way a phone number is written into E.164 (+919876543210), so
// "098765 43210", "+91-98765-43210" and "९८७६५४३२१०" all hit the same row.
// Numbers without a country code are assumed to be Indian.
export function normalizePhone(input: string): NormalizeResult {
  let text = cleanInput(input).replace(/^tel:/i, "");
  if (!/\d/.test(text)) return fail("phone", input, "no digits");

  // "00" is the international prefix when dialling from India.
  text = text.replace(/^00(?=[1-9])/, "+");

  // "919876543210" (12 digits, no plus) is an Indian number with the country
  // code typed but the "+" left out; without this fix it reads as invalid.
  const digitsOnly = text.replace(/\D/g, "");
  if (!text.startsWith("+") && digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    text = `+${digitsOnly}`;
  }

  const parsed = parsePhoneNumberFromString(text, "IN");
  if (!parsed || !parsed.isValid()) return fail("phone", input, "not a valid phone number");
  // Every Indian number (mobile or landline with STD code) is 10 digits after
  // +91. Without this, a 12-digit Aadhaar number can slip through as a phone.
  if (parsed.countryCallingCode === "91" && parsed.nationalNumber.length !== 10) {
    return fail("phone", input, "Indian numbers have 10 digits");
  }

  return { ok: true, kind: "phone", value: parsed.number };
}
