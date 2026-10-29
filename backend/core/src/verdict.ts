import type { TextAnalysis } from "./analyze.js";
import { worstBand } from "./band.js";
import { SCAM_RULES } from "./rules.js";
import type { SenderInfo } from "./sender.js";
import { SIGNAL_TEXT } from "./signals.js";
import type { IdentifierKind, RiskBand, ScamType, Text2 } from "./types.js";

// What the database (and Safe Browsing) told us about one identifier.
export type IdentifierLookup = {
  kind: IdentifierKind;
  value: string;
  /** Number of different people who reported it. */
  reportCount: number;
  /** Band stored for seeded entries (phishing lists), "unknown" otherwise. */
  storedBand: RiskBand;
  source: "user" | "seed" | "safe_browsing" | null;
  /** True when Google Safe Browsing lists this URL. */
  safeBrowsingHit?: boolean;
  scamType?: ScamType | null;
};

export type Verdict = {
  band: RiskBand;
  scamType: ScamType | null;
  reasons: Text2[];
  advice: Text2[];
  reportCount: number;
  /** What kind of sender sent the message, when known. Information only: it never lowers the band. */
  sender: SenderInfo | null;
};

// V1 rule: 3+ different reporters is high risk, 1-2 is medium.
export const HIGH_RISK_REPORTS = 3;

export function identifierBand(l: IdentifierLookup): RiskBand {
  if (l.safeBrowsingHit) return "high";
  const fromReports: RiskBand =
    l.reportCount >= HIGH_RISK_REPORTS ? "high" : l.reportCount >= 1 ? "medium" : "unknown";
  return worstBand([l.storedBand, fromReports]);
}

const KIND_NAME: Record<IdentifierKind, Text2> = {
  phone: { en: "This phone number", hi: "यह फोन नंबर" },
  upi: { en: "This UPI ID", hi: "यह UPI ID" },
  domain: { en: "This website", hi: "यह वेबसाइट" },
};

export const HELPLINE: Text2 = {
  en: "Lost money? Call 1930 right away or report at cybercrime.gov.in. The first hour matters most.",
  hi: "पैसे गए? तुरंत 1930 पर कॉल करें या cybercrime.gov.in पर शिकायत करें। पहला घंटा सबसे ज़रूरी है।",
};

// I4C's national cybercrime portal lets anyone search a number or UPI ID
// against complaints filed with the police. No API, so we point people to it.
export const SUSPECT_SEARCH: Text2 = {
  en: 'You can also search this number or UPI ID at cybercrime.gov.in → "Report & Check Suspect", to see if others complained to the police.',
  hi: 'आप cybercrime.gov.in → "Report & Check Suspect" पर यह नंबर या UPI ID खोजकर भी देख सकते हैं कि किसी ने पुलिस से इसकी शिकायत की है या नहीं।',
};

const BAND_ADVICE: Record<RiskBand, Text2> = {
  high: {
    en: "Don't pay, don't click the link, and don't share any OTP or PIN. Block the sender.",
    hi: "पैसे न भेजें, लिंक न खोलें, और कोई OTP या PIN न बताएं। भेजने वाले को ब्लॉक करें।",
  },
  medium: {
    en: "Be careful. Before paying, check through the official app or website, not the number or link in this message.",
    hi: "सावधान रहें। पैसे भेजने से पहले आधिकारिक ऐप या वेबसाइट से जांचें, इस मैसेज के नंबर या लिंक से नहीं।",
  },
  low: {
    en: "Little risk found, but stay careful with any payment request.",
    hi: "कम जोखिम मिला, फिर भी किसी भी पेमेंट की मांग पर सावधान रहें।",
  },
  unknown: {
    en: '"No reports yet" does not mean safe. If anyone asks for money, an OTP or a PIN, stop and check first.',
    hi: '"अभी तक कोई रिपोर्ट नहीं" का मतलब सुरक्षित नहीं है। अगर कोई पैसे, OTP या PIN मांगे, तो रुकें और पहले जांचें।',
  },
};

// Builds the answer the user sees. Every verdict has at least one reason and
// always ends with the 1930 helpline, in both languages.
export function buildVerdict(input: {
  lookups?: IdentifierLookup[];
  text?: TextAnalysis | null;
}): Verdict {
  const lookups = input.lookups ?? [];
  const text = input.text ?? null;
  const reasons: Text2[] = [];
  const bands: RiskBand[] = [];
  let reportCount = 0;
  let reportedType: ScamType | null = null;

  for (const l of lookups) {
    const band = identifierBand(l);
    bands.push(band);
    reportCount = Math.max(reportCount, l.reportCount);
    reportedType ??= l.scamType ?? null;
    const who = KIND_NAME[l.kind];

    if (l.safeBrowsingHit) {
      reasons.push({
        en: `${who.en} is flagged as dangerous by Google Safe Browsing.`,
        hi: `${who.hi} Google Safe Browsing में खतरनाक बताई गई है।`,
      });
    }
    if (l.source === "seed" && l.storedBand === "high") {
      reasons.push({
        en: `${who.en} is on a public phishing blocklist.`,
        hi: `${who.hi} एक सार्वजनिक फ़िशिंग ब्लॉकलिस्ट में है।`,
      });
    }
    if (l.reportCount > 0) {
      const people = l.reportCount === 1 ? "1 person" : `${l.reportCount} people`;
      reasons.push({
        en: `${who.en} was reported as a scam by ${people}.`,
        hi: `${who.hi} को ${l.reportCount} ${l.reportCount === 1 ? "व्यक्ति" : "लोगों"} ने धोखाधड़ी बताया है।`,
      });
    }
  }

  const scamType = text?.scamType ?? reportedType;
  if (text) {
    bands.push(text.band);
    if (text.scamType) {
      const rule = SCAM_RULES.find((r) => r.type === text.scamType)!;
      reasons.push({
        en: `The message matches a common ${rule.name.en}.`,
        hi: `यह मैसेज एक आम ${rule.name.hi} से मिलता है।`,
      });
    }
    for (const s of text.signals) reasons.push(SIGNAL_TEXT[s]);
  }

  const band = worstBand(bands);
  if (reasons.length === 0) {
    reasons.push({
      en: "No one has reported this to Sachet yet, and we found no warning signs.",
      hi: "अभी तक किसी ने Sachet पर इसकी शिकायत नहीं की है, और हमें कोई चेतावनी संकेत नहीं मिला।",
    });
  }

  const advice: Text2[] = [BAND_ADVICE[band]];
  const typeAdvice = SCAM_RULES.find((r) => r.type === scamType)?.advice;
  if (typeAdvice) advice.push(typeAdvice);
  const sender = text?.sender ?? null;
  const hasNumberOrUpi =
    lookups.some((l) => l.kind === "phone" || l.kind === "upi") ||
    (text?.extracted.phones.length ?? 0) > 0 ||
    (text?.extracted.upis.length ?? 0) > 0 ||
    sender?.kind === "mobile" ||
    sender?.kind === "international";
  if (hasNumberOrUpi) advice.push(SUSPECT_SEARCH);
  advice.push(HELPLINE);

  return { band, scamType, reasons, advice, reportCount, sender };
}
