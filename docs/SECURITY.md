# Sachet security

How Sachet is protected, what is still open, and what to check before launch.
Found a problem? Report it privately on GitHub (repo → Security → Report a vulnerability),
not in a public issue.

## Architecture and trust boundaries

```mermaid
flowchart LR
  subgraph Internet [Untrusted: anyone can send anything]
    U[Browser / PWA]
    TGS[Telegram servers]
    META[Meta WhatsApp servers]
  end
  U -->|HTTPS, CORS, X-Client-Id| EDGE
  TGS -->|secret-token header| EDGE
  META -->|HMAC-SHA256 signature| EDGE
  subgraph Railway [Trusted: our server]
    EDGE[Railway proxy<br/>adds real client IP] --> API[Fastify API<br/>zod validation · rate limits<br/>security headers]
    API --> CORE[backend/core<br/>pure functions]
  end
  API -->|TLS, verified with CA cert| PG[(Supabase Postgres<br/>RLS on, hashed IDs)]
  API -->|TLS rediss://| R[(Upstash Redis)]
  API -->|HTTPS, 800 ms timeout| SB[Google Safe Browsing]
  W[Vercel: Next.js PWA<br/>CSP, HSTS] -.serves.-> U
  A[Android app<br/>HTTPS only, no permissions<br/>but Internet] -->|HTTPS, X-Client-Id| EDGE
```

Everything left of the Railway proxy is untrusted. Each way in proves who it is:

| Way in             | How the API knows it's genuine                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Web app            | It doesn't: anyone can call the API. So every route validates input, is rate-limited, and returns only public facts. |
| Telegram webhook   | `X-Telegram-Bot-Api-Secret-Token` must equal `TELEGRAM_WEBHOOK_SECRET` (constant-time compare). Otherwise 401.       |
| WhatsApp webhook   | `X-Hub-Signature-256` must be the HMAC of the raw body with `WHATSAPP_APP_SECRET` (constant-time). Otherwise 401.    |
| WhatsApp setup GET | `hub.verify_token` must equal `WHATSAPP_VERIFY_TOKEN` (constant-time). Otherwise 403.                                |

## Threats and what stops them

| Threat                                                                      | Control                                                                                                                                                                                                                                | Test                                         |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **Report poisoning**: one person marks an honest shop's number HIGH RISK    | HIGH needs 3 _different_ reporters. On the web the browser ID is made up by the client, so reports also count once per network (IPv4 address or IPv6 /64) per identifier for 30 days. 20 reports/hour per person, 30/hour per network. | `v1.test.ts`: "faking many browser IDs"      |
| **Faked IP** (`X-Forwarded-For: 1.2.3.4`) to dodge rate limits              | The API trusts only `TRUST_PROXY_HOPS` proxies (1 on Railway) and reads the IP the proxy saw, never the client's own entry.                                                                                                            | `security.test.ts`: "client IP behind proxy" |
| **Fake bot messages** to make the bot spam people or file fake reports      | Webhook secret (Telegram) and signature (WhatsApp) above. WhatsApp message IDs are handled once.                                                                                                                                       | `telegram.test.ts`, `bots.test.ts`           |
| **Flooding** (cost, Safe Browsing quota, database rows)                     | 60 checks/min per network on the web, 20 checks/min per chat on the bots, 64 KB body limit, 4,000-character messages, 10 identifiers per report.                                                                                       | `v1.test.ts`, `security.test.ts`             |
| **Inflating "money protected"** by answering "Did you pay?" for others      | Only the browser or chat that made the check can answer (`WHERE user_hash = …`). The reply is 204 either way, so it doesn't reveal which IDs exist.                                                                                    | `v1.test.ts`, `store.test.ts`                |
| **Deleting someone else's data**                                            | `DELETE /v1/me` needs the browser's random ID; it never falls back to the IP (shared by hostels, offices, mobile carriers). Private-mode browsers get a fresh ID per visit, not a shared one.                                          | `v1.test.ts`                                 |
| **SQL injection**                                                           | Every query uses `$1` parameters; no SQL is built from input.                                                                                                                                                                          | code review                                  |
| **Supabase REST API reading our tables** with the public anon key           | Row Level Security is on for all 4 tables with no policies; only the API (database owner) can read.                                                                                                                                    | `001_init.sql`                               |
| **Database impersonation** (man in the middle)                              | TLS always; with `DATABASE_CA_CERT` the server certificate is verified too. The API warns at startup if it isn't set.                                                                                                                  | –                                            |
| **XSS** on the web app                                                      | React escapes all text; no `dangerouslySetInnerHTML`. CSP allows scripts only from Sachet's own site and network calls only to the Sachet API. `object-src 'none'`, `base-uri 'self'`.                                                 | headers checked in a browser                 |
| **Clickjacking**                                                            | `frame-ancestors 'none'` and `X-Frame-Options: DENY` on the web app and the API.                                                                                                                                                       | `security.test.ts`                           |
| **Leaking internals** in error messages                                     | 5xx answers say only "Something went wrong"; the details go to the server log.                                                                                                                                                         | `security.test.ts`                           |
| **Stale "No reports yet"** served from a cache                              | API sends `Cache-Control: no-store`; the service worker never caches answers.                                                                                                                                                          | `security.test.ts`                           |
| **Shared message leaking** from `/share?text=…`                             | Removed from the address bar and history as soon as it's read; `Referrer-Policy: no-referrer`.                                                                                                                                         | checked in a browser                         |
| **Any website calling the API** from a visitor's browser                    | CORS allows only `CORS_ORIGINS`; `*` is refused in production.                                                                                                                                                                         | `security.test.ts`                           |
| **Weak secrets**                                                            | Production refuses to start with `HASH_SALT` under 32 characters or a webhook secret under 24.                                                                                                                                         | `security.test.ts`                           |
| **Vulnerable dependencies**                                                 | `pnpm audit --prod` is clean (Zod 4.6.7, PostCSS ≥ 8.5.23). Lockfile is frozen in Docker and CI.                                                                                                                                       | `pnpm audit --prod`                          |
| **Android app reading the phone's data**                                    | The only permission is Internet: no SMS, contacts, call log or location. 1930 uses the dialer, which needs no permission.                                                                                                              | `AndroidManifest.xml`                        |
| **Reading the Android app's traffic** (public Wi-Fi, a planted certificate) | Release builds allow HTTPS only and trust only the phone's built-in certificates, not user-added ones. No https→http redirects. Release refuses to build with an http API URL.                                                         | `network_security_config.xml`                |
| **Android app data leaking** through backups                                | Backups and device-to-device transfer are off; the app stores only a random ID and the language.                                                                                                                                       | `data_extraction_rules.xml`                  |
| **Container break-out impact**                                              | The API runs as the unprivileged `node` user, production dependencies only.                                                                                                                                                            | `Dockerfile`                                 |

