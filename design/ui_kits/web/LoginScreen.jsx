/* globals React, Button */

function LoginScreen({ onSignIn }) {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  function submit(e) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 600);
  }

  if (sent) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <div className="w-full max-w-sm text-center">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Check your inbox</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            We sent a sign-in link to <span className="text-zinc-900 dark:text-zinc-100 font-medium">{email}</span>. Click it to sign in.
          </p>
          <div className="mt-6 flex flex-col gap-3 items-center">
            <button
              onClick={() => onSignIn(email)}
              className="text-sm text-zinc-900 dark:text-zinc-50 underline underline-offset-4"
            >
              (Prototype) Skip magic link and continue
            </button>
            <button
              onClick={() => { setSent(false); setEmail(''); }}
              className="text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <img src="../../assets/favicon.svg" width="32" height="32" alt="" />
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight leading-none">PacePact</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1.5 text-sm">Sign in to your account</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent transition-colors"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Sending link…' : 'Send sign-in link'}
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-400 dark:text-zinc-500 mt-6">
          No account?{' '}
          <a className="text-zinc-900 dark:text-zinc-100 underline underline-offset-4">Sign up</a>
        </p>

        <div className="flex items-center justify-center gap-4 mt-8 text-xs text-zinc-400 dark:text-zinc-500">
          <a className="hover:text-zinc-600 dark:hover:text-zinc-300">Support</a>
          <a className="hover:text-zinc-600 dark:hover:text-zinc-300">Privacy</a>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LoginScreen });
