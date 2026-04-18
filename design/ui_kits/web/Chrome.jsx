/* globals React, IconBell, IconSun, IconMoon, IconCheck, IconMessage */

// Top nav with wordmark (left) + bell + theme + links (right)
function TopNav({ unread = 0, dark, onToggleTheme, onNavigate, route }) {
  const linkCls = (active) =>
    `px-3 py-1.5 rounded-md transition-colors ` +
    (active
      ? 'text-zinc-900 dark:text-zinc-50 bg-zinc-100 dark:bg-zinc-800'
      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800');

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50 font-semibold tracking-tight"
        >
          <img src="../../assets/favicon.svg" width="22" height="22" alt="" />
          <span className="text-base">PacePact</span>
        </button>

        <div className="flex items-center gap-1 text-sm">
          <div className="relative">
            <button
              onClick={() => onNavigate('notifications')}
              className="relative p-2 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Notifications"
            >
              <IconBell size={16} />
              {unread > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold leading-none px-0.5">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {dark ? <IconSun size={16} /> : <IconMoon size={16} />}
          </button>

          <button onClick={() => onNavigate('dashboard')} className={linkCls(route === 'dashboard')}>Dashboard</button>
          <button onClick={() => onNavigate('profile')} className={linkCls(route === 'profile')}>Profile</button>
          <button
            onClick={() => onNavigate('login')}
            className="px-3 py-1.5 rounded-md text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

// Small utility badge
function Pill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300',
    success: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400',
  };
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded ${tones[tone]}`}>{children}</span>
  );
}

// Primary / secondary / ghost buttons
function Button({ children, variant = 'primary', size = 'md', className = '', ...rest }) {
  const base = 'inline-flex items-center justify-center font-medium rounded-md transition-colors disabled:opacity-40';
  const sizes = {
    sm: 'text-xs px-2.5 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-sm px-5 py-2.5',
  };
  const variants = {
    primary:
      'bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-700 dark:hover:bg-zinc-200 text-white dark:text-zinc-900',
    secondary:
      'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-500',
    ghost:
      'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800',
    danger:
      'bg-red-600 hover:bg-red-700 text-white',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

Object.assign(window, { TopNav, Pill, Button });
