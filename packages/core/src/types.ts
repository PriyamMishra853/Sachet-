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
