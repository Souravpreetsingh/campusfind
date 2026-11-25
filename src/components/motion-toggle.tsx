"use client";

import { useSyncExternalStore } from 'react';
import {
  getMotionServerSnapshot,
  getMotionSnapshot,
  setMotionPreference,
  subscribeMotion,
  type MotionPreference,
} from '@/lib/motion';

export default function MotionToggle() {
  const preference = useSyncExternalStore(
    subscribeMotion,
    getMotionSnapshot,
    getMotionServerSnapshot,
  );

  const toggle = () => {
    const next: MotionPreference = preference === 'on' ? 'off' : 'on';
    setMotionPreference(next);
    window.location.reload();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={preference === 'on'}
      aria-label={preference === 'on' ? 'Turn animations off' : 'Turn animations on'}
      className="fixed bottom-4 right-4 z-40 rounded-full border border-ash bg-white/90 px-3 py-1.5 text-xs font-medium text-primary shadow-craft-sm backdrop-blur transition hover:bg-marigold/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {preference === 'on' ? 'Motion on' : 'Motion off'}
    </button>
  );
}
