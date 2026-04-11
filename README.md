# PacePact

Social training platform for groups of friends preparing for the same endurance event. PacePact generates an AI-powered training plan for the group, automatically marks sessions complete via Strava webhooks, and keeps everyone accountable on a shared live leaderboard.

## Features

- **Group training plans** — Claude generates a structured plan based on event type, date, and training ambition (`finish` / `pb` / `podium`)
- **Strava auto-sync** — sessions are marked complete when you log a matching Strava activity; matched by activity type and weekly schedule, not exact date
- **Live leaderboard** — Supabase Realtime keeps scores updated for everyone in the group simultaneously
- **Group chat** — per-group message board with real-time updates via Supabase Realtime
- **In-app notifications** — real-time bell in the nav; activity confirmations are always on, message notifications are opt-in per user
- **Invite links** — 8-character invite codes let friends join a group in one click
- **Points system** — base points per session, plus bonuses for completing early, exceeding targets, and maintaining a streak
- **Week view** — training weeks show date ranges, past weeks are visually locked (green = complete, grey = missed), active week sorted to top
- **Rest day handling** — rest sessions are excluded from the session grid; a note shows how many rest days are recommended for the week
- **Magic link auth** — passwordless sign-in via email OTP using Resend; styled email template matches the app
- **Strava connect / disconnect** — connect Strava on the profile page; disconnect deauthorizes the Strava token and clears stored credentials

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (Postgres + Auth + Realtime) |
| Hosting | Railway |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) |
| External API | Strava API v3 (OAuth + Webhooks) |
| Styling | Tailwind CSS |
| Email | Resend |

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/your-org/pacepact.git
cd pacepact
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Fill in all values — see docs/setup.md

# 3. Apply database schema
# Run migrations in supabase/migrations/ in your Supabase SQL editor

# 4. Start dev server
npm run dev
```

See [docs/setup.md](docs/setup.md) for the full setup walkthrough including Supabase, Strava API, and Railway deployment.

## Project structure

```
pacepact/
├── app/
│   ├── (auth)/               # Login + signup pages (magic link / OTP)
│   ├── (app)/                # Authenticated app routes
│   │   ├── dashboard/        # All groups overview
│   │   ├── groups/
│   │   │   ├── new/          # Create group + generate plan
│   │   │   └── [groupId]/    # Group home, full plan, members
│   │   ├── profile/          # Strava connect/disconnect, account info
│   │   └── join/[inviteCode]/# Invite link landing page
│   ├── api/
│   │   ├── auth/otp/send/    # Send magic link email via Resend
│   │   ├── strava/
│   │   │   ├── callback/     # OAuth token exchange
│   │   │   ├── disconnect/   # Deauthorize Strava + clear tokens
│   │   │   └── webhook/      # Strava webhook receiver
│   │   ├── groups/
│   │   │   └── generate-plan/# Claude plan generation
│   │   ├── notifications/
│   │   │   └── read-all/     # Mark all notifications as read
│   │   └── user/
│   │       └── delete/       # Delete authenticated user account
│   └── auth/callback/        # Auth callback (handles PKCE + implicit flow)
├── components/
│   ├── leaderboard/          # Real-time leaderboard table
│   ├── training/             # Week view + session cards
│   ├── groups/               # Group cards, create form, invite button, message board
│   ├── notifications/        # NotificationBell — real-time bell icon with dropdown
│   ├── profile/              # Delete account, disconnect Strava, notification settings
│   └── ui/                   # Shared primitives (nav, theme toggle)
├── lib/
│   ├── supabase/             # Browser + server clients
│   ├── strava/               # OAuth, webhook processing, activity matching
│   ├── claude/               # Plan generation prompt + parsing
│   ├── resend/               # Magic link email template
│   ├── groups/               # Session fan-out helper
│   ├── points/               # Points calculation
│   └── utils/                # Week status, date formatting helpers
├── types/index.ts            # Shared TypeScript types
├── supabase/
│   ├── schema.sql            # Full DB schema + RLS policies
│   └── migrations/           # Incremental migrations (e.g. messages table)
└── docs/setup.md             # Setup guide
```

## Development

```bash
npm run dev        # Start dev server on http://localhost:3000
npm run build      # Production build
npm run lint       # ESLint
npm test           # Jest unit + integration tests
npm run test:watch # Watch mode
```

## Testing

Unit tests cover core business logic (points calculator, activity matcher, plan parser, week status, date formatting, webhook notification insertion). Integration tests cover API routes with Supabase mocked — Strava webhook, auth OTP, notification read-all, and profile preference updates.

```bash
npm test                                       # Run all tests
npm test -- --testPathPattern=calculator       # Run specific file
npm test -- --coverage                         # With coverage report
```

## Deployment

PacePact is designed to deploy on [Railway](https://railway.app). See [docs/setup.md](docs/setup.md#deployment) for the full deployment guide including Strava webhook registration.

## Points system

| Action | Points |
|---|---|
| Complete any scheduled session | +10 |
| Session scheduled on Monday or Tuesday | +2 |
| Activity exceeds target by >10% | +3 |
| 7-day streak (session every day) | +5 |

## Auth flow

PacePact uses passwordless magic link authentication:

1. User enters their email on `/login`
2. The server calls `supabase.auth.admin.generateLink()` and sends the link via Resend
3. User clicks the link → `/auth/callback` (client component)
4. The callback page handles both flows:
   - **PKCE** (`?code=` query param): exchanges code for session
   - **Implicit** (`#access_token=` in URL hash): calls `setSession()` directly — the hash is never sent to the server, so this must be handled client-side
5. Profile is upserted, user is redirected to `/dashboard`

## Strava activity matching

When a Strava webhook arrives, PacePact matches the activity to a planned session by:

1. Finding incomplete sessions for that user scheduled in the same calendar week as the activity
2. Filtering by activity type (run, ride, swim, etc.)
3. Checking the activity meets ≥ 85% of any distance or duration target
4. Matching to the earliest qualifying session in the week

Multiple activities in the same week can each match a different session — completing two runs on the same day will mark off two run sessions if both are scheduled that week.

## Environment variables

See [.env.local.example](.env.local.example) for all required variables.
