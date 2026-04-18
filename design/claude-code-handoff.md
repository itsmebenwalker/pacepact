# Claude Code handoff — PacePact Design System improvements

You are a design-engineer working inside the **PacePact Next.js codebase** (`pacepact/`) and its adjacent **Design System project** (where this file lives). Your job is to implement three follow-ups to the existing design system. Work in small, reviewable commits.

## Context to read first

Before touching anything, read these in order:

1. `README.md` (this project) — the full design system: tokens, voice, visual foundations, iconography rules.
2. `SKILL.md` (this project) — the non-negotiables. Internalize the "zinc neutrals only, Strava orange is Strava-only, no emoji, borders over shadows, Lucide-style SVG, Inter" rules.
3. `ui_kits/web/index.html` and the JSX files next to it — the reference prototype. Your new work must match this component style exactly.
4. In the attached codebase: `pacepact/components/training/SessionCard.tsx`, `pacepact/components/training/WeekView.tsx`, `pacepact/components/groups/WeekInReviewPanel.tsx`, `pacepact/CLAUDE.md`, `pacepact/docs/pacepact-pitch.md`.

Don't skim. The voice guidelines and the exact Tailwind classnames matter — if you invent new ones you'll drift from the real app.

---

## Task 1 — Mobile UI kit (`ui_kits/mobile/`)

**Goal.** A clickable recreation of the PacePact app at phone width, wrapped in an iOS frame. PacePact is a mobile-first responsive web app; most real users open it on their phone.

**Steps.**

1. Use the `ios_frame.jsx` starter component. Put it in `ui_kits/mobile/` and import it from `ui_kits/mobile/index.html`.
2. Recreate four screens inside the frame:
   - **Dashboard** — groups grid collapses to a single column; the "New group" button becomes a full-width secondary button at the bottom of the list (not a top-right CTA).
   - **Group home** — stacked single column: header → leaderboard (collapsed to top 3 + "view all") → current week only (other weeks accessible via a "Past weeks" disclosure) → chat pinned at bottom as a floating "Open chat" pill that expands into a bottom sheet.
   - **Session detail** — tap a `SessionCard` to open a bottom sheet showing the full tip, target, and "Mark done manually" / "Count as X session instead" actions.
   - **New group flow** — same 3 steps, full-width, sticky "Continue" button at the bottom safe area.
3. Reuse components from `ui_kits/web/` where they work as-is (`Button`, `Pill`, `SessionCard`). Do not copy-paste and diverge — import the same JSX files.
4. Register each screen as a separate asset version so they show up in the Design System tab. Group: `Components`. Subtitles: "Mobile · Dashboard", "Mobile · Group home", etc.

**Constraints.**

- Hit targets ≥ 44px.
- No new colors, fonts, or icons. If a mobile-specific interaction needs an icon you don't have, add it to `Icons.jsx` in Lucide style (24×24, 2px stroke, round caps).
- Use the iOS frame's built-in status bar; don't draw a custom one.
- Persist route to localStorage under a different key (`pp-mobile-route`) so it doesn't collide with the web kit.

**Acceptance.** Open `ui_kits/mobile/index.html`, tap through all four screens, and verify every hit target is reachable with a thumb at phone width. Screenshot each screen into `preview/` for the Design System tab.

---

## Task 2 — Motion documentation

**Goal.** Write down the motion rules that are already implicit in the codebase, so designers stop inventing animations.

**Steps.**

1. Grep the codebase for every use of `transition-`, `animate-`, `duration-`, and `ease-` classes. Compile a list — you should find `transition-colors` everywhere, `transition-opacity` on a few tooltips, and `transition-transform` on the notification panel. That's it.
2. Add a `## Motion` section to `README.md` between the "Visual foundations" and "Iconography" sections. Document three rules, in this order:
   - **Colors animate. Nothing moves.** `transition-colors` (150ms default, no override) is applied to every hoverable element. We don't slide, fade in, or bounce.
   - **Fade for presence.** Tooltips and dropdowns use `transition-opacity` with `invisible/visible` + `opacity-0/100`. 150ms. No translate-on-enter.
   - **Instant for commits.** Form state, loading states, and route changes are instant. A 200ms spinner is worse than no spinner.
