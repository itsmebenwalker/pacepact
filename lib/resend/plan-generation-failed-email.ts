export function buildPlanGenerationFailedEmail({
  groupName,
}: {
  groupName: string
}): { subject: string; html: string } {
  const subject = `We couldn't generate your training plan for ${groupName}`

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

        <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:600;color:#18181b;">Training plan generation failed</h1>
        <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#71717a;">We tried to generate the training plan for your group <strong style="color:#18181b;">${groupName}</strong> three times, but it didn't go through.</p>
        <p style="margin:0 0 28px 0;font-size:14px;line-height:1.6;color:#71717a;">No charges were made and your group is still set up. Please reply to this email or contact <a href="mailto:support@pacepact.com.au" style="color:#18181b;">support@pacepact.com.au</a> and we'll generate the plan manually for you.</p>

        <p style="margin:0 0 0 0;font-size:12px;color:#a1a1aa;line-height:1.5;">Sorry for the inconvenience — we'll get this sorted shortly.</p>

      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, html }
}
