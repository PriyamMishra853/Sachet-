import pg from "pg";

// The two methods Sachet needs from a Postgres client. Both node-postgres
// (production, Supabase) and PGlite (tests: real Postgres inside Node) fit
// this shape, so the same store code runs against either.
export interface Sql {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
  /** Runs one or more statements without parameters (used for migrations). */
  exec(text: string): Promise<unknown>;
  close?(): Promise<void>;
}

export function connectPostgres(databaseUrl: string, opts: { caCert?: string } = {}): Sql {
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(databaseUrl);
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 5,
    // Supabase requires TLS, signed by Supabase's own CA (not in Node's list).
    // With that CA certificate (DATABASE_CA_CERT) we verify the server, so
    // nobody in between can pretend to be the database. Without it the
    // connection is still encrypted but not verified.
    ssl: isLocal
      ? undefined
      : opts.caCert
        ? { ca: pemOrBase64(opts.caCert), rejectUnauthorized: true }
        : { rejectUnauthorized: false },
  });
  // bigint ids come back as strings by default; ours fit in a JS number.
  pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));

  return {
    query: async <T>(text: string, params?: unknown[]) => {
      const res = await pool.query(text, params);
      return { rows: res.rows as T[] };
    },
    exec: (text) => pool.query(text),
    close: () => pool.end(),
  };
}

// Hosts that can't store multi-line values get the certificate base64-encoded.
function pemOrBase64(cert: string): string {
  const v = cert.trim();
  return v.startsWith("-----BEGIN") ? v : Buffer.from(v, "base64").toString("utf8");
}
