/* globals React */

function Leaderboard({ members, currentUserId }) {
  const sorted = [...members].sort((a, b) => b.points - a.points);
  const LIMIT = 5;
  const myRank = sorted.findIndex((m) => m.user_id === currentUserId);
  const isOutsideTop = myRank >= LIMIT;
  const visible = sorted.slice(0, LIMIT);
  const me = isOutsideTop ? sorted[myRank] : null;

  function Row({ member, rank }) {
    const isMe = member.user_id === currentUserId;
    return (
      <div className={`flex items-center gap-3 px-4 py-3 sm:px-5 sm:gap-4 ${isMe ? 'bg-zinc-50 dark:bg-zinc-800/50' : ''}`}>
        <span className={`w-5 text-center font-medium text-xs tabular-nums ${rank === 0 ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-400 dark:text-zinc-500'}`}>
          {rank + 1}
        </span>
        <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {member.display_name ?? 'Athlete'}
          {isMe && <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500 font-normal">you</span>}
        </span>
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">{member.points}</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Leaderboard</h2>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {visible.map((m, i) => <Row key={m.user_id} member={m} rank={i} />)}
        {isOutsideTop && me && (
          <>
            <div className="flex items-center gap-3 px-4 py-1.5 sm:px-5">
              <span className="w-5 text-center text-zinc-300 dark:text-zinc-600 text-xs">·</span>
              <span className="w-5 text-center text-zinc-300 dark:text-zinc-600 text-xs">·</span>
              <span className="w-5 text-center text-zinc-300 dark:text-zinc-600 text-xs">·</span>
            </div>
            <Row member={me} rank={myRank} />
          </>
        )}
      </div>
    </div>
  );
}

function MessageBoard({ initial, currentUserId, memberNames }) {
  const [messages, setMessages] = React.useState(initial);
  const [content, setContent] = React.useState('');

  function send(e) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    setMessages([
      ...messages,
      {
        id: 'local-' + Date.now(),
        user_id: currentUserId,
        content: trimmed,
        created_at: new Date().toISOString(),
        display_name: memberNames[currentUserId] ?? 'You',
      },
    ]);
    setContent('');
  }

  function formatTime(iso) {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
      <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-zinc-100 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Group chat</h2>
      </div>
      <div className="h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
        {messages.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">No messages yet — say hello!</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`px-4 py-3 sm:px-5 flex gap-3 ${msg.user_id === currentUserId ? 'bg-zinc-50 dark:bg-zinc-800/40' : ''}`}>
              <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {(msg.display_name ?? 'A')[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-50">
                    {msg.display_name ?? 'Athlete'}
                    {msg.user_id === currentUserId && (
                      <span className="ml-1.5 font-normal text-zinc-400 dark:text-zinc-500">you</span>
                    )}
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">{formatTime(msg.created_at)}</span>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-snug break-words">{msg.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
      <form onSubmit={send} className="p-3 sm:p-4 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a message…"
          maxLength={200}
          className="flex-1 px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={!content.trim()}
          className="px-3 py-2 bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-40 text-white dark:text-zinc-900 font-medium rounded-md text-sm transition-colors shrink-0"
        >
          Send
        </button>
      </form>
    </div>
  );
}

Object.assign(window, { Leaderboard, MessageBoard });
