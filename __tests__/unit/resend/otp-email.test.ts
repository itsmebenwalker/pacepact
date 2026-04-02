import { buildOtpEmail } from '@/lib/resend/otp-email'

const LINK = 'https://supabase.co/auth/v1/verify?token=abc123&type=magiclink'

describe('buildOtpEmail — subject', () => {
  it('uses a signup subject when isSignup is true', () => {
    const { subject } = buildOtpEmail({ link: LINK, isSignup: true })
    expect(subject).toMatch(/creat/i)
  })

  it('uses a sign-in subject when isSignup is false', () => {
    const { subject } = buildOtpEmail({ link: LINK, isSignup: false })
    expect(subject).toMatch(/sign in/i)
  })
})

describe('buildOtpEmail — html', () => {
  it('includes the magic link in the output', () => {
    const { html } = buildOtpEmail({ link: LINK, isSignup: false })
    expect(html).toContain(LINK)
  })

  it('includes the link twice (button href + fallback text)', () => {
    const { html } = buildOtpEmail({ link: LINK, isSignup: false })
    const occurrences = html.split(LINK).length - 1
    expect(occurrences).toBe(2)
  })

  it('is valid HTML with a doctype', () => {
    const { html } = buildOtpEmail({ link: LINK, isSignup: false })
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/i)
  })

  it('includes PacePact branding', () => {
    const { html } = buildOtpEmail({ link: LINK, isSignup: false })
    expect(html).toContain('PacePact')
  })

  it('shows "Create account" CTA for signup', () => {
    const { html } = buildOtpEmail({ link: LINK, isSignup: true })
    expect(html).toContain('Create account')
  })

  it('shows "Sign in" CTA for login', () => {
    const { html } = buildOtpEmail({ link: LINK, isSignup: false })
    expect(html).toContain('Sign in')
  })
})
