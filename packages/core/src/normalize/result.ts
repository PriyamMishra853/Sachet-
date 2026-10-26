import type { IdentifierKind } from "../types.js";

// Every normalizer returns this shape instead of throwing, so callers (the
// API, the extractor) can show the user *why* an input was not understood.
export type NormalizeResult<Extra = object> =
  | ({ ok: true; kind: IdentifierKind; value: string } & Extra)
  | { ok: false; kind: IdentifierKind; input: string; reason: string };

export function fail(kind: IdentifierKind, input: string, reason: string) {
  return { ok: false as const, kind, input, reason };
}
