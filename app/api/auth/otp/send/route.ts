import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { buildOtpEmail } from '@/lib/resend/otp-email'

export async function POST(request: Request) {
  const { email, display_name } = await request.json() as {
    email: string
    display_name?: string
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
  const isSignup = !!display_name

  // Only allow users who already exist in Supabase auth — no open signups
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const userExists = users.some((u) => u.email === email)
  if (!userExists) {
    // Silent rejection — don't reveal which emails are registered
    return NextResponse.json({ ok: true })
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo,
      ...(display_name ? { data: { display_name } } : {}),
    },
  })

  if (error || !data.properties?.action_link) {
    console.error('Supabase generateLink error:', error)
    // Return 200 regardless — don't reveal whether the email exists
    return NextResponse.json({ ok: true })
  }

  const { subject, html } = buildOtpEmail({
    link: data.properties.action_link,
    isSignup,
  })

  await resend.emails.send({
    from: `PacePact <noreply@${process.env.RESEND_FROM_DOMAIN ?? 'pacepact.com'}>`,
    to: email,
    subject,
    html,
  })

  return NextResponse.json({ ok: true })
}
