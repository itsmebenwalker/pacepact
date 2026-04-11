import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as {
    display_name?: string
    notify_admin_message?: boolean
    notify_any_message?: boolean
  }

  const updates: Record<string, unknown> = {}

  if (body.display_name !== undefined) {
    if (!body.display_name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    updates.display_name = body.display_name.trim()
  }
  if (body.notify_admin_message !== undefined) updates.notify_admin_message = body.notify_admin_message
  if (body.notify_any_message !== undefined) updates.notify_any_message = body.notify_any_message

  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true })

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
