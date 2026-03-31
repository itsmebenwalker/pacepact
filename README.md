# PacePact

Social training platform for groups of friends preparing for the same endurance event. PacePact generates an AI-powered training plan for the group, automatically marks sessions complete via Strava webhooks, and keeps everyone accountable on a shared live leaderboard.

## Features

- **Group training plans** — Claude generates a structured plan based on event type, date, and training ambition
- **Strava auto-sync** — sessions are marked complete when you log a matching Strava activity, no manual input
- **Live leaderboard** — Supabase Realtime keeps scores updated for everyone in the group simultaneously
- **Invite links** — 8-character invite codes let friends join a group in one click
- **Points system** — base points per session, plus bonuses for completing early, exceeding targets, and maintaining a streak
- **Dark mode** — system preference detected on load, with a manual toggle

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
# Run supabase/schema.sql in your Supabase SQL editor

# 4. Start dev server
npm run dev
```

See [docs/setup.md](docs/setup.md) for the full setup walkthrough including Supabase, Strava API, and Railway deployment.

## Project structure

```
pacepact/
├── app/
│   ├── (auth)/               # Login + signup pages
│   ├── (app)/                # Authenticated app routes
│   │   ├── dashboard/        # All groups overview
│   │   ├── groups/
│   │   │   ├── new/          # Create group + generate plan
│   │   │   └── [groupId]/    # Group home, full plan, members
│   │   ├── profile/          # Strava connect, account info
│   │   └── join/[inviteCode]/# Invite link landing page
│   ├── api/
│   │   ├── strava/
│   │   │   ├── callback/     # OAuth token exchange
│   │   │   └── webhook/      # Strava webhook receiver
│   │   └── groups/
│   │       └── generate-plan/# Claude plan generation
│   └── auth/callback/        # Auth callback handler (magic link / OAuth)
├── components/
│   ├── leaderboard/          # Real-time leaderboard table
│   ├── training/             # Week view + session cards
│   ├── groups/               # Group cards, create form, invite button
│   └── ui/                   # Shared primitives (nav, theme toggle)
├── lib/
│   ├── supabase/             # Browser + server clients
│   ├── strava/               # OAuth, webhook processing, activity matching
│   ├── claude/               # Plan generation prompt + parsing
│   ├── groups/               # Session fan-out helper
│   └── points/               # Points calculation
├── types/index.ts            # Shared TypeScript types
├── supabase/schema.sql       # Full DB schema + RLS policies
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

Unit tests cover the core business logic (points calculator, activity matcher, plan parser). Integration tests cover the Strava webhook route.

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

## Environment variables

See [.env.local.example](.env.local.example) for all required variables.
