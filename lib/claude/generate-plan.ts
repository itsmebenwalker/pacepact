import Anthropic from '@anthropic-ai/sdk'
import { TrainingSession, EventType, Ambition, OtherSport } from '@/types'

const client = new Anthropic()

const AMBITION_DESCRIPTIONS: Record<Ambition, string> = {
  finish: 'finish = comfortable completion, low volume, no intervals',
  pb: 'pb = beat personal best, moderate volume with some interval work',
  podium: 'podium = competitive, high volume with structured speed work',
}

const OTHER_SPORT_SESSION_TYPE: Record<OtherSport, string> = {
  running: 'run',
  cycling: 'ride',
  swimming: 'swim',
  walking: 'run',
}

export async function generateTrainingPlan(
  eventType: EventType,
  eventDate: string,
  ambition: Ambition,
  otherSport?: OtherSport,
  otherDistanceKm?: number
): Promise<{ sessions: TrainingSession[]; raw: string }> {
  const weeksUntil = Math.max(
    1,
    Math.ceil((new Date(eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7))
  )

  const eventDescription = eventType === 'other' && otherSport
    ? `${otherSport} (target distance: ${otherDistanceKm} km)`
    : eventType

  const otherSportRule = eventType === 'other' && otherSport
    ? `- This is a ${otherSport} event with a target distance of ${otherDistanceKm} km — build volume progressively toward that distance, using session_type "${OTHER_SPORT_SESSION_TYPE[otherSport]}" for all active sessions`
    : ''

  const userPrompt = `Generate a training plan for the following:

Event type: ${eventDescription}
Event date: ${eventDate}
Weeks until event: ${weeksUntil}
Training ambition: ${ambition} (${AMBITION_DESCRIPTIONS[ambition]})

Return a JSON array of sessions. Each session:
{
  "week_number": number,
  "session_type": "run" | "ride" | "swim" | "brick" | "rest",
  "target_distance_km": number | null,
  "target_duration_minutes": number | null,
  "target_description": string,
  "day_of_week": number
}

Rules:
- Include a rest day each week
- Taper in the final 2 weeks
- Scale intensity to ambition: finish = low volume, pb = moderate with intervals, podium = high volume with structured speed work
- For triathlon include swim, ride, run, and brick sessions each week
- For marathon/half focus on run volume with one long run per week
${otherSportRule}
- Maximum ${weeksUntil * 6} sessions total
- day_of_week: 1=Mon through 7=Sun`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    system: `You are an expert endurance sports coach. You generate structured training plans as JSON. Respond ONLY with valid JSON — no markdown, no explanation.`,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''

  let sessions: TrainingSession[]
  try {
    sessions = JSON.parse(raw)
  } catch {
    // Try stripping markdown code fences if present
    const stripped = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    sessions = JSON.parse(stripped)
  }

  if (!Array.isArray(sessions)) {
    throw new Error('Claude returned non-array plan')
  }

  return { sessions, raw }
}
