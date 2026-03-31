# PacePact — Setup Guide

Full walkthrough to get PacePact running locally and deployed to Railway.

---

## Prerequisites

- Node.js 24+
- A [Supabase](https://supabase.com) account (free tier is fine)
- A [Strava API application](https://www.strava.com/settings/api)
- An [Anthropic API key](https://console.anthropic.com)
- A [Resend](https://resend.com) account for email (free tier is fine)
- [Railway](https://railway.app) account for deployment (optional for local dev)

---

## 1. Clone and install

```bash
git clone https://github.com/your-org/pacepact.git
cd pacepact
npm install
```

---

## 2. Supabase setup

### 2.1 Create a project

1. Go to [supabase.com](https://supabase.com) → New project
2. Choose a region close to your users
3. Note your **Project URL** and **anon key** from Settings → API

### 2.2 Apply the schema

Open the SQL editor in your Supabase dashboard and run the entire contents of [`supabase/schema.sql`](../supabase/schema.sql).

This creates:
- `profiles` — user profile data extending Supabase Auth
- `groups` — training groups with generated plans
- `group_members` — membership + point totals
- `sessions` — individual training sessions per user per group
- `strava_webhook_events` — raw webhook payload log
- All RLS policies
- A trigger that auto-creates a profile row on signup

### 2.3 Enable Realtime

Go to **Database → Replication** in your Supabase dashboard and enable replication for the `group_members` table. This powers the live leaderboard.

### 2.4 Create user accounts

Signup is disabled by default (`NEXT_PUBLIC_SIGNUP_ENABLED=false`). Create user accounts manually in the Supabase dashboard under **Authentication → Users → Add user**. Set an email and password — users sign in with email and password directly.

To allow self-signup (e.g. during testing), set `NEXT_PUBLIC_SIGNUP_ENABLED=true` in your environment. Signup uses a magic link flow.

### 2.5 Configure Auth redirect URLs

Go to **Authentication → URL Configuration** and set:

- **Site URL**: `http://localhost:3000` (update to your production URL when deploying)
- **Redirect URLs**: Add `http://localhost:3000/auth/callback` and your production equivalent

These are needed for the magic link signup flow and Strava OAuth callback.

---

## 3. Strava API setup

### 3.1 Create an application

1. Go to [strava.com/settings/api](https://www.strava.com/settings/api)
2. Create a new application
3. Set **Authorization Callback Domain** to `localhost` for local dev, and your Railway domain for production
4. Note your **Client ID** and **Client Secret**

### 3.2 Webhook registration (production only)

Strava webhooks require a publicly accessible URL, so this step is done after deploying to Railway.

Run the following after deployment (replace values with your own):

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=YOUR_STRAVA_CLIENT_ID \
  -F client_secret=YOUR_STRAVA_CLIENT_SECRET \
  -F callback_url=https://your-app.railway.app/api/strava/webhook \
  -F verify_token=YOUR_STRAVA_WEBHOOK_VERIFY_TOKEN
```

`verify_token` must match the `STRAVA_WEBHOOK_VERIFY_TOKEN` value in your environment variables — it's any string you choose.

Strava will call your endpoint to verify it. On success you'll receive a `{"id": ...}` response with the subscription ID. You don't need to store this anywhere.

If you see `"already exists"`, a subscription is already registered. To view it:

```bash
curl -G https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET
```

### 3.3 Local webhook testing

For local development, use [ngrok](https://ngrok.com) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) to expose your local server:

```bash
ngrok http 3000
# Use the https:// URL as your callback_url when registering the webhook
```

---

## 4. Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com) → API Keys
2. Create a new key and copy it

PacePact uses `claude-sonnet-4-20250514`. Plan generation typically costs ~$0.01–0.05 per group depending on the number of weeks.

---

## 5. Resend setup

1. Go to [resend.com](https://resend.com) → API Keys
2. Create a key with **Send access**
3. Optionally configure a sending domain under **Domains**

Resend is used for invite and notification emails. The free tier allows 3,000 emails/month.

---

## 6. Environment variables

Copy the example file and fill in all values:

```bash
cp .env.local.example .env.local
```

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Settings → API → service_role key

# Strava
STRAVA_CLIENT_ID=12345
STRAVA_CLIENT_SECRET=abc123...
STRAVA_WEBHOOK_VERIFY_TOKEN=any-string-you-choose

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Resend
RESEND_API_KEY=re_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SIGNUP_ENABLED=false   # Set to 'true' to allow self-signup
```

> **Security note**: `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It is only used in server-side API routes and is never exposed to the browser. Never commit `.env.local` to version control.

---

## 7. Run locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`.

Sign in with the email and password you set when creating the account in Supabase. Your profile is created automatically by the database trigger on first login.

---

## 8. Deployment (Railway)

### 8.1 Create a Railway project

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select this repository
3. Railway will detect Next.js and configure the build automatically

### 8.2 Set environment variables

In the Railway dashboard → your service → **Variables**, add all the same variables from your `.env.local`, but update:

```
NEXT_PUBLIC_APP_URL=https://your-app.railway.app
```

Also update **Supabase → Authentication → URL Configuration**:
- Site URL: `https://your-app.railway.app`
- Add `https://your-app.railway.app/auth/callback` to Redirect URLs

And update **Strava → Authorization Callback Domain** to your Railway domain.

### 8.3 Register the Strava webhook

After your first successful Railway deploy, run the webhook registration curl command from [step 3.2](#32-webhook-registration-production-only).

### 8.4 Custom domain (optional)

Railway supports custom domains under Settings → Domains. Update `NEXT_PUBLIC_APP_URL`, Supabase redirect URLs, and Strava callback domain to match.

---

## 9. Running tests

```bash
npm test              # All tests
npm run test:watch    # Watch mode
npm test -- --coverage  # Coverage report
```

---

## Testing

### Unit tests

Located in `__tests__/unit/`. Cover pure business logic with no external dependencies.

| File | What's tested |
|---|---|
| `points/calculator.test.ts` | All point bonus combinations |
| `strava/activity-matcher.test.ts` | Type matching, date window, distance/duration thresholds, multi-candidate selection |
| `claude/generate-plan.test.ts` | JSON parsing, markdown stripping, validation |

### Integration tests

Located in `__tests__/integration/`. Cover API routes with Supabase mocked via `jest.mock`.

| File | What's tested |
|---|---|
| `api/strava/webhook.test.ts` | GET challenge verification, POST event processing, non-activity events ignored |

---

## Troubleshooting

**Can't sign in**
- Confirm the user exists in Supabase → Authentication → Users
- Check that the password was set correctly (Supabase allows resetting it from the dashboard)
- If using the signup flow, check Supabase logs under Authentication → Logs for magic link delivery issues

**Strava OAuth fails**
- Confirm `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` are correct
- Check the Authorization Callback Domain in your Strava app settings matches your domain (no `https://`, no path)

**Webhook events not processing**
- Check Railway logs for errors from `processWebhookEvent`
- Verify the webhook is registered: `GET https://www.strava.com/api/v3/push_subscriptions?client_id=X&client_secret=Y`
- Check `strava_webhook_events` table in Supabase — events should appear with `processed = false` if they're arriving but failing

**Plan generation fails**
- Check `ANTHROPIC_API_KEY` is valid and has credits
- The raw Claude response is stored in `groups.training_plan_raw` for debugging bad parses

**Leaderboard not updating in real time**
- Confirm Realtime replication is enabled for `group_members` in Supabase → Database → Replication
- Check the browser console for Supabase channel subscription errors
