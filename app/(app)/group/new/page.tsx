import Link from 'next/link'
import CreateGroupForm from '@/components/groups/CreateGroupForm'

export default function NewGroupPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Create a group</h1>
        <Link
          href="/groups"
          className="flex items-center gap-1.5 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-md transition-colors"
        >
          Back
        </Link>
      </div>
      <CreateGroupForm />
    </div>
  )
}
