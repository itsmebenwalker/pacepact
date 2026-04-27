# Stripe Setup

PacePact uses Stripe Checkout for payments. This document covers how to set up Stripe for local development and production.

---

## Pricing model

| Flow | Formula | Minimum |
|---|---|---|
| Create group | `members_cap × weeks_until_event × $0.05 AUD` | $0.50 AUD |
| Increase member cap | `seats_added × weeks_until_event × $0.05 AUD` | $0.50 AUD |

`weeks_until_event` is the number of weeks from today to the event date, rounded up to the nearest whole week (minimum 1).

---

## Prerequisites

- A [Stripe account](https://dashboard.stripe.com/register)
- Stripe CLI installed locally for webhook testing (`brew install stripe/stripe-cli/stripe`)

---

## 1. Get your API keys

In the [Stripe Dashboard](https://dashboard.stripe.com/apikeys):

- **Publishable key** — starts with `pk_test_` (test) or `pk_live_` (production)
- **Secret key** — starts with `sk_test_` or `sk_live_`

Add to your environment:

```env
STRIPE_SECRET_KEY=sk_test_...
```

---

## 2. Enable the feature flag

Payments are gated behind a feature flag. To turn them on:

```env
NEXT_PUBLIC_PAYMENTS_ENABLED=true
```

When this is `false` (the default), the Create Group flow bypasses payment entirely and the `generate-plan` API route creates groups directly — the same behaviour as before Stripe was added.

---

## 3. Register a webhook

### Local development

Use the Stripe CLI to forward events to your local server:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The CLI prints a webhook signing secret that starts with `whsec_`. Add it to your env:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Production (Railway)

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Set the URL to `https://your-app.up.railway.app/api/stripe/webhook`
4. Under **Events to listen to**, select: `checkout.session.completed`
5. Copy the **Signing secret** from the webhook details page and add it as `STRIPE_WEBHOOK_SECRET` in your Railway environment variables

---

## 4. Summary of environment variables

```env
# Feature flag — set to true to enable payments
NEXT_PUBLIC_PAYMENTS_ENABLED=false

# Stripe secret key (server-side only)
STRIPE_SECRET_KEY=sk_test_...

# Stripe webhook signing secret
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 5. How it works

### Create Group flow (payments enabled)

1. User completes the 4-step form (Event → Ambition → Review → Payment)
2. The Payment step shows the price breakdown
3. Clicking **Pay with Stripe** calls `POST /api/stripe/checkout` with `action: create_group`
4. The server creates a Stripe Checkout Session and returns its URL
5. The user is redirected to Stripe's hosted checkout page
6. After payment, Stripe redirects to `/group/new/processing?session_id=...`
7. In the background, Stripe sends a `checkout.session.completed` webhook to `/api/stripe/webhook`
8. The webhook handler calls `createGroup()`, which creates the group record, adds the creator as a member, and starts AI plan generation in the background
9. The processing page polls Supabase every 2 seconds for a group with the matching `stripe_session_id`. Once found, it redirects to the group page

**If the user abandons Stripe checkout**, no group is created and they are redirected back to `/group/new` (the cancel URL) to start over.

### Increase Member Cap flow (payments enabled)

1. Creator opens the member cap page and enters a new limit
2. The Review step shows the price breakdown (based on seats added, not total cap)
3. Clicking **Pay with Stripe** calls `POST /api/stripe/checkout` with `action: update_members_cap`
4. After payment, Stripe redirects to the group's members page
5. The webhook handler updates `groups.members_cap` directly

### Payment gate

When `NEXT_PUBLIC_PAYMENTS_ENABLED=true`, the `POST /api/groups/generate-plan` route returns `402 Payment Required`. This prevents the UI payment step from being bypassed by calling the API directly.

---

## 6. Replaying failed webhook events

If a webhook fails (e.g. the server was down), you can replay it from the Stripe Dashboard under **Webhooks → [your endpoint] → Recent deliveries**. All events are also logged in Stripe's event log for 30 days.

---

## 7. Testing

Use Stripe's [test card numbers](https://docs.stripe.com/testing#cards):

| Card | Outcome |
|---|---|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Declined |
| `4000 0025 0000 3155` | 3D Secure required |

Expiry: any future date. CVC: any 3 digits. Postcode: any valid postcode.

---

## 8. Going live

1. Switch `STRIPE_SECRET_KEY` to your `sk_live_...` key
2. Register a new production webhook endpoint (see step 3 above) and update `STRIPE_WEBHOOK_SECRET`
3. Set `NEXT_PUBLIC_PAYMENTS_ENABLED=true` in your Railway production environment
4. Verify a test transaction end-to-end before announcing
