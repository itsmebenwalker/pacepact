/* globals React, IconInfo, IconCheck */

function SessionCard({ session, pendingPart }) {
  const labels = { run: 'Run', ride: 'Ride', swim: 'Swim', brick: 'Brick', rest: 'Rest' };
  const isCompleted = !!session.completed;
  const label = labels[session.session_type] ?? session.session_type.toUpperCase();
  const defaultTips = {
    run: 'Keep a conversational pace. Consistency beats intensity.',
    ride: 'Stay seated on climbs and focus on a smooth cadence.',
    swim: 'Long, efficient strokes — relax and glide between pulls.',
    brick: 'Move quickly through transition and settle into your run rhythm.',
  };
  const tip = session.tip ?? defaultTips[session.session_type];

  return (
    <div className={
      `relative border rounded-md p-3 text-sm transition-colors ` +
      (isCompleted
        ? 'bg-zinc-50 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800 opacity-60'
        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800')
    }>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {tip && (
            <div className="relative group">
              <button className="text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 mt-0.5" aria-label="Training tip">
                <IconInfo size={13} />
              </button>
              <div role="tooltip" className="absolute right-0 top-6 z-20 w-48 p-2 rounded bg-zinc-800 dark:bg-zinc-200 text-zinc-50 dark:text-zinc-900 text-xs leading-relaxed opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity pointer-events-none shadow-md">
                {tip}
              </div>
            </div>
          )}
          {isCompleted && (
            <span className="text-zinc-400 dark:text-zinc-500 mt-0.5"><IconCheck size={14} /></span>
          )}
        </div>
      </div>
      <p className={`font-medium leading-snug ${isCompleted ? 'text-zinc-400 dark:text-zinc-500 line-through' : 'text-zinc-900 dark:text-zinc-50'}`}>
        {session.target_description}
      </p>
      {(session.target_distance_km || session.target_duration_minutes) && (
        <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">
          {session.target_distance_km ? `${session.target_distance_km} km` : ''}
          {session.target_distance_km && session.target_duration_minutes ? ' · ' : ''}
          {session.target_duration_minutes ? `${session.target_duration_minutes} min` : ''}
        </p>
      )}
      {isCompleted && (
        <div className="text-zinc-400 dark:text-zinc-500 text-xs mt-1 space-y-1">
          <p>
            {session.completed_at ?? 'Completed'}
            {session.points_awarded > 0 && <span className="font-medium"> · +{session.points_awarded} pts</span>}
          </p>
          {session.strava_activity_id && (
            <a href="#" onClick={(e) => e.preventDefault()} className="font-bold underline text-[#FC5200] hover:opacity-80">
              View on Strava
            </a>
          )}
        </div>
      )}
      {pendingPart && !isCompleted && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
            <span>{pendingPart.activity_type === 'ride' ? 'Ride' : 'Run'} logged · waiting on {pendingPart.activity_type === 'ride' ? 'run' : 'ride'}</span>
            <span>50%</span>
          </div>
          <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-zinc-400 dark:bg-zinc-500 rounded-full" />
          </div>
          <button className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 underline underline-offset-2 hover:text-zinc-700">
            Count as {pendingPart.activity_type} session instead
          </button>
        </div>
      )}
    </div>
  );
}

function WeekView({ weekNumber, sessions, status = 'active', dateRange, brickParts = [] }) {
  const activeSessions = sessions.filter((s) => s.session_type !== 'rest');
  const restCount = sessions.filter((s) => s.session_type === 'rest').length;
  const completed = activeSessions.filter((s) => s.completed).length;

  const cardClass =
    'rounded-lg overflow-hidden border ' +
    (status === 'past-complete'
      ? 'bg-white dark:bg-zinc-900 border-green-200 dark:border-green-800'
      : status === 'past-incomplete'
      ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 opacity-60'
      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800');

  const headerClass =
    'px-4 py-3 sm:px-5 border-b flex items-center justify-between ' +
    (status === 'past-complete'
      ? 'bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900'
      : status === 'past-incomplete'
      ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
      : 'border-zinc-100 dark:border-zinc-800');

  return (
    <div className={cardClass}>
      <div className={headerClass}>
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Week {weekNumber}</h3>
          {dateRange && <span className="text-xs text-zinc-400 dark:text-zinc-500">{dateRange}</span>}
        </div>
        <div className="flex items-center gap-2">
          {status === 'past-complete' && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
              <IconCheck size={12} /> Done
            </span>
          )}
          {status === 'past-incomplete' && (
            <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Ended</span>
          )}
          <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">{completed}/{activeSessions.length}</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {activeSessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              pendingPart={s.session_type === 'brick' ? brickParts[0] : undefined}
            />
          ))}
        </div>
        {restCount > 0 && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Recommended: {restCount} rest day{restCount === 1 ? '' : 's'} this week
          </p>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { SessionCard, WeekView });
