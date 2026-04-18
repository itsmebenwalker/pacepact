import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import NavUser from '@/components/ui/NavUser'
import NotificationBell from '@/components/notifications/NotificationBell'
import PoweredByStrava from '@/components/ui/PoweredByStrava'

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
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="24" height="24" aria-hidden="true">
              <rect width="32" height="32" rx="4" className="fill-zinc-950 dark:fill-zinc-50"/>
              <path d="M9 8h7a5 5 0 0 1 0 10h-4v6H9V8z" className="fill-zinc-50 dark:fill-zinc-950"/>
            </svg>
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
          <PoweredByStrava className="h-5 w-auto max-w-full opacity-70" />
        </div>
      </footer>
    </div>
  )
}
