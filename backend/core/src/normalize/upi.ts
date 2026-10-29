import { fail, type NormalizeResult } from "./result.js";
import { cleanInput } from "./text.js";

// A UPI ID (VPA) is "name@handle", e.g. ramesh.k@okaxis or 9876543210@ybl.
// The handle names the payment app's bank and never contains a dot; that is
// how we tell a UPI ID apart from an email address like ramesh@gmail.com.
const UPI_RE = /^([a-z0-9][a-z0-9._-]{1,255})@([a-z][a-z0-9]{1,63})$/;

export function normalizeUpi(input: string): NormalizeResult {
  let text = cleanInput(input);

  // Accept a payment link (upi://pay?pa=x@ybl&am=2999) and read the payee.
  if (/^upi:\/\//i.test(text)) {
    const pa = new URLSearchParams(text.split("?")[1] ?? "").get("pa");
    if (!pa) return fail("upi", input, "UPI link has no payee (pa)");
    text = pa.trim();
  }

  text = text.toLowerCase();
  const match = UPI_RE.exec(text);
  if (!match) {
    const reason = /@[^@]*\./.test(text) ? "looks like an email, not a UPI ID" : "not a UPI ID";
    return fail("upi", input, reason);
  }

  return { ok: true, kind: "upi", value: text };
}
