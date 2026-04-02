import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Use the public app URL for redirects — Railway's internal origin is
  // localhost:8080, not the public-facing domain.
  const base = process.env.NEXT_PUBLIC_APP_URL!

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const displayName = data.user.user_metadata?.display_name as string | undefined
      await supabase.from('profiles').upsert({
        id: data.user.id,
        display_name: displayName ?? data.user.email?.split('@')[0] ?? 'Athlete',
      }, { onConflict: 'id', ignoreDuplicates: true })

      return NextResponse.redirect(`${base}${next}`)
    }
  }

  return NextResponse.redirect(`${base}/login?error=auth_failed`)
}
