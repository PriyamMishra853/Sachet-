import type { Channel, IdentifierKind, RiskBand, ScamType } from "@sachet/core";

export type IdentifierRef = { kind: IdentifierKind; value: string };

/**
 * "open": the owner asked for a review and it isn't decided yet.
 * "cleared": an appeal was upheld; reports made before it no longer count.
 */
export type ReviewState = "open" | "cleared" | null;

export type StoredIdentifier = IdentifierRef & {
  reportCount: number;
  riskBand: RiskBand;
  source: "user" | "seed" | "safe_browsing";
  /** Most common scam type people reported it as, if any. */
  scamType: ScamType | null;
  review: ReviewState;
};

export type NewReport = {
  channel: Channel;
  reporterHash: string;
  scamType: ScamType | null;
  textRedacted: string | null;
  amountInr: number | null;
  idempotencyKey: string;
  identifiers: IdentifierRef[];
};

export type NewCheck = {
  channel: Channel;
  userHash: string;
  verdictBand: RiskBand;
  scamType: ScamType | null;
  amountInr: number | null;
};

export type SeedEntry = IdentifierRef & { source: "seed" | "safe_browsing"; riskBand: RiskBand };

export type NewAppeal = IdentifierRef & {
  appellantHash: string;
  /** Already redacted. */
  reason: string;
  contact: string | null;
};

export type AppealStatus = "open" | "upheld" | "rejected";

/** What a reviewer sees: the appeal, the identifier, and the newest reports about it. */
export type AppealRecord = {
  id: string;
  identifier: IdentifierRef & {
    reportCount: number;
    riskBand: RiskBand;
    source: StoredIdentifier["source"];
  };
  reason: string;
  contact: string | null;
  status: AppealStatus;
  decisionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  recentReports: {
    channel: Channel;
    scamType: ScamType | null;
    textRedacted: string | null;
    createdAt: string;
  }[];
};

export type CreateAppealResult =
  | { ok: true; appealId: string }
  /** not_listed: no reports and not on a list, so nothing to appeal. */
  | { ok: false; error: "not_listed" | "already_open" };

export type Stats = {
  checks: number;
  reports: number;
  /** Sum of amounts in risky checks where the user later said they did NOT pay. */
  moneyProtectedInr: number;
};

// Everything the API needs from storage. Two implementations: Postgres
// (pg-store.ts) and in-memory (memory-store.ts, for local dev and tests).
export interface Store {
  lookup(refs: IdentifierRef[]): Promise<StoredIdentifier[]>;
  /** Idempotent: the same idempotencyKey returns the first report's id. */
  createReport(r: NewReport): Promise<{ reportId: string; duplicate: boolean }>;
  recordCheck(c: NewCheck): Promise<string>;
  /** Risky checks older than `olderThan` that have not had a follow-up yet. */
  dueFollowups(olderThan: Date, limit: number): Promise<string[]>;
  markFollowupSent(checkId: string): Promise<void>;
  /** Saves the "Did you pay?" answer. Only the person who made the check can answer; returns false otherwise. */
  setUserPaid(checkId: string, userHash: string, paid: "yes" | "no"): Promise<boolean>;
  upsertSeed(entries: SeedEntry[]): Promise<number>;
  /** "Delete my data": removes a person's reports, checks and appeals. */
  deleteUserData(userHash: string): Promise<{ reports: number; checks: number; appeals: number }>;
  createAppeal(a: NewAppeal): Promise<CreateAppealResult>;
  /** Oldest first, so appeals are decided in the order they came in. */
  listAppeals(status: AppealStatus, limit: number): Promise<AppealRecord[]>;
  /**
   * Decides an open appeal. Upheld: reports made until now stop counting and a
   * blocklist entry is dropped to "unknown". Returns the identifier, or null
   * when there is no open appeal with this id.
   */
  resolveAppeal(
    id: string,
    decision: "upheld" | "rejected",
    note: string | null,
  ): Promise<IdentifierRef | null>;
  stats(): Promise<Stats>;
  ping(): Promise<boolean>;
}
