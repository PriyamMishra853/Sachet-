import { normalizePhone } from "./normalize/index.js";
import type { Text2 } from "./types.js";

// Who sent an SMS, read from what the phone shows as the sender.
//
// Businesses in India must register their SMS sender names with TRAI. The
// phone shows them as e.g. "VM-HDFCBK-S": a 2-letter operator/circle code,
// the registered name, and (since 2025) a letter for the kind of message:
//   -P promotional (ads), -S service, -T transactional (OTPs, payments),
//   -G government.
// An ordinary 10-digit number is a person (or a scammer with a SIM card).
//
// This is information, never a clean chit: Sachet does not lower the risk
// because a registered name sent it. It only raises it when a message that
// claims to be a bank or office comes from an ordinary number.

export const SENDER_KINDS = [
  "promotional",
  "service",
  "transactional",
  "government",
  "business",
  "mobile",
  "international",
] as const;
export type SenderKind = (typeof SENDER_KINDS)[number];

export type SenderInfo = {
  kind: SenderKind;
  /** Registered name ("HDFCBK") or the number in +91 form. */
  value: string;
  label: Text2;
  note: Text2;
};

const SUFFIX: Record<string, SenderKind> = {
  P: "promotional",
  S: "service",
  T: "transactional",
  G: "government",
};

// Optional operator/circle prefix, the registered name, optional suffix.
const HEADER = /^(?:[A-Z]{2}[-\s])?([A-Z0-9]{3,9})(?:[-\s]([PSTG]))?$/;
// A name alone, with no prefix or suffix, must look exactly like a phone
// shows it (6 capitals or digits), so a contact called "Mom" or "Ramesh"
// isn't taken for a company.
const BARE_HEADER = /^[A-Z0-9]{6}$/;

const REGISTERED_NOTE: Text2 = {
  en: "Sent with a TRAI-registered sender name. Scammers find these harder to get, but it is not a guarantee: still don't pay or share an OTP because of a message.",
  hi: "TRAI में रजिस्टर्ड भेजने वाले नाम से आया है। धोखेबाज़ों को ये नाम मिलना मुश्किल होता है, पर यह गारंटी नहीं है: फिर भी किसी मैसेज के कहने पर पैसे न भेजें या OTP न बताएं।",
};

const INFO: Record<SenderKind, { label: Text2; note: Text2 }> = {
  promotional: {
    label: { en: "Promotional (marketing) SMS", hi: "प्रचार (मार्केटिंग) SMS" },
    note: {
      en: "This is an advertisement from a registered business. The offer may be real, but never pay in advance or share an OTP because of an ad.",
      hi: "यह किसी रजिस्टर्ड कंपनी का विज्ञापन है। ऑफ़र असली हो सकता है, पर विज्ञापन के कहने पर कभी पहले से पैसे न भेजें या OTP न बताएं।",
    },
  },
  service: {
    label: {
      en: "Service message from a registered business",
      hi: "रजिस्टर्ड कंपनी का सर्विस मैसेज",
    },
    note: REGISTERED_NOTE,
  },
  transactional: {
    label: { en: "Transaction alert (OTP or payment)", hi: "लेन-देन अलर्ट (OTP या पेमेंट)" },
    note: {
      en: "Banks send OTPs and payment alerts this way. An OTP is only for you: no bank, courier or officer will ever ask you to tell it to them.",
      hi: "बैंक OTP और पेमेंट अलर्ट ऐसे ही भेजते हैं। OTP सिर्फ आपके लिए है: कोई बैंक, कूरियर या अधिकारी कभी आपसे OTP नहीं मांगेगा।",
    },
  },
  government: {
    label: { en: "Government message", hi: "सरकारी मैसेज" },
    note: REGISTERED_NOTE,
  },
  business: {
    label: { en: "Registered business sender", hi: "रजिस्टर्ड कंपनी का भेजने वाला नाम" },
    note: REGISTERED_NOTE,
  },
  mobile: {
    label: { en: "An ordinary mobile number", hi: "एक आम मोबाइल नंबर" },
    note: {
      en: "Banks, couriers, electricity boards and government offices send SMS from registered names like VM-SBIINB-S, not from ordinary mobile numbers.",
      hi: "बैंक, कूरियर, बिजली विभाग और सरकारी दफ्तर VM-SBIINB-S जैसे रजिस्टर्ड नामों से SMS भेजते हैं, आम मोबाइल नंबर से नहीं।",
    },
  },
  international: {
    label: { en: "A number from outside India", hi: "भारत के बाहर का नंबर" },
    note: {
      en: "Indian banks, couriers and government offices don't message you from foreign numbers. Fake job and investment offers often do.",
      hi: "भारतीय बैंक, कूरियर और सरकारी दफ्तर विदेशी नंबर से मैसेज नहीं करते। फर्जी जॉब और निवेश ऑफ़र अक्सर ऐसे ही आते हैं।",
    },
  },
};

/** Reads the sender a phone shows for an SMS. Returns null when it can't tell. */
export function classifySender(raw: string): SenderInfo | null {
  const s = raw.trim();
  if (!s || s.length > 40) return null;

  // A number: always try this first, so "9876543210" isn't read as a name.
  if (/^[+\d][\d\s().-]{6,}$/.test(s)) {
    const phone = normalizePhone(s);
    if (!phone.ok) return null;
    const kind: SenderKind = phone.value.startsWith("+91") ? "mobile" : "international";
    return { kind, value: phone.value, ...INFO[kind] };
  }

  const m = HEADER.exec(s.toUpperCase());
  if (!m) return null;
  const hasPrefixOrSuffix = m[0] !== m[1];
  if (!hasPrefixOrSuffix && !BARE_HEADER.test(s)) return null;
  const name = m[1]!;
  const suffix = m[2];
  // Before the suffixes, ads came from 6-digit number headers and everything
  // else from letter headers.
  const kind: SenderKind = suffix
    ? SUFFIX[suffix]!
    : /^\d{6}$/.test(name)
      ? "promotional"
      : "business";
  return { kind, value: name, ...INFO[kind] };
}

// Words that show a message claims to come from a bank, company or office.
const OFFICIAL_CLAIM =
  /\b(?:bank|sbi|hdfc|icici|axis|kotak|pnb|rbi|kyc|income tax|customs|police|cbi|trai|electricity|bijli|courier|fedex|dhl|blue ?dart|india post|aadhaa?r|pan card|epfo|npci|paytm|phonepe|gpay|google pay)\b|बैंक|बिजली|पुलिस|सरकार|आधार|कस्टम/;

/** True when the text pretends to be a bank, company or government office. */
export function claimsToBeOfficial(text: string): boolean {
  return OFFICIAL_CLAIM.test(text.toLowerCase());
}
