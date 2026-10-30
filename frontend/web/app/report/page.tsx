"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError, guessType } from "../../lib/api";
import { SCAM_TYPE_NAMES } from "../../lib/i18n";
import { useLang } from "../components/LangProvider";

export default function ReportPage() {
  const { lang, tr } = useLang();
  const [identifier, setIdentifier] = useState("");
  const [scamType, setScamType] = useState("");
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "duplicate">("idle");
  const [error, setError] = useState<string | null>(null);
  // Same key for retries of this one form; a new key after success.
  const [key, setKey] = useState(() => crypto.randomUUID());

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);
    try {
      const id = identifier.trim();
      const r = await api.report(
        {
          identifiers: id ? [{ type: guessType(id), value: id }] : undefined,
          text: text.trim() || undefined,
          scamType: scamType || undefined,
          amountInr: amount ? Number(amount) : undefined,
        },
        key,
      );
      setState(r.duplicate ? "duplicate" : "done");
      setIdentifier("");
      setText("");
      setAmount("");
      setScamType("");
      setKey(crypto.randomUUID());
    } catch (err) {
      setState("idle");
      if (err instanceof ApiError && (err.status === 400 || err.status === 429))
        setError(err.reason);
      else if (err instanceof ApiError && err.status === 0) setError(tr("errorOffline"));
      else setError(tr("errorGeneric"));
    }
  }

  return (
    <div className="page">
      <h1>{tr("reportTitle")}</h1>
      <p className="lead">{tr("reportIntro")}</p>

      <form onSubmit={onSubmit} className="card">
        <label>
          {tr("reportWhat")}
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="+91 98765 43210 · name@ybl · bit.ly/abc"
            autoCapitalize="off"
            autoCorrect="off"
          />
        </label>

        <label>
          {tr("reportType")}
          <select value={scamType} onChange={(e) => setScamType(e.target.value)}>
            <option value="">{tr("unknown")}</option>
            {Object.entries(SCAM_TYPE_NAMES).map(([id, name]) => (
              <option key={id} value={id}>
                {name[lang]}
              </option>
            ))}
          </select>
        </label>

        <label>
          {tr("reportText")}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            maxLength={4000}
          />
        </label>

        <label>
          {tr("reportAmount")}
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder="2999"
          />
        </label>

        <p className="muted small">{tr("reportPrivacy")}</p>

        <button
          type="submit"
          className="primary"
          disabled={state === "sending" || (!identifier.trim() && !text.trim())}
        >
          {tr("reportSubmit")}
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {(state === "done" || state === "duplicate") && (
          <p className="ok">{tr(state === "done" ? "reportThanks" : "reportDuplicate")}</p>
        )}
      </form>
    </div>
  );
}
