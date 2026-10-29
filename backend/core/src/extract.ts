import { normalizePhone } from "./normalize/phone.js";
import { cleanInput } from "./normalize/text.js";
import { normalizeUpi } from "./normalize/upi.js";
import { normalizeUrl } from "./normalize/url.js";

export type ExtractedLink = { domain: string; hostname: string; url: string; isIp: boolean };

export type Extracted = {
  phones: string[];
  upis: string[];
  links: ExtractedLink[];
  /** Rupee amounts mentioned in the text, e.g. "₹2,999" -> 2999. */
  amounts: number[];
};

// Order matters: we pull out the most specific things first and blank them
// out, so "customs.clear@ybl" is not also read as a link to "customs.clear",
// and the digits inside a link are not read as a phone number.
const EMAIL_OR_UPI_RE = /[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9.-]*[a-z0-9]/gi;
const UPI_LINK_RE = /upi:\/\/pay\?[^\s<>"']+/gi;
const URL_RE =
  /(?:(?:https?|hxxps?):\/\/[^\s<>"']+)|(?:\bwww\.[^\s<>"']+)|(?:\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:(?:\.|\[\.\])[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*(?:\.|\[\.\])[a-z]{2,}(?:\/[^\s<>"']*)?)/gi;
// A run of digits (with spaces, dashes, dots or brackets) that might be a phone.
const PHONE_RE = /(?:\+|\b00)?\(?\d[\d\s().-]{7,18}\d/g;
// Three ways Indians write money: "₹2,999" / "Rs. 5 lakh", "2999 rupaye" / "50,000/-",
// and a bare "25 lakh" or "2 crore" (always money in these messages).
const AMOUNT_RE =
  /(?:₹|\brs\.?|\binr)\s*(\d[\d,]*(?:\.\d{1,2})?)(?:\s*(lakh|lac|crore|cr|k)\b)?|\b(\d[\d,]*(?:\.\d{1,2})?)\s*(lakh|lac|crore|cr|k)?\s*(?:rupees?|rupaye|rupay|रुपये|रुपए|\/-)|\b(\d[\d,]*(?:\.\d{1,2})?)\s*(lakh|lac|crore)\b/gi;

const MULTIPLIER: Record<string, number> = {
  k: 1_000,
  lakh: 100_000,
  lac: 100_000,
  crore: 10_000_000,
  cr: 10_000_000,
};

export function extract(input: string): Extracted {
  let text = cleanInput(input);
  const phones = new Set<string>();
  const upis = new Set<string>();
  const links = new Map<string, ExtractedLink>();
  const amounts: number[] = [];

  // Amounts first, from the untouched text, because "₹2,999" must not
  // become a phone number later.
  for (const m of text.matchAll(AMOUNT_RE)) {
    const raw = m[1] ?? m[3] ?? m[5];
    const unit = (m[2] ?? m[4] ?? m[6])?.toLowerCase();
    if (!raw) continue;
    const value = Number(raw.replace(/,/g, "")) * (unit ? (MULTIPLIER[unit] ?? 1) : 1);
    if (Number.isFinite(value) && value > 0) amounts.push(Math.round(value));
  }
  text = text.replace(AMOUNT_RE, " ");

  text = text.replace(UPI_LINK_RE, (link) => {
    const upi = normalizeUpi(link);
    if (upi.ok) upis.add(upi.value);
    return " ";
  });

  text = text.replace(EMAIL_OR_UPI_RE, (token) => {
    const upi = normalizeUpi(token);
    if (upi.ok) upis.add(upi.value);
    return " "; // emails are dropped: they are personal data, not V1 identifiers
  });

  text = text.replace(URL_RE, (token) => {
    const link = normalizeUrl(token);
    if (!link.ok) return token; // e.g. "Mr.Sharma": not a real domain, leave it
    if (!links.has(link.url)) {
      links.set(link.url, {
        domain: link.value,
        hostname: link.hostname,
        url: link.url,
        isIp: link.isIp,
      });
    }
    return " ";
  });

  for (const m of text.matchAll(PHONE_RE)) {
    // Ignore a leading "00" (international prefix) when counting digits.
    const digits = m[0].replace(/^\s*00/, "").replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) continue;
    const phone = normalizePhone(m[0]);
    if (phone.ok) phones.add(phone.value);
  }

  return { phones: [...phones], upis: [...upis], links: [...links.values()], amounts };
}
