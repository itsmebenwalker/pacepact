import { requireAuth } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user, supabase } = auth

  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)

  return NextResponse.json({ ok: true })
}
