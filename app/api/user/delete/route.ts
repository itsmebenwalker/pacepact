import { requireAuth, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE() {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const serviceClient = createServiceClient()

  // Delete profile first — cascades to group_members, sessions, messages.
  // Without this, the FK from profiles.id -> auth.users.id blocks auth user deletion.
  await serviceClient.from('profiles').delete().eq('id', user.id)

  const { error } = await serviceClient.auth.admin.deleteUser(user.id)

  if (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Failed to delete account.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
