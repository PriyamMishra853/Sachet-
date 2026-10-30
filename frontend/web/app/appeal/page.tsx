"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, guessType, type IdType } from "../../lib/api";
import { useLang } from "../components/LangProvider";

// For the owner of a number, UPI ID or website flagged by mistake. The result
// card links here with the identifier in the #fragment (never the query
// string), so it doesn't reach any server log.
export default function AppealPage() {
  const { tr } = useLang();
  const [type, setType] = useState<IdType | null>(null);
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.hash.slice(1));
    const t = p.get("type");
    if (t === "phone" || t === "upi" || t === "url") setType(t);
    setValue(p.get("value") ?? "");
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);
    try {
      const v = value.trim();
      await api.appeal({
        type: type ?? guessType(v),
        value: v,
        reason: reason.trim(),
        contact: contact.trim() || undefined,
      });
      setState("done");
    } catch (err) {
      setState("idle");
      if (err instanceof ApiError && err.status === 404) setError(tr("appealNotListed"));
      else if (err instanceof ApiError && err.status === 409) setError(tr("appealAlreadyOpen"));
      else if (err instanceof ApiError && (err.status === 400 || err.status === 429))
        setError(err.reason);
      else if (err instanceof ApiError && err.status === 0) setError(tr("errorOffline"));
      else setError(tr("errorGeneric"));
    }
  }

  return (
    <div className="page">
      <h1>{tr("appealTitle")}</h1>
      <p className="lead">{tr("appealIntro")}</p>

      {state === "done" ? (
        <p className="card ok">{tr("appealDone")}</p>
      ) : (
        <form onSubmit={onSubmit} className="card">
          <label>
            {tr("appealWhat")}
            <input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setType(null);
              }}
              placeholder="+91 98765 43210 · name@ybl · myshop.in"
              autoCapitalize="off"
              autoCorrect="off"
              required
            />
          </label>

          <label>
            {tr("appealReason")}
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              minLength={20}
              maxLength={1000}
              required
            />
            <span className="muted small">{tr("appealReasonHint")}</span>
          </label>

          <label>
            {tr("appealContact")}
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              maxLength={200}
              autoComplete="email"
            />
            <span className="muted small">{tr("appealContactNote")}</span>
          </label>

          <button
            type="submit"
            className="primary"
            disabled={state === "sending" || !value.trim() || reason.trim().length < 20}
          >
            {tr("appealSubmit")}
          </button>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
