import { createHmac } from "node:crypto";

// We never store who a user is (their Telegram ID, WhatsApp number, IP).
// A keyed hash (HMAC) gives a stable ID for counting "different reporters"
// that can't be reversed, and without the salt can't be guessed by hashing
// every possible phone number.
export function hashUser(salt: string, channel: string, rawId: string): string {
  return createHmac("sha256", salt).update(`${channel}:${rawId}`).digest("hex");
}