## What Sachet stores

| Data                                | Where    | Form                                                                | Kept                   |
| ----------------------------------- | -------- | ------------------------------------------------------------------- | ---------------------- |
| Who reported / checked              | Postgres | HMAC-SHA256 of chat ID, phone or browser ID, with `HASH_SALT`       | until "delete my data" |
| Reported message text               | Postgres | Redacted: names, OTPs, Aadhaar, PAN, cards, accounts, emails        | until "delete my data" |
| Network a web report came from      | Redis    | HMAC of the IP / IPv6 prefix, never the IP                          | 30 days                |
| Raw chat ID for the follow-up       | Redis    | plain (needed to send the message)                                  | 48 hours at most       |
| Last checked message (for "Report") | Redis    | plain                                                               | 1 hour                 |
| Server logs                         | Railway  | no message text, chat IDs, IPs or checked values (no query strings) | Railway's retention    |

## Known gaps (accepted for V1)

- **Report poisoning with many networks or accounts.** Someone with several SIMs or Telegram
  accounts can still reach 3 reporters. Mitigations for V2: weigh reports by reporter age and
  history, require one bot reporter for HIGH, a review queue for business numbers, and an
  appeal form for wrongly flagged numbers.
- **Carrier-grade NAT.** Many Jio/Airtel IPv4 users share one address, so their web reports
  can count as one network. This undercounts; it never makes something look riskier.
- **`'unsafe-inline'` scripts in the CSP.** Next.js needs inline bootstrap scripts; nonce-based
  CSP needs per-request rendering. Planned once the site has a server component.
- **Vercel access logs** contain `/share?text=…` URLs (the page strips it from the browser, not
  from the request log). A POST share target handled by the service worker would avoid this.
- **No authentication for operators.** There is no admin panel in V1; anything administrative
  is done directly in Supabase.

## Secrets

- Live only in `.env` (git-ignored) and the Railway / Vercel dashboards. Never in code,
  commits, screenshots or chat.
- `NEXT_PUBLIC_API_URL` is the only web variable, and it's public by design. No secret goes in a
  `NEXT_PUBLIC_` variable.
- If a secret leaks: rotate it at the source (BotFather `/revoke`, Meta app secret, Supabase
  password, Upstash password), update Railway, redeploy. Never rotate `HASH_SALT`: it would split
  every reporter into a new identity.

## Launch checklist

- [ ] `pnpm audit --prod` shows no known vulnerabilities.
- [ ] Railway: `NODE_ENV=production`, `HASH_SALT` 32+ chars, `CORS_ORIGINS` = the Vercel URL only.
- [ ] Railway: `DATABASE_CA_CERT` set; the startup log has no "isn't verified" warning.
- [ ] Railway log after a web check shows a real client IP, not Railway's (else adjust `TRUST_PROXY_HOPS`).
- [ ] `curl -i https://<api>/webhooks/telegram -X POST` → 401; same for `/webhooks/whatsapp`.
- [ ] Supabase → Table editor shows "RLS enabled" on all 4 tables.
- [ ] `curl -I https://<web>` shows `Content-Security-Policy` and `Strict-Transport-Security`.
- [ ] GitHub repo → Settings → Secret scanning and Dependabot alerts switched on.
