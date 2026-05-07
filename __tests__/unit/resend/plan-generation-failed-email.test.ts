import { buildPlanGenerationFailedEmail } from '@/lib/resend/plan-generation-failed-email'

describe('buildPlanGenerationFailedEmail', () => {
  it('includes the group name in the subject', () => {
    const { subject } = buildPlanGenerationFailedEmail({ groupName: 'Marathon Crew' })
    expect(subject).toContain('Marathon Crew')
  })

  it('includes the group name in the body', () => {
    const { html } = buildPlanGenerationFailedEmail({ groupName: 'Marathon Crew' })
    expect(html).toContain('Marathon Crew')
  })

  it('points the user at the support email', () => {
    const { html } = buildPlanGenerationFailedEmail({ groupName: 'X' })
    expect(html).toContain('support@pacepact.com.au')
  })

  it('is valid HTML with a doctype', () => {
    const { html } = buildPlanGenerationFailedEmail({ groupName: 'X' })
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/i)
  })
})
