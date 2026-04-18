/* globals React, Button, Pill, EVENT_LABELS, AMBITION_LABELS, Leaderboard, WeekView, MessageBoard, IconArrowLeft, IconCopy */

function GroupActionsMenu({ isCreator, onAction }) {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const t = setTimeout(() => document.addEventListener('click', close), 0);
    return () => { clearTimeout(t); document.removeEventListener('click', close); };
  }, [open]);
  const items = isCreator
    ? [
        { label: 'Copy invite link', action: 'copy-invite' },
        { label: 'Reset invite link', action: 'rotate' },
        { label: 'Lock invites', action: 'lock' },
        { label: 'Edit group', action: 'edit' },
        { label: 'Delete group', action: 'delete', danger: true },
      ]
    : [
        { label: 'Copy invite link', action: 'copy-invite' },
        { label: 'Leave group', action: 'leave', danger: true },
      ];

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
      >
        •••
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg overflow-hidden z-40">
          {items.map((it) => (
            <button
              key={it.action}
              onClick={() => { setOpen(false); onAction(it.action); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                it.danger
                  ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                  : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupHome({ group, sessions, members, currentUserId, messages, memberNames, onBack }) {
  const [copied, setCopied] = React.useState(false);

  // Split sessions into weeks, with Week 1=past-complete, Week 2=past-incomplete, Week 3=active
  const weeks = [
    { number: 1, status: 'past-complete', dateRange: '7–13 Apr', sessions: sessions.filter((s) => s.week_number === 1) },
    { number: 2, status: 'past-incomplete', dateRange: '14–20 Apr', sessions: sessions.filter((s) => s.week_number === 2) },
    { number: 3, status: 'active', dateRange: '21–27 Apr', sessions: sessions.filter((s) => s.week_number === 3) },
  ];

  const daysUntil = Math.ceil((new Date(group.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  function copyInvite() {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 mb-4 transition-colors">
        <IconArrowLeft size={14} /> Dashboard
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Pill>{EVENT_LABELS[group.event_type]}</Pill>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">{AMBITION_LABELS[group.ambition]}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight truncate">{group.name}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {group.event_name} · {daysUntil > 0 ? `${daysUntil} days to go` : 'Race day'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="secondary" size="sm" onClick={copyInvite}>
            {copied
              ? <span className="text-green-700 dark:text-green-400">Copied!</span>
              : <span className="inline-flex items-center gap-1.5"><IconCopy size={13}/> Invite</span>}
          </Button>
          <GroupActionsMenu isCreator={true} onAction={() => {}} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        {/* Left: weeks */}
        <div className="space-y-4 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Training plan</h2>
            <a className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 cursor-pointer">View full plan →</a>
          </div>
          {weeks.map((w) => (
            <WeekView
              key={w.number}
              weekNumber={w.number}
              sessions={w.sessions}
              status={w.status}
              dateRange={w.dateRange}
              brickParts={w.number === 3 ? [{ activity_type: 'ride' }] : []}
            />
          ))}
        </div>

        {/* Right: leaderboard + chat */}
        <div className="space-y-4">
          <Leaderboard members={members} currentUserId={currentUserId} />
          <MessageBoard
            initial={messages}
            currentUserId={currentUserId}
            memberNames={memberNames}
          />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GroupHome, GroupActionsMenu });
