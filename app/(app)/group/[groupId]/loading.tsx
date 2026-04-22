export default function Loading() {
  return (
    <div className="space-y-5 sm:space-y-8 pb-20 sm:pb-0 animate-pulse">

      {/* Header: group name + event info + actions button */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-6 w-44 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-4 w-56 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
        <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>

      {/* Week in Review strip */}
      <div className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />

      {/* Leaderboard */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
        <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
              <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
            <div className="h-4 w-14 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        ))}
      </div>

      {/* Training plan: current week + one past week */}
      {[0, 1].map((i) => (
        <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-md" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
