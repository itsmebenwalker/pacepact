---
name: pacepact-design
description: Use this skill to generate well-branded interfaces and assets for PacePact — a social endurance-training platform (marathons, triathlons, cycling events) where groups of friends train together, auto-sync activities from Strava, and compete on a live leaderboard. Works for production work or throwaway prototypes, mocks, and slides. Contains essential design guidelines, colors, type, fonts, assets, and a faithful UI kit recreating the real Next.js app.
user-invocable: true
---

Read the `README.md` file within this skill for the full design system: product context, content fundamentals, visual foundations, and iconography rules. Then explore the other files as needed:

- `colors_and_type.css` — all CSS variables (zinc neutral scale, Strava accent, semantic tokens, type scale)
- `assets/` — brand marks: `favicon.svg` (monochrome "P" glyph), `connect-with-strava.svg` and `powered-by-strava.svg` (official Strava lockups, use as-is)
- `fonts/` — note on Inter (loaded from Google Fonts, not bundled)
- `preview/` — small HTML cards documenting every token (colors, type, spacing, components)
- `ui_kits/web/` — a high-fidelity, clickable React prototype of the real app (login, dashboard, group home with leaderboard + week view + message board, new group flow, profile). Component classnames mirror the live codebase one-to-one. Use these as reference for new screens.

**When creating visual artifacts** (slides, mocks, throwaway prototypes): copy whatever assets you need out of this skill and build static HTML files the user can open. Load Tailwind via CDN and Inter via Google Fonts — don't try to set up a build. Start from the patterns in `ui_kits/web/` rather than inventing.

**When working on production code**: read `README.md` and `colors_and_type.css` to get up to speed on the design rules, then edit the real PacePact codebase. The UI kit components are cosmetic copies — do not paste them into production.

**If invoked with no other guidance**: ask the user what they want — a new screen, a marketing asset, a slide, a feature mock? — then ask a few specific questions (audience, format, whether it's internal or customer-facing) and act as an expert designer. Output HTML artifacts or production code depending on the need.

### Non-negotiables from the brand

- **Zinc neutrals only**, with black text on white (or white on near-black in dark mode). Strava orange (`#FC5200`) is used **only** on Strava-adjacent surfaces — never as a primary CTA, focus ring, or generic highlight.
- **No emoji.** No gradients. No rainbow category colors. No purple/blue tech-startup accents.
- **Borders over shadows** for cards and inputs. `shadow-lg` only on modals and dropdowns.
- **Inter** for everything. No serif, no display face.
- **Lucide-style inline SVG** for icons (2px stroke, round caps, `currentColor`). Never use emoji as icons.
- Conversational second-person copy, short and dry — "Create your first group", not "Let's get you started on your fitness journey!" No exclamations except in actual UI success states.
