# Follow-ups

Gaps and deferred decisions found during the three tasks.

---

## Mobile UI kit

**Screenshots not taken.**
The handoff asks for screenshots of each mobile screen saved into `preview/`.
This requires a browser/screenshot tool. Manually open
`ui_kits/mobile/index.html`, tap through all four screens, and save screenshots
as `preview/mobile-dashboard.png`, `preview/mobile-group-home.png`,
`preview/mobile-session-detail.png`, `preview/mobile-new-group.png`.

**Design System tab registration.**
The handoff references registering each screen as an "asset version" so it
appears in the Design System tab. No registration mechanism exists in the
current HTML-based system. If/when a design tool (Storybook, Chromatic,
Zeroheight, etc.) is introduced, the four screens should be registered as:
- `{ asset: "Mobile · Dashboard",      group: "Components", path: "ui_kits/mobile/index.html" }`
- `{ asset: "Mobile · Group home",     group: "Components", path: "ui_kits/mobile/index.html" }`
- `{ asset: "Mobile · Session detail", group: "Components", path: "ui_kits/mobile/index.html" }`
- `{ asset: "Mobile · New group",      group: "Components", path: "ui_kits/mobile/index.html" }`

**Motion preview and voice specimens registration.**
Same issue — the handoff specifies:
- `{ asset: "Motion · rules",    group: "Spacing", path: "preview/motion.html" }`
- `{ asset: "Voice · specimens", group: "Type",    path: "preview/voice-specimens.html" }`

---

## Motion violations — RESOLVED

Both violations were fixed by removing `transition-transform` and switching to
instant state changes:

1. `components/groups/WeekInReviewPanel.tsx` — chevron now uses inline
   `style={{ transform: open ? 'rotate(180deg)' : 'none' }}` with no transition.
   Flips instantly on open/close.

2. `components/profile/NotificationSettings.tsx` — toggle thumb also switched to
   instant position via the same inline style approach. `transition-transform`
   removed.

The README motion violation comment block should be updated to reflect this.

---

## Mobile nav bar — RESOLVED

Production `NavUser` now handles mobile:
- Desktop text links (`Dashboard`, `Profile`) have `hidden sm:block` — invisible
  on phone.
- A profile icon (`<svg>` person glyph) is added with `sm:hidden` — visible only
  on phone.
- `Sign out` button remains visible on all sizes.

No hamburger or sheet menu was needed — the icon approach keeps the nav clean.
