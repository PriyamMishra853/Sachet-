// Removes personal data from a message before it is saved with a report.
// Scam identifiers (the scammer's number, UPI ID, link) are kept on purpose:
// they are what warns the next person. What goes is data about the victim.

const RULES: [RegExp, string][] = [
  // Emails (UPI IDs have no dot after the @, so they survive).
  [/[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi, "[email]"],
  // OTP / PIN / CVV codes: "OTP is 482913", "pin 1234".
  [/\b(otp|pin|cvv|code|ओटीपी)(\s*(?:is|:|-|है)?\s*)\d{3,8}\b/gi, "$1$2[code]"],
  // Card numbers (13-19 digits, maybe grouped).
  [/\b(?:\d[ -]?){12,18}\d\b/g, "[card]"],
  // Aadhaar: 12 digits grouped 4-4-4 (never starts with 0 or 1), or any 12
  // digits right after the word. Ungrouped "919876543210" is a phone, so kept.
  [/\b[2-9]\d{3}[ -]\d{4}[ -]\d{4}\b/g, "[aadhaar]"],
  [/(aadhaa?r|आधार)(\D{0,12})\d{12}\b/gi, "$1$2[aadhaar]"],
  // PAN: ABCDE1234F.
  [/\b[a-z]{5}\d{4}[a-z]\b/gi, "[pan]"],
  // Account numbers after "a/c" or "account".
  [/\b(a\/c|acct|account(?: no\.?| number)?)(\s*[:#-]?\s*)[x*\d]{6,18}\b/gi, "$1$2[account]"],
  // Greetings with a name: "Dear Ramesh Kumar," / "Hi Priya".
  [
    /\b(dear|hi|hello|namaste|respected|mr\.?|mrs\.?|ms\.?|shri|smt\.?)\s+[a-z][a-z]+(?:\s+[a-z][a-z]+)?(?=[\s,.!:]|$)/gi,
    "$1 [name]",
  ],
  // Hindi honorifics with a name: "प्रिय रमेश".
  [/(प्रिय|श्री|श्रीमती)\s+[^\s,.!:।]+/g, "$1 [name]"],
];

const GENERIC_GREETING_WORDS = new Set(["customer", "user", "sir", "madam", "friend", "member"]);

export function redact(text: string): string {
  let out = text;
  for (const [re, replacement] of RULES) {
    out = out.replace(re, (match, ...groups) => {
      // Keep "Dear Customer": it is not a name, and it is a useful scam signal.
      const word = typeof groups[0] === "string" ? match.slice(groups[0].length).trim() : "";
      if (replacement === "$1 [name]" && GENERIC_GREETING_WORDS.has(word.toLowerCase())) {
        return match;
      }
      return replacement.replace(/\$(\d)/g, (_, i: string) => String(groups[Number(i) - 1] ?? ""));
    });
  }
  return out;
}
