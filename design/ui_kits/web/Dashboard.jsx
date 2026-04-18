/* globals React, Button, Pill */

const EVENT_LABELS = {
  marathon: 'Marathon',
  half_marathon: 'Half Marathon',
  triathlon: 'Triathlon',
  cycling: 'Cycling',
  obstacle: 'Obstacle Race',
  custom: 'Event',
};
const AMBITION_LABELS = { finish: 'Just finish', pb: 'Beat my PB', podium: 'Podium' };

function GroupCard({ group, onClick }) {
  const daysUntil = Math.ceil(
    (new Date(group.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return (
    <button
      onClick={onClick}
      className="text-left bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0 mr-3">
          <h2 className="font-medium text-zinc-900 dark:text-zinc-50 truncate">{group.name}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{group.event_name}</p>
        </div>
        <Pill>{EVENT_LABELS[group.event_type] ?? group.event_type}</Pill>
      </div>
      <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
        <span>{daysUntil > 0 ? `${daysUntil} days to go` : 'Race day'}</span>
        <span>{AMBITION_LABELS[group.ambition]}</span>
      </div>
      <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <span className="text-xs text-zinc-400 dark:text-zinc-500">Your points</span>
        <span className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">{group.my_points}</span>
      </div>
    </button>
  );
}

function Dashboard({ groups, onOpenGroup, onNew }) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-5 sm:mb-8">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Groups</h1>
        <Button onClick={onNew}>New group</Button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <p className="text-zinc-900 dark:text-zinc-50 font-medium mb-2">No groups yet</p>
          <p className="text-zinc-400 dark:text-zinc-500 text-sm mb-6">
            Create one for your next race, or ask a friend for their invite link.
          </p>
          <Button size="lg" onClick={onNew}>Create your first group</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} onClick={() => onOpenGroup(g.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Dashboard, GroupCard, EVENT_LABELS, AMBITION_LABELS });
