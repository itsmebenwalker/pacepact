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
- `profiles` — user profile data extending Supabase Auth (cascades on user delete)
- `groups` — training groups with generated plans
- `group_members` — membership + point totals
- `sessions` — individual training sessions per user per group
- `strava_webhook_events` — raw webhook payload log
- All RLS policies
- A trigger that auto-creates a profile row on signup

Then apply each migration in `supabase/migrations/` in filename order:

```
supabase/migrations/20260402_add_messages.sql               # Group chat
supabase/migrations/20260411_add_notifications.sql          # Notification system
supabase/migrations/20260412_add_deferred_webhook_processing.sql  # Brick detection + deferred processing
```

The notifications migration adds:
- `notify_admin_message` / `notify_any_message` columns to `profiles`
- `notifications` table with RLS
- A Postgres trigger that fans out message notifications to opted-in members

The deferred webhook processing migration adds:
- `process_after` column on `strava_webhook_events` — events are not processed until this timestamp elapses (default: 30 seconds after arrival)
- A partial index on `(process_after) where processed = false` for fast cron queries
- Cron setup instructions in the migration file comments (see below)

> **Existing installs**: if you applied the schema before this was fixed, run the following to add the missing cascade:
> ```sql
> ALTER TABLE profiles
> DROP CONSTRAINT profiles_id_fkey,
> ADD CONSTRAINT profiles_id_fkey
>   FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
> ```

### 2.3 Set up the webhook processing cron

Strava webhook events are stored immediately but processed 30 seconds later, so all legs of a Garmin multisport (brick) activity arrive before matching runs. A cron job must call `POST /api/strava/process-webhooks` every minute.

**Option A — Supabase pg_cron + pg_net** (requires the `pg_net` extension, available on paid Supabase plans):

Open the SQL editor and run:

```sql
select cron.schedule(
  'process-strava-webhooks',
  '* * * * *',
  $$
    select net.http_post(
      url     := 'https://your-app.railway.app/api/strava/process-webhooks',
      body    := '{}'::jsonb,
      headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET')
    )
  $$
);
```

**Option B — Railway cron service**: Add a cron service in the Railway dashboard that sends `POST https://your-app.railway.app/api/strava/process-webhooks` with header `Authorization: Bearer YOUR_CRON_SECRET` every minute (`* * * * *`).

Set `CRON_SECRET` to any strong random string in your Railway environment variables. The same value must be used in both places.

### 2.4 Enable Realtime

Go to **Database → Replication** in your Supabase dashboard and enable replication for the following tables:

| Table | Powers |
|---|---|
| `group_members` | Live leaderboard |
| `messages` | Live group chat |
| `notifications` | Real-time notification bell |

The migrations add these tables to `supabase_realtime` automatically via `ALTER PUBLICATION`, but you can verify in the dashboard under Database → Replication.

### 2.5 Create user accounts

Signup is disabled by default (`NEXT_PUBLIC_SIGNUP_ENABLED=false`). Create user accounts manually in the Supabase dashboard under **Authentication → Users → Add user**. Set an email and password — users sign in with email and password directly.

To allow self-signup (e.g. during testing), set `NEXT_PUBLIC_SIGNUP_ENABLED=true` in your environment. Signup uses a magic link flow.

### 2.6 Configure Auth redirect URLs

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
CRON_SECRET=any-strong-random-string   # Must match the value used in your cron job
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
| `strava/activity-matcher.test.ts` | Type matching, date window, distance/duration thresholds, multi-candidate selection, brick session detection |
| `strava/webhook-processor.test.ts` | Multi-group matching, `isRealRide`/`isRealRun` helpers, brick batch classification |
| `claude/generate-plan.test.ts` | JSON parsing, markdown stripping, validation |
| `utils/week-in-review.test.ts` | Review week selection, stat aggregation, teaser copy, streak detection, member ranking |

### Integration tests

Located in `__tests__/integration/`. Cover API routes with Supabase mocked via `jest.mock`.

| File | What's tested |
|---|---|
| `api/strava/webhook.test.ts` | GET challenge verification, POST stores event with process_after, deferred processing confirmed |
| `api/strava/process-webhooks.test.ts` | Auth enforcement, batch grouping by (owner_id, event_time), error resilience |
| `api/strava/disconnect.test.ts` | Strava deauthorize, token clearing, error handling |
| `api/auth/otp-send.test.ts` | Magic link generation and email delivery |
| `api/notifications/read-all.test.ts` | Auth guard, marks all unread as read |
| `api/user/profile-notifications.test.ts` | Notification preference updates, field validation |

---

## Troubleshooting

**Can't sign in**
- Confirm the user exists in Supabase → Authentication → Users
- Check Supabase logs under Authentication → Logs for magic link delivery issues
- If the magic link opens in a different browser than the one that requested it, it will still work — the OTP send route uses implicit flow (`flowType: 'implicit'`) to avoid PKCE cross-browser failures

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

**Notifications not appearing**
- Confirm Realtime replication is enabled for the `notifications` table in Supabase → Database → Replication
- Confirm the `20260411_add_notifications.sql` migration has been applied
- Activity confirmation notifications are always on — if those aren't appearing, check that `processWebhookEvent` is completing successfully (see webhook troubleshooting above)
- Message notifications only fire if the recipient has opted in via Profile → Notifications; the opt-in is `false` by default

**Garmin brick workout not completing a brick session**
- Strava splits Garmin multisport activities into separate ride, transition, and run activities that all share the same `owner_id` and `event_time`
- Confirm the `20260412_add_deferred_webhook_processing.sql` migration has been applied
- Confirm the cron job is running: check Railway logs or Supabase pg_cron history for `POST /api/strava/process-webhooks` calls every minute
- The ride + run batch is detected automatically; the Workout/Transition segment is intentionally ignored
- Check `strava_webhook_events` to confirm all three activities arrived (`processed = false` rows with the same `event_time`). If only one leg is present, the cron will still run but no brick session will be matched
