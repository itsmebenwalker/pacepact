# PacePact — Web UI Kit

A clickable recreation of PacePact's Next.js web app. Components mirror the real codebase (`pacepact/components/**`) one-to-one — same Tailwind classnames, same layout grid, same zinc neutrals + Strava orange accent.

## Run

Open `index.html` directly in a browser. No build step — Tailwind via CDN, React/Babel via UMD. Route persists to `localStorage` so refresh keeps your place.

## Flow

`Login → Dashboard → New group (3-step) / Group home → Profile`

- **Login** — magic-link style screen, with a "(prototype) skip" shortcut.
- **Dashboard** — list of groups as `GroupCard`s; "New group" CTA top right.
- **New group** — 3-step form: Event details → Ambition → Review. Generate has a fake 1.8s loading state.
- **Group home** — 2-col grid. Left: three weeks (past-complete / past-incomplete / active) with `SessionCard`s including a pending brick leg at 50%. Right: `Leaderboard` + `MessageBoard` (live local-only).
- **Profile** — account, Strava connect/disconnect toggle, notification preferences.

## File map

| File | What it contains |
|---|---|
| `Icons.jsx` | Lucide-style inline SVG icons (2px stroke, round caps) — bell, check, info, chevron, sun/moon, message, etc. |
| `Chrome.jsx` | `TopNav`, `Pill`, `Button` (primary/secondary/ghost/danger) |
| `LoginScreen.jsx` | Magic-link login + "check your inbox" state |
| `Dashboard.jsx` | `Dashboard` + `GroupCard`, plus `EVENT_LABELS` / `AMBITION_LABELS` |
| `Training.jsx` | `SessionCard` (incl. pending-brick progress), `WeekView` with status-colored header |
| `GroupPanels.jsx` | `Leaderboard` (top-5 + self-pinned), `MessageBoard` (in-memory send) |
| `GroupHome.jsx` | Full group screen — header, actions `•••` menu, plan column, side column |
| `NewGroup.jsx` | 3-step create-group form |
| `Profile.jsx` | Account + Strava + notification toggles |
| `index.html` | App shell that imports everything and wires routing |

## What's faithful vs simplified

**Faithful to the codebase:** component structure, Tailwind classnames (zinc-50..950, green-50..950 for done states, Strava `#FC5200` for that one link, rounded-md/lg, border-zinc-200), dark mode (`class` strategy), `tabular-nums` on numeric columns, the 5+self leaderboard pattern, the uppercase-tracking-wide session labels, the `•••` actions menu model.

**Simplified:** no real auth, no Supabase Realtime (messages are local-only), no Strava OAuth (toggled locally on Profile), no Claude call (fake 1.8s delay), no `/groups/[id]/plan` or `/members` sub-pages.

## Not included (out of scope for a UI kit)

- `/join/[inviteCode]` landing
- `/support` and `/privacy` static pages
- Week-in-review panel (exists in codebase, rare use)
- Kick/transfer admin flows (visible in the menu but not wired up)
