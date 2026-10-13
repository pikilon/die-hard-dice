export const TIP_STORAGE_KEY = 'dhd.tip.v1';
export const ACTIVE_THRESHOLD_SECONDS = 15 * 60; // 15 minutes of active usage
export const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (1 week)

export const PAYPAL_BASE_URL = 'https://paypal.me/pikilongeorgia';
export const PAYPAL_1_URL = `${PAYPAL_BASE_URL}/1USD`;
export const PAYPAL_2_URL = `${PAYPAL_BASE_URL}/2USD`;

export interface TipStateData {
  activeSeconds: number;
  dismissedAt: number | null;
  donated: boolean;
}

export const DEFAULT_TIP_STATE: TipStateData = {
  activeSeconds: 0,
  dismissedAt: null,
  donated: false,
};

/** Checks whether the tip reminder is currently in the 7-day snooze period. */
export function isSnoozed(dismissedAt: number | null, now = Date.now()): boolean {
  if (dismissedAt === null || typeof dismissedAt !== 'number' || isNaN(dismissedAt)) return false;
  return now - dismissedAt < SNOOZE_MS && now >= dismissedAt;
}

/** Determines whether the tip modal should be automatically prompted. */
export function shouldAutoPromptTip(data: TipStateData, now = Date.now()): boolean {
  if (data.donated) return false;
  if (data.activeSeconds < ACTIVE_THRESHOLD_SECONDS) return false;
  if (isSnoozed(data.dismissedAt, now)) return false;
  return true;
}

/** Safely decodes stored tip state, falling back to defaults for invalid data. */
export function parseTipState(raw: string | null): TipStateData {
  if (!raw) return { ...DEFAULT_TIP_STATE };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_TIP_STATE };
    const activeSeconds = typeof parsed.activeSeconds === 'number' && !isNaN(parsed.activeSeconds) && parsed.activeSeconds >= 0 ? parsed.activeSeconds : 0;
    const dismissedAt = typeof parsed.dismissedAt === 'number' && !isNaN(parsed.dismissedAt) ? parsed.dismissedAt : null;
    const donated = Boolean(parsed.donated);
    return { activeSeconds, dismissedAt, donated };
  } catch {
    return { ...DEFAULT_TIP_STATE };
  }
}
