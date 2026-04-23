# PacePact Design System

A design system distilled from the PacePact web app — a social training platform
where friends preparing for the same endurance event share a training plan,
auto-complete sessions via Strava webhooks, and compete on a live leaderboard.

## Source material

- **Codebase:** `pacepact/` (Next.js 15 App Router + Tailwind CSS + Supabase).
  Attached read-only via the Import menu.
  - App shell & theme: `pacepact/app/layout.tsx`, `pacepact/app/globals.css`, `pacepact/tailwind.config.ts`
  - Core UI: `pacepact/components/` (groups, training, leaderboard, notifications, profile, ui)
  - Product pitch & voice: `pacepact/docs/pacepact-pitch.md`, `pacepact/README.md`, `pacepact/CLAUDE.md`
  - Support / privacy copy: `pacepact/app/support/page.tsx`
  - Email voice: `pacepact/lib/resend/otp-email.ts`
- **Figma:** none attached
- **Slide decks:** none attached

## Product context

PacePact is a mobile-first, responsive web app. One product, one surface — no
marketing site, no separate mobile app, no docs site. Users land on `/login`,
sign in via magic link, connect Strava, and work inside `/groups → /group/[id]`.
The only brand adjacency is the Strava OAuth integration (the distinctive
`#FC5200` orange and the official "Powered by Strava" badge).

Core surfaces recreated in the UI kit:

1. Auth (login / signup — magic link)
2. Dashboard (list of groups)
3. Group home (header, leaderboard, chat, weekly training plan)
4. Create group (3-step form)
5. Profile (account, Strava, notifications, danger zone)

## Content fundamentals

PacePact's voice is **direct, pragmatic, second-person, and low on hype**. It
reads like a thoughtful product person talking to a runner friend — not a
marketing team.

