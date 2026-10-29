// Apps share in different ways: WhatsApp puts the message in `text`, Chrome
// puts a page in `url` and its name in `title`, some apps put the link in
// both `text` and `url`. This joins them into one message to check.

const MAX_LENGTH = 4000;

export function combineShared(p: {
  title?: string | null;
  text?: string | null;
  url?: string | null;
}): string {
  const parts: string[] = [];
  for (const raw of [p.title, p.text, p.url]) {
    const part = raw?.trim();
    if (!part) continue;
    // Skip a part already contained in another (the link repeated in `url`),
    // and drop earlier parts the new one contains (a title that is the start of the text).
    if (parts.some((existing) => existing.includes(part))) continue;
    for (let i = parts.length - 1; i >= 0; i--) {
      if (part.includes(parts[i]!)) parts.splice(i, 1);
    }
    parts.push(part);
  }
  return parts.join("\n").slice(0, MAX_LENGTH);
}
