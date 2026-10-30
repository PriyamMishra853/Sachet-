"use client";

import { useState, type FormEvent } from "react";
import { adminApi, ApiError, type AdminAppeal, type AppealStatus } from "../../lib/api";
import { SCAM_TYPE_NAMES } from "../../lib/i18n";

// Operator page for deciding appeals, in English only. The ADMIN_TOKEN is
// typed in each visit and kept in this page's memory: never in storage, the
// address bar or a cookie.
export default function AdminPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<AppealStatus>("open");
  const [appeals, setAppeals] = useState<AdminAppeal[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(next: AppealStatus = status) {
    setBusy(true);
    setError(null);
    try {
      setStatus(next);
      setAppeals((await adminApi.appeals(token, next)).appeals);
    } catch (err) {
      setAppeals(null);
      setError(err instanceof ApiError ? err.reason : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(a: AdminAppeal, decision: "upheld" | "rejected") {
    const what =
      decision === "upheld"
        ? `Uphold: the ${a.identifier.reportCount} report(s) about ${a.identifier.value} stop counting.`
        : `Reject: ${a.identifier.value} keeps its reports.`;
    if (!window.confirm(`${what} Continue?`)) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.decide(token, a.id, decision, notes[a.id] ?? "");
      setAppeals((list) => list?.filter((x) => x.id !== a.id) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.reason : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void load();
  }

  return (
    <div className="page">
      <h1>Reviews</h1>
      <form onSubmit={onSubmit} className="card">
        <label>
          Admin token
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
            required
          />
        </label>
        <button type="submit" className="primary" disabled={busy || !token}>
          Load appeals
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>

      {appeals && (
        <>
          <div className="tabs" role="tablist" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {(["open", "upheld", "rejected"] as const).map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={status === s}
                onClick={() => void load(s)}
                disabled={busy}
              >
                {s}
              </button>
            ))}
          </div>
          {appeals.length === 0 && <p className="muted">No {status} appeals.</p>}
          {appeals.map((a) => (
            <section key={a.id} className="card">
              <h2>
                <code>{a.identifier.value}</code>
              </h2>
              <p className="muted small">
                {a.identifier.kind} · {a.identifier.reportCount} reporter(s) · list band{" "}
                {a.identifier.riskBand} · source {a.identifier.source} · asked{" "}
                {new Date(a.createdAt).toLocaleString()}
              </p>
              <h3>Owner says</h3>
              <p>{a.reason}</p>
              {a.contact && (
                <p>
                  <strong>Contact:</strong> {a.contact}
                </p>
              )}
              <h3>Newest reports</h3>
              {a.recentReports.length === 0 ? (
                <p className="muted">None (on a blocklist only).</p>
              ) : (
                <ul>
                  {a.recentReports.map((r, i) => (
                    <li key={i}>
                      <span className="muted small">
                        {new Date(r.createdAt).toLocaleDateString()} · {r.channel}
                        {r.scamType ? ` · ${SCAM_TYPE_NAMES[r.scamType]?.en ?? r.scamType}` : ""}
                      </span>
                      <br />
                      {r.textRedacted ?? <em>no message text</em>}
                    </li>
                  ))}
                </ul>
              )}
              {a.status === "open" ? (
                <>
                  <label>
                    Note (kept with the decision)
                    <input
                      value={notes[a.id] ?? ""}
                      onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })}
                      maxLength={500}
                    />
                  </label>
                  <div className="paid-buttons">
                    <button
                      className="secondary"
                      onClick={() => void decide(a, "upheld")}
                      disabled={busy}
                    >
                      Uphold (clear reports)
                    </button>
                    <button
                      className="secondary"
                      onClick={() => void decide(a, "rejected")}
                      disabled={busy}
                    >
                      Reject
                    </button>
                  </div>
                </>
              ) : (
                <p className="muted small">
                  {a.status} {a.resolvedAt && `on ${new Date(a.resolvedAt).toLocaleString()}`}
                  {a.decisionNote && ` · ${a.decisionNote}`}
                </p>
              )}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
