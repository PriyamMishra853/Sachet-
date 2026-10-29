import { isShortener, lookalikeBrand } from "./domains.js";
import type { Extracted } from "./extract.js";
import { claimsToBeOfficial, type SenderInfo } from "./sender.js";
import type { Text2 } from "./types.js";

// Warning signs that raise risk for any scam type. When Sachet knows nothing
// about a number or link, these are what it shows instead of saying "safe".

export const SIGNALS = [
  "urgency",
  "threat",
  "secrecy",
  "payment_demand",
  "otp_or_pin",
  "short_link",
  "apk",
  "lookalike_domain",
  "ip_link",
  // Only when the SMS sender is known (see sender.ts).
  "official_from_mobile",
  "foreign_number",
] as const;
export type Signal = (typeof SIGNALS)[number];

// The ones that mean "someone wants your money or access right now".
export const DANGER_SIGNALS: ReadonlySet<Signal> = new Set([
  "payment_demand",
  "otp_or_pin",
  "apk",
  "lookalike_domain",
  "ip_link",
]);

const URGENCY =
  /(?:within|in|next) \d+ ?(?:hours?|hrs?|minutes?|mins?|घंटे|मिनट)|\b(?:immediately|urgent(?:ly)?|asap|turant|jaldi|today only|last chance|aaj hi|right now)\b|तुरंत|फौरन|जल्दी|आज ही/;
const THREAT =
  /\b(?:arrest(?:ed)?|legal action|jail|police case|blocked|suspended|disconnected|penalty|fine|seized|freeze|frozen)\b|गिरफ्तार|जेल|कार्रवाई|ब्लॉक|बंद कर/;
const SECRECY =
  /(?:don'?t|do not|never) (?:tell|inform|share this with) (?:anyone|anybody|your family|family)|keep (?:this|it) (?:secret|confidential)|kisi ko (?:bhi )?(?:mat|na) bata|किसी को (?:भी )?(?:मत|न) बता/;
const PAYMENT =
  /(?:pay|send|transfer|deposit|bhej|bhejo|jama|bharo|भेजें|भेजो|जमा|भुगतान|भरें).{0,40}(?:₹|\brs\.?|\binr\b|rupees?|rupaye|upi|amount|fees?|charges?|\d{3,})/;
// English puts the verb first ("share the OTP"); Hindi and Hinglish put it
// last ("OTP bata do", "ओटीपी बताएं"), so we look for both orders.
const OTP_PIN =
  /(?:share|send|tell|give|forward|enter|bata\w*|bhej\w*|daal\w*|बता\w*|भेज\w*|डाल\w*).{0,25}(?:\botp\b|ओटीपी|\bpin\b|पिन|\bcvv\b)|(?:\botp\b|ओटीपी|\bpin\b|पिन|\bcvv\b).{0,20}(?:\bbata\w*|\bbhej\w*|\bshare\b|बता\w*|भेज\w*)/;
// "Do not share your OTP" / "OTP kisi ko mat batana" is a real bank's
// warning, not a request for it.
const NEGATION_BEFORE = /(?:\bnot|\bnever|n't|\bmat|\bna|\bnahi|\bnahin|मत|न|नहीं)\s*$/;
const NEGATION_INSIDE = /\b(?:not|never|mat|na|nahi|nahin)\b|n't|मत |न |नहीं/;
const APK = /\.apk\b/;

export function detectSignals(
  text: string,
  extracted: Extracted,
  sender: SenderInfo | null = null,
): Signal[] {
  const t = text.toLowerCase();
  const found = new Set<Signal>();

  if (URGENCY.test(t)) found.add("urgency");
  if (THREAT.test(t)) found.add("threat");
  if (SECRECY.test(t)) found.add("secrecy");
  if (PAYMENT.test(t) || (extracted.upis.length > 0 && extracted.amounts.length > 0)) {
    found.add("payment_demand");
  }
  if (matchesWithoutNegation(OTP_PIN, t)) found.add("otp_or_pin");
  if (APK.test(t)) found.add("apk");

  for (const link of extracted.links) {
    if (link.isIp) found.add("ip_link");
    else if (isShortener(link.domain)) found.add("short_link");
    else if (lookalikeBrand(link.domain)) found.add("lookalike_domain");
  }

  if (sender?.kind === "international") found.add("foreign_number");
  // "Your SBI account is blocked" from 98765 43210: real banks use registered names.
  if (sender && ["mobile", "international"].includes(sender.kind) && claimsToBeOfficial(t)) {
    found.add("official_from_mobile");
  }

  return SIGNALS.filter((s) => found.has(s));
}

function matchesWithoutNegation(re: RegExp, text: string): boolean {
  const global = new RegExp(re.source, "g");
  for (const m of text.matchAll(global)) {
    const before = text.slice(Math.max(0, m.index - 15), m.index);
    if (!NEGATION_BEFORE.test(before) && !NEGATION_INSIDE.test(m[0])) return true;
  }
  return false;
}

export const SIGNAL_TEXT: Record<Signal, Text2> = {
  urgency: { en: "Pushes you to act fast", hi: "जल्दी करने का दबाव डालता है" },
  threat: {
    en: "Threatens arrest, a block or a penalty",
    hi: "गिरफ्तारी, ब्लॉक या जुर्माने की धमकी देता है",
  },
  secrecy: { en: "Tells you to keep it secret", hi: "किसी को न बताने के लिए कहता है" },
  payment_demand: { en: "Asks you to pay money", hi: "पैसे भेजने के लिए कहता है" },
  otp_or_pin: {
    en: "Asks for an OTP, PIN or CVV",
    hi: "OTP, PIN या CVV मांगता है",
  },
  short_link: {
    en: "Uses a short link that hides the real website",
    hi: "छोटा लिंक इस्तेमाल करता है जो असली वेबसाइट छिपाता है",
  },
  apk: { en: "Asks you to install an .apk app file", hi: ".apk ऐप फाइल इंस्टॉल करने को कहता है" },
  lookalike_domain: {
    en: "Link pretends to be a well-known brand but isn't its real website",
    hi: "लिंक किसी जानी-मानी कंपनी जैसा दिखता है, पर उसकी असली वेबसाइट नहीं है",
  },
  ip_link: {
    en: "Link goes to a bare IP address, not a website name",
    hi: "लिंक किसी वेबसाइट नाम की जगह सीधे IP पते पर जाता है",
  },
  official_from_mobile: {
    en: "Claims to be a bank, company or government office, but came from an ordinary phone number",
    hi: "बैंक, कंपनी या सरकारी दफ्तर होने का दावा करता है, पर एक आम फोन नंबर से आया है",
  },
  foreign_number: {
    en: "Sent from a number outside India",
    hi: "भारत के बाहर के नंबर से भेजा गया है",
  },
};
