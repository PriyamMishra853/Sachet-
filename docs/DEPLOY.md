# Deploying Sachet V1

The API (with the Telegram bot) runs on **Railway** from `backend/api/Dockerfile`. The web app runs
on **Vercel**. Both deploy from the GitHub repo, so every push to `main` redeploys them.

You need: the code pushed to GitHub, a Railway account and a Vercel account (sign in to both
with GitHub). Never paste keys into chat, commits or screenshots; type them only into the
Railway / Vercel dashboards and your local `.env`.

## 0. Push the code

```bash
git status            # .env must NOT be listed
git add -A
git commit -m "Your message"
git push
```

## 1. API on Railway

1. railway.com → **New Project** → **Deploy from GitHub repo** → `PriyamMishra853/Sachet-`.
   Railway reads `railway.json`: it builds `backend/api/Dockerfile` and checks `/health`.
2. Open the service → **Variables** → add:

   | Variable                  | Value                                                                |
   | ------------------------- | -------------------------------------------------------------------- |
   | `NODE_ENV`                | `production`                                                         |
   | `HASH_SALT`               | the same value as in your `.env`, 32+ characters (never change it)   |
   | `TELEGRAM_BOT_TOKEN`      | from @BotFather                                                      |
   | `TELEGRAM_WEBHOOK_SECRET` | a new random string: run `openssl rand -hex 24` and paste the output |
   | `CORS_ORIGINS`            | leave for now; set in step 3                                         |

   Add `DATABASE_URL` and `REDIS_URL` **only once they work locally** (`pnpm dev:api` shows
   `"db":true,"cache":true` at `/health`). A wrong `DATABASE_URL` stops the API from starting.
   Without them the API uses memory, and data is lost on every deploy or restart.
   With `DATABASE_URL`, also add `DATABASE_CA_CERT` (Supabase → Database settings → SSL
   Configuration → Download certificate; paste the whole file), so the API checks it really
   talks to Supabase.

3. **Settings → Networking → Generate Domain**. You get `https://<name>.up.railway.app`.
4. Open `https://<name>.up.railway.app/health` → `{"status":"ok",...}`. In **Deployments →
   logs** you should see `Telegram bot @SachetkroBot ready for webhooks`.

Cost: Railway's trial gives $5 of credit, enough for V1. After that the Hobby plan is $5/month.
(Render's free tier also works with the same Dockerfile, but it sleeps after 15 minutes idle: the
first message after a sleep takes ~1 minute, and the "Did you pay?" timer doesn't run while asleep.)

## 2. Web app on Vercel

1. vercel.com → **Add New → Project** → import `PriyamMishra853/Sachet-`.
2. **Root Directory: `frontend/web`** (Vercel detects Next.js and pnpm by itself).
3. **Environment Variables**: `NEXT_PUBLIC_API_URL` = `https://<name>.up.railway.app`
   (no slash at the end). It is built into the page, so after changing it, redeploy.
4. **Deploy**. You get `https://<project>.vercel.app`.

## 3. Let the web app call the API

Back on Railway → Variables → `CORS_ORIGINS` = `https://<project>.vercel.app`
(comma-separate more than one). Railway redeploys by itself.

## 4. Point the Telegram bot at Railway

1. In your local `.env`, set `TELEGRAM_WEBHOOK_SECRET` to the **same** value as on Railway.
2. Run:

   ```bash
   pnpm telegram:webhook https://<name>.up.railway.app
   ```

   It should print `Telegram now sends updates to: https://<name>.up.railway.app/webhooks/telegram`.

From now on the bot runs on Railway, even with your laptop off. A bot still polling on your
laptop stops (Telegram allows either a webhook or polling, not both). To go back to local
testing: `pnpm telegram:webhook --delete`, and clear `TELEGRAM_WEBHOOK_SECRET` in `.env`.

## 5. WhatsApp bot on the test number

1. Railway → Variables → add the four values from your `.env`: `WHATSAPP_TOKEN`,
   `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`.
2. developers.facebook.com → your app → **WhatsApp → Configuration → Webhook → Edit**:
   - Callback URL: `https://<name>.up.railway.app/webhooks/whatsapp`
   - Verify token: the same `WHATSAPP_VERIFY_TOKEN`
   - Click **Verify and save** (Meta calls the API; it must answer, so deploy first).
3. Under **Webhook fields**, **Subscribe** to `messages`.
4. **WhatsApp → API Setup → To**: add your phone number (and up to 4 testers) and confirm the
   code WhatsApp sends you. The test number only talks to numbers on this list.
5. From your phone, send a scam message to the test number (+1 555 170 5709). Sachet replies
   with the verdict card and a 🚩 Report button.

Limits: the test number can only reply within 24 hours of the user's last message, and the
"Did you pay?" follow-up needs that window too. The access token expires on 26 Dec 2026; make a
new system-user token before then.

## 6. Android app

Debug APKs come from every CI run (Actions → the run → Artifacts → `sachet-debug-apk`). For a
release build signed with your own key, follow "Release build" in
[frontend/android/README.md](../frontend/android/README.md).

## 7. Test on your phone

1. Telegram → @SachetkroBot → `/start`, then forward a scam message.
2. Android Chrome → open `https://<project>.vercel.app` → tap **📲 Install app**
   (or ⋮ menu → **Install app**).
3. WhatsApp → long-press a message → **Share** → **Sachet**. The result opens and is checked
   straight away.

If Sachet doesn't appear in the Share menu: it must be installed (not just bookmarked), and
Android sometimes needs a minute after install. iPhone supports install ("Add to Home Screen")
but not the Share target.
