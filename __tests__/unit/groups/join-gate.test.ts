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

  describe('members cap', () => {
    it('allows joining when member count is below cap', () => {
      expect(evaluateJoinGate(false, false, 9, 10)).toEqual({ allowed: true })
    })

    it('blocks joining with reason "full" when member count equals cap', () => {
      expect(evaluateJoinGate(false, false, 10, 10)).toEqual({ allowed: false, reason: 'full' })
    })

    it('blocks joining with reason "full" when member count exceeds cap', () => {
      expect(evaluateJoinGate(false, false, 11, 10)).toEqual({ allowed: false, reason: 'full' })
    })

    it('allows joining when cap is null (unlimited)', () => {
      expect(evaluateJoinGate(false, false, 999, null)).toEqual({ allowed: true })
    })

    it('allows joining when cap is omitted', () => {
      expect(evaluateJoinGate(false, false, 999)).toEqual({ allowed: true })
    })

    it('prefers "locked" over "full"', () => {
      expect(evaluateJoinGate(true, false, 10, 10)).toEqual({ allowed: false, reason: 'locked' })
    })

    it('prefers "banned" over "full"', () => {
      expect(evaluateJoinGate(false, true, 10, 10)).toEqual({ allowed: false, reason: 'banned' })
    })
  })
})
