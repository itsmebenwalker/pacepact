export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-5 sm:mb-8">
        <div className="h-7 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="hidden sm:block h-9 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
      </div>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="h-5 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
      <div className="sm:hidden mt-3 h-11 w-full bg-zinc-100 dark:bg-zinc-800 rounded-md" />
    </div>
  )
}
