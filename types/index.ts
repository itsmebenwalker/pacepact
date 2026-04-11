export type EventType =
  | 'marathon'
  | 'half_marathon'
  | 'triathlon'
  | 'cycling'
  | 'obstacle'
  | 'custom'
  | 'other'

export type OtherSport = 'running' | 'cycling' | 'swimming' | 'walking'

export type Ambition = 'finish' | 'pb' | 'podium'

export type SessionType = 'run' | 'ride' | 'swim' | 'brick' | 'rest'

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  strava_athlete_id: number | null
  strava_access_token: string | null
  strava_refresh_token: string | null
  strava_token_expires_at: string | null
  notify_admin_message: boolean
  notify_any_message: boolean
  created_at: string
}

export type NotificationType = 'message_admin' | 'message_any' | 'activity_matched'

export interface AppNotification {
  id: string
  user_id: string
  type: NotificationType
  group_id: string | null
  data: Record<string, string | number>
  read: boolean
  created_at: string
}

export interface TrainingSession {
  week_number: number
  session_type: SessionType
  target_distance_km: number | null
  target_duration_minutes: number | null
  target_description: string
  day_of_week: number // 1=Mon, 7=Sun
}

export interface Group {
  id: string
  name: string
  event_name: string
  event_type: EventType
  event_date: string
  ambition: Ambition
  training_plan: TrainingSession[]
  training_plan_raw?: string
  invite_code: string
  created_by: string
  created_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  points: number
  joined_at: string
  profiles?: Profile
}

export interface Session {
  id: string
  group_id: string
  user_id: string
  week_number: number
  session_type: SessionType
  target_distance_km: number | null
  target_duration_minutes: number | null
  target_description: string
  scheduled_date: string | null
  completed: boolean
  completed_at: string | null
  strava_activity_id: number | null
  points_awarded: number
  created_at: string
}

export interface StravaWebhookEvent {
  id: string
  payload: Record<string, unknown>
  processed: boolean
  processed_at: string | null
  created_at: string
}

// Strava API types
export interface StravaActivity {
  id: number
  name: string
  type: string
  sport_type: string
  distance: number // metres
  moving_time: number // seconds
  elapsed_time: number // seconds
  start_date: string
  start_date_local: string
  athlete: { id: number }
  external_id?: string // set by the originating device/app (e.g. garmin_ping_XXXX); shared across split multisport activities
}

export interface StravaTokenResponse {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete: {
    id: number
    firstname: string
    lastname: string
    profile: string
  }
}

// Strava webhook payload
export interface StravaWebhookPayload {
  object_type: string
  aspect_type: string
  object_id: number
  owner_id: number
  subscription_id: number
  event_time: number
  updates: Record<string, unknown>
}

export interface Message {
  id: string
  group_id: string
  user_id: string
  content: string
  created_at: string
}

// Points breakdown returned by calculator
export interface PointsResult {
  total: number
  base: number
  early_bonus: number
  exceed_bonus: number
  streak_bonus: number
}
