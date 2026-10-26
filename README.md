# Sachet

**Stop the scam before the payment.** A real-time scam check for phone numbers, UPI IDs, links
and messages, in Hindi and English. "Sachet" means alert in Hindi.

V1 (26 Oct – 9 Nov 2026) answers one question: _"Is this a scam?"_ When Sachet doesn't know
something, it never says "safe"; it says "No reports yet" and lists the warning signs it found.

## Repo layout

```
apps/
  api/        Fastify server: routes, webhooks, jobs
  web/        Next.js web app (from Day 12)
packages/
  core/       normalizers, extractor, rules, verdict (pure functions: no network, no database)
data/
  test-messages/  labelled scam and normal messages (names removed)
```

All channels (Telegram, WhatsApp, web) call the same API, and all scam logic lives in
`packages/core`, so it is easy to test.

## Setup

Needs Node.js 20+ and pnpm 9.

```bash
pnpm install
pnpm test          # all unit tests
pnpm lint          # ESLint
pnpm typecheck     # TypeScript, no emit
pnpm dev:api       # API on http://localhost:3000/health
```

Copy `.env.example` to `.env` for local secrets. `.env` is git-ignored; never commit keys.

## Status

| Day | Build                                    | Status      |
| --- | ---------------------------------------- | ----------- |
| 1   | Monorepo, TypeScript, ESLint, Vitest, CI | Done        |
| 2   | Normalizers: phone, UPI ID, URL          | In progress |
