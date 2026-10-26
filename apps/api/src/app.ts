import Fastify, { type FastifyServerOptions } from "fastify";

// Building the app separately from listen() lets tests call routes with
// app.inject() without opening a real port.
export function buildApp(opts: FastifyServerOptions = {}) {
  const app = Fastify(opts);

  // Day 3/4 add database and Redis status here.
  app.get("/health", async () => ({ status: "ok" }));

  return app;
}
