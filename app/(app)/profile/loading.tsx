export default function Loading() {
  return (
    <div className="max-w-lg space-y-6 animate-pulse">
      <div className="h-7 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />

      {/* Account card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
          <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
        <div className="space-y-3">
          <div className="h-9 w-full bg-zinc-100 dark:bg-zinc-800 rounded" />
          <div className="flex justify-between">
            <div className="h-4 w-10 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-44 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        </div>
      </div>

      {/* Strava card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4">
        <div className="h-4 w-14 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-16 w-full bg-zinc-100 dark:bg-zinc-800 rounded" />
      </div>

      {/* Notifications card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4">
        <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="space-y-3">
          <div className="h-10 w-full bg-zinc-100 dark:bg-zinc-800 rounded" />
          <div className="h-10 w-full bg-zinc-100 dark:bg-zinc-800 rounded" />
        </div>
      </div>

      {/* Danger zone card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4">
        <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-9 w-32 bg-zinc-100 dark:bg-zinc-800 rounded" />
      </div>
    </div>
  )
}
