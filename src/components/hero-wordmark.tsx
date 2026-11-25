"use client";

import { useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import VectorWordmark from './vector-wordmark';

export const HERO_WORDMARK_MOUNT_ID = 'campusfind-hero-wordmark';

const heroLines = ['Belongings reunited', 'across campus with', 'institutional care.'];
const heroText = 'Belongings reunited across campus with institutional care.';
const fallbackHeadingClass = 'font-serif text-4xl sm:text-5xl md:text-6xl text-primary font-bold tracking-tight leading-[1.12]';

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    const supported = Boolean(context);
    const loseContext = context?.getExtension('WEBGL_lose_context');
    loseContext?.loseContext();
    return supported;
  } catch {
    return false;
  }
}

function HeroWordmark() {
  const [readyLines, setReadyLines] = useState<Set<number>>(() => new Set());
  const [failed, setFailed] = useState(false);
  const ready = !failed && readyLines.size === heroLines.length;

  return (
    <div className="hero-wordmark">
      <h1 className={ready ? 'sr-only' : fallbackHeadingClass}>{heroText}</h1>
      {heroLines.map((line, index) => (
        <div
          aria-hidden="true"
          className="hero-wordmark-line"
          key={line}
          style={{ visibility: ready ? 'visible' : 'hidden' }}
        >
          <VectorWordmark
            onError={() => setFailed(true)}
            onReady={() => setReadyLines((current) => new Set(current).add(index))}
            text={line}
            background="transparent"
            textColor="#000000"
            shade="#000000"
            accent="rgba(139, 31, 0, 0.32)"
            reach={260}
            speed={45}
            damping={60}
            handles={{ size: 72, spread: 24, labels: false }}
            font={{
              fontFamily: 'Merriweather, Georgia, serif',
              fontWeight: 800,
              fontSize: '112px',
              lineHeight: '1em',
              letterSpacing: '-0.03em',
              textAlign: 'center',
            }}
            style={{
              minWidth: 0,
              minHeight: 0,
              width: '100%',
              height: '100%',
              background: 'transparent',
            }}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Mounts the Originkit vector wordmark into the canonical hero mount point.
 * The generated markup keeps a styled heading as a fallback, so browsers
 * without WebGL (or before hydration) still show the real tagline.
 */
export default function HeroWordmarkMount() {
  const rootRef = useRef<Root | null>(null);
  const hostRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const host = document.getElementById(HERO_WORDMARK_MOUNT_ID);

    if (!host || !supportsWebGL()) {
      if (rootRef.current) {
        rootRef.current.unmount();
        rootRef.current = null;
        hostRef.current = null;
      }
      return;
    }

    if (rootRef.current && hostRef.current === host) return;

    if (rootRef.current) {
      rootRef.current.unmount();
      rootRef.current = null;
    }

    try {
      const root = createRoot(host);
      rootRef.current = root;
      hostRef.current = host;
      root.render(<HeroWordmark />);
    } catch {
      rootRef.current = null;
      hostRef.current = null;
    }
  });

  useEffect(() => {
    return () => {
      if (rootRef.current) {
        rootRef.current.unmount();
        rootRef.current = null;
      }
      hostRef.current = null;
    };
  }, []);

  return null;
}
