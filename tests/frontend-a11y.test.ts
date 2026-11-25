import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { pageContent, pageTitles } from '@/content/pages';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const readSource = (path: string) => readFileSync(`${rootDir}${path}`, 'utf8');
const generatedHtml = Object.values(pageContent).join('\n');
const layoutSource = readSource('src/app/layout.tsx');
const slugSource = readSource('src/app/[slug]/page.tsx');
const actionsSource = readSource('src/components/canonical-actions.tsx');
const assistantSource = readSource('src/components/report-assistant.tsx');
const loginSource = readSource('src/components/login-form.tsx');
const heroSource = readSource('src/components/hero-wordmark.tsx');
const vectorSource = readSource('src/components/vector-wordmark.tsx');
const constellationSource = readSource('src/components/constellation.tsx');
const globalCss = readSource('src/app/globals.css');
const buildSource = readSource('scripts/build-content.mjs');

describe('canonical frontend accessibility and interaction audit', () => {
  it('keeps all 15 canonical screens with human-readable titles', () => {
    expect(Object.keys(pageContent)).toHaveLength(15);
    expect(Object.keys(pageTitles)).toHaveLength(15);
    expect(pageTitles['campus-lost-found']).not.toBe('CampusFind');
    expect(pageTitles['report-lost']).toBe('Report a Lost Item');
    expect(layoutSource).not.toContain("default: 'CampusFind'");
  });

  it('serves every canonical photograph locally with accessible metadata', () => {
    expect(generatedHtml).not.toMatch(/lh3\.googleusercontent\.com/);
    expect(generatedHtml).not.toContain('data-alt=');
    const images = [...generatedHtml.matchAll(/<img\b([^>]*)>/gi)];
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image[1]).toMatch(/(?:^|\s)alt="/);
      expect(image[1]).toMatch(/\bloading="lazy"/);
      expect(image[1]).toMatch(/\bdecoding="async"/);
    }
  });

  it('does not leave known labels pointing at the placeholder home href', () => {
    const knownLabels = [
      'Campus Zones',
      'Report Lost',
      'Report Found',
      'Track Status',
      'Intelligent Match',
      'Admin Portal',
    ];
    for (const label of knownLabels) {
      const expression = new RegExp(
        `<a[^>]*href="/"[^>]*>[\\s\\S]{0,240}${label}`,
        'i',
      );
      expect(generatedHtml).not.toMatch(expression);
    }
  });

  it('does not ship invented prototype numbers or credentials', () => {
    for (const value of [
      'All Submissions 148',
      'All Logs (1,842)',
      '94%',
      '99.98% Network Health',
      '42 Tenancies',
      'Vault Sync Active (6 Depots)',
      '14 results',
      '8 results',
      '6 results',
      'CF-2024-8841-L',
      'K7X9-MV42-Q89P-BL71',
      'Officer M. Vance #884',
      'M. Vance (#884)',
      'Proctor #884',
      'Shield #884',
    ]) {
      expect(generatedHtml).not.toContain(value);
    }
  });

  it('guards every canonical admin screen on the server', () => {
    for (const slug of [
      'overview-dashboard',
      'report-moderation',
      'claims-and-verification',
      'vault-inventory-and-custody',
      'intelligent-matching',
      'platform-overview',
      'college-registry-provisioning',
    ]) {
      expect(slugSource).toContain(`'${slug}'`);
    }
    expect(slugSource).toContain("import { getCurrentUser } from '@/lib/auth'");
    expect(slugSource).toContain('adminSlugs.has(slug)');
    expect(slugSource).toContain("if (!user) redirect(`/login?next=/${slug}`)");
    expect(slugSource).toContain("redirect('/admin')");
  });

  it('restores submission credentials from the tracking cookie', () => {
    expect(slugSource).toContain("import { getTrackingCookie } from '@/lib/tracking-cookie'");
    expect(slugSource).toContain("slug === 'submission-confirmation'");
    expect(slugSource).toContain('role="status" aria-live="polite"');
    expect(slugSource).toContain('One-time tracking token');
  });

  it('wires canonical controls through one global action handler', () => {
    expect(layoutSource).toContain("import CanonicalActions from '@/components/canonical-actions'");
    expect(layoutSource).toMatch(/<div className="site-content">[\s\S]*<CanonicalActions \/>/);
    for (const action of ['tab', 'toggle', 'radio', 'pill', 'copy', 'submit', 'navigate', 'call', 'notice']) {
      expect(actionsSource).toContain(`'${action}'`);
    }
    expect(actionsSource).toContain("closest<ActionButton>('[data-action]')");
    expect(buildSource).toContain('wireInertButtons');
    expect(generatedHtml).not.toMatch(/<button\b(?![^>]*\bdata-action=)[^>]*\btype="button"[^>]*>/i);
  });

  it('keeps the assistant modal, focus management and muted default', () => {
    expect(assistantSource).toContain('useState(false)');
    expect(assistantSource).toContain('role="dialog"');
    expect(assistantSource).toContain('aria-modal="true"');
    expect(assistantSource).toContain('closeRef.current?.focus()');
    expect(assistantSource).toContain("event.key === 'Escape'");
    expect(assistantSource).toContain("aria-live={message.id === latestAssistantId ? 'polite' : undefined}");
    expect(loginSource).toContain('role="alert"');
    expect(loginSource).toContain('aria-live="assertive"');
  });

  it('respects reduced-motion preferences in both WebGL components', () => {
    for (const source of [vectorSource, constellationSource]) {
      expect(source).toContain('prefers-reduced-motion: reduce');
      expect(source).toContain('renderStatic()');
    }
    expect(vectorSource).toContain('gl.getShaderParameter');
    expect(vectorSource).toContain('gl.getProgramParameter');
    expect(heroSource).toContain('getExtension(\'WEBGL_lose_context\')');
  });

  it('self-hosts fonts and keeps styled scrollbars and content layering', () => {
    expect(globalCss).not.toContain('fonts.googleapis.com');
    for (const font of ['@fontsource/inter/400.css', '@fontsource/merriweather/700.css', '@fontsource/be-vietnam-pro/500.css']) {
      expect(globalCss).toContain(font);
    }
    expect(globalCss).not.toContain('display: none');
    expect(globalCss).toContain('scrollbar-width: thin');
    expect(globalCss).toMatch(/\.site-background\s*\{[\s\S]*?z-index: 0/);
    expect(globalCss).toMatch(/\.site-content\s*\{[\s\S]*?z-index: 1/);
    expect(globalCss).toContain('#0b57d0');
  });
});
