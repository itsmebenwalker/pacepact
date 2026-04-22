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
supabase/migrations/20260402_add_messages.sql                       # Group chat
supabase/migrations/20260411_add_notifications.sql                  # Notification system
supabase/migrations/20260411_add_brick_activity_parts.sql           # Garmin brick detection (superseded)
supabase/migrations/20260412_extend_brick_activity_parts.sql        # Brick combined stats (superseded)
supabase/migrations/20260413_brick_activity_parts_ui.sql            # Brick progress UI + RLS (superseded)
supabase/migrations/20260414_recreate_brick_activity_parts.sql      # Clean rebuild of brick table
supabase/migrations/20260415_brick_parts_nullable_external_id.sql   # Allow non-Garmin activities to park (superseded)
supabase/migrations/20260416_group_admin_features.sql               # invite_locked + group_member_bans
supabase/migrations/20260422_drop_external_id_brick_activity_parts.sql  # Drop external_id; switch to same-day matching
supabase/migrations/20260417_add_session_tip.sql                    # tip column on sessions
supabase/migrations/20260418_allow_manual_complete.sql              # allow_manual_complete on groups
```

> **Note**: the three `brick_activity_parts` migrations marked "superseded" are replaced by `20260414_recreate_brick_activity_parts.sql`. On a fresh install you can skip them and run only the final one. On an existing install, run all four in order — the final migration drops and recreates the table cleanly.

The notifications migration adds:
- `notify_admin_message` / `notify_any_message` columns to `profiles`
- `notifications` table with RLS
- A Postgres trigger that fans out message notifications to opted-in members

The group admin migration adds:
- `invite_locked boolean DEFAULT false` column to `groups` — when true, the join page rejects new members with an "Invites closed" message
- `group_member_bans` table — records users kicked by the creator, preventing rejoin via any invite link; RLS allows users to read their own ban rows (needed for the join-gate check)

The `allow_manual_complete` migration adds:
- `allow_manual_complete boolean NOT NULL DEFAULT true` column to `groups` — when false, the "Mark done manually" button is hidden for all members. Defaults to `true` so existing groups are unaffected. Toggled by the group creator via the ••• menu.

The brick activity parts migrations add:
- `brick_activity_parts` table — in any week with a pending brick session, any incoming run or ride is stored here until it is either manually assigned by the user or auto-released when the brick completes
- `distance_km` / `duration_minutes` columns — stored so both Garmin legs can be combined and validated against the brick session target (85% threshold) when the second leg arrives
- `group_id`, `strava_activity_id`, `activity_name`, `activity_date` columns — context needed for the progress bar UI and manual assignment
- RLS SELECT policy so the client can read its own pending parts

> **Existing installs**: if you applied the schema before this was fixed, run the following to add the missing cascade:
> ```sql
> ALTER TABLE profiles
> DROP CONSTRAINT profiles_id_fkey,
> ADD CONSTRAINT profiles_id_fkey
>   FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
> ```

### 2.3 Enable Realtime

Go to **Database → Replication** in your Supabase dashboard and enable replication for the following tables:

| Table | Powers |
|---|---|
| `group_members` | Live leaderboard |
| `messages` | Live group chat |
| `notifications` | Real-time notification bell |

The migrations add these tables to `supabase_realtime` automatically via `ALTER PUBLICATION`, but you can verify in the dashboard under Database → Replication.

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
| `strava/activity-matcher.test.ts` | Type matching, date window, distance/duration thresholds, multi-candidate selection, brick session detection, combined stats validation |
| `strava/webhook-processor.test.ts` | Multi-group matching logic, brick detection coordination |
| `strava/webhook-notifications.test.ts` | Activity matched notification insertion |
| `claude/generate-plan.test.ts` | JSON parsing, markdown stripping, validation |
| `resend/otp-email.test.ts` | Magic link email rendering |
| `utils/week-in-review.test.ts` | Review week selection, stat aggregation, teaser copy, streak detection, member ranking |
| `utils/week-status.test.ts` | Week state classification (past-complete, past-incomplete, active) |
| `utils/format-time.test.ts` | Message timestamp formatting |
| `training/week-date-range.test.ts` | Week date range calculation |
| `groups/join-gate.test.ts` | Join gate evaluation: locked, banned, both, neither |

### Integration tests

Located in `__tests__/integration/`. Cover API routes with Supabase mocked via `jest.mock`.

| File | What's tested |
|---|---|
| `api/strava/webhook.test.ts` | GET challenge verification, POST event processing, non-activity events ignored |
| `api/strava/disconnect.test.ts` | Strava deauthorize, token clearing, error handling |
| `api/auth/otp-send.test.ts` | Magic link generation and email delivery |
| `api/notifications/read-all.test.ts` | Auth guard, marks all unread as read |
| `api/user/profile-notifications.test.ts` | Notification preference updates, field validation |
| `api/activities/assign.test.ts` | Auth guard, part ownership, session lookup, completion flow |
| `api/groups/members.test.ts` | Kick+ban member, transfer creator — auth guards, self-action prevention, DB mutations |
| `api/groups/group-admin.test.ts` | Rotate invite code, lock/unlock invites — auth guards, toggle direction, DB mutations |
| `api/groups/leave.test.ts` | Leave group — auth guard, creator blocked, non-member guard, success path |

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

**Brick workout not completing a brick session**
- Confirm all brick migrations have been applied in filename order through `20260422_drop_external_id_brick_activity_parts.sql`
- In any week containing a brick session, every incoming run or ride is parked in `brick_activity_parts` and shown as a 50% progress bar on the brick session card. The user can tap **"Count as ride/run session instead"** to manually assign it to a matching standalone session at any time
- When a second complementary leg (opposite type) arrives on the same calendar date, combined stats are validated against the 85% rule and the brick session is marked complete automatically. Any other activities parked earlier that week (orphans) are then matched to remaining standalone sessions
- If the combined distance/duration doesn't reach 85% of the session target, the brick won't auto-complete — the user will need to manually assign each leg
