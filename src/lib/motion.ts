export type MotionPreference = 'on' | 'off';

export const MOTION_STORAGE_KEY = 'campusfind:motion';

const listeners = new Set<() => void>();

export function subscribeMotion(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * CampusFind keeps its WebGL motion enabled by default. Users who want a
 * static experience can switch it off explicitly in the site motion control.
 */
export function getMotionSnapshot(): MotionPreference {
  if (typeof window === 'undefined') return 'on';
  try {
    return window.localStorage.getItem(MOTION_STORAGE_KEY) === 'off' ? 'off' : 'on';
  } catch {
    // Storage can be unavailable in private browsing; keep motion enabled.
    return 'on';
  }
}

export const getMotionPreference = getMotionSnapshot;

export function getMotionServerSnapshot(): MotionPreference {
  return 'on';
}

export function setMotionPreference(value: MotionPreference): void {
  try {
    window.localStorage.setItem(MOTION_STORAGE_KEY, value);
  } catch {
    // Ignore storage failures; the reload still honours the in-memory choice.
  }
  for (const listener of listeners) listener();
}

export function shouldReduceMotion(): boolean {
  return getMotionSnapshot() === 'off';
}
