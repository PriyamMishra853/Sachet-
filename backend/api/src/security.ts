import { createHash, timingSafeEqual } from "node:crypto";
import { isIPv4, isIPv6 } from "node:net";
import type { FastifyInstance, FastifyRequest } from "fastify";

// Compares two secrets in constant time. Comparing with === stops at the first
// wrong character, so response timing leaks how much of a guess was right.
// Hashing first makes both sides the same length, so the length leaks nothing.
export function safeEqual(given: string | undefined, expected: string): boolean {
  if (given === undefined) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

// The network a request comes from: the full IPv4 address, or the first 64
// bits of an IPv6 address (one home or phone gets a whole /64, so the full
// address would let one person look like millions).
export function networkOf(ip: string): string {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) return mapped[1]!;
  if (isIPv4(ip)) return ip;
  if (!isIPv6(ip)) return ip;
  const [head = "", tail = ""] = ip.toLowerCase().split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = ip.includes("::")
    ? [...left, ...Array<string>(8 - left.length - right.length).fill("0"), ...right]
    : left;
  return `${groups.slice(0, 4).join(":")}::/64`;
}

// Headers on every API response. The API only returns JSON, so it can forbid
// everything a browser might otherwise do with a response.
export function addSecurityHeaders(app: FastifyInstance) {
  app.addHook("onSend", async (_req, reply, payload) => {
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("content-security-policy", "default-src 'none'; frame-ancestors 'none'");
    reply.header("referrer-policy", "no-referrer");
    // Browsers ignore this over plain http, so it is safe to always send.
    reply.header("strict-transport-security", "max-age=31536000; includeSubDomains");
    // Verdicts change as reports come in: never keep an old one in a cache.
    reply.header("cache-control", "no-store");
    return payload;
  });
}

// What a request log line may contain. Fastify's default logs the full URL
// (GET /v1/check?value=<someone's phone number>) and the client IP; both are
// personal data, so we log the path and method only.
export const logSerializers = {
  req: (req: FastifyRequest) => ({ method: req.method, path: req.url.split("?")[0] }),
};
