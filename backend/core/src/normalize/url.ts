import { parse } from "tldts";
import { fail, type NormalizeResult } from "./result.js";
import { cleanInput } from "./text.js";

export type UrlExtra = {
  /** Full host, e.g. "sbi.kyc-update.xyz". */
  hostname: string;
  /** Cleaned URL with scheme, e.g. "https://bit.ly/x". */
  url: string;
  isIp: boolean;
};

// Reduces a link to its registered domain ("login.sbi-kyc.xyz/a?b" -> "sbi-kyc.xyz"),
// because scammers rotate sub-domains and paths but pay for the domain itself.
// `value` is what we store and look up; hostname and url are kept for display
// and for the Safe Browsing check, which wants the full URL.
export function normalizeUrl(input: string): NormalizeResult<UrlExtra> {
  // Strip brackets and punctuation that come from the sentence around a link.
  let text = refang(cleanInput(input))
    .replace(/^[(<["']+/, "")
    .replace(/[)>\].,;:!?'"]+$/, "");
  if (!text) return fail("domain", input, "empty");
  if (/\s/.test(text)) return fail("domain", input, "contains spaces");

  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = `http://${text}`;

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return fail("domain", input, "not a valid link");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return fail("domain", input, `unsupported link type ${url.protocol}`);
  }

  // URL() already lower-cases the host and converts Unicode look-alike
  // domains to punycode (xn--...), which is what we want to store.
  const hostname = url.hostname.replace(/\.$/, "");
  // allowPrivateDomains: on free hosts like github.io or vercel.app every
  // sub-domain has a different owner, so "scam.vercel.app" is the domain,
  // not "vercel.app" (which would flag every site hosted there).
  const info = parse(hostname, { allowPrivateDomains: true });

  if (info.isIp) {
    return { ok: true, kind: "domain", value: hostname, hostname, url: url.href, isIp: true };
  }
  if (!info.domain || !(info.isIcann || info.isPrivate)) {
    return fail("domain", input, "no known top-level domain");
  }

  return { ok: true, kind: "domain", value: info.domain, hostname, url: url.href, isIp: false };
}

// Security people "defang" links so they can't be clicked: hxxps://evil[.]com.
// Users forward those too, so turn them back into real links.
function refang(text: string): string {
  return text
    .replace(/^hxxp(s?):\/\//i, "http$1://")
    .replace(/\[\.\]|\(\.\)|\{\.\}/g, ".")
    .replace(/\[:\]/g, ":");
}
