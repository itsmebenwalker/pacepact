/**
 * Unit tests for evaluateJoinGate — pure function that decides
 * whether a user may join a group based on lock state and ban status.
 */

import { evaluateJoinGate } from '@/lib/groups/join-gate'

describe('evaluateJoinGate', () => {
  it('allows joining when invite is open and user is not banned', () => {
    expect(evaluateJoinGate(false, false)).toEqual({ allowed: true })
  })

  it('blocks joining with reason "locked" when invite_locked is true', () => {
    expect(evaluateJoinGate(true, false)).toEqual({ allowed: false, reason: 'locked' })
  })

  it('blocks joining with reason "banned" when user is banned', () => {
    expect(evaluateJoinGate(false, true)).toEqual({ allowed: false, reason: 'banned' })
  })

  it('prefers "locked" over "banned" when both conditions are true', () => {
    // lock check runs first; a banned user hitting a locked group sees "locked"
    expect(evaluateJoinGate(true, true)).toEqual({ allowed: false, reason: 'locked' })
  })
})
