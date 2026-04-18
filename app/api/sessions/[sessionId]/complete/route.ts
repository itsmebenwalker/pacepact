import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const MANUAL_POINTS = 10

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()

  const { data: session } = await serviceClient
    .from('sessions')
    .select('id, group_id, completed')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.completed) return NextResponse.json({ error: 'Already completed' }, { status: 409 })

  await serviceClient
    .from('sessions')
    .update({ completed: true, completed_at: new Date().toISOString(), points_awarded: MANUAL_POINTS })
    .eq('id', sessionId)

  const { data: member } = await serviceClient
    .from('group_members')
    .select('points')
    .eq('group_id', session.group_id)
    .eq('user_id', user.id)
    .single()

  if (member) {
    await serviceClient
      .from('group_members')
      .update({ points: member.points + MANUAL_POINTS })
      .eq('group_id', session.group_id)
      .eq('user_id', user.id)
  }

  return NextResponse.json({ ok: true })
}
