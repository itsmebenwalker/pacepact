'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <div className="w-full max-w-sm text-center">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Check your inbox</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            We sent a sign-in link to <span className="text-zinc-900 dark:text-zinc-100 font-medium">{email}</span>. Click it to sign in.
          </p>
          <button
            onClick={() => { setSent(false); setEmail('') }}
            className="mt-6 text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">PacePact</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-40 text-white dark:text-zinc-900 font-medium py-2 px-4 rounded-md text-sm transition-colors mt-2"
          >
            {loading ? 'Sending link...' : 'Send sign-in link'}
          </button>
        </form>

        {process.env.NEXT_PUBLIC_SIGNUP_ENABLED !== 'false' && (
          <p className="text-center text-sm text-zinc-400 dark:text-zinc-500 mt-6">
            No account?{' '}
            <Link href="/signup" className="text-zinc-900 dark:text-zinc-100 underline underline-offset-4">
              Sign up
            </Link>
          </p>
        )}

        <div className="flex items-center justify-center gap-4 mt-8 text-xs text-zinc-400 dark:text-zinc-500">
          <Link href="/support" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">Support</Link>
          <Link href="/privacy" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">Privacy</Link>
        </div>
      </div>
    </div>
  )
}
