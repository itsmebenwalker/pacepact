export type JoinGateResult =
  | { allowed: true }
  | { allowed: false; reason: 'locked' | 'banned' }

/**
 * Pure function that decides whether a user is allowed to join a group,
 * given the group's invite lock state and whether the user is banned.
 * Used by the join page and unit-testable in isolation.
 */
export function evaluateJoinGate(
  inviteLocked: boolean,
  isBanned: boolean
): JoinGateResult {
  if (inviteLocked) return { allowed: false, reason: 'locked' }
  if (isBanned) return { allowed: false, reason: 'banned' }
  return { allowed: true }
}
