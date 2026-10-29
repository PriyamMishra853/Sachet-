// Shared vocabulary for every part of Sachet. These mirror the enums in the
// database schema (identifiers.kind, identifiers.risk_band, reports.channel).

export const IDENTIFIER_KINDS = ["phone", "upi", "domain"] as const;
export type IdentifierKind = (typeof IDENTIFIER_KINDS)[number];

// Ordered from least to most risky, so the index doubles as a severity score.
export const RISK_BANDS = ["unknown", "low", "medium", "high"] as const;
export type RiskBand = (typeof RISK_BANDS)[number];

export const CHANNELS = ["telegram", "whatsapp", "web"] as const;
export type Channel = (typeof CHANNELS)[number];

export type Lang = "en" | "hi";

// The 10 scam types V1 detects, in order of money lost (investment first).
export const SCAM_TYPES = [
  "investment",
  "digital_arrest",
  "parcel",
  "kyc",
  "electricity",
  "task_job",
  "upi_refund",
  "lottery",
  "loan_app",
  "fake_support",
] as const;
export type ScamType = (typeof SCAM_TYPES)[number];

// Every user-facing sentence exists in both languages.
export type Text2 = { en: string; hi: string };
