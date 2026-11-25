import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const heroSource = readFileSync(`${rootDir}src/components/hero-wordmark.tsx`, 'utf8');
const wordmarkSource = readFileSync(`${rootDir}src/components/vector-wordmark.tsx`, 'utf8');
const homeSource = readFileSync(`${rootDir}src/app/page.tsx`, 'utf8');
const slugSource = readFileSync(`${rootDir}src/app/[slug]/page.tsx`, 'utf8');
const buildSource = readFileSync(`${rootDir}scripts/build-content.mjs`, 'utf8');

describe('homepage Originkit vector wordmark', () => {
  it('uses the supplied Vector Wordmark component with its eslint override', () => {
    expect(wordmarkSource).toContain('/* eslint-disable */');
    expect(wordmarkSource).toContain('// Vector Wordmark — Originkit');
    expect(wordmarkSource).toContain('"use client"');
    expect(wordmarkSource).toContain('export default function VectorWordmark');
  });

  it('splits the tagline into large wordmark lines and keeps a text fallback', () => {
    expect(heroSource).toContain("'Belongings reunited'");
    expect(heroSource).toContain("'across campus with'");
    expect(heroSource).toContain("'institutional care.'");
    expect(heroSource).toContain("ready ? 'sr-only' : fallbackHeadingClass");
    expect(heroSource).toContain('fontSize: \'112px\'');
    expect(heroSource).toContain('fontWeight: 800');
    expect(heroSource).toContain('textColor="#000000"');
    expect(heroSource).toContain('accent="rgba(139, 31, 0, 0.32)"');
    expect(wordmarkSource).toContain('inside * 1.5');
  });

  it('mounts into the generated hero only when WebGL is available', () => {
    expect(heroSource).toContain("HERO_WORDMARK_MOUNT_ID = 'campusfind-hero-wordmark'");
    expect(heroSource).toContain('supportsWebGL()');
    expect(heroSource).toContain('createRoot(host)');
    expect(buildSource).toContain('mountHomeHeroWordmark');
    expect(buildSource).toContain('roundHomeNavigation');
  });

  it('wires the mount on both homepage routes', () => {
    expect(homeSource).toContain('<HeroWordmarkMount />');
    expect(slugSource).toContain("slug === 'campus-lost-found'");
    expect(slugSource).toContain('<HeroWordmarkMount />');
  });

  it('keeps the visible heading until every line reports ready', () => {
    expect(heroSource).toContain("fallbackHeadingClass = 'font-serif text-4xl");
    expect(heroSource).toContain("ready ? 'sr-only' : fallbackHeadingClass");
    expect(heroSource).toContain('readyLines.size === heroLines.length');
    expect(heroSource).toContain('onReady={() => setReadyLines');
    expect(heroSource).toContain('onError={() => setFailed(true)}');
    expect(heroSource).toContain("visibility: ready ? 'visible' : 'hidden'");
    expect(heroSource).toContain("getExtension('WEBGL_lose_context')");
  });

  it('checks shader compilation and linking before drawing', () => {
    expect(wordmarkSource).toContain('onReady?: () => void');
    expect(wordmarkSource).toContain('onError?: (error: Error) => void');
    expect(wordmarkSource).toContain('gl.getShaderParameter(sh, gl.COMPILE_STATUS)');
    expect(wordmarkSource).toContain('gl.getProgramParameter(program, gl.LINK_STATUS)');
    expect(wordmarkSource).toContain('markReady()');
    expect(wordmarkSource).toContain('onErrorRef.current?.(');
  });

  it('renders one static vector frame for reduced-motion users', () => {
    expect(wordmarkSource).toContain('prefers-reduced-motion: reduce');
    expect(wordmarkSource).toContain('const renderStatic = () =>');
    expect(wordmarkSource).toContain('if (reduceMotion) renderStatic()');
  });
});
