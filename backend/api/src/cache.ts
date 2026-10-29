import { Redis } from "ioredis";

// The few cache operations Sachet needs. Redis (Upstash) in production,
// in-memory when REDIS_URL is not set.
export interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  /** Sets only if the key does not exist. Returns true if it was set. */
  setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  del(...keys: string[]): Promise<void>;
  /** Adds 1 and returns the new value; the TTL starts on the first increment. */
  incr(key: string, ttlSeconds: number): Promise<number>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

export function createMemoryCache(now: () => number = Date.now): Cache {
  const data = new Map<string, { value: string; expires: number }>();
  const live = (key: string) => {
    const e = data.get(key);
    if (e && e.expires <= now()) {
      data.delete(key);
      return undefined;
    }
    return e;
  };

  return {
    async get(key) {
      return live(key)?.value ?? null;
    },
    async set(key, value, ttl) {
      data.set(key, { value, expires: now() + ttl * 1000 });
    },
    async setIfAbsent(key, value, ttl) {
      if (live(key)) return false;
      data.set(key, { value, expires: now() + ttl * 1000 });
      return true;
    },
    async del(...keys) {
      for (const k of keys) data.delete(k);
    },
    async incr(key, ttl) {
      const e = live(key);
      const next = Number(e?.value ?? 0) + 1;
      data.set(key, { value: String(next), expires: e?.expires ?? now() + ttl * 1000 });
      return next;
    },
    async ping() {
      return true;
    },
    async close() {},
  };
}

export function createRedisCache(url: string): Cache {
  const redis = new Redis(url, { maxRetriesPerRequest: 2, enableOfflineQueue: false });
  return {
    get: (key) => redis.get(key),
    async set(key, value, ttl) {
      await redis.set(key, value, "EX", ttl);
    },
    async setIfAbsent(key, value, ttl) {
      return (await redis.set(key, value, "EX", ttl, "NX")) === "OK";
    },
    async del(...keys) {
      if (keys.length) await redis.del(...keys);
    },
    async incr(key, ttl) {
      // MULTI makes INCR + EXPIRE one step; NX keeps the first window's TTL.
      const res = await redis.multi().incr(key).expire(key, ttl, "NX").exec();
      return Number(res?.[0]?.[1] ?? 0);
    },
    async ping() {
      try {
        return (await redis.ping()) === "PONG";
      } catch {
        return false;
      }
    },
    async close() {
      redis.disconnect();
    },
  };
}
