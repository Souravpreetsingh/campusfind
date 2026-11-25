export type MotionPreference = 'on' | 'off';

export const MOTION_STORAGE_KEY = 'campusfind:motion';

/**
 * CampusFind keeps its WebGL motion enabled by default. Users who want a
 * static experience can switch it off explicitly in the site motion control.
 */
export function getMotionPreference(): MotionPreference {
  if (typeof window === 'undefined') return 'on';
  try {
    const stored = window.localStorage.getItem(MOTION_STORAGE_KEY);
    if (stored === 'off') return 'off';
    if (stored === 'on') return 'on';
    window.localStorage.setItem(MOTION_STORAGE_KEY, 'on');
  } catch {
    // Storage can be unavailable in private browsing; keep motion enabled.
  }
  return 'on';
}

export function setMotionPreference(value: MotionPreference): void {
  try {
    window.localStorage.setItem(MOTION_STORAGE_KEY, value);
  } catch {
    // Ignore storage failures; the reload still honours the in-memory choice.
  }
}

export function shouldReduceMotion(): boolean {
  return getMotionPreference() === 'off';
}
