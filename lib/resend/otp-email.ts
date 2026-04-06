export function buildOtpEmail({
  link,
  isSignup,
}: {
  link: string
  isSignup: boolean
}): { subject: string; html: string } {
  const subject = isSignup ? 'Finish creating your PacePact account' : 'Sign in to PacePact'
  const heading = isSignup ? 'Create your account' : 'Sign in to PacePact'
  const body = isSignup
    ? 'Click the button below to finish creating your account. This link expires in 1 hour and can only be used once.'
    : 'Click the button below to sign in. This link expires in 1 hour and can only be used once.'
  const cta = isSignup ? 'Create account' : 'Sign in'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td style="padding:48px 32px;">

        <p style="margin:0 0 32px 0;font-size:15px;font-weight:600;color:#18181b;">PacePact</p>

        <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:600;color:#18181b;">${heading}</h1>
        <p style="margin:0 0 28px 0;font-size:14px;line-height:1.6;color:#71717a;">${body}</p>

        <table cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="background:#18181b;border-radius:6px;">
              <a href="${link}" style="display:inline-block;padding:10px 20px;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;">${cta}</a>
            </td>
          </tr>
        </table>

        <p style="margin:32px 0 0 0;font-size:12px;color:#a1a1aa;line-height:1.5;">If the button doesn't work, copy and paste this link:<br/>
        <span style="color:#71717a;word-break:break-all;">${link}</span></p>

        <p style="margin:24px 0 0 0;font-size:12px;color:#a1a1aa;line-height:1.5;">If you didn't request this email, you can safely ignore it.</p>

      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, html }
}
