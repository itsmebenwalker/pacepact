/* globals React, Pill, IconArrowLeft, IconMessage, IconX, SessionCard */

// Mobile · Group home
// Layout: nav → group header → leaderboard (top 3 + expand) →
//   current week sessions → "Past weeks" disclosure →
//   floating "Open chat" pill → chat bottom sheet → session detail bottom sheet.
function MobileGroupHome({ group, sessions, members, currentUserId, messages,
  memberNames, onBack, initialSessionId }) {

  const [chatOpen,         setChatOpen]         = React.useState(false);
  const [selectedSession,  setSelectedSession]  = React.useState(null);
  const [pastWeeksOpen,    setPastWeeksOpen]    = React.useState(false);
  const [lbExpanded,       setLbExpanded]       = React.useState(false);
  const [chatDraft,        setChatDraft]        = React.useState('');
  const [localMessages,    setLocalMessages]    = React.useState(messages);

  // Open a specific session on first render (used for "Session detail" screen jump)
  React.useEffect(() => {
    if (initialSessionId) {
      const s = sessions.find((x) => x.id === initialSessionId);
      if (s) setSelectedSession(s);
    }
  }, []);

  const EVENT_LABELS    = { marathon:'Marathon', half_marathon:'Half Marathon', triathlon:'Triathlon', cycling:'Cycling', obstacle:'Obstacle Race', custom:'Event' };
  const AMBITION_LABELS = { finish:'Just finish', pb:'Beat my PB', podium:'Podium' };

  const daysUntil = Math.ceil((new Date(group.event_date).getTime() - Date.now()) / 86400000);

  // Organise into weeks; last week = active, earlier = past
  const weekNums   = [...new Set(sessions.map((s) => s.week_number))].sort((a, b) => a - b);
  const weeks      = weekNums.map((n) => ({ number: n, sessions: sessions.filter((s) => s.week_number === n) }));
  const currentWeek = weeks[weeks.length - 1];
  const pastWeeks   = weeks.slice(0, -1);

  const WEEK_DATE_RANGES = { 1:'7–13 Apr', 2:'14–20 Apr', 3:'21–27 Apr' };
  const WEEK_STATUSES    = { 1:'past-complete', 2:'past-incomplete', 3:'active' };

  // Leaderboard
  const sorted    = [...members].sort((a, b) => b.points - a.points);
  const lbVisible = lbExpanded ? sorted : sorted.slice(0, 3);

  function sendMessage(e) {
    e.preventDefault();
    const trimmed = chatDraft.trim();
    if (!trimmed) return;
    setLocalMessages([...localMessages, {
      id: 'local-' + Date.now(),
      user_id: currentUserId,
      content: trimmed,
      created_at: new Date().toISOString(),
      display_name: memberNames[currentUserId] ?? 'You',
    }]);
    setChatDraft('');
  }

  // ── sub-components (called as functions to avoid reconciliation churn) ──────

  function renderSessionRow(session) {
    const isCompleted = session.completed;
    const TYPE_LABELS = { run:'Run', ride:'Ride', swim:'Swim', brick:'Brick' };
    const label       = TYPE_LABELS[session.session_type] ?? session.session_type;
    return (
      <button
        key={session.id}
        className="w-full text-left"
        style={{minHeight:'44px'}}
        onClick={() => setSelectedSession(session)}
      >
        <div className={`border rounded-md p-3 text-sm transition-colors ${
          isCompleted
            ? 'bg-zinc-50 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800 opacity-60'
            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
        }`}>
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</span>
          <p className={`font-medium leading-snug mt-0.5 ${isCompleted ? 'text-zinc-400 dark:text-zinc-500 line-through' : 'text-zinc-900 dark:text-zinc-50'}`}>
            {session.target_description}
          </p>
          {(session.target_distance_km || session.target_duration_minutes) && (
            <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-0.5">
              {[
                session.target_distance_km    && `${session.target_distance_km} km`,
                session.target_duration_minutes && `${session.target_duration_minutes} min`,
              ].filter(Boolean).join(' · ')}
            </p>
          )}
          {isCompleted && session.points_awarded > 0 && (
            <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-0.5">+{session.points_awarded} pts</p>
          )}
        </div>
      </button>
    );
  }

  function renderWeekCard(week) {
    const status  = WEEK_STATUSES[week.number] ?? 'active';
    const active  = week.sessions.filter((s) => s.session_type !== 'rest');
    const done    = active.filter((s) => s.completed).length;
    const dateRng = WEEK_DATE_RANGES[week.number] ?? '';

    const cardCls = `rounded-lg overflow-hidden border bg-white dark:bg-zinc-900 ${
      status === 'past-complete'
        ? 'border-green-200 dark:border-green-800'
        : status === 'past-incomplete'
        ? 'border-zinc-200 dark:border-zinc-800 opacity-60'
        : 'border-zinc-200 dark:border-zinc-800'
    }`;
    const headCls = `px-4 py-3 border-b flex items-center justify-between ${
      status === 'past-complete'
        ? 'bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900'
        : status === 'past-incomplete'
        ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
        : 'border-zinc-100 dark:border-zinc-800'
    }`;

    return (
      <div key={week.number} className={cardCls}>
        <div className={headCls}>
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Week {week.number}</h3>
            {dateRng && <span className="text-xs text-zinc-400 dark:text-zinc-500">{dateRng}</span>}
          </div>
          <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">{done}/{active.length}</span>
        </div>
        <div className="p-3 space-y-2">
          {active.map(renderSessionRow)}
        </div>
      </div>
    );
  }

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Mobile nav bar */}
      <div
        className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between px-2"
        style={{height:'52px', flexShrink:0}}
      >
        <button
          onClick={onBack}
          className="flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors rounded-md"
          style={{minWidth:'44px', minHeight:'44px'}}
        >
          <IconArrowLeft size={16} />
        </button>
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate px-2">{group.name}</span>
        <div style={{width:'44px'}} />
      </div>

      {/* Scrollable content */}
      <div style={{flex:1, overflowY:'auto', overflowX:'hidden'}}>
        <div className="px-4 py-4 space-y-4" style={{paddingBottom:'72px'}}>

          {/* Group header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Pill>{EVENT_LABELS[group.event_type] ?? group.event_type}</Pill>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">{AMBITION_LABELS[group.ambition]}</span>
            </div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">{group.name}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {group.event_name} · {daysUntil > 0 ? `${daysUntil} days to go` : 'Race day'}
            </p>
          </div>

          {/* Leaderboard — top 3 visible, expand on tap */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Leaderboard</h2>
              {sorted.length > 3 && (
                <button
                  onClick={() => setLbExpanded(!lbExpanded)}
                  className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                  style={{minHeight:'44px', paddingLeft:'8px'}}
                >
                  {lbExpanded ? 'Collapse' : `View all ${sorted.length}`}
                </button>
              )}
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {lbVisible.map((m, i) => {
                const isMe = m.user_id === currentUserId;
                return (
                  <div key={m.user_id} className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-zinc-50 dark:bg-zinc-800/50' : ''}`}>
                    <span className={`w-5 text-center font-medium text-xs tabular-nums shrink-0 ${i === 0 ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-400 dark:text-zinc-500'}`}>{i + 1}</span>
                    <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                      {m.display_name ?? 'Athlete'}
                      {isMe && <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500 font-normal">you</span>}
                    </span>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums shrink-0">{m.points}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current week */}
          <div>
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2">This week</h2>
            {renderWeekCard(currentWeek)}
          </div>

          {/* Past weeks disclosure */}
          {pastWeeks.length > 0 && (
            <div>
              <button
                onClick={() => setPastWeeksOpen(!pastWeeksOpen)}
                className="w-full flex items-center justify-between px-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                style={{minHeight:'44px'}}
              >
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Past weeks</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{color:'#a1a1aa', flexShrink:0, transform: pastWeeksOpen ? 'rotate(180deg)' : 'none'}}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {pastWeeksOpen && (
                <div className="mt-2 space-y-2">
                  {[...pastWeeks].reverse().map(renderWeekCard)}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Floating "Open chat" pill */}
      <div style={{position:'absolute', bottom:'12px', left:'50%', transform:'translateX(-50%)', zIndex:10}}>
        <button
          onClick={() => setChatOpen(true)}
          className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-medium text-sm px-5 rounded-full transition-colors"
          style={{height:'44px', whiteSpace:'nowrap', boxShadow:'0 2px 12px rgba(0,0,0,0.18)'}}
        >
          <IconMessage size={15} />
          Open chat
        </button>
      </div>

      {/* ── Chat bottom sheet ─────────────────────────────────────── */}
      {chatOpen && (
        <div style={{position:'absolute', inset:0, zIndex:40, display:'flex', flexDirection:'column', justifyContent:'flex-end'}}>
          <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.4)'}} onClick={() => setChatOpen(false)} />
          <div className="bg-white dark:bg-zinc-900 relative flex flex-col" style={{borderRadius:'20px 20px 0 0', height:'70%'}}>
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
            </div>
            {/* Header */}
            <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Group chat</h2>
              <button
                onClick={() => setChatOpen(false)}
                className="flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-md"
                style={{minWidth:'44px', minHeight:'44px'}}
              >
                <IconX size={16} />
              </button>
            </div>
            {/* Messages */}
            <div style={{flex:1, overflowY:'auto'}} className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {localMessages.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">No messages yet — say hello!</p>
              ) : localMessages.map((msg) => (
                <div key={msg.id} className={`px-4 py-3 flex gap-3 ${msg.user_id === currentUserId ? 'bg-zinc-50 dark:bg-zinc-800/40' : ''}`}>
                  <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{(msg.display_name ?? 'A')[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-zinc-900 dark:text-zinc-50">{msg.display_name ?? 'Athlete'}</span>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-snug break-words">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Input */}
            <form onSubmit={sendMessage} className="p-3 border-t border-zinc-100 dark:border-zinc-800 flex gap-2 shrink-0">
              <input
                type="text" value={chatDraft} onChange={(e) => setChatDraft(e.target.value)}
                placeholder="Write a message…" maxLength={200}
                className="flex-1 px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent transition-colors"
                style={{minHeight:'44px'}}
              />
              <button
                type="submit" disabled={!chatDraft.trim()}
                className="px-3 bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-40 text-white dark:text-zinc-900 font-medium rounded-md text-sm transition-colors shrink-0"
                style={{minHeight:'44px'}}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Session detail bottom sheet ───────────────────────────── */}
      {selectedSession && (
        <div style={{position:'absolute', inset:0, zIndex:40, display:'flex', flexDirection:'column', justifyContent:'flex-end'}}>
          <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.4)'}} onClick={() => setSelectedSession(null)} />
          <div className="bg-white dark:bg-zinc-900 relative" style={{borderRadius:'20px 20px 0 0'}}>
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
            </div>
            {/* Title row */}
            <div className="px-4 pb-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  {selectedSession.session_type}
                </span>
                <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-50 mt-0.5 leading-snug">
                  {selectedSession.target_description}
                </h2>
                {(selectedSession.target_distance_km || selectedSession.target_duration_minutes) && (
                  <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
                    {[
                      selectedSession.target_distance_km      && `${selectedSession.target_distance_km} km`,
                      selectedSession.target_duration_minutes && `${selectedSession.target_duration_minutes} min`,
                    ].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-md shrink-0"
                style={{minWidth:'44px', minHeight:'44px'}}
              >
                <IconX size={16} />
              </button>
            </div>
            {/* Coaching tip */}
            {(selectedSession.tip || selectedSession.session_type !== 'rest') && (
              <div className="mx-4 mb-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-md border border-zinc-100 dark:border-zinc-800">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">Coaching tip</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {selectedSession.tip ?? {
                    run:   'Keep a conversational pace. Consistency beats intensity.',
                    ride:  'Stay seated on climbs and focus on a smooth cadence.',
                    swim:  'Long, efficient strokes — relax and glide between pulls.',
                    brick: 'Move quickly through transition and settle into your run rhythm.',
                  }[selectedSession.session_type]}
                </p>
              </div>
            )}
            {/* Actions */}
            <div className="px-4 pb-6 space-y-2">
              {!selectedSession.completed && (
                <button
                  className="w-full bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-700 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium rounded-md text-sm transition-colors"
                  style={{minHeight:'44px'}}
                  onClick={() => setSelectedSession(null)}
                >
                  Mark done manually
                </button>
              )}
              {selectedSession.session_type === 'brick' && !selectedSession.completed && (
                <button
                  className="w-full border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-md text-sm bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  style={{minHeight:'44px'}}
                  onClick={() => setSelectedSession(null)}
                >
                  Count as ride session instead
                </button>
              )}
              {selectedSession.strava_activity_id && (
                <p className="text-center">
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-sm font-bold underline text-[#FC5200] hover:opacity-80 transition-opacity">
                    View on Strava
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

Object.assign(window, { MobileGroupHome });
