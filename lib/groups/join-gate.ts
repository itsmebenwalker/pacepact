export type JoinGateResult =
  | { allowed: true }
  | { allowed: false; reason: 'locked' | 'banned' | 'full' }

/**
 * Pure function that decides whether a user is allowed to join a group.
 * Checks invite lock, ban status, and member cap (null cap = unlimited).
 * Used by the join page and unit-testable in isolation.
 */
export function evaluateJoinGate(
  inviteLocked: boolean,
  isBanned: boolean,
  memberCount?: number,
  cap?: number | null,
): JoinGateResult {
  if (inviteLocked) return { allowed: false, reason: 'locked' }
  if (isBanned) return { allowed: false, reason: 'banned' }
  if (cap != null && memberCount != null && memberCount >= cap) return { allowed: false, reason: 'full' }
  return { allowed: true }
}
