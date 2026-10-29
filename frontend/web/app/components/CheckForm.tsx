"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError, type CheckResult, type IdType } from "../../lib/api";
import { useLang } from "./LangProvider";
import { ResultCard, type Checked } from "./ResultCard";

type Tab = "message" | IdType;

// The check form and its result. Used by the home page, and by /share with
// the text another app shared, checked straight away.
export function CheckForm({
  initialText = "",
  autoRun = false,
}: {
  initialText?: string;
  autoRun?: boolean;
}) {
  const { tr } = useLang();
  const [tab, setTab] = useState<Tab>("message");
  const [input, setInput] = useState(initialText);
  const [sender, setSender] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ data: CheckResult; checked: Checked } | null>(null);
  const autoRan = useRef(false);

  const tabs: { id: Tab; label: string; placeholder: string }[] = [
    { id: "message", label: tr("tabMessage"), placeholder: tr("phMessage") },
    { id: "phone", label: tr("tabPhone"), placeholder: tr("phPhone") },
    { id: "upi", label: tr("tabUpi"), placeholder: tr("phUpi") },
    { id: "url", label: tr("tabUrl"), placeholder: tr("phUrl") },
  ];
  const current = tabs.find((x) => x.id === tab)!;

  async function run(kind: Tab, raw: string) {
    const value = raw.trim();
    if (!value) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const checked: Checked =
        kind === "message" ? { kind: "message", text: value } : { kind, value };
      const data =
        kind === "message"
          ? await api.checkMessage(value, sender)
          : await api.checkIdentifier(kind, value);
      setResult({ data, checked });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) setError(err.reason);
      else if (err instanceof ApiError && err.status === 0) setError(tr("errorOffline"));
      else setError(tr("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  // A ref, not state: React's strict mode runs effects twice in development,
  // and we must not check the shared message twice.
  useEffect(() => {
    if (autoRun && initialText && !autoRan.current) {
      autoRan.current = true;
      void run("message", initialText);
    }
  }, [autoRun, initialText]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void run(tab, input);
  }

  return (
    <>
      <form onSubmit={onSubmit} className="card">
        <div className="tabs" role="tablist">
          {tabs.map((x) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={tab === x.id}
              onClick={() => {
                setTab(x.id);
                setResult(null);
                setError(null);
              }}
            >
              {x.label}
            </button>
          ))}
        </div>

        {tab === "message" ? (
          <>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={current.placeholder}
              rows={6}
              maxLength={4000}
              aria-label={current.label}
            />
            <label>
              {tr("senderLabel")}
              <input
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder={tr("senderPlaceholder")}
                maxLength={40}
                autoCapitalize="characters"
                autoCorrect="off"
              />
            </label>
          </>
        ) : (
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={current.placeholder}
            inputMode={tab === "phone" ? "tel" : tab === "url" ? "url" : "email"}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label={current.label}
          />
        )}

        <button type="submit" className="primary" disabled={loading || !input.trim()}>
          {loading ? tr("checking") : tr("checkButton")}
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>

      {result && (
        <ResultCard
          key={result.data.checkId ?? input}
          result={result.data}
          checked={result.checked}
        />
      )}
    </>
  );
}
