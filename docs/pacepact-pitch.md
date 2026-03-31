# PacePact — Pitch

## The Idea

Training for a marathon, triathlon, or any endurance event is lonely. You sign up with friends, everyone commits hard in the first week, and by week three half the group has quietly dropped off. There's no accountability, no visibility into what your mates are actually doing, and no shared momentum.

**PacePact** fixes that. It's a social training platform where groups of friends preparing for the same event train together — tracked automatically via Strava, scored on a shared leaderboard, and kept honest by each other.

---

## How It Works

You create a group around a specific event — say, the Perth City to Surf in September. Everyone in the group connects their Strava account. PacePact calculates a smart training plan based on the time until race day and members' fitness baselines. Each week, it sets training targets: a long run, two interval sessions, a recovery jog.

When you complete a workout, Strava fires a webhook to PacePact in the background. The activity is automatically matched against your training plan, marked complete, and converted into points. Everyone in the group sees the leaderboard update in real time — who's nailing it, who's gone quiet, who just did a 6am brick session.

You can be in multiple groups simultaneously. Training for a half marathon with your work crew and a triathlon with your weekend squad? Both plans run in parallel, each with their own leaderboard.

---

## Why It's Compelling

- **Strava already has 125M+ users** — the behaviour of logging activities is already established. PacePact sits on top of that behaviour rather than trying to create a new one
- **Group accountability is the strongest predictor of training adherence** — more than apps, coaches, or personal motivation
- **Race registrations are a natural acquisition moment** — people sign up for events months in advance and immediately want to loop in their friends
- **The core loop is inherently viral** — you can't use PacePact alone. Every new user has to invite others

---

## Monetisation

**Freemium (core model)**

The free tier covers one active group, basic leaderboards, and Strava sync. This is the viral engine — it needs to be genuinely good to earn word-of-mouth.

**PacePact Pro — ~$9/month or $69/year per user**
- Unlimited groups
- AI-generated adaptive training plans (adjusts when you miss sessions or smash targets)
- Detailed performance analytics and training load tracking
- Custom challenges and group milestones
- Activity comments and reactions within the group feed

**Team/Club Plan — ~$49–79/month per group**
Targeted at running clubs, triathlon clubs, fitness studios, and corporate wellness programs. Centralised admin, branding options, coach access to all member plans, bulk invites. This is where the real revenue per customer sits.

**Event Partnerships**
Race organisers (marathons, ironman events, obstacle courses) pay for co-branded group experiences — an official PacePact group for their event that drives pre-race engagement and attendance. Think of it as a distribution deal: they promote PacePact to their registrants, PacePact creates a social layer around their event.

**White Label**
Sell the platform to large fitness brands, running shoe companies, or gym chains to run under their own branding. Higher-value, lower-volume. Realistic at scale.

---

## The Numbers (Rough)

Getting to 10,000 paying users at $9/month = $90K MRR / $1.1M ARR. That's a realistic 18–24 month target for a well-executed launch with strong Strava community seeding. The club/team tier dramatically improves this — 200 clubs at $65/month gets you to the same number with far fewer individual users to manage.

---

## The Opportunity

The endurance sports market is large, passionate, and willing to spend. These are people who drop $300 on running shoes without thinking. The gap in the market isn't fitness tracking — Strava, Garmin, and Apple Watch have that covered. The gap is **social accountability infrastructure built around shared goals.** That's what PacePact is.

---

## What This Needs to Get Off the Ground

Strava API approval, a clean mobile-first web app (Next.js + Supabase is a natural fit for the multi-group data model), and a tight beta with 3–5 real friend groups training for real events. The product sells itself once people experience the leaderboard moment.
