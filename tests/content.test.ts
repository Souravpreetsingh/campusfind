import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { pageContent, pageTitles } from '@/content/pages';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const globalCss = readFileSync(`${rootDir}src/app/globals.css`, 'utf8');

describe('generated canonical frontend content', () => {
  it('includes all 15 original Stitch screens', () => {
    expect(Object.keys(pageContent)).toHaveLength(15);
    expect(pageContent['campus-lost-found']).toContain(
      'Belongings reunited across campus with institutional care.',
    );
    expect(pageContent['report-found']).toContain('Report a Discovered Belonging');
    expect(pageContent['college-registry-provisioning']).toContain(
      'Institutional Tenant Registry &amp; Autonomous Enclave Provisioning',
    );
  });

  it('mounts the larger vector wordmark in the canonical hero', () => {
    const home = pageContent['campus-lost-found'];
    expect(home).toContain('id="campusfind-hero-wordmark"');
    expect(home).toContain('class="text-center max-w-6xl mx-auto space-y-6"');
    expect(home).toContain('Belongings reunited across campus with institutional care.');
    expect(home).toContain('class="sticky z-50 bg-white/90 backdrop-blur-md transition-all site-nav-rounded"');
    expect(home).not.toContain('bg-white/90 backdrop-blur-md border-b border-ash');
  });

  it('wires every original form to a real handler', () => {
    expect(pageContent['report-lost']).toContain('action="/api/reports"');
    expect(pageContent['report-found']).toContain('action="/api/reports"');
    expect(pageContent['mobile-lost-property']).toContain('action="/api/reports"');
    expect(pageContent['campus-lost-found']).toContain('action="/advanced-search"');
    expect(pageContent['campus-lost-found']).toContain('action="/api/guest/track"');
    expect(pageContent['vault-inventory-and-custody']).toContain('action="/api/custody/handover"');
    expect(pageContent['vault-inventory-and-custody'].match(/action="\/api\/custody\/handover"/g)).toHaveLength(2);
  });

  it('uses real report fields and file uploads instead of prototype data', () => {
    const reportSlugs = ['report-lost', 'report-found', 'mobile-lost-property'];

    for (const slug of reportSlugs) {
      const html = pageContent[slug];
      expect(html).toContain('action="/api/reports" method="post" enctype="multipart/form-data"');
      expect(html).toContain('name="images"');
      expect(html).toContain('name="category"');
      expect(html).toContain('name="description"');
      expect(html).toContain('name="location"');
      expect(html).toContain('name="reporterNetId"');
      expect(html).not.toContain('value="arivers9281"');
      expect(html).not.toContain('value="alex.rivers@westfield.edu"');
      expect(html).not.toContain('value="guest-mobile"');
      expect(html).not.toContain('value="staff-intake"');
      expect(html).not.toContain('Sony WH-1000XM5');
      expect(html).not.toContain('AirPods Pro');
      expect(html).not.toContain('Silver MacBook Pro');
      expect(html).not.toContain('893-412');
    }

    expect(pageContent['mobile-lost-property']).toContain('form="lost-report-form" id="next-step-btn" type="submit"');
  });

  it('wires search filters and suggestions to real query parameters', () => {
    const home = pageContent['campus-lost-found'];
    expect(home).toContain('action="/advanced-search" method="get" id="campus-search-form"');
    expect(home).toContain('name="q"');
    expect(home).toContain('name="zone"');
    for (const value of ['ALL', 'LOST', 'FOUND']) {
      expect(home).toContain(`name="type" value="${value}"`);
    }
    expect(home).toContain('href="/advanced-search?q=AirPods%20Pro"');

    const search = pageContent['advanced-search'];
    expect(search).toContain('id="advanced-search-form"');
    expect(search).toContain('data-search-input');
    expect(search).toContain('name="type" value="ALL" form="advanced-search-form"');
    expect(search).toContain('<!-- CAMPUSFIND_SEARCH_RESULTS_START -->');
    expect(search).toContain('<!-- CAMPUSFIND_SEARCH_RESULTS_END -->');
    expect(search).toContain('<!-- CAMPUSFIND_SEARCH_CHIPS_START -->');
    expect(search).toContain('<!-- CAMPUSFIND_SEARCH_PAGINATION_START -->');
    expect(search).toContain('name="sort" form="advanced-search-form"');
    expect(search).not.toContain('All Records (148)');
    expect(search).not.toContain('148 campus items cataloged');
  });

  it('lets the global constellation show through the canonical page roots', () => {
    for (const html of Object.values(pageContent)) {
      expect(html).toContain('site-page-root');
      const rootClass = html.match(/^<div class="([^"]*)"/)?.[1] ?? '';
      expect(rootClass).not.toMatch(/\bbg-(?:canvas|background|surface)(?:\/[0-9]+)?\b/);
    }

    expect(pageContent['advanced-search']).not.toContain('bg-stone-50');
  });

  it('keeps the constellation behind page content instead of over text and controls', () => {
    const backgroundRule = globalCss.match(/\.site-background\s*\{[\s\S]*?\}/)?.[0] ?? '';
    const contentRule = globalCss.match(/\.site-content\s*\{[\s\S]*?\}/)?.[0] ?? '';

    expect(backgroundRule).toContain('z-index: 0');
    expect(backgroundRule).not.toContain('mix-blend-mode');
    expect(backgroundRule).not.toContain('mask-image');
    expect(contentRule).toContain('z-index: 1');
  });

  it('routes hero action links to their report screens', () => {
    const home = pageContent['campus-lost-found'];
    const anchorFor = (label: string) => {
      const index = home.indexOf(label);
      const start = home.lastIndexOf('<a', index);
      return home.slice(start, home.indexOf('>', start));
    };

    expect(anchorFor('Begin Lost Property Report')).toContain('href="/report-lost"');
    expect(anchorFor('Log Discovered Item &amp; Get Locker Code')).toContain('href="/report-found"');
  });

  it('removes prototype-only scripts and placeholder links', () => {
    const allHtml = Object.values(pageContent).join('\n');
    expect(allHtml).not.toMatch(/href="[a-z0-9-]+\.html"/);
    expect(allHtml).not.toContain('href="#"');
    expect(allHtml).not.toContain('<script');
    expect(allHtml).not.toContain('cdn.tailwindcss.com');
  });

  it('has a title for each page', () => {
    for (const slug of Object.keys(pageContent)) {
      expect(pageTitles[slug]).toBeTruthy();
    }
    expect(pageTitles['campus-lost-found']).toBe('Campus Lost & Found');
    expect(pageTitles['advanced-search']).toBe('Search Listings');
    expect(pageTitles['report-lost']).toBe('Report a Lost Item');
  });

  it('localizes every canonical image with accessible text', () => {
    const allHtml = Object.values(pageContent).join('\n');
    expect(allHtml).not.toMatch(/lh3\.googleusercontent\.com/);
    expect(allHtml).not.toContain('data-alt=');

    for (const match of allHtml.matchAll(/<img\b([^>]*)>/gi)) {
      expect(match[1]).toMatch(/(?:^|\s)alt="/);
      expect(match[1]).toMatch(/\bloading="/);
      expect(match[1]).toMatch(/\bdecoding="/);
    }
  });

  it('gives heading-only screens a top-level heading and fixes the lost report title', () => {
    expect(pageContent['advanced-search']).toContain('<h1 class="sr-only">Search approved campus lost and found listings.</h1>');
    expect(pageContent['overview-dashboard']).toContain('<h1 class="sr-only">Operations overview dashboard.</h1>');
    expect(pageContent['report-lost']).toMatch(/<h1[^>]*>Report a Lost Item<\/h1>/);
  });

  it('wires inert prototype buttons and names every form control', () => {
    const allHtml = Object.values(pageContent).join('\n');
    for (const match of allHtml.matchAll(/<button\b([^>]*)>/gi)) {
      const hasAction = /\bdata-action=/.test(match[1]);
      const isSubmit = /\btype="submit"/.test(match[1]);
      const belongsToForm = /\bform=/.test(match[1]);
      expect(hasAction || isSubmit || belongsToForm).toBe(true);
    }

    for (const match of allHtml.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)) {
      if (/\btype="hidden"/.test(match[2])) continue;
      expect(match[2]).toMatch(/\bname=/);
    }
  });

  it('uses a real post form for secure guest tracking credentials', () => {
    const tracking = pageContent['secure-guest-tracking'];
    expect(tracking).toMatch(/<form[^>]*action="\/api\/guest\/track"[^>]*method="post"/);
    expect(tracking).toContain('name="reference"');
    expect(tracking).toContain('name="secretToken"');
    expect(tracking).toMatch(/<button type="submit"[^>]*>[\s\S]*?Check case status/);
  });

  it('does not display simulated authentication results on the tracking screen', () => {
    const tracking = pageContent['secure-guest-tracking'];
    for (const value of [
      'AUTHENTICATION SUCCESSFUL',
      'AUTHENTICATION FAILED',
      'Valid Token',
      'Simulate Invalid Token',
      'PORT-443 TLS 1.3',
      'SHA-256 Validated',
      '0 Failures (Nominal)',
      'Cryptographic match verified',
      'Ready for Challenge',
      'Tier-4 Encrypted',
      'Session expires in 43m 12s',
      'Zero-knowledge verification engine',
      'Sony WH-1000XM5',
      'Officer M. Vance (#1094)',
      '96.2%',
      '749-218',
      'WSU-2024-CUSTODY',
    ]) {
      expect(tracking).not.toContain(value);
    }
    expect(tracking).toContain('Awaiting verification');
    expect(tracking).toContain('Your case details appear after verification');
  });

  it('removes invented prototype counts, dockets and secret values', () => {
    const allHtml = Object.values(pageContent).join('\n');
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
      expect(allHtml).not.toContain(value);
    }
  });

  it('keeps canonical screens usable on small viewports and honest sort options', () => {
    expect(pageContent['overview-dashboard']).toContain('hidden md:block');
    expect(pageContent['overview-dashboard']).toContain('pl-0 md:pl-72');
    expect(pageContent['advanced-search']).toContain('px-4 sm:px-10 md:px-20 lg:px-40');
    expect(pageContent['advanced-search']).not.toContain('whitespace-nowrap');
    expect(pageContent['advanced-search']).not.toContain('value="oldest">Sort: Custody Depot Proximity');
  });

  it('pairs labels with their controls', () => {
    for (const html of Object.values(pageContent)) {
      for (const match of html.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/gi)) {
        if (match[1].includes('for=')) continue;
        const control = match[2].match(/<(input|select|textarea)\b([^>]*)>/i);
        if (control) expect(control[2]).toMatch(/(?:^|\s)(?:id|aria-label)=/);
      }
    }
  });
});
