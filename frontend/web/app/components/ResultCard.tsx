"use client";

import { useState } from "react";
import { api, type CheckResult, type IdType } from "../../lib/api";
import { SCAM_TYPE_NAMES } from "../../lib/i18n";
import { AlertCircle, AlertTriangle, Flag, Info, Phone } from "./Icons";
import { useLang } from "./LangProvider";

const ICON = { high: AlertTriangle, medium: AlertCircle, low: Info, unknown: Info } as const;
const SUB = {
  high: "bandSubHigh",
  medium: "bandSubMedium",
  low: "bandSubLow",
  unknown: "bandSubUnknown",
} as const;

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
  // The owner of a flagged number, UPI ID or site can ask for a review. The
  // value goes in the #fragment, which browsers never send to a server.
  const appealHref =
    checked.kind !== "message" && (result.band === "high" || result.band === "medium")
      ? `/appeal#${new URLSearchParams({ type: checked.kind, value: checked.value })}`
      : null;

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

  const BandIcon = ICON[result.band];

  return (
    <section className={`result band-${result.band}`} aria-live="polite">
      <header className="result-head">
        <span className="result-icon">
          <BandIcon size={28} />
        </span>
        <div>
          <h2 className="result-band">{result.label[lang]}</h2>
          <p className="result-sub">{tr(SUB[result.band])}</p>
        </div>
      </header>

      <div className="result-body">
        {(result.scamType || result.reportCount > 0) && (
          <dl className="result-facts">
            {result.scamType && (
              <div>
                <dt>{tr("scamTypeLabel")}</dt>
                <dd>{SCAM_TYPE_NAMES[result.scamType]?.[lang]}</dd>
              </div>
            )}
            {result.reportCount > 0 && (
              <div>
                <dt>{tr("reportedBy")}</dt>
                <dd>{result.reportCount}</dd>
              </div>
            )}
          </dl>
        )}

        <h3>{tr("whatToDo")}</h3>
        <ul>
          {result.advice.map((a) => (
            <li key={a.en}>{a[lang]}</li>
          ))}
        </ul>

        <h3>{tr("why")}</h3>
        <ul>
          {result.reasons.map((r) => (
            <li key={r.en}>{r[lang]}</li>
          ))}
        </ul>

        {result.sender && (
          <>
            <h3>{tr("sender")}</h3>
            <p className="sender">
              <strong>{result.sender.label[lang]}</strong>
              <br />
              <span className="muted small">{result.sender.note[lang]}</span>
            </p>
          </>
        )}

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

        {askPaid && (
          <div className="paid">
            {paid === null ? (
              <>
                <p>
                  <strong>{tr("paidQuestion")}</strong>
                </p>
                <div className="button-row">
                  <button className="button button-plain" onClick={() => answerPaid("yes")}>
                    {tr("paidYes")}
                  </button>
                  <button className="button button-plain" onClick={() => answerPaid("no")}>
                    {tr("paidNo")}
                  </button>
                </div>
              </>
            ) : paid === "yes" ? (
              <>
                <p className="error">{tr("afterYes")}</p>
                <a className="button button-danger" href="tel:1930">
                  <Phone size={18} /> {tr("call1930")}
                </a>
              </>
            ) : (
              <p className="ok">{tr("afterNo")}</p>
            )}
          </div>
        )}

        <div className="result-actions">
          {reportState === "done" || reportState === "duplicate" ? (
            <p className="ok">{tr(reportState === "done" ? "reportThanks" : "reportDuplicate")}</p>
          ) : (
            <button
              className="button button-plain"
              onClick={report}
              disabled={reportState === "sending"}
            >
              <Flag size={18} /> {tr("reportThis")}
            </button>
          )}
          {reportState === "error" && <p className="error">{tr("errorGeneric")}</p>}
          {appealHref && (
            <a href={appealHref} className="appeal-link small">
              {tr("appealLink")}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
