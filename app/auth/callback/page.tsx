'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Handles both auth flows produced by Supabase:
 *
 * - PKCE (code in query param):  /auth/callback?code=xxx
 * - Implicit (tokens in hash):   /auth/callback#access_token=xxx&refresh_token=yyy
 *
 * admin.generateLink uses the implicit flow, so tokens arrive in the hash
 * which the server never sees. We handle it client-side here.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState(false)

  useEffect(() => {
    async function handleCallback() {
      const supabase = createClient()

      const params = new URLSearchParams(window.location.search)
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))

      const code = params.get('code')
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      const next = params.get('next') ?? '/groups'

      try {
        if (code) {
          // PKCE flow
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error || !data.user) throw error
        } else if (accessToken && refreshToken) {
          // Implicit flow — tokens are in the URL hash
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error || !data.user) throw error
        } else {
          throw new Error('No auth params found')
        }

        // Check if this is a first login (no profile yet)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single()

          const isFirstLogin = !existingProfile

          const displayName = user.user_metadata?.display_name as string | undefined
          await supabase.from('profiles').upsert({
            id: user.id,
            display_name: displayName ?? null,
          }, { onConflict: 'id', ignoreDuplicates: true })

          if (isFirstLogin) {
            router.replace(`/profile/setup?next=${encodeURIComponent(next)}`)
            return
          }
        }

        router.replace(next)
      } catch {
        setError(true)
      }
    }

    handleCallback()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <div className="text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            That link has expired or has already been used.
          </p>
          <a
            href="/login"
            className="text-sm text-zinc-900 dark:text-zinc-50 underline underline-offset-4"
          >
            Request a new one
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="w-4 h-4 rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-zinc-100 animate-spin" />
    </div>
  )
}
