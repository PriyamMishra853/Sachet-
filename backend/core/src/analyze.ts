import { extract, type Extracted } from "./extract.js";
import { SCAM_RULES } from "./rules.js";
import { classifySender, type SenderInfo } from "./sender.js";
import { DANGER_SIGNALS, detectSignals, type Signal } from "./signals.js";
import type { RiskBand, ScamType } from "./types.js";

export type TextAnalysis = {
  extracted: Extracted;
  /** Best-matching scam type, or null when no rule scored enough. */
  scamType: ScamType | null;
  /** Points for the best type: 2 per strong pattern, 1 per weak pattern. */
  score: number;
  strongHit: boolean;
  signals: Signal[];
  band: RiskBand;
  /** Who sent it, when the user told us (an SMS sender name or number). */
  sender: SenderInfo | null;
};

const MIN_TYPE_SCORE = 2;
const MIN_WEAK_ONLY_SCORE = 3;

const SIGNAL_BOOSTS: Partial<Record<Signal, ScamType>> = {
  otp_or_pin: "fake_support",
};

// Scores a pasted message against the 10 scam rules and the warning signals.
// The thresholds are deliberately simple so the V2 ML model has a clear,
// explainable baseline to beat.
export function analyzeText(text: string, opts: { sender?: string | null } = {}): TextAnalysis {
  const extracted = extract(text);
  const lower = text.toLowerCase();
  const sender = opts.sender ? classifySender(opts.sender) : null;
  const signals = detectSignals(text, extracted, sender);

  let best: { type: ScamType; score: number; strongHit: boolean } | null = null;
  for (const rule of SCAM_RULES) {
    // Some signals are themselves strong evidence for one scam type (asking
    // for an OTP is the fake-support scam). They count as a strong pattern.
    const boosted = signals.filter((s) => SIGNAL_BOOSTS[s] === rule.type).length;
    const strong = rule.strong.filter((re) => re.test(lower)).length + boosted;
    const weak = rule.weak.filter((re) => re.test(lower)).length;
    const score = strong * 2 + weak;
    // Ties go to the rule listed first (investment is first: most money lost).
    if (score > (best?.score ?? 0)) best = { type: rule.type, score, strongHit: strong > 0 };
  }
  // Topic words alone ("electricity" + "bill") describe normal messages too,
  // so a type needs one strong pattern, or several weak ones together.
  const matched =
    best && (best.strongHit ? best.score >= MIN_TYPE_SCORE : best.score >= MIN_WEAK_ONLY_SCORE)
      ? best
      : null;
  const danger = signals.some((s) => DANGER_SIGNALS.has(s));

  let band: RiskBand = "unknown";
  if (matched && ((matched.strongHit && danger) || matched.score >= 5)) {
    band = "high";
  } else if (matched || signals.length >= 2 || (danger && extracted.links.length > 0)) {
    band = "medium";
  }

  return {
    extracted,
    scamType: matched?.type ?? null,
    score: matched?.score ?? 0,
    strongHit: matched?.strongHit ?? false,
    signals,
    band,
    sender,
  };
}
