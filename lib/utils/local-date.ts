import { cookies } from 'next/headers'

export async function getLocalToday(): Promise<string> {
  const cookieStore = await cookies()
  const tz = cookieStore.get('tz')?.value
  return new Date().toLocaleDateString('en-CA', { timeZone: tz ?? 'UTC' })
}
