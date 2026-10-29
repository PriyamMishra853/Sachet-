import { bandLabel } from "./band.js";
import type { Lang, RiskBand } from "./types.js";
import type { Verdict } from "./verdict.js";

const ICON: Record<RiskBand, string> = {
  high: "🔴",
  medium: "🟠",
  low: "🟡",
  unknown: "⚪",
};

const HEADINGS = {
  en: { why: "Why", todo: "What to do", sender: "Sender" },
  hi: { why: "क्यों", todo: "क्या करें", sender: "भेजने वाला" },
};

// Plain-text verdict card shared by the Telegram and WhatsApp bots.
// Kept free of Markdown so neither app mangles it.
export function formatVerdictCard(v: Verdict, lang: Lang): string {
  const h = HEADINGS[lang];
  const lines = [`${ICON[v.band]} ${bandLabel(v.band, lang).toUpperCase()}`, ""];
  if (v.sender) lines.push(`${h.sender}: ${v.sender.label[lang]}`, `ℹ️ ${v.sender.note[lang]}`, "");
  lines.push(`${h.why}:`);
  for (const r of v.reasons.slice(0, 5)) lines.push(`• ${r[lang]}`);
  lines.push("", `${h.todo}:`);
  for (const a of v.advice) lines.push(`• ${a[lang]}`);
  return lines.join("\n");
}
