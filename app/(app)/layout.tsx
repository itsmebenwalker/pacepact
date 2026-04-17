import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import NavUser from '@/components/ui/NavUser'
import NotificationBell from '@/components/notifications/NotificationBell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
            PacePact
          </Link>
          <div className="relative flex items-center gap-1">
            <NotificationBell userId={user.id} />
            <NavUser />
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-4 sm:py-8">{children}</main>
      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 text-xs text-zinc-400 dark:text-zinc-500">
            <a href="/support" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">Support</a>
            <a href="/privacy" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">Privacy</a>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/powered-by-strava.svg" alt="Powered by Strava" width={150} height={28} className="h-5 w-auto opacity-70" />
        </div>
      </footer>
    </div>
  )
}
