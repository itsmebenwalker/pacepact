/* globals React, Button */

function Profile({ onBack }) {
  const [connected, setConnected] = React.useState(true);
  const [adminMsg, setAdminMsg] = React.useState(true);
  const [anyMsg, setAnyMsg] = React.useState(false);
  const [displayName, setDisplayName] = React.useState('Alex');
  const [editing, setEditing] = React.useState(false);

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight mb-6">Profile</h1>

      <section className="space-y-6">
        {/* Account */}
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Account</p>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg divide-y divide-zinc-100 dark:divide-zinc-800">
            <Row label="Email" value="alex@example.com" />
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Display name</p>
                {editing ? (
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1 px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                ) : (
                  <p className="text-sm text-zinc-900 dark:text-zinc-50 mt-0.5">{displayName}</p>
                )}
              </div>
              <button onClick={() => setEditing(!editing)} className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                {editing ? 'Save' : 'Edit'}
              </button>
            </div>
          </div>
        </div>

        {/* Strava */}
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Strava</p>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
            {connected ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FC5200]" />
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Connected</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Activities auto-sync to your groups</p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setConnected(false)}>Disconnect</Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Connect your Strava account to auto-sync activities.</p>
                <button onClick={() => setConnected(true)}>
                  <img src="../../assets/connect-with-strava.svg" alt="Connect with Strava" className="h-[38px]" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Notifications</p>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg divide-y divide-zinc-100 dark:divide-zinc-800">
            <Toggle
              label="Activity matched"
              sub="Always on — when a Strava activity is credited to a session"
              checked={true}
              disabled
            />
            <Toggle
              label="Messages from group admin"
              sub="Notify when the group creator posts"
              checked={adminMsg}
              onChange={setAdminMsg}
            />
            <Toggle
              label="All group messages"
              sub="Notify for every message in every group"
              checked={anyMsg}
              onChange={setAnyMsg}
            />
          </div>
        </div>

        <div className="pt-2">
          <button className="text-sm text-red-600 dark:text-red-400 hover:underline">Delete account</button>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-sm text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}

function Toggle({ label, sub, checked, onChange, disabled }) {
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{label}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{sub}</p>
      </div>
      <button
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
          checked ? 'bg-zinc-900 dark:bg-zinc-50' : 'bg-zinc-200 dark:bg-zinc-700'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${
          checked ? 'translate-x-5 bg-white dark:bg-zinc-900' : 'bg-white'
        }`} />
      </button>
    </div>
  );
}

Object.assign(window, { Profile });
