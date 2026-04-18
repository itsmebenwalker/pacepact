/* globals React, Button, IconArrowLeft */

const AMBITIONS = [
  { value: 'finish', label: 'Just finish', sub: 'Comfortable completion, low volume' },
  { value: 'pb', label: 'Beat my PB', sub: 'Moderate volume with interval work' },
  { value: 'podium', label: 'Go for podium', sub: 'High volume with structured speed' },
];

const EVENTS = [
  { value: 'marathon', label: 'Marathon' },
  { value: 'half_marathon', label: 'Half Marathon' },
  { value: 'triathlon', label: 'Triathlon' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'obstacle', label: 'Obstacle Race' },
  { value: 'custom', label: 'Other' },
];

function NewGroup({ onBack, onCreated }) {
  const [step, setStep] = React.useState(1);
  const [name, setName] = React.useState('');
  const [eventName, setEventName] = React.useState('');
  const [eventType, setEventType] = React.useState('marathon');
  const [eventDate, setEventDate] = React.useState('2026-09-12');
  const [ambition, setAmbition] = React.useState('pb');
  const [generating, setGenerating] = React.useState(false);

  function generate() {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      onCreated({ name, eventName, eventType, eventDate, ambition });
    }, 1800);
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 mb-4 transition-colors">
        <IconArrowLeft size={14} /> Cancel
      </button>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight mb-1">New group</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">Step {step} of 3</p>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 sm:p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-50">Event details</h2>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Group name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Berlin Crew" className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Event name</label>
              <input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Berlin Marathon 2026" className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Event type</label>
                <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900">
                  {EVENTS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Event date</label>
                <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} disabled={!name || !eventName}>Continue</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-50">Training ambition</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Shapes your plan's volume and intensity.</p>
            <div className="space-y-2">
              {AMBITIONS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setAmbition(a.value)}
                  className={`w-full text-left p-4 rounded-md border transition-colors ${
                    ambition === a.value
                      ? 'border-zinc-900 dark:border-zinc-50 bg-zinc-50 dark:bg-zinc-800/50'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                  }`}
                >
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{a.label}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{a.sub}</p>
                </button>
              ))}
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Continue</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-50">Review</h2>
            <dl className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
              {[
                ['Group', name || '—'],
                ['Event', eventName || '—'],
                ['Type', EVENTS.find((e) => e.value === eventType)?.label],
                ['Date', eventDate],
                ['Ambition', AMBITIONS.find((a) => a.value === ambition)?.label],
              ].map(([k, v]) => (
                <div key={k} className="py-2 flex justify-between">
                  <dt className="text-zinc-500 dark:text-zinc-400">{k}</dt>
                  <dd className="text-zinc-900 dark:text-zinc-50 font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              AI will generate a personalised training plan. This takes 5–15 seconds — don't navigate away.
            </p>
            <div className="flex justify-between pt-2">
              <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={generate} disabled={generating}>
                {generating ? 'Generating plan…' : 'Generate training plan'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { NewGroup });