- **Person & tone.** Second-person ("your group", "you'll appear to your group");
  first-person plural for the product ("we sent a link", "we never post on your
  behalf"). Short sentences. No exclamation marks except in the UI copy "say
  hello!" on the empty chat.
- **Casing.** Sentence case for everything — buttons (`Send sign-in link`,
  `Generate plan`, `New group`), page titles (`Full training plan`, `Group chat`,
  `Week in review`), menu items. Never Title Case, never ALL CAPS except for
  ALL-CAPS eyebrow labels (`ACCOUNT`, `NOTIFICATIONS`, `STRAVA`) that separate
  settings sections.
- **Numbers & units.** Always numeric: `10 pts`, `5 km`, `45 min`, `3 days to go`.
  Tabular numerals on counts and timers.
- **Ambition labels** (one of the product's few pieces of brand personality):
  `Just finish`, `Beat my PB`, `Go for podium` — each paired with a plain-English
  description: "Comfortable completion — cross the line feeling good" /
  "Moderate structure with tempo and interval work" / "High volume, structured
  speed, peak performance".
- **Empty & first-run states** are matter-of-fact and actionable:
  *"No groups yet — Create one for your next race, or ask a friend for their
  invite link."* / *"No messages yet — say hello!"*
- **Error copy** is generic and safe: *"Something went wrong. Please try again."*
  No blame, no technical detail.
- **Emoji & punctuation.** No emoji. Em-dashes (`—`) used as separators
  (`Berlin Marathon · 45 days to go`). Middle-dot `·` separates inline metadata.
- **No jargon.** "Session" not "workout". "Brick" is accepted (it's the
  triathlon term) but is always explained in context via the inline 50% progress
  bar UI.
- **Legal/support voice** is slightly more formal but still plain — no legalese
  beyond what GDPR requires ("Data export request", "within 30 days").

Examples copied verbatim:

> **Dashboard empty state** — "No groups yet. Create one for your next race, or
> ask a friend for their invite link."
>
> **Group creation CTA** — "AI will generate a personalised training plan in the
> background. You'll be notified when it's ready — you can navigate away."
>
> **Strava connect** — "Connect Strava so PacePact can automatically mark
> sessions complete when you log activities. We only read your activity data to
> match completed sessions — we never post on your behalf."
>
> **Magic link email** — "Click the button below to sign in. This link expires
> in 1 hour and can only be used once."

For 15 side-by-side before/after examples across buttons, empty states, errors,
notifications, and email, see [voice specimens](preview/voice-specimens.html).

## Visual foundations

PacePact is a **tight, utilitarian, neutral-first interface**. It is closer to
Linear or Vercel than to Strava's own app. The Strava orange `#FC5200` shows up
only where it should: on the Strava connect flow and activity links back to
Strava. Everything else is zinc.

- **Palette.** Tailwind's `zinc` ramp as the complete neutral system (`zinc-50`
  → `zinc-950`), plus five accent uses: `#FC5200` Strava orange (Strava surfaces
  only), `green-600 / green-400` (week-complete success), `amber-400 / 500`
  (brick-in-progress bar), `red-500` (notification badge), `red-600`
  (destructive buttons).
- **Light + dark first-class.** Every component ships both; dark mode uses
  `zinc-950` bg, `zinc-900` cards. Triggered by `.dark` on `<html>`. The theme
  toggle is a sun/moon icon button that persists to localStorage.
- **Type.** Inter via `next/font/google` (loaded in `app/layout.tsx`). Geist and
  Geist Mono are shipped as local `.woff` fallbacks. Weights used: 400, 500
  (medium is the workhorse weight), 600 (h1/wordmark). Semibold is the heaviest;
  no bold-bold.
- **Scale.** Very compact. Page titles are only `text-xl` (20px). Most UI is
  `text-sm` (14px). Meta and labels `text-xs` (12px). Auth pages use `text-2xl`
  (24px) as the one upsized moment.
- **Backgrounds.** Flat. `bg-zinc-50` page / `bg-white` card in light mode,
  `bg-zinc-950` page / `bg-zinc-900` card in dark. **No** gradients,
  illustrations, patterns, textures, photography, or hero imagery anywhere in
  the product. The app is screen-first; nothing competes with the data.
- **Borders.** Hairlines only (`1px solid var(--border)`, `zinc-200` /
  `zinc-800` dark). Cards always have a border, never a drop shadow in the
  resting state. Dividers between rows use the lighter `zinc-100` / `zinc-800`.
- **Radii.** `4px` pills / tags, `6px` buttons + inputs, `8px` cards + modals +
  dropdowns. Full round (`9999px`) for avatars, status dots, notification badge.
- **Shadows.** Almost none. Modals and dropdown menus use a subtle
  `shadow-lg`. Cards, inputs, and buttons have no shadow — they rely on the
  hairline border.
- **Animation.** Only `transition-colors` (200ms default) on hover. One
  `animate-spin` on the plan-generation spinner. No bounces, no slide-ins, no
  staggered entrances, no scroll animations. When a brick progress bar fills
  there's no animation — it's just `w-1/2`.
- **Hover states.**
  - Buttons: primary shifts `zinc-900 → zinc-700`; secondary/nav shifts
    `text-zinc-500 → text-zinc-900` + `bg-zinc-100`.
  - Cards: border shifts `zinc-200 → zinc-400` (light) / `zinc-800 → zinc-600`
    (dark).
  - Links: `text-zinc-400 → text-zinc-600`, optionally underline-offset-4.
- **Press / focus states.** `focus:ring-2 focus:ring-zinc-900 dark:ring-zinc-100`
  and `focus:border-transparent` on inputs. No shrink / scale on buttons.
- **Transparency & blur.** Modals use a simple `bg-black/40` (light) /
  `bg-black/60` (dark) overlay — no blur. The only other transparency is
  `bg-zinc-800/50` on the "this is me" leaderboard row and `bg-zinc-800/40` on
  own-message chat rows.
- **Layout rules.** App shell is `max-w-5xl` (1024px) with `px-4` (mobile) /
  `sm:py-8` (desktop). Sticky top nav (`h-14`, 56px). The layout stacks
  vertically — there is no sidebar. Forms constrain to `max-w-sm` (auth) or
  `max-w-lg` (create-group, profile).
- **Spacing rhythm.** `p-4` card padding on mobile, `sm:p-5` on desktop. Stacks
  use `space-y-3` (dense, session cards), `space-y-4` (forms), or `space-y-6 /
  -8` (page-level).
- **Imagery.** None in-product other than:
  - `/favicon.svg` — a black `#09090b` square with a white `P` glyph. Used with `dark:invert` in the nav.
  - `/connect-with-strava.svg` — Strava's official OAuth button (orange).
  - `/powered-by-strava.svg` — Strava's official attribution lockup (light mode).
  - `/powered-by-strava-dark.svg` — Dark-mode variant with near-white text (`#fafafa`). Used via dual `<img>` tags with `dark:hidden` / `hidden dark:block` — **not** CSS `invert`, which would flip the orange.
  - User avatars from Strava (circular, 28px in chat, 40px on profile) — or a
    single-letter initial on `bg-zinc-200` / `zinc-700` fallback.

## Motion

PacePact uses **`transition-colors` everywhere and almost nothing else**. If
you cannot describe the animation in one word, it does not belong.

- **Colors animate. Nothing moves.** Every hoverable element carries
  `transition-colors` (Tailwind's default 150 ms, no `duration-*` override).
  Buttons, cards, nav items, links, inputs — colour changes on hover. Nothing
  translates, scales, or rotates as part of an interaction.
- **Fade for presence.** Tooltips (on `SessionCard` info icon) and the
  notification-bell dropdown use `transition-opacity` paired with
  `invisible/visible + opacity-0/100`. 150 ms. No translate-on-enter, no
  scale-from-small.
- **Instant for commits.** Form state, route changes, and loading indicators
  appear instantly. The one permitted spinning animation is `animate-spin` on
  the plan-generation loader (Claude can take a minute or two, so a spinner is the
  right affordance) and the auth-callback page. A 200 ms spinner for a fast
  operation is worse than no spinner.

> **In one sentence:** everything either changes colour or fades — nothing
> slides, bounces, or enters with a flourish.

See [`preview/motion.html`](preview/motion.html) for live demos of all three
rules.

<!-- Previously flagged violations — now resolved:
  - components/groups/WeekInReviewPanel.tsx — transition-transform removed;
    chevron now flips instantly via inline style={{ transform }}.
  - components/profile/NotificationSettings.tsx — transition-transform removed;
    toggle thumb position is now instant.
-->

## Iconography

- **No icon library.** The codebase does **not** ship Lucide, Heroicons, or any
  icon font. Every icon is an **inline SVG literal**, always 24×24 viewBox,
  stroke-only (`fill="none"`, `stroke="currentColor"`, `strokeWidth="2"` or
  `"2.5"`, `strokeLinecap="round"`, `strokeLinejoin="round"`). Rendered small:
  `12–16px` most places.
- **Stroke style** matches **Lucide** almost exactly — same viewBox, same 2/2.5
  weight, same `round` caps. The glyphs used in the codebase (`check`, `bell`,
  `info-circle`, `chevron-down`, `sun`, `moon`, `message-square`) are
  hand-rolled copies of the Lucide equivalents. For prototyping, linking
  `lucide-static` via CDN is the closest match.
- **Color.** Icons inherit `currentColor`. Resting state is almost always
  `text-zinc-400 / zinc-500`; hover/active is `text-zinc-900 / zinc-100`.
- **Emoji.** None, anywhere, in the product. The marketing pitch document
  (`docs/pacepact-pitch.md`) uses a single bullet dash (`—`) not emoji.
- **Unicode chars used as icons.**
  - `•••` (three middle-dots, U+2022) as the group-actions menu affordance.
  - `·` (middle dot) as an inline metadata separator.
  - `—` and `–` (em / en dash) used carefully in prose.
- **Brand marks.**
  - The PacePact wordmark is **text only** — "PacePact" set in Inter 600,
    tracking-tight.
  - The favicon is the only logo mark in the codebase: a black `#09090b` rounded
    square with a white `P` counter.
  - Strava-authored assets (`connect-with-strava.svg`, `powered-by-strava.svg`)
    are used verbatim per Strava brand guidelines and never recolored or resized
    disproportionately.

Copied into `assets/`:
- `assets/favicon.svg` — PacePact favicon.
- `assets/connect-with-strava.svg` — official Strava OAuth button.
- `assets/powered-by-strava.svg` — official Strava attribution lockup (light mode).

Note: `powered-by-strava-dark.svg` (white text variant) lives in `pacepact/public/` but is not copied here — the design system `assets/` folder holds only the canonical originals.

## Index

```
.
├── README.md                 You are here
├── SKILL.md                  Claude Skill entry point
├── colors_and_type.css       CSS tokens (colors, type, radii, shadows)
├── assets/                   Brand marks + Strava lockups
│   ├── favicon.svg
│   ├── connect-with-strava.svg
│   └── powered-by-strava.svg
├── fonts/                    Local font files
│   ├── GeistVF.woff
│   └── GeistMonoVF.woff
├── preview/                  Design-system cards (Design System tab)
│   ├── colors-neutrals.html
│   ├── colors-semantic.html
│   ├── colors-strava.html
│   ├── type-scale.html
│   ├── type-specimens.html
│   ├── spacing-radii.html
│   ├── shadow-elevation.html
│   ├── buttons.html
│   ├── inputs.html
│   ├── cards.html
│   ├── badges-pills.html
│   ├── icons.html
│   └── logos.html
└── ui_kits/
    └── web/                  The PacePact web app UI kit
        ├── README.md
        ├── index.html        Interactive click-thru of the app (route persists to localStorage)
        ├── Icons.jsx         Lucide-style inline SVGs (bell, check, info, chevron, …)
        ├── Chrome.jsx        TopNav, Pill, Button (primary/secondary/ghost/danger)
        ├── LoginScreen.jsx   Magic-link sign-in + "check your inbox" state
        ├── Dashboard.jsx     Groups grid + empty state + GroupCard
        ├── Training.jsx      SessionCard (incl. pending-brick progress), WeekView
        ├── GroupPanels.jsx   Leaderboard (top-5 + self-pinned), MessageBoard
        ├── GroupHome.jsx     Full group screen — header, ••• actions, plan + side column
        ├── NewGroup.jsx      3-step create-group form
        └── Profile.jsx       Account / Strava / notification toggles / danger zone
```

Plus at the root:
- `SKILL.md` — Agent Skill manifest (cross-compatible with Claude Code). Points the reader at `README.md` first, then the other files.

## Known substitutions

- **Fonts.** The production app loads **Inter** via `next/font/google`. Inter
  is pulled from Google Fonts in the UI kit HTML. Geist / Geist Mono fallbacks
  are shipped locally (copied from `pacepact/app/fonts/`). No substitutions
  were needed.
- **Icons.** The codebase hand-rolls every SVG, so no icon library is shipped.
  For prototyping, this system recreates the exact glyphs used in the app
  inline. If you need to add more, match the **Lucide** style (24×24 viewBox,
  2px stroke, round caps) — do not introduce a different icon family.
