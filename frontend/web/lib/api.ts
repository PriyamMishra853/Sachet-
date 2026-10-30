// Small client for the Sachet API, used from the browser.

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export type Text2 = { en: string; hi: string };
export type Band = "unknown" | "low" | "medium" | "high";
export type CheckResult = {
  band: Band;
  label: Text2;
  scamType: string | null;
  reasons: Text2[];
  advice: Text2[];
  reportCount: number;
  checkId: string | null;
  identifier?: { kind: string; value: string };
  extracted?: { phones: string[]; upis: string[]; domains: string[]; amounts: number[] };
  /** Who sent the SMS, when the user typed it: kind of sender, never a clean chit. */
  sender?: { kind: string; value: string; label: Text2; note: Text2 } | null;
};
export type IdType = "phone" | "upi" | "url";
export type Stats = { checks: number; reports: number; moneyProtectedInr: number };

export class ApiError extends Error {
  constructor(
    public status: number,
    public reason: string,
  ) {
    super(reason);
  }
}

// A random ID kept in this browser, so the API can count one person's
// reports once without knowing who they are. Clearing site data resets it.
// Without storage (private mode), a fresh ID for this visit: a fixed fallback
// would be one ID shared by everyone, who could then delete each other's data.
let visitId: string | null = null;
function clientId(): string {
  const KEY = "sachet-client-id";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    visitId ??= crypto.randomUUID();
    return visitId;
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers: { "content-type": "application/json", "x-client-id": clientId(), ...init.headers },
    });
  } catch {
    throw new ApiError(0, "offline");
  }
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.reason ?? `HTTP ${res.status}`);
  return body as T;
}

export const api = {
  checkIdentifier: (type: IdType, value: string) =>
    call<CheckResult>(`/v1/check?type=${type}&value=${encodeURIComponent(value)}`),
  checkMessage: (text: string, sender?: string) =>
    call<CheckResult>("/v1/check/message", {
      method: "POST",
      body: JSON.stringify({ text, sender: sender?.trim() || undefined }),
    }),
  report: (
    body: {
      identifiers?: { type: IdType; value: string }[];
      text?: string;
      scamType?: string;
      amountInr?: number;
    },
    idempotencyKey: string,
  ) =>
    call<{ reportId: string; duplicate: boolean }>("/v1/reports", {
      method: "POST",
      headers: { "idempotency-key": idempotencyKey },
      body: JSON.stringify(body),
    }),
  deleteMyData: () => call<{ reports: number; checks: number }>("/v1/me", { method: "DELETE" }),
  answerPaid: (checkId: string, paid: "yes" | "no") =>
    call<null>(`/v1/checks/${encodeURIComponent(checkId)}/paid`, {
      method: "POST",
      body: JSON.stringify({ paid }),
    }),
  stats: () => call<Stats>("/v1/stats"),
};

/** Guesses whether a typed value is a phone, UPI ID or link. */
export function guessType(value: string): IdType {
  const v = value.trim();
  if (/^[^\s@]+@[a-z][a-z0-9]+$/i.test(v)) return "upi";
  if (/^[+\d][\d\s().-]{7,}$/.test(v)) return "phone";
  return "url";
}
