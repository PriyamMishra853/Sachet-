import cors from "@fastify/cors";
import type { Store } from "@sachet/db";
import Fastify, { type FastifyError, type FastifyServerOptions } from "fastify";
import type { Cache } from "./cache.js";
import { createChecker } from "./services/checker.js";
import type { SafeBrowsing } from "./services/safe-browsing.js";
import { v1Routes } from "./routes/v1.js";
import { addSecurityHeaders } from "./security.js";

export type AppDeps = {
  store: Store;
  cache: Cache;
  safeBrowsing: SafeBrowsing;
  salt: string;
  corsOrigins?: string[];
  /**
   * How many proxies sit in front of the API (1 on Railway/Render). The client
   * IP is read that many steps from the end of X-Forwarded-For. Trusting the
   * whole header would let anyone fake their IP and dodge the rate limits.
   */
  trustProxyHops?: number;
};

// Requests are small JSON (a message is at most 4,000 characters).
const BODY_LIMIT = 64 * 1024;

// Building the app separately from listen() lets tests call routes with
// app.inject() without opening a real port. Every outside service is passed
// in, so tests use in-memory fakes and production uses Supabase/Upstash.
export function buildApp(deps: AppDeps, opts: FastifyServerOptions = {}) {
  const options: FastifyServerOptions = {
    // Same as proxy-addr's numeric setting: trust the first N hops only.
    trustProxy: (_addr: string, hop: number) => hop < (deps.trustProxyHops ?? 0),
    bodyLimit: BODY_LIMIT,
    ...opts,
  };
  const app = Fastify(options);
  const checker = createChecker({ ...deps, log: app.log });
  app.decorate("checker", checker);

  void app.register(cors, { origin: deps.corsOrigins ?? false });
  addSecurityHeaders(app);

  // Errors: say what was wrong with a bad request, but never send the details
  // of a server error (they can contain SQL, hostnames or stack traces).
  app.setErrorHandler((err: FastifyError, req, reply) => {
    const status = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
    if (status >= 500) {
      req.log.error({ err }, "request failed");
      return reply
        .code(500)
        .send({ error: "internal_error", reason: "Something went wrong. Please try again." });
    }
    return reply.code(status).send({ error: "bad_request", reason: err.message });
  });

  app.get("/health", async (_req, reply) => {
    const [db, cache] = await Promise.all([deps.store.ping(), deps.cache.ping()]);
    const ok = db && cache;
    return reply.code(ok ? 200 : 503).send({ status: ok ? "ok" : "degraded", db, cache });
  });

  v1Routes(app, { checker, cache: deps.cache, store: deps.store, salt: deps.salt });

  return app;
}

declare module "fastify" {
  interface FastifyInstance {
    checker: ReturnType<typeof createChecker>;
  }
}
