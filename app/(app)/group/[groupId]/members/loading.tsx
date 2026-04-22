export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">

      {/* Header: Members + group name + Back button */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-4 w-36 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
        <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
      </div>

      {/* Member list */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 sm:px-5 sm:py-4">
              <div className="w-5 h-4 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-3 w-24 bg-zinc-100 dark:bg-zinc-800 rounded" />
              </div>
              <div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
