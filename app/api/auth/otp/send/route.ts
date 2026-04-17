import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { buildOtpEmail } from '@/lib/resend/otp-email'

export async function POST(request: Request) {
  const { email, display_name } = await request.json() as {
    email: string
    display_name?: string
  }

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false, flowType: 'implicit' } }
  )

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
  const isSignup = !!display_name

  // For login, verify the email exists with a single targeted query rather than
  // loading all users. GoTrue's filter param searches by email, so we use perPage:1
  // and confirm the returned user is an exact match.
  if (!isSignup) {
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers(
      { perPage: 1, filter: email } as { perPage: number }
    )
    const userExists = users.some((u) => u.email === email)
    if (!userExists) {
      return NextResponse.json(
        { error: 'No account found for this email address. You need an invite to join PacePact.' },
        { status: 404 }
      )
    }
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
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { subject, html } = buildOtpEmail({ link: data.properties.action_link, isSignup })

  await resend.emails.send({
    from: `PacePact <noreply@${process.env.RESEND_FROM_DOMAIN ?? 'pacepact.com.au'}>`,
    to: email,
    subject,
    html,
  })

  return NextResponse.json({ ok: true })
}
