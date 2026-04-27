import Stripe from 'stripe'

let _stripe: Stripe | null = null

// Lazily initialised so Next.js static analysis during build doesn't throw
// when STRIPE_SECRET_KEY is absent from the build environment.
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-04-22.dahlia',
    })
  }
  return _stripe
}
