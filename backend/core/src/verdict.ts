import type { TextAnalysis } from "./analyze.js";
import { worstBand } from "./band.js";
import { NEW_DOMAIN_DAYS } from "./domains.js";
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
  /** "open": the owner asked for a review. "cleared": an appeal was upheld and older reports were set aside. */
  review?: "open" | "cleared" | null;
  /** Websites only: days since the name was registered (RDAP), when known. */
  domainAgeDays?: number | null;
};

/**
 * A second opinion on the message text from an AI model. It can raise the band
 * to medium, never higher and never lower: the rules and reports stay in charge,
 * and a message written to fool the model can at worst add one warning.
 */
export type AiOpinion = {
  scam: boolean;
  scamType: ScamType | null;
  confidence: "low" | "medium" | "high";
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
  return worstBand([l.storedBand, fromReports, isNewDomain(l) ? "medium" : "unknown"]);
}

const isNewDomain = (l: IdentifierLookup) =>
  l.kind === "domain" && l.domainAgeDays != null && l.domainAgeDays < NEW_DOMAIN_DAYS;

const KIND_NAME: Record<IdentifierKind, Text2> = {
  phone: { en: "This phone number", hi: "यह फोन नंबर" },
  upi: { en: "This UPI ID", hi: "यह UPI ID" },
  domain: { en: "This website", hi: "यह वेबसाइट" },
};
// Hindi uses "इस" instead of "यह" before को, ने, में ("इस नंबर को").
const KIND_NAME_OBLIQUE: Record<IdentifierKind, string> = {
  phone: "इस फोन नंबर",
  upi: "इस UPI ID",
  domain: "इस वेबसाइट",
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

const UNDER_REVIEW: Text2 = {
  en: "Its owner says these reports are wrong. Sachet is reviewing them.",
  hi: "इसके मालिक का कहना है कि ये शिकायतें गलत हैं। Sachet इनकी जांच कर रहा है।",
};
const CLEARED: Text2 = {
  en: "Earlier reports about it were set aside after a review. Only newer reports count.",
  hi: "जांच के बाद इसकी पुरानी शिकायतें हटा दी गईं। अब सिर्फ नई शिकायतें गिनी जाती हैं।",
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
  ai?: AiOpinion | null;
}): Verdict {
  const lookups = input.lookups ?? [];
  const text = input.text ?? null;
  // A low-confidence "scam" is ignored: a false alarm costs trust.
  const ai = input.ai?.scam && input.ai.confidence !== "low" ? input.ai : null;
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
        hi: `${KIND_NAME_OBLIQUE[l.kind]} को ${l.reportCount} ${l.reportCount === 1 ? "व्यक्ति" : "लोगों"} ने धोखाधड़ी बताया है।`,
      });
    }
    if (isNewDomain(l)) {
      const days = l.domainAgeDays!;
      const ago = days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
      const agoHi = days === 0 ? "आज ही" : days === 1 ? "कल ही" : `${days} दिन पहले ही`;
      reasons.push({
        en: `This website (${l.value}) was registered ${ago}. Scam websites are usually new.`,
        hi: `यह वेबसाइट (${l.value}) ${agoHi} बनी है। धोखाधड़ी वाली वेबसाइटें अक्सर नई होती हैं।`,
      });
    }
    // Information only: a pending review never lowers the band, or every
    // scammer would file one.
    if (l.review === "open") reasons.push(UNDER_REVIEW);
    if (l.review === "cleared") reasons.push(CLEARED);
  }

  const scamType = text?.scamType ?? reportedType ?? ai?.scamType ?? null;
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
  if (ai) {
    bands.push("medium");
    const rule = SCAM_RULES.find((r) => r.type === ai.scamType);
    reasons.push({
      en: `An AI check also reads this as a likely ${rule?.name.en ?? "scam"}.`,
      hi: `AI जांच भी इसे संभावित ${rule?.name.hi ?? "धोखाधड़ी"} मानती है।`,
    });
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
