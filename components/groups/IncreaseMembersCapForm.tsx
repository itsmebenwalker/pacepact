'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { calculateCapUpgradePrice } from '@/lib/payments/calculate-price'
import StripeCheckoutModal from '@/components/groups/StripeCheckoutModal'

const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true'

interface Props {
  groupId: string
  currentCap: number
  memberCount: number
  eventDate: string
}

const STEPS = ['limit', 'review'] as const
type Step = typeof STEPS[number]

const MAX_MEMBERS = 100

const inputClass = 'w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent transition-colors'
const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5'

export default function IncreaseMembersCapForm({ groupId, currentCap, memberCount, eventDate }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('limit')
  const [newCap, setNewCap] = useState<string>(String(Math.min(currentCap + 10, MAX_MEMBERS)))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  const atHardLimit = currentCap >= MAX_MEMBERS
  const spotsRemaining = Math.max(0, currentCap - memberCount)
  const newCapNum = parseInt(newCap, 10)
  const isValid = !isNaN(newCapNum) && newCapNum > currentCap && newCapNum <= MAX_MEMBERS

  const deltaSeats = isValid ? newCapNum - currentCap : 0
  const price = PAYMENTS_ENABLED && isValid
    ? calculateCapUpgradePrice(deltaSeats, eventDate)
    : null

  function capValidationError(): string | null {
    if (newCap === '' || isNaN(newCapNum)) return null
    if (newCapNum <= currentCap) return `New limit must be higher than ${currentCap}.`
    if (newCapNum > MAX_MEMBERS) return `Groups cannot exceed ${MAX_MEMBERS} members.`
    return null
  }

  async function handleConfirm() {
    if (!isValid) return
    setLoading(true)
    setError(null)

    if (PAYMENTS_ENABLED) {
      try {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_members_cap',
            group_id: groupId,
            new_cap: newCapNum,
            current_cap: currentCap,
            event_date: eventDate,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
        setClientSecret(data.clientSecret)
        setLoading(false)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
        setLoading(false)
      }
      return
    }

    const res = await fetch(`/api/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_members_cap', members_cap: newCapNum }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      setStep('limit')
      return
    }
    router.push(`/group/${groupId}/members`)
    router.refresh()
  }

  const currentStepIndex = STEPS.indexOf(step)

  return (
    <>
      {clientSecret && (
        <StripeCheckoutModal
          clientSecret={clientSecret}
          onClose={() => setClientSecret(null)}
        />
      )}

      <div className="max-w-lg mx-auto pb-24 sm:pb-0">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-medium text-xs transition-colors ${
                step === s
                  ? 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900'
                  : currentStepIndex > i
                  ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
              }`}>
                {i + 1}
              </div>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-zinc-200 dark:bg-zinc-700" />}
            </div>
          ))}
        </div>

        {step === 'limit' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-50">Increase member limit</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                You can only increase the limit — not reduce it.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3 text-sm">
              <Row label="Current limit" value={String(currentCap)} />
              <Row label="Members now" value={String(memberCount)} />
              <Row label="Spots remaining" value={String(spotsRemaining)} />
            </div>

            {atHardLimit ? (
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                Groups are limited to {MAX_MEMBERS} members — this group is already at the maximum.
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className={labelClass + ' mb-0'}>New limit</label>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">max {MAX_MEMBERS}</span>
                </div>
                <input
                  type="number"
                  min={currentCap + 1}
                  max={MAX_MEMBERS}
                  value={newCap}
                  onChange={(e) => setNewCap(e.target.value)}
                  className={inputClass}
                />
                {capValidationError() && (
                  <p className="text-xs text-red-500 mt-1.5">{capValidationError()}</p>
                )}
              </div>
            )}

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-5">
            <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-50">Review</h2>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3 text-sm">
              <Row label="Current limit" value={String(currentCap)} />
              <Row label="New limit" value={String(newCapNum)} />
              <Row label="New spots added" value={`+${newCapNum - currentCap}`} />

              {PAYMENTS_ENABLED && price && (
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                  <Row label="Weeks until event" value={String(price.weeks)} />
                  <Row label="Rate" value={`$${price.ratePerSeatPerWeek.toFixed(2)}/seat/week`} />
                  <Row label="Total (AUD)" value={price.displayAmount} />
                </div>
              )}
            </div>

            {PAYMENTS_ENABLED && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Payment is handled securely by Stripe. The limit is updated after payment is confirmed.
              </p>
            )}
          </div>
        )}

        {/* Sticky action bar */}
        <div className="fixed bottom-0 inset-x-0 z-10 sm:static sm:mt-5 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 sm:border-0 px-4 py-4 sm:p-0">
          {step === 'limit' && (
            <button
              onClick={() => setStep('review')}
              disabled={atHardLimit || !isValid}
              className="w-full bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-40 text-white dark:text-zinc-900 font-medium py-2.5 rounded-md text-sm transition-colors"
            >
              Next
            </button>
          )}

          {step === 'review' && (
            <div className="flex gap-3">
              <button
                onClick={() => setStep('limit')}
                disabled={loading}
                className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-medium py-2.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 text-sm bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 text-white dark:text-zinc-900 font-medium py-2.5 rounded-md transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                    </svg>
                    {PAYMENTS_ENABLED ? 'Loading…' : 'Saving…'}
                  </>
                ) : PAYMENTS_ENABLED ? 'Pay with Stripe' : 'Confirm'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="font-medium text-zinc-900 dark:text-zinc-50">{value}</span>
    </div>
  )
}
