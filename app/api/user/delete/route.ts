import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
