import { RISK_BANDS, type Lang, type RiskBand } from "./types.js";

// Product rule: Sachet never tells a user something is "safe". When we know
// nothing, we say so, and let the warning signs in the message speak.
const LABELS: Record<RiskBand, Record<Lang, string>> = {
  unknown: { en: "No reports yet", hi: "अभी तक कोई रिपोर्ट नहीं" },
  low: { en: "Low risk", hi: "कम जोखिम" },
  medium: { en: "Medium risk", hi: "मध्यम जोखिम" },
  high: { en: "High risk", hi: "उच्च जोखिम" },
};

export function bandLabel(band: RiskBand, lang: Lang = "en"): string {
  return LABELS[band][lang];
}

// Returns the riskier of the bands; used when a message holds several identifiers.
export function worstBand(bands: readonly RiskBand[]): RiskBand {
  let worst: RiskBand = "unknown";
  for (const band of bands) {
    if (RISK_BANDS.indexOf(band) > RISK_BANDS.indexOf(worst)) worst = band;
  }
  return worst;
}
