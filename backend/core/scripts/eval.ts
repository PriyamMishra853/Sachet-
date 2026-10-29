// Prints the V1 rules baseline on data/test-messages/messages.json:
// hit rate on scam messages, false-alarm rate on normal ones, and misses.
// Run with: pnpm --filter @sachet/core eval
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { analyzeText } from "../src/index.js";

type Labelled = { id: string; label: string; text: string; source: string };

const file = fileURLToPath(new URL("../../../data/test-messages/messages.json", import.meta.url));
const messages = JSON.parse(readFileSync(file, "utf8")) as Labelled[];

export function evaluate(list: Labelled[]) {
  const scams = list.filter((m) => m.label !== "normal");
  const normals = list.filter((m) => m.label === "normal");
  const flagged = (text: string) => analyzeText(text).band !== "unknown";

  const missed = scams.filter((m) => !flagged(m.text));
  const wrongType = scams.filter(
    (m) => flagged(m.text) && analyzeText(m.text).scamType !== m.label,
  );
  const falseAlarms = normals.filter((m) => flagged(m.text));
  return {
    scams: scams.length,
    normals: normals.length,
    hitRate: (scams.length - missed.length) / scams.length,
    typeAccuracy: (scams.length - missed.length - wrongType.length) / scams.length,
    falseAlarmRate: falseAlarms.length / normals.length,
    missed,
    wrongType,
    falseAlarms,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = evaluate(messages);
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  console.log(`Scam messages:    ${r.scams}`);
  console.log(`Normal messages:  ${r.normals}`);
  console.log(`Hit rate:         ${pct(r.hitRate)}  (scams flagged medium or high)`);
  console.log(`Type accuracy:    ${pct(r.typeAccuracy)}  (flagged with the right scam type)`);
  console.log(`False-alarm rate: ${pct(r.falseAlarmRate)}  (normal messages flagged)`);
  for (const m of r.missed) console.log(`  MISSED      ${m.id}: ${m.text.slice(0, 70)}`);
  for (const m of r.wrongType) {
    console.log(`  WRONG TYPE  ${m.id}: got ${analyzeText(m.text).scamType}, want ${m.label}`);
  }
  for (const m of r.falseAlarms) {
    const a = analyzeText(m.text);
    console.log(
      `  FALSE ALARM ${m.id} (${a.band}, ${a.scamType}, ${a.signals.join("+")}): ${m.text.slice(0, 60)}`,
    );
  }
}
