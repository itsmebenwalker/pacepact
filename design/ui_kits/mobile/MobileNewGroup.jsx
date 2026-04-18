/* globals React, IconArrowLeft */

// Mobile · New group flow
// Same 3 steps as the web kit; full-width inputs; Continue/Generate pinned
// to the bottom safe-area bar so it never scrolls out of reach.

const MOBILE_AMBITIONS = [
  { value: 'finish',  label: 'Just finish',     sub: 'Comfortable completion — cross the line feeling good' },
  { value: 'pb',      label: 'Beat my PB',       sub: 'Moderate structure with tempo and interval work' },
  { value: 'podium',  label: 'Go for podium',    sub: 'High volume, structured speed, peak performance' },
];
const MOBILE_EVENTS = [
  { value: 'marathon',      label: 'Marathon' },
  { value: 'half_marathon', label: 'Half Marathon' },
  { value: 'triathlon',     label: 'Triathlon' },
  { value: 'cycling',       label: 'Cycling' },
  { value: 'obstacle',      label: 'Obstacle Race' },
  { value: 'custom',        label: 'Other' },
];

function MobileNewGroup({ onBack, onCreated }) {
  const [step,       setStep]       = React.useState(1);
  const [name,       setName]       = React.useState('');
  const [eventName,  setEventName]  = React.useState('');
  const [eventType,  setEventType]  = React.useState('marathon');
  const [eventDate,  setEventDate]  = React.useState('2026-09-12');
  const [ambition,   setAmbition]   = React.useState('pb');
  const [generating, setGenerating] = React.useState(false);

  const canContinue = step === 1 ? (!!name && !!eventName) : true;

  const inputCls = 'w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent transition-colors';
  const labelCls = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5';

  function generate() {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      onCreated({ name, eventName, eventType, eventDate, ambition });
    }, 1800);
  }

  return (
    <>
      {/* Nav */}
      <div
        className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center px-2 gap-1"
        style={{height:'52px', flexShrink:0}}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors px-2 rounded-md"
          style={{minHeight:'44px'}}
        >
          <IconArrowLeft size={16} />
          Cancel
        </button>
      </div>

      {/* Scrollable form */}
      <div style={{flex:1, overflowY:'auto', overflowX:'hidden'}}>
        <div className="px-4 py-4" style={{paddingBottom:'16px'}}>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">New group</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 mb-5">Step {step} of 3</p>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">

            {/* Step 1 — Event details */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-50">Event details</h2>
                <div>
                  <label className={labelCls}>Group name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Berlin Crew" className={inputCls} style={{minHeight:'44px'}} />
                </div>
                <div>
                  <label className={labelCls}>Event name</label>
                  <input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Berlin Marathon 2026" className={inputCls} style={{minHeight:'44px'}} />
                </div>
                <div>
                  <label className={labelCls}>Event type</label>
                  <select value={eventType} onChange={(e) => setEventType(e.target.value)} className={inputCls} style={{minHeight:'44px'}}>
                    {MOBILE_EVENTS.map((ev) => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Event date</label>
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputCls} style={{minHeight:'44px'}} />
                </div>
              </div>
            )}

            {/* Step 2 — Ambition */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-50">Training ambition</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Shapes your plan's volume and intensity.</p>
                <div className="space-y-2">
                  {MOBILE_AMBITIONS.map((a) => (
                    <button
                      key={a.value}
                      onClick={() => setAmbition(a.value)}
                      className={`w-full text-left p-4 rounded-md border transition-colors ${
                        ambition === a.value
                          ? 'border-zinc-900 dark:border-zinc-50 bg-zinc-50 dark:bg-zinc-800/50'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                      }`}
                      style={{minHeight:'44px'}}
                    >
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{a.label}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{a.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3 — Review */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-50">Review</h2>
                <dl className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                  {[
                    ['Group',   name      || '—'],
                    ['Event',   eventName || '—'],
                    ['Type',    MOBILE_EVENTS.find((e) => e.value === eventType)?.label],
                    ['Date',    eventDate],
                    ['Ambition', MOBILE_AMBITIONS.find((a) => a.value === ambition)?.label],
                  ].map(([k, v]) => (
                    <div key={k} className="py-2.5 flex justify-between">
                      <dt className="text-zinc-500 dark:text-zinc-400">{k}</dt>
                      <dd className="text-zinc-900 dark:text-zinc-50 font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  AI will generate a personalised training plan. This takes 5–15 seconds — don't navigate away.
                </p>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Sticky bottom bar — Continue / Back / Generate */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3 space-y-2 shrink-0">
        {step < 3 ? (
          <>
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canContinue}
              className="w-full bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-40 text-white dark:text-zinc-900 font-medium rounded-md text-sm transition-colors"
              style={{minHeight:'44px'}}
            >
              Continue
            </button>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="w-full border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-md text-sm bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                style={{minHeight:'44px'}}
              >
                Back
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={generate}
              disabled={generating}
              className="w-full bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-40 text-white dark:text-zinc-900 font-medium rounded-md text-sm transition-colors flex items-center justify-center gap-2"
              style={{minHeight:'44px'}}
            >
              {generating ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                  </svg>
                  Generating plan…
                </>
              ) : 'Generate training plan'}
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={generating}
              className="w-full border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-md text-sm bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              style={{minHeight:'44px'}}
            >
              Back
            </button>
          </>
        )}
      </div>
    </>
  );
}

Object.assign(window, { MobileNewGroup, MOBILE_AMBITIONS, MOBILE_EVENTS });
