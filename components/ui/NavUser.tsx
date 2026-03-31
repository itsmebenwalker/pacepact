'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NavUser({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href="/profile" className="text-gray-600 hover:text-gray-900">
        Profile
      </Link>
      <button onClick={signOut} className="text-gray-400 hover:text-gray-700">
        Sign out
      </button>
    </div>
  )
}
