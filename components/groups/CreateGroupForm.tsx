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
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        {(['event', 'ambition', 'review'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-medium text-xs ${
              step === s ? 'bg-orange-500 text-white' :
              ['event', 'ambition', 'review'].indexOf(step) > i ? 'bg-orange-100 text-orange-600' :
              'bg-gray-200 text-gray-400'
            }`}>
              {i + 1}
            </div>
            {i < 2 && <div className="w-8 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {step === 'event' && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Event details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Berlin Marathon Crew"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event name</label>
            <input
              type="text"
              value={form.event_name}
              onChange={(e) => update('event_name', e.target.value)}
              placeholder="e.g. Berlin Marathon 2026"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event type</label>
            <select
              value={form.event_type}
              onChange={(e) => update('event_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            >
              <option value="">Select type…</option>
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event date</label>
            <input
              type="date"
              value={form.event_date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => update('event_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <button
            onClick={() => setStep('ambition')}
            disabled={!form.name || !form.event_name || !form.event_type || !form.event_date}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {step === 'ambition' && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Training ambition</h2>
          <p className="text-sm text-gray-500">This shapes the intensity of the plan for everyone in the group.</p>

          <div className="space-y-3">
            {AMBITIONS.map((a) => (
              <button
                key={a.value}
                onClick={() => update('ambition', a.value)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
                  form.ambition === a.value
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">{a.label}</div>
                <div className="text-sm text-gray-500 mt-0.5">{a.desc}</div>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('event')}
              className="flex-1 text-gray-600 border border-gray-300 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep('review')}
              disabled={!form.ambition}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Ready to generate</h2>

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 text-sm">
            <Row label="Group" value={form.name} />
            <Row label="Event" value={form.event_name} />
            <Row label="Type" value={EVENT_TYPES.find(t => t.value === form.event_type)?.label ?? ''} />
            <Row label="Date" value={new Date(form.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
            <Row label="Ambition" value={AMBITIONS.find(a => a.value === form.ambition)?.label ?? ''} />
          </div>

          <p className="text-sm text-gray-500">
            Claude will generate a personalised training plan. This takes 5–15 seconds — don't navigate away.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('ambition')}
              disabled={loading}
              className="flex-1 text-gray-600 border border-gray-300 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Generating plan…' : 'Generate training plan'}
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
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}
