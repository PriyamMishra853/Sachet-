"use client";

import { useState } from "react";
import { api, type CheckResult, type IdType } from "../../lib/api";
import { SCAM_TYPE_NAMES } from "../../lib/i18n";
import { useLang } from "./LangProvider";

const ICON = { high: "🔴", medium: "🟠", low: "🟡", unknown: "⚪" } as const;

// What the user checked, so the Report button can report exactly that.
export type Checked = { kind: "message"; text: string } | { kind: IdType; value: string };

export function ResultCard({ result, checked }: { result: CheckResult; checked: Checked }) {
  const { lang, tr } = useLang();
  const [reportState, setReportState] = useState<
    "idle" | "sending" | "done" | "duplicate" | "error"
  >("idle");
  const [paid, setPaid] = useState<"yes" | "no" | null>(null);
  // One key per result: double taps and retries create one report.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const e = result.extracted;
  const found = e ? [...e.phones, ...e.upis, ...e.domains] : [];

  // Counts "money protected" when someone stopped before paying. The answer
  // shows straight away; saving it is best effort.
  function answerPaid(answer: "yes" | "no") {
    setPaid(answer);
    if (result.checkId) void api.answerPaid(result.checkId, answer).catch(() => {});
  }
  const askPaid = result.checkId && (result.band === "high" || result.band === "medium");

  async function report() {
    setReportState("sending");
    try {
      // A message from an ordinary number: report that number too.
      const senderPhone =
        result.sender?.kind === "mobile" || result.sender?.kind === "international"
          ? [{ type: "phone" as const, value: result.sender.value }]
          : undefined;
      const body =
        checked.kind === "message"
          ? { text: checked.text, identifiers: senderPhone }
          : { identifiers: [{ type: checked.kind, value: checked.value }] };
      const r = await api.report(
        { ...body, scamType: result.scamType ?? undefined },
        idempotencyKey,
      );
      setReportState(r.duplicate ? "duplicate" : "done");
    } catch {
      setReportState("error");
    }
  }

  return (
    <section className={`result band-${result.band}`} aria-live="polite">
      <h2 className="result-band">
        <span aria-hidden>{ICON[result.band]}</span> {result.label[lang]}
      </h2>
      {result.scamType && <p className="scam-type">{SCAM_TYPE_NAMES[result.scamType]?.[lang]}</p>}
      {result.sender && (
        <p className="sender">
          <strong>{tr("sender")}:</strong> {result.sender.label[lang]}
          <br />
          <span className="muted small">{result.sender.note[lang]}</span>
        </p>
      )}
      {result.reportCount > 0 && (
        <p className="muted">
          {tr("reportedBy")}: {result.reportCount}
        </p>
      )}

      <h3>{tr("why")}</h3>
      <ul>
        {result.reasons.map((r) => (
          <li key={r.en}>{r[lang]}</li>
        ))}
      </ul>

      {found.length > 0 && (
        <>
          <h3>{tr("found")}</h3>
          <p className="chips">
            {found.map((f) => (
              <code key={f}>{f}</code>
            ))}
          </p>
        </>
      )}

      <h3>{tr("whatToDo")}</h3>
      <ul>
        {result.advice.map((a) => (
          <li key={a.en}>{a[lang]}</li>
        ))}
      </ul>

      {askPaid && (
        <div className="paid">
          {paid === null ? (
            <>
              <p>
                <strong>{tr("paidQuestion")}</strong>
              </p>
              <div className="paid-buttons">
                <button className="secondary" onClick={() => answerPaid("yes")}>
                  {tr("paidYes")}
                </button>
                <button className="secondary" onClick={() => answerPaid("no")}>
                  {tr("paidNo")}
                </button>
              </div>
            </>
          ) : paid === "yes" ? (
            <>
              <p className="error">{tr("afterYes")}</p>
              <a className="primary button-link" href="tel:1930">
                {tr("call1930")}
              </a>
            </>
          ) : (
            <p className="ok">{tr("afterNo")}</p>
          )}
        </div>
      )}

      <div className="actions">
        {reportState === "done" || reportState === "duplicate" ? (
          <p className="ok">{tr(reportState === "done" ? "reportThanks" : "reportDuplicate")}</p>
        ) : (
          <button className="secondary" onClick={report} disabled={reportState === "sending"}>
            {tr("reportThis")}
          </button>
        )}
        {reportState === "error" && <p className="error">{tr("errorGeneric")}</p>}
      </div>
    </section>
  );
}