3. Create `preview/motion.html` — a card with three live demos (hover, tooltip, loading). Match the style of the other preview cards (`_shared.css`).
4. Register it as `{asset: "Motion · rules", group: "Spacing", path: "preview/motion.html"}`.

**Constraints.**

- Do not add any new motion to the system. This task is documenting what exists, not extending it.
- If you find a component that breaks these rules (something using `transition-all`, `animate-bounce`, etc.), flag it in a comment at the bottom of the README section — don't "fix" it in the codebase without my approval.

**Acceptance.** Someone reading the Motion section cold can tell me, in one sentence, what PacePact's motion philosophy is.

---

## Task 3 — Copywriting specimens

**Goal.** A side-by-side "bad / good" copy table that designers and PMs can cite in reviews. Paragraphs in the Voice section are being ignored.

**Steps.**

1. Read every user-facing string in `pacepact/app/` and `pacepact/components/`. Pull ~15 that best illustrate the voice (buttons, empty states, error messages, email subject lines, confirmation dialogs, onboarding microcopy).
2. For each, write the **bad** version — what a generic SaaS or fitness-marketing team would write. Make it genuinely tempting, not a strawman. Examples: hype ("Let's crush your goals!"), softening ("We'd love to help you create a group"), padding ("You don't have any groups yet — but that's okay!"), emoji ("💪 Your first run!"), first-person-plural ("We'll send you a link").
3. Create `preview/voice-specimens.html`. Two-column layout: "Avoid" (left, zinc-400) / "Write" (right, zinc-900). ~15 rows grouped into sections: Buttons & CTAs, Empty states, Errors & confirmations, Notifications, Email.
4. At the top of the file, put the five voice rules from `README.md` as one-line reminders (not prose).
5. Add a short paragraph to `README.md` in the Voice section pointing to the specimens card.
6. Register it as `{asset: "Voice · specimens", group: "Type", path: "preview/voice-specimens.html"}`.

**Constraints.**

- Real copy only — every "Write" cell must match a string that actually exists in the codebase (or is a plausible addition in the same register). Don't invent new product features in the examples.
- No exclamation marks in the "Write" column except where the existing codebase uses them (e.g., "say hello!" in the empty chat state).
- Keep rows tight — max ~12 words per cell.

**Acceptance.** A designer pastes a screenshot into Slack with "is this copy on-brand?" — another designer can open the specimens card and answer the question in 30 seconds.

---

## Working norms

- **Commits.** One task per commit, one commit per task. Commit message: `design-system: <task name>`.
- **Don't touch the production codebase** (`pacepact/`). Everything lives in the Design System project.
- **Ask me before adding new tokens, components, or icons.** Extending the system is a bigger decision than executing within it.
- **When unsure about voice or a visual call, default to the most restrained option.** The PacePact aesthetic is "thoughtful product person, not marketing team" — boring is usually right.
- **Ship each task independently.** Don't wait to finish all three before opening a PR.

## What "done" looks like

1. `ui_kits/mobile/index.html` exists, runs with no console errors, walks through four screens, and is registered in the Design System tab.
2. `README.md` has a Motion section and `preview/motion.html` demonstrates it.
3. `preview/voice-specimens.html` exists with ~15 rows and is registered.
4. All three new preview cards render cleanly at their registered viewport sizes.
5. No changes to tokens in `colors_and_type.css`. No new fonts. No new accent colors.

If a task reveals a genuine gap in the system (a missing component, an unclear rule), write it down in a `follow-ups.md` at the project root — don't try to fix it inline.
