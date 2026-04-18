/* globals React, Button, GroupCard */

// Mobile · Dashboard
// Single-column group list. "New group" is a full-width secondary button
// at the bottom of the list (not a top-right CTA).
function MobileDashboard({ groups, onOpenGroup, onNew }) {
  return (
    <div style={{height:'100%', overflowY:'auto', overflowX:'hidden'}}>
      <div className="px-4 pt-3 pb-6">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Groups</h1>

        {groups.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <p className="text-zinc-900 dark:text-zinc-50 font-medium mb-2">No groups yet</p>
            <p className="text-zinc-400 dark:text-zinc-500 text-sm mb-6 px-6">
              Create one for your next race, or ask a friend for their invite link.
            </p>
            <button
              onClick={onNew}
              className="bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-medium px-5 rounded-md text-sm transition-colors"
              style={{minHeight:'44px'}}
            >
              Create your first group
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} onClick={() => onOpenGroup(g.id)} />
            ))}

            {/* Full-width secondary button replaces the top-right CTA on mobile */}
            <button
              onClick={onNew}
              className="w-full text-sm font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
              style={{minHeight:'44px'}}
            >
              New group
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { MobileDashboard });
