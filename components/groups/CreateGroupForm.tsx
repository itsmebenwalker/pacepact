'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { EventType, Ambition } from '@/types'

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'marathon', label: 'Marathon' },
  { value: 'half_marathon', label: 'Half Marathon' },
  { value: 'triathlon', label: 'Triathlon' },
  { value: 'cycling', label: 'Cycling Sportive' },
  { value: 'obstacle', label: 'Obstacle Race' },
  { value: 'custom', label: 'Custom Event' },
]

const AMBITIONS: { value: Ambition; label: string; desc: string }[] = [
  { value: 'finish', label: 'Just finish', desc: 'Comfortable completion — cross the line feeling good' },
  { value: 'pb', label: 'Beat my PB', desc: 'Moderate structure with tempo and interval work' },
  { value: 'podium', label: 'Go for podium', desc: 'High volume, structured speed, peak performance' },
]

type Step = 'event' | 'ambition' | 'review'
const STEPS: Step[] = ['event', 'ambition', 'review']

const inputClass = 'w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent transition-colors'
const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5'

export default function CreateGroupForm() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('event')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    event_name: '',
    event_type: '' as EventType,
    event_date: '',
    ambition: '' as Ambition,
  })

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/groups/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      router.push(`/groups/${data.groupId}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const currentStepIndex = STEPS.indexOf(step)

  return (
    <div className="max-w-lg mx-auto">
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
            {i < 2 && <div className="w-8 h-px bg-zinc-200 dark:bg-zinc-700" />}
          </div>
        ))}
      </div>

      {step === 'event' && (
        <div className="space-y-5">
          <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-50">Event details</h2>

          <div>
            <label className={labelClass}>Group name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Berlin Marathon Crew"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Event name</label>
            <input
              type="text"
              value={form.event_name}
              onChange={(e) => update('event_name', e.target.value)}
              placeholder="e.g. Berlin Marathon 2026"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Event type</label>
            <select
              value={form.event_type}
              onChange={(e) => update('event_type', e.target.value)}
              className={inputClass}
            >
              <option value="">Select type</option>
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Event date</label>
            <input
              type="date"
              value={form.event_date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => update('event_date', e.target.value)}
              className={inputClass}
            />
          </div>

          <button
            onClick={() => setStep('ambition')}
            disabled={!form.name || !form.event_name || !form.event_type || !form.event_date}
            className="w-full bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-40 text-white dark:text-zinc-900 font-medium py-2.5 rounded-md text-sm transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {step === 'ambition' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-50">Training ambition</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">This shapes the intensity of the plan for everyone in the group.</p>
          </div>

          <div className="space-y-2">
            {AMBITIONS.map((a) => (
              <button
                key={a.value}
                onClick={() => update('ambition', a.value)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  form.ambition === a.value
                    ? 'border-zinc-900 dark:border-zinc-50 bg-zinc-50 dark:bg-zinc-800'
                    : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-500'
                }`}
              >
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{a.label}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{a.desc}</div>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('event')}
              className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-medium py-2.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep('review')}
              disabled={!form.ambition}
              className="flex-1 text-sm bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-40 text-white dark:text-zinc-900 font-medium py-2.5 rounded-md transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-5">
          <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-50">Review</h2>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3 text-sm">
            <Row label="Group" value={form.name} />
            <Row label="Event" value={form.event_name} />
            <Row label="Type" value={EVENT_TYPES.find(t => t.value === form.event_type)?.label ?? ''} />
            <Row label="Date" value={new Date(form.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
            <Row label="Ambition" value={AMBITIONS.find(a => a.value === form.ambition)?.label ?? ''} />
          </div>

          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            AI will generate a personalised training plan. This takes 5–15 seconds — don&apos;t navigate away.
          </p>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('ambition')}
              disabled={loading}
              className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-medium py-2.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
            >
              Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex-1 text-sm bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 text-white dark:text-zinc-900 font-medium py-2.5 rounded-md transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                  Generating...
                </>
              ) : 'Generate plan'}
            </button>
          </div>
        </div>
      )}
    </div>
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
