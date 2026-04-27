import Link from 'next/link'
import PoweredByStrava from '@/components/ui/PoweredByStrava'

export const metadata = {
  title: 'Privacy Policy — PacePact',
  description: 'PacePact privacy policy — how we collect, use, and protect your data.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/groups" className="font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
            PacePact
          </Link>
          <Link
            href="/groups"
            className="flex items-center gap-1.5 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-md transition-colors"
          >
            Back to PacePact
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Privacy Policy</h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-500">Last updated: April 2026</p>
        </div>

        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          PacePact (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the PacePact platform, a group training
          accountability app for endurance athletes. This policy explains what data we collect, why we collect it, and
          how you can control it. PacePact is committed to handling your personal information in accordance with the{' '}
          <em>Privacy Act 1988</em> (Cth) and the Australian Privacy Principles (APPs). If you have questions, contact
          us at{' '}
          <a href="mailto:support@pacepact.com.au" className="underline hover:no-underline">
            support@pacepact.com.au
          </a>.
        </p>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">1. Data we collect</h2>
          <div className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
            <p><strong className="text-zinc-700 dark:text-zinc-300">Account data.</strong> When you sign up we collect your email address. You may optionally add a display name.</p>
            <p><strong className="text-zinc-700 dark:text-zinc-300">Strava connection data.</strong> When you connect your Strava account, we store your Strava athlete ID and OAuth tokens (access token, refresh token, token expiry). These are used solely to receive activity notifications from Strava on your behalf.</p>
            <p><strong className="text-zinc-700 dark:text-zinc-300">Activity data.</strong> When Strava notifies us that you have completed an activity, we fetch the activity&apos;s type, distance, duration, and date. We store only the Strava activity ID against any session it matches — we do not store GPS routes, heart rate, power data, or other detailed health metrics. Some activity data may constitute health information under the Privacy Act and is treated accordingly with heightened care.</p>
            <p><strong className="text-zinc-700 dark:text-zinc-300">Group and training data.</strong> We store the groups you belong to, your generated training sessions, completion status, and points. Within a group, all members can see each other&apos;s training progress and points — you consent to this when joining a group.</p>
            <p><strong className="text-zinc-700 dark:text-zinc-300">Messages.</strong> Group chat messages are stored and visible to all members of the group. Messages are limited to 200 characters.</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">2. How we use your data</h2>
          <ul className="text-sm text-zinc-500 dark:text-zinc-400 space-y-2 list-disc list-inside">
            <li>To operate the service: match Strava activities to your training sessions and award points</li>
            <li>To display your progress and leaderboard position to other members of your groups</li>
            <li>To send in-app notifications for activity matches and (if opted in) group messages</li>
            <li>To generate your group&apos;s AI-powered training plan via the Anthropic Claude API</li>
          </ul>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            We do not sell your data, use it for advertising, or combine it with third-party datasets. Strava activity
            data is never used for AI model training.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">3. Strava data</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            PacePact is powered by Strava. We access your Strava data under the{' '}
            <a href="https://www.strava.com/legal/api" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
              Strava API Agreement
            </a>
            . We request the <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded text-xs">activity:read_all</code> scope to receive
            webhook notifications when you log activities. We never request permission to write to Strava or post on your behalf.
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Strava activity data is cached for no longer than 7 days in accordance with Strava&apos;s API terms. You can
            revoke PacePact&apos;s access to your Strava account at any time from your{' '}
            <Link href="/profile" className="underline hover:no-underline">profile page</Link> or directly via{' '}
            <a href="https://www.strava.com/settings/apps" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
              Strava&apos;s app settings
            </a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">4. Data sharing</h2>
          <div className="text-sm text-zinc-500 dark:text-zinc-400 space-y-2">
            <p>We share data only with the following sub-processors, each necessary to operate the service:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong className="text-zinc-700 dark:text-zinc-300">Supabase</strong> — database and authentication (EU/US)</li>
              <li><strong className="text-zinc-700 dark:text-zinc-300">Railway</strong> — application hosting (US)</li>
              <li><strong className="text-zinc-700 dark:text-zinc-300">Anthropic</strong> — AI plan generation (prompts contain only event type, date, and ambition — no personal data)</li>
              <li><strong className="text-zinc-700 dark:text-zinc-300">Resend</strong> — transactional email (magic link login)</li>
              <li><strong className="text-zinc-700 dark:text-zinc-300">Strava</strong> — activity data source</li>
            </ul>
            <p>We do not share data with any other third parties.</p>
            <p className="mt-2">
              Some of these sub-processors are located overseas (primarily the United States). Under APP 8 of the
              Australian Privacy Principles, where we disclose personal information to an overseas recipient, we remain
              accountable for ensuring that information is handled in accordance with the APPs. We take reasonable
              contractual and technical steps to ensure overseas sub-processors meet this standard.
            </p>
            <p className="mt-2">
              Please note that when you connect your Strava account, Strava may independently collect data about your
              use of their platform in accordance with the{' '}
              <a href="https://www.strava.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                Strava Privacy Policy
              </a>. PacePact has no control over Strava&apos;s data collection practices.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">5. Data retention</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Your data is retained for as long as your account is active. If you delete your account, all personal data
            (profile, sessions, messages, Strava tokens) is permanently deleted within 48 hours. If you disconnect
            Strava, your tokens are deleted immediately.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">6. Your rights</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Under the <em>Privacy Act 1988</em> (Cth) and the Australian Privacy Principles, you have the right to
            access the personal information we hold about you (APP 12) and to request corrections if it is inaccurate,
            out of date, incomplete, or misleading (APP 13). To exercise any of these rights, email{' '}
            <a href="mailto:support@pacepact.com.au" className="underline hover:no-underline">
              support@pacepact.com.au
            </a>
            . We will respond within 30 days. There is no charge for making an access or correction request.
          </p>
          <ul className="text-sm text-zinc-500 dark:text-zinc-400 list-disc list-inside space-y-1">
            <li><strong className="text-zinc-700 dark:text-zinc-300">Delete your account</strong>: profile page → Danger zone → Delete account</li>
            <li><strong className="text-zinc-700 dark:text-zinc-300">Disconnect Strava</strong>: profile page → Strava → Disconnect</li>
            <li><strong className="text-zinc-700 dark:text-zinc-300">Data export</strong>: email support@pacepact.com.au with subject &quot;Data export request&quot;</li>
          </ul>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            If you are not satisfied with our response to a privacy concern, you may lodge a complaint with the{' '}
            <a href="https://www.oaic.gov.au/privacy/privacy-complaints" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
              Office of the Australian Information Commissioner (OAIC)
            </a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">7. Security</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            We use Supabase&apos;s built-in Row Level Security to ensure users can only access data they are authorised
            to see. Strava OAuth tokens are stored encrypted at rest. In the event of an eligible data breach under the
            Notifiable Data Breaches scheme, we will notify affected individuals and the Office of the Australian
            Information Commissioner (OAIC) as soon as practicable after becoming aware of the breach.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">8. Contact</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            For any privacy-related queries, email{' '}
            <a href="mailto:support@pacepact.com.au" className="underline hover:no-underline">
              support@pacepact.com.au
            </a>.
          </p>
        </section>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-8">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <PoweredByStrava className="h-5 w-auto opacity-70" />
        </div>
      </footer>
    </div>
  )
}
