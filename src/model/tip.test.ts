import { describe, expect, it } from 'vitest';
import {
  ACTIVE_THRESHOLD_SECONDS,
  DEFAULT_TIP_STATE,
  isSnoozed,
  parseTipState,
  PAYPAL_1_URL,
  PAYPAL_2_URL,
  PAYPAL_BASE_URL,
  shouldAutoPromptTip,
  SNOOZE_MS,
  type TipStateData,
} from './tip';

describe('tip model logic', () => {
  it('has correct PayPal URLs', () => {
    expect(PAYPAL_BASE_URL).toBe('https://paypal.me/pikilongeorgia');
    expect(PAYPAL_1_URL).toBe('https://paypal.me/pikilongeorgia/1USD');
    expect(PAYPAL_2_URL).toBe('https://paypal.me/pikilongeorgia/2USD');
  });

  describe('isSnoozed', () => {
    const now = 1000000000000;

    it('returns false when dismissedAt is null', () => {
      expect(isSnoozed(null, now)).toBe(false);
    });

    it('returns true when dismissedAt is within 7 days', () => {
      expect(isSnoozed(now - 1000, now)).toBe(true);
      expect(isSnoozed(now - SNOOZE_MS + 1000, now)).toBe(true);
    });

    it('returns false when dismissedAt is 7 days or older', () => {
      expect(isSnoozed(now - SNOOZE_MS, now)).toBe(false);
      expect(isSnoozed(now - SNOOZE_MS - 5000, now)).toBe(false);
    });

    it('returns false when dismissedAt is in the future', () => {
      expect(isSnoozed(now + 5000, now)).toBe(false);
    });
  });

  describe('shouldAutoPromptTip', () => {
    const now = 1000000000000;

    it('returns false if activeSeconds is below 15 minutes', () => {
      const data: TipStateData = {
        activeSeconds: ACTIVE_THRESHOLD_SECONDS - 1,
        dismissedAt: null,
        donated: false,
      };
      expect(shouldAutoPromptTip(data, now)).toBe(false);
    });

    it('returns false if user already donated', () => {
      const data: TipStateData = {
        activeSeconds: ACTIVE_THRESHOLD_SECONDS + 100,
        dismissedAt: null,
        donated: true,
      };
      expect(shouldAutoPromptTip(data, now)).toBe(false);
    });

    it('returns false if snoozed within 7 days', () => {
      const data: TipStateData = {
        activeSeconds: ACTIVE_THRESHOLD_SECONDS + 100,
        dismissedAt: now - 10000,
        donated: false,
      };
      expect(shouldAutoPromptTip(data, now)).toBe(false);
    });

    it('returns true when activeSeconds >= 15m, not donated, and not snoozed', () => {
      const data: TipStateData = {
        activeSeconds: ACTIVE_THRESHOLD_SECONDS,
        dismissedAt: null,
        donated: false,
      };
      expect(shouldAutoPromptTip(data, now)).toBe(true);
    });

    it('returns true when activeSeconds >= 15m and snooze has expired (>7 days)', () => {
      const data: TipStateData = {
        activeSeconds: ACTIVE_THRESHOLD_SECONDS + 50,
        dismissedAt: now - SNOOZE_MS - 1000,
        donated: false,
      };
      expect(shouldAutoPromptTip(data, now)).toBe(true);
    });
  });

  describe('parseTipState', () => {
    it('returns default state for null or invalid JSON', () => {
      expect(parseTipState(null)).toEqual(DEFAULT_TIP_STATE);
      expect(parseTipState('')).toEqual(DEFAULT_TIP_STATE);
      expect(parseTipState('invalid json')).toEqual(DEFAULT_TIP_STATE);
      expect(parseTipState('123')).toEqual(DEFAULT_TIP_STATE);
    });

    it('parses valid JSON accurately', () => {
      const valid = JSON.stringify({
        activeSeconds: 450,
        dismissedAt: 123456789,
        donated: true,
      });
      expect(parseTipState(valid)).toEqual({
        activeSeconds: 450,
        dismissedAt: 123456789,
        donated: true,
      });
    });

    it('sanitizes malformed fields', () => {
      const bad = JSON.stringify({
        activeSeconds: -50,
        dismissedAt: 'not a number',
        donated: 1,
      });
      expect(parseTipState(bad)).toEqual({
        activeSeconds: 0,
        dismissedAt: null,
        donated: true,
      });
    });
  });
});
