import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { display_name } = await request.json() as { display_name: string }

  if (!display_name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: display_name.trim() })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to update name' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
