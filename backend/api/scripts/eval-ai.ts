// Compares the rules alone with rules + AI second opinion on
// data/test-messages/messages.json, so you can see whether the AI is worth
// switching on (it must catch more scams without more false alarms).
//
// It calls the Claude API once per message, which costs money, so it only
// runs with --yes:  pnpm eval:ai --yes   (model: AI_CHECK_MODEL, default claude-opus-5-5)
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { analyzeText, buildVerdict, type AiOpinion } from "@sachet/core";
import { createMemoryCache } from "../src/cache.js";
import { createAiCheck } from "../src/services/ai-check.js";

type Labelled = { id: string; label: string; text: string; source: string };

const envFile = fileURLToPath(new URL("../../../.env", import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const file = fileURLToPath(new URL("../../../data/test-messages/messages.json", import.meta.url));
const messages = JSON.parse(readFileSync(file, "utf8")) as Labelled[];
const model = process.env.AI_CHECK_MODEL || "claude-opus-5-5";

if (!process.argv.includes("--yes")) {
  console.log(`This calls ${model} once for each of ${messages.length} messages (it costs money).`);
  console.log("Run again with --yes to go ahead:  pnpm eval:ai --yes");
  process.exit(0);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Set ANTHROPIC_API_KEY in .env first.");
  process.exit(1);
}

let inputTokens = 0;
let outputTokens = 0;
const ai = createAiCheck({
  cache: createMemoryCache(),
  apiKey: process.env.ANTHROPIC_API_KEY,
  model,
  waitMs: 60_000,
  log: {
    info: (o) => {
      const u = o as { inputTokens?: number; outputTokens?: number };
      inputTokens += u.inputTokens ?? 0;
      outputTokens += u.outputTokens ?? 0;
    },
    warn: (o) => console.warn("  AI error:", (o as { err?: string }).err),
  },
});

// A few at a time: fast enough, and well inside rate limits.
const opinions = new Map<string, AiOpinion | null>();
for (let i = 0; i < messages.length; i += 4) {
  await Promise.all(
    messages.slice(i, i + 4).map(async (m) => opinions.set(m.id, await ai.opinion(m.text))),
  );
  process.stdout.write(`\r${Math.min(i + 4, messages.length)}/${messages.length}`);
}
console.log("\n");

const scams = messages.filter((m) => m.label !== "normal");
const normals = messages.filter((m) => m.label === "normal");
const rulesBand = (m: Labelled) => analyzeText(m.text).band;
const aiFlags = (m: Labelled) => {
  const o = opinions.get(m.id);
  return !!o && o.scam && o.confidence !== "low";
};
// What a user would see: the rules, plus the AI's opinion where the checker asks for it.
const combinedBand = (m: Labelled) => {
  const text = analyzeText(m.text);
  return buildVerdict({ text, ai: text.band === "high" ? null : opinions.get(m.id) }).band;
};

const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(1)}%`;
const row = (name: string, flagged: (m: Labelled) => boolean) =>
  console.log(
    `${name.padEnd(14)} hit rate ${pct(scams.filter(flagged).length, scams.length).padStart(6)}   ` +
      `false alarms ${pct(normals.filter(flagged).length, normals.length).padStart(6)}`,
  );

console.log(`${scams.length} scam and ${normals.length} normal messages, model ${model}\n`);
row("Rules only", (m) => rulesBand(m) !== "unknown");
row("AI only", aiFlags);
row("Rules + AI", (m) => combinedBand(m) !== "unknown");

const typed = scams.filter((m) => aiFlags(m) && opinions.get(m.id)?.scamType === m.label);
console.log(`\nAI scam-type accuracy: ${pct(typed.length, scams.length)}`);
for (const m of scams.filter((x) => !aiFlags(x))) {
  console.log(`  AI MISSED      ${m.id}: ${m.text.slice(0, 70)}`);
}
for (const m of normals.filter(aiFlags)) {
  console.log(`  AI FALSE ALARM ${m.id}: ${m.text.slice(0, 70)}`);
}
console.log(`\nTokens: ${inputTokens} in, ${outputTokens} out (thinking included in out).`);
