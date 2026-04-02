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
<body style="margin:0;padding:0;background-color:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#fafafa;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:480px;">

          <!-- Logo / wordmark -->
          <tr>
            <td style="padding-bottom:24px;">
              <span style="font-size:16px;font-weight:600;color:#18181b;letter-spacing:-0.025em;">PacePact</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;padding:32px;">

              <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:600;color:#18181b;letter-spacing:-0.025em;">${heading}</h1>
              <p style="margin:0 0 28px 0;font-size:14px;line-height:1.6;color:#71717a;">${body}</p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="border-radius:6px;background:#18181b;">
                    <a href="${link}" style="display:inline-block;padding:10px 20px;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;border-radius:6px;">${cta}</a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
                <tr>
                  <td style="border-top:1px solid #f4f4f5;"></td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0 0 4px 0;font-size:12px;color:#a1a1aa;">If the button doesn't work, copy and paste this link:</p>
              <p style="margin:0;font-size:12px;color:#71717a;word-break:break-all;">${link}</p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:20px;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
                If you didn't request this email, you can safely ignore it — your account will not be affected.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, html }
}
