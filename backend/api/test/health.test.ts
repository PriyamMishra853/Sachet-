import { afterAll, describe, expect, it } from "vitest";
import { makeTestApp } from "./helpers.js";

describe("GET /health", () => {
  const { app } = makeTestApp();
  afterAll(() => app.close());

  it("reports database and cache status", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok", db: true, cache: true });
  });
});
