// Small text clean-ups shared by all normalizers.

const DEVANAGARI_ZERO = 0x0966; // '०'

// Hindi keyboards and forwarded messages often use Devanagari digits (९८७६...).
export function toAsciiDigits(input: string): string {
  return input.replace(/[\u0966-\u096F]/g, (d) => String(d.charCodeAt(0) - DEVANAGARI_ZERO));
}

// Removes zero-width characters scammers paste in to dodge simple filters,
// and turns non-breaking spaces into normal ones.
export function stripInvisible(input: string): string {
  return input.replace(/[\u200B-\u200D\u2060\uFEFF]/g, "").replace(/\u00A0/g, " ");
}

export function cleanInput(input: string): string {
  return toAsciiDigits(stripInvisible(input)).trim();
}
