import type { Channel, IdentifierKind, RiskBand, ScamType } from "@sachet/core";

export type IdentifierRef = { kind: IdentifierKind; value: string };

export type StoredIdentifier = IdentifierRef & {
  reportCount: number;
  riskBand: RiskBand;
  source: "user" | "seed" | "safe_browsing";
  /** Most common scam type people reported it as, if any. */
  scamType: ScamType | null;
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
  /** "Delete my data": removes a person's reports and checks. */
  deleteUserData(userHash: string): Promise<{ reports: number; checks: number }>;
  stats(): Promise<Stats>;
  ping(): Promise<boolean>;
}
