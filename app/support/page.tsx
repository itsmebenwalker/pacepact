import Link from 'next/link'

export const metadata = {
  title: 'Support — PacePact',
  description: 'Get help with PacePact, the group training platform powered by Strava.',
}

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
            PacePact
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-md transition-colors"
          >
            Back to PacePact
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-10">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Support</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Need help with PacePact? We&apos;re happy to help. Reach us at{' '}
            <a href="mailto:support@pacepact.com.au" className="font-medium text-zinc-900 dark:text-zinc-50 underline hover:no-underline">
              support@pacepact.com.au
            </a>
          </p>
        </div>

        <section className="space-y-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Frequently asked questions</h2>

          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                Why does PacePact need to connect to my Strava account?
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                PacePact uses Strava to automatically mark your training sessions as complete. When you log an activity on
                Strava (a run, ride, swim, etc.), PacePact matches it against your group&apos;s training plan and awards
                your points — no manual logging needed. We only request read access to your activities and never post to
                Strava on your behalf.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                My session wasn&apos;t marked as complete after I logged an activity on Strava. What happened?
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                A few things to check: (1) confirm your Strava account is connected on your{' '}
                <Link href="/profile" className="underline hover:no-underline">
                  profile page
                </Link>
                ; (2) the activity type must match the session type (e.g. a Strava &quot;Run&quot; matches a scheduled
                run session); (3) the activity must be at least 85% of the target distance or duration. If everything
                looks correct and it still wasn&apos;t credited, email us and include the date of the activity.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                How do I disconnect my Strava account?
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Go to your{' '}
                <Link href="/profile" className="underline hover:no-underline">
                  profile page
                </Link>{' '}
                and click &quot;Disconnect Strava&quot;. This immediately removes your tokens from PacePact and
                deauthorises the connection on Strava&apos;s side. Future activities will no longer be processed. Your
                previously completed sessions and points are retained.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                How do I leave a group?
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Open the group page, click the &quot;•••&quot; menu, and select &quot;Leave group&quot;. If you created
                the group you must transfer admin rights to another member before you can leave. Leaving removes your
                sessions and points from that group.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                How do I delete my account?
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Go to your{' '}
                <Link href="/profile" className="underline hover:no-underline">
                  profile page
                </Link>{' '}
                and click &quot;Delete account&quot; in the Danger zone section. This permanently deletes your account,
                all session data, and removes you from all groups. Strava is also deauthorised at the same time. Account
                deletion is irreversible.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                What data does PacePact store from Strava?
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                We store your Strava athlete ID and OAuth tokens (access token, refresh token, expiry). When an activity
                arrives via webhook, we store the Strava activity ID against the matched session. We do not store your
                full activity details, GPS routes, heart rate data, or any other personal health information. See our{' '}
                <Link href="/privacy" className="underline hover:no-underline">
                  Privacy Policy
                </Link>{' '}
                for full details.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                Can I request a copy of my data?
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Yes. Email{' '}
                <a href="mailto:support@pacepact.com.au" className="underline hover:no-underline">
                  support@pacepact.com.au
                </a>{' '}
                with the subject &quot;Data export request&quot; and we will provide a copy of all data we hold about
                you within 30 days.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Still need help?</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Email us at{' '}
            <a href="mailto:support@pacepact.com.au" className="font-medium text-zinc-900 dark:text-zinc-50 underline hover:no-underline">
              support@pacepact.com.au
            </a>{' '}
            and we&apos;ll get back to you within 2 business days.
          </p>
        </section>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-8">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/powered-by-strava.svg" alt="Powered by Strava" width={150} height={28} className="h-5 w-auto opacity-70" />
        </div>
      </footer>
    </div>
  )
}
