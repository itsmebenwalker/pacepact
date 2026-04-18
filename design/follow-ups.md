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

## Motion violations (approve or fix)

Two components in `pacepact/` stretch the "colors animate, nothing moves" rule.
Flagged in the README Motion section; not changed without approval:

1. `components/groups/WeekInReviewPanel.tsx` — chevron icon uses
   `transition-transform` to rotate 180° when the panel opens. It is a standard
   disclosure affordance. **Decision needed:** accept as a named exception, or
   remove the transition so the chevron flips instantly.

2. `components/profile/NotificationSettings.tsx` — toggle thumb uses
   `transition-transform` to slide left/right. Same question.

---

## Mobile nav bar (not implemented)

The mobile screens use a minimal nav bar (back arrow + title). The production
app's `TopNav` is unchanged — it has horizontal text links that overflow at
phone width. A production implementation would either:
- Hide the text links on mobile (`hidden sm:flex`) and keep the icon-only
  version, or
- Add a hamburger/sheet menu for mobile nav.

This was intentionally left out of scope for the UI kit (the prototype shows
only the inner screen, not how TopNav adapts).
