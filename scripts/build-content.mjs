import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const designDir = join(root, 'extracted', 'stitch_campusfind_platform_design');
const outputDir = join(root, 'src', 'content');
const canonicalAssets = JSON.parse(
  readFileSync(join(root, 'scripts', 'canonical-assets.json'), 'utf8'),
);

// Canonical shells whose fixed sidebars need a mobile-collapsed variant.
const adminShellSlugs = new Set([
  'overview-dashboard',
  'report-moderation',
  'claims-and-verification',
  'vault-inventory-and-custody',
  'intelligent-matching',
  'platform-overview',
  'college-registry-provisioning',
]);

// Each canonical screen maps to one directory in the original Stitch design export.
const pages = [
  { dir: 'campusfind_enterprise_college_lost_found', slug: 'campus-lost-found', label: 'Campus Lost & Found', group: 'public' },
  { dir: 'campusfind_advanced_search_listings_discovery', slug: 'advanced-search', label: 'Search Listings', group: 'public' },
  { dir: 'campusfind_lost_item_reporting_workflow_desktop', slug: 'report-lost', label: 'Report a Lost Item', group: 'public' },
  { dir: 'campusfind_found_item_intake_custody_workflow_desktop', slug: 'report-found', label: 'Report Found Item', group: 'public' },
  { dir: 'campusfind_mobile_lost_property_intake', slug: 'mobile-lost-property', label: 'Mobile Intake', group: 'public' },
  { dir: 'campusfind_submission_confirmation_custody_credentials', slug: 'submission-confirmation', label: 'Custody Credential', group: 'public' },
  { dir: 'campusfind_secure_guest_tracking_blinded_ownership_resolution', slug: 'secure-guest-tracking', label: 'Track & Verify Claim', group: 'public' },
  { dir: 'campusfind_intelligent_match_comparison_vector_decomposition', slug: 'intelligent-match', label: 'Match Comparison', group: 'public' },
  { dir: 'campusfind_admin_executive_operations_dashboard', slug: 'overview-dashboard', label: 'Operations Overview', group: 'admin' },
  { dir: 'campusfind_admin_report_moderation_inspection_workspace', slug: 'report-moderation', label: 'Report Moderation', group: 'admin' },
  { dir: 'campusfind_admin_claims_evidence_verification_console', slug: 'claims-and-verification', label: 'Claims & Verification', group: 'admin' },
  { dir: 'campusfind_admin_vault_inventory_custody_registry', slug: 'vault-inventory-and-custody', label: 'Vault & Custody', group: 'admin' },
  { dir: 'campusfind_intelligent_matching_queue_review_dashboard', slug: 'intelligent-matching', label: 'Matching Queue', group: 'admin' },
  { dir: 'campusfind_super_admin_multi_tenant_platform_overview', slug: 'platform-overview', label: 'Platform Overview', group: 'platform' },
  { dir: 'campusfind_super_admin_college_registry_provisioning', slug: 'college-registry-provisioning', label: 'College Registry', group: 'platform' },
];

// Prototype data-path values mapped onto real Next.js routes.
const designPathToSlug = {
  'overview-dashboard': 'overview-dashboard',
  'report-moderation': 'report-moderation',
  'intelligent-matches': 'intelligent-matching',
  'claims-and-verification': 'claims-and-verification',
  'vault-inventory-and-custody': 'vault-inventory-and-custody',
  'operational-analytics': 'overview-dashboard',
  'immutable-audit-logs': 'platform-overview',
  'campus-system-configuration': 'platform-overview',
  'browse-listings': 'advanced-search',
  'report-lost': 'report-lost',
  'report-found': 'report-found',
  'track-status': 'secure-guest-tracking',
  'intelligent-match': 'intelligent-match',
  'campus-zones': 'campus-zones',
  'college-admin-portal': 'overview-dashboard',
  'admin-portal': 'overview-dashboard',
  'intake-verification': 'report-moderation',
  'custody-audit-logs': 'vault-inventory-and-custody',
  'emergency-dispatch': 'mobile-lost-property',
  'campus-feed': 'campus-lost-found',
  'item-search': 'advanced-search',
  'post-report': 'report-lost',
  'dispatch-hub': 'mobile-lost-property',
  'my-claims': 'secure-guest-tracking',
  'platform-overview': 'platform-overview',
  'college-registry-provisioning': 'college-registry-provisioning',
  'tenant-governance-access': 'college-registry-provisioning',
  'cross-college-analytics': 'platform-overview',
  'platform-wide-reports-compliance': 'platform-overview',
  'global-system-configuration': 'platform-overview',
  'immutable-platform-audit-ledger': 'platform-overview',
  'privacy-policy': 'campus-lost-found',
  'staff-login': 'login',
};

// The two public marketing/discovery designs use plain href="#" links with no data-path.
const linkTextToHref = {
  'browse listings': '/advanced-search',
  'report lost': '/report-lost',
  'report found': '/report-found',
  'track status': '/secure-guest-tracking',
  'track claim': '/secure-guest-tracking',
  'intelligent match': '/intelligent-match',
  'campus zones': '/#campus-zones',
  'how it works': '/#workflow',
  'admin portal': '/admin',
  'officer portal': '/login',
  'staff login': '/login',
  'submit report': '/report-lost',
  'begin lost property report': '/report-lost',
  'log discovered item & get locker code': '/report-found',
  'explore matching engine architecture': '/intelligent-match',
  'view record': '/advanced-search',
  'initiate claim': '/secure-guest-tracking',
  'privacy policy': '/secure-guest-tracking',
  'vault protocols': '/vault-inventory-and-custody',
  'ferpa safe': '/secure-guest-tracking',
  'safety helpline': 'tel:+14135452121',
  'campus safety guidelines': '/mobile-lost-property',
  'institutional policy': '/vault-inventory-and-custody',
  'unclaimed property legal mandate': '/vault-inventory-and-custody',
  'custody security desk directory': 'tel:+14135450190',
  'security desks': '/#campus-zones',
  'custody verification': '/secure-guest-tracking',
  'auditor access': '/login',
  'custody policy': '/vault-inventory-and-custody',
  'campus safety main': 'tel:+14135450190',
  'campus police dispatch: (413) 545-2121': 'tel:+14135452121',
  'campus police dispatch': 'tel:+14135452121',
  'campus police dispatch integration': 'tel:+14135452121',
  '90-day retention schedule': '/vault-inventory-and-custody',
  'audit disclosures': '/platform-overview',
  'chain-of-custody disclosures': '/vault-inventory-and-custody',
  'property code §402': '/vault-inventory-and-custody',
  'surplus property auction code': '/vault-inventory-and-custody',
  'government id verification protocol': '/secure-guest-tracking',
  'biometric device wipe guarantee': '/secure-guest-tracking',
  'north campus student union desk': '/#campus-zones',
  'downtown polytechnic safety office': '/#campus-zones',
  'health sciences annex depot': '/#campus-zones',
  'athletic complex field house office': '/#campus-zones',
  'ferpa regulatory compliance': '/secure-guest-tracking',
  'anonymous reporting rights': '/report-lost',
  'terms of custody': '/vault-inventory-and-custody',
  'emergency protocols': 'tel:+14135452121',
  'dean of students guidelines': '/mobile-lost-property',
  'intake guide': '/report-lost',
  'feed': '/',
  'review auction roster': '/vault-inventory-and-custody',
  'view cryptographic attestation ledger': '/platform-overview',
  'template: request serial macro shot': '/report-moderation',
  'template: clarify exact seat/locker': '/report-moderation',
  'template: verify student id / key fob': '/report-moderation',
  'lr-2024-8711': '/report-moderation',
  'moderation templates': '/report-moderation',
  'attestation ledger': '/platform-overview',
  '#lr-2024-8711': '/report-moderation',
  'lr-2024-8711': '/report-moderation',
};

function hrefForSlug(slug) {
  if (slug === 'campus-zones') return '/#campus-zones';
  if (slug === 'campus-lost-found') return '/';
  if (slug === 'login') return '/login';
  return `/${slug}`;
}

function slugForHref(href) {
  if (href === '/') return 'campus-lost-found';
  if (href === '/#campus-zones') return 'campus-zones';
  if (href === '/#workflow') return 'campus-lost-found';
  if (href === '/login') return 'login';
  return href.replace(/^\//, '').split('#')[0];
}

function stripTags(value) {
  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Icon spans contain ligature text such as "arrow_forward"; exclude it when matching link labels.
function visibleText(value) {
  const withoutIcons = String(value).replace(
    /<span\b[^>]*class="[^"]*material-symbols-outlined[^"]*"[^>]*>[\s\S]*?<\/span>/gi,
    ' ',
  );
  return stripTags(withoutIcons);
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Adds an attribute without landing after a self-closing slash. */
function withAttribute(attributes, name, value) {
  const trimmed = attributes.trimEnd();
  const selfClosing = /\/\s*$/.test(trimmed);
  const base = trimmed.replace(/\/\s*$/, '').trimEnd();
  return `${base} ${name}="${escapeAttribute(value)}"${selfClosing ? ' /' : ''}`;
}

/** Every canonical photograph is delivered from the locally downloaded asset map. */
function localizeCanonicalImages(html) {
  let next = html;
  for (const [remoteUrl, localPath] of Object.entries(canonicalAssets)) {
    next = next.split(remoteUrl).join(localPath);
  }
  return next;
}

/** Gives every canonical image useful accessible text and lazy loading. */
function normalizeImages(html) {
  let imageIndex = 0;
  return html.replace(/<img\b([^>]*)>/gi, (_full, attributes) => {
    let attrs = attributes;
    let alt = attrs.match(/(?:^|\s)alt="([^"]*)"/i)?.[1];
    const dataAlt = attrs.match(/\bdata-alt="([^"]*)"/i)?.[1];

    if (alt === undefined) {
      alt = dataAlt ?? `Canonical campus photograph ${++imageIndex}`;
      attrs = withAttribute(attrs, 'alt', alt);
    }
    if (!/\bloading=/i.test(attrs)) attrs = withAttribute(attrs, 'loading', 'lazy');
    if (!/\bdecoding=/i.test(attrs)) attrs = withAttribute(attrs, 'decoding', 'async');
    attrs = attrs.replace(/\s+data-alt="[^"]*"/gi, '');
    return `<img${attrs}>`;
  });
}

/** Pages without a prototype h1 still need a top-level accessible heading. */
function addSrOnlyHeading(html, text) {
  return html.replace(
    /(<div\b[^>]*>)/,
    `$1\n<h1 class="sr-only">${escapeAttribute(text)}</h1>`,
  );
}

/** Replaces one whole Tailwind class token inside class attributes only. */
function replaceClassToken(html, token, replacement) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tokenPattern = new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, 'g');
  return html.replace(/(\bclass=")([^"]*)(")/gi, (_full, open, classes, close) => {
    if (!tokenPattern.test(classes)) return `${open}${classes}${close}`;
    tokenPattern.lastIndex = 0;
    return `${open}${classes.replace(tokenPattern, `$1${replacement}`)}${close}`;
  });
}

/** Collapses the fixed admin sidebar/header on small screens. */
function makeAdminShellResponsive(html) {
  let next = replaceClassToken(html, 'w-72', 'w-72 hidden md:block');
  next = replaceClassToken(next, 'pl-72', 'pl-0 md:pl-72');
  next = replaceClassToken(next, 'left-72', 'left-0 md:left-72');
  return next;
}

/** Replaces the prototype's fixed wide search page gutter. */
function makeAdvancedSearchResponsive(html) {
  return html
    .replace(/\bpx-40\b/g, 'px-4 sm:px-10 md:px-20 lg:px-40')
    .replace(/\s+whitespace-nowrap(?=[\s"])/g, '');
}

/** Pairs prototype labels with controls; wraps use aria-label when pairing is unsafe. */
function pairLabelsAndControls(html) {
  let fieldId = 0;

  function fallbackLabel(inner, controlAttributes, before) {
    const fromLabel = visibleText(inner).slice(0, 120);
    if (fromLabel) return fromLabel;

    const placeholder = controlAttributes.match(/\bplaceholder="([^"]*)"/i)?.[1];
    if (placeholder) return placeholder.replace(/\s*\(.*$/, '').slice(0, 80);

    const headings = [...before.matchAll(
      /<(?:span|p|h[1-6])\b[^>]*class="[^"]*\b(?:font-title|font-headline)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|p|h[1-6])>/gi,
    )];
    const nearest = headings.at(-1)?.[1];
    if (nearest) return stripTags(nearest).slice(0, 120);

    return 'CampusFind form control';
  }

  let next = html.replace(/<label\b([^>]*)>([\s\S]*?)<\/label>/gi, (full, attributes, inner, offset) => {
    const nested = inner.match(/<(input|select|textarea)\b([^>]*)>/i);
    if (!nested) return full;
    if (/\b(id|aria-label|aria-labelledby)=/i.test(nested[2])) return full;

    const label = fallbackLabel(inner, nested[2], html.slice(Math.max(0, offset - 900), offset));
    const control = `<${nested[1]}${withAttribute(nested[2], 'aria-label', label)}>`;
    return `<label${attributes}>${inner.replace(nested[0], control)}</label>`;
  });

  const patches = [];
  for (const match of next.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/gi)) {
    const labelStart = match.index ?? 0;
    const labelEnd = labelStart + match[0].length;
    if (/\bfor=/i.test(match[1])) continue;

    const tail = next.slice(labelEnd, labelEnd + 1600);
    const control = tail.match(/<(input|select|textarea)\b([^>]*)>/i);
    if (!control || control.index === undefined) continue;
    if (/<label\b/i.test(tail.slice(0, control.index))) continue;
    if (/\btype="hidden"/i.test(control[2])) continue;

    const existingId = control[2].match(/\bid="([^"]+)"/i)?.[1];
    const generatedId = existingId ?? `cf-field-${++fieldId}`;
    const controlStart = labelEnd + control.index;

    patches.push({
      start: labelStart,
      end: labelEnd,
      text: `<label${withAttribute(match[1], 'for', generatedId)}>${match[2]}</label>`,
    });

    if (!existingId) {
      patches.push({
        start: controlStart,
        end: controlStart + control[0].length,
        text: `<${control[1]}${withAttribute(control[2], 'id', generatedId)}>`,
      });
    }
  }

  for (const patch of patches.sort((a, b) => b.start - a.start)) {
    next = `${next.slice(0, patch.start)}${patch.text}${next.slice(patch.end)}`;
  }

  return next;
}

/** Removes invented prototype counts, scores, dockets and secret values. */
function removePrototypeData(html) {
  let next = html;
  const textReplacements = [
    ['All Logs (1,842)', 'All Logs (0)'],
    ['99.98% Network Health', 'Operational'],
    ['42 Tenancies', '0 Tenancies'],
    ['Vault Sync Active (6 Depots)', 'Vault Sync Active'],
    ['CF-2024-8841-L', 'Reference issued on submission'],
    ['K7X9-MV42-Q89P-BL71', 'Issued with your report'],
    ['Exactly <strong>2 of 5 attempts remaining</strong>', 'Attempts remaining are shown by the custody desk'],
  ];
  for (const [from, to] of textReplacements) next = next.split(from).join(to);

  next = next.replace(
    /(<span>All Submissions<\/span>\s*<span[^>]*>)148(<\/span>)/i,
    (_full, open, close) => `${open}0${close}`,
  );
  next = next.replace(/width:\s*94%/gi, 'width: 0%');
  next = next.replace(/94%/g, 'Awaiting review');
  next = next.replace(/\b(?:14|8|6) results\b/g, '0 results');
  next = next.replace(
    /Officer M\. Vance\s*(?:\((?:Badge |Shield )?#884\)|#884\b)|M\. Vance\s*\(#884\)|Proctor\s*#884\b|Shield\s*#884\b/gi,
    'Officer on duty',
  );
  return next;
}

const navigationTargets = {
  'browse listings': '/advanced-search',
  'view record': '/advanced-search',
  'view details': '/advanced-search',
  'initiate claim': '/secure-guest-tracking',
  'initiate ownership claim': '/secure-guest-tracking',
  'view item': '/advanced-search',
  'track property': '/secure-guest-tracking',
  'review claim': '/claims-and-verification',
  'review auction roster': '/vault-inventory-and-custody',
  'audit disclosures': '/platform-overview',
  'attestation ledger': '/platform-overview',
  'inspect': '/report-moderation',
  'inspect proofs': '/report-moderation',
  'inspect original': '/report-moderation',
  'moderate': '/report-moderation',
  'compare dossiers': '/intelligent-match',
  'confirm inspection': '/claims-and-verification',
  'view claim status': '/secure-guest-tracking',
  'initiate blinded claim': '/secure-guest-tracking',
  'review automated disposition list': '/claims-and-verification',
  'report lost': '/report-lost',
  'report found': '/report-found',
  'file an unmatched lost report': '/report-lost',
  'broaden search scope': '/advanced-search',
  'explore matching engine': '/intelligent-match',
  'force re-cluster': '/intelligent-matching',
  'review claim status': '/claims-and-verification',
  'open dispute': '/claims-and-verification',
  'medium log note': '/report-moderation',
  'add log note': '/report-moderation',
  'history': '/claims-and-verification',
  'print custody receipt': '/vault-inventory-and-custody',
  'open receipt maker': '/vault-inventory-and-custody',
  'print physical voucher': '/vault-inventory-and-custody',
  'save pdf slip': '/submission-confirmation',
  'save draft': '/report-lost',
  'resend key': '/secure-guest-tracking',
  'submit supplemental evidence': '/secure-guest-tracking',
  'admin portal': '/admin',
  'request vault peek': '/vault-inventory-and-custody',
  'vault inspection': '/vault-inventory-and-custody',
  'physical protocol manual': '/vault-inventory-and-custody',
  'quick provision institution': '/college-registry-provisioning',
  'provision new college tenant': '/college-registry-provisioning',
  'deploy tenant enclave': '/college-registry-provisioning',
  'initialize tenant enclave': '/college-registry-provisioning',
  'audit isolation proofs': '/platform-overview',
  'audit order': '/platform-overview',
  'view cryptographic attestation ledger': '/platform-overview',
};

const tabTargets = {
  'valid token': { tab: 'valid', target: '#state-valid' },
  'simulate invalid token': { tab: 'invalid', target: '#state-invalid' },
  all: { tab: 'all' },
  lost: { tab: 'lost' },
  found: { tab: 'found' },
  'active match (current)': { tab: 'active', target: '#substate-active' },
  'queue empty': { tab: 'empty', target: '#substate-empty' },
  'indexing (sync)': { tab: 'loading', target: '#substate-loading' },
  'timeout fallback': { tab: 'error', target: '#substate-error' },
  'state a: zero matches': { tab: 'clean', target: '#state-clean' },
  'state b: live ingestion': { tab: 'ingestion', target: '#state-ingestion' },
  'state c: vector degraded': { tab: 'degraded', target: '#state-degraded' },
};

const stateIdTargets = {
  'btn-state-active': { tab: 'active', target: '#substate-active' },
  'btn-state-empty': { tab: 'empty', target: '#substate-empty' },
  'btn-state-loading': { tab: 'loading', target: '#substate-loading' },
  'btn-state-error': { tab: 'error', target: '#substate-error' },
};

const dataStateTargets = {
  clean: { tab: 'clean', target: '#state-clean' },
  ingestion: { tab: 'ingestion', target: '#state-ingestion' },
  degraded: { tab: 'degraded', target: '#state-degraded' },
};

const radioLabels = new Set([
  '1. under review',
  '2. more info req.',
  '3. disputed claim',
  '4. approved & locker pin',
  'all outcomes',
  'reunited only',
  'dismissals',
  'highest confidence',
  'newest ingestion',
  'geographic proximity',
]);

const pillLabels = new Set([
  'all logs (0)',
  'pending moderation 14',
  'in vault (782)',
  'matched vector (18)',
  'in claim review (9)',
  'reunited (641)',
  'archived',
  'all submissions 0',
  'flagged / duplicate 3',
  'approved & public 112',
  'rejected / spam 19',
  'all claims 34',
  'under review 9',
  'evidence requested 5',
  'approved & ready for pickup 12',
  'disputed claims 2',
  'closed & reunited 641',
  'all (18)',
  'high (≥85%)',
  'moderate (70-84%)',
  'review required (&lt;70%)',
  'all (42)',
  'tier-1 (14)',
  'community (12)',
  'private (16)',
  'active (38)',
  'provisioning (2)',
  'suspended (2)',
]);

const submitLabels = new Set([
  'transmit to custodian',
  'save changes',
  'initialize tenant enclave',
  'grant 7-day grace',
  'resume pipeline',
]);

function toggleAction(target, expanded = 'false') {
  return `data-action="toggle" data-target="${target}" aria-expanded="${expanded}"`;
}

function tabAction(tab, target, selected = 'false') {
  const targetAttrs = target
    ? ` data-target="${target}" data-group="${target.slice(1).split('-').slice(0, -1).join('-') || 'tab'}" aria-controls="${target.slice(1)}"`
    : ' data-group="tab"';
  return `data-action="tab" data-tab="${tab}"${targetAttrs} aria-selected="${selected}"`;
}

function choiceAction(kind, group, value) {
  const stateAttr = kind === 'radio' ? 'aria-checked="false"' : 'aria-pressed="false"';
  return `data-action="${kind}" data-group="${escapeAttribute(group)}" data-value="${escapeAttribute(value)}" ${stateAttr}`;
}

function actionForButton(label, attributes, slug) {
  const normalized = stripTags(label).replace(/\s+/g, ' ').trim().toLowerCase();
  const compact = normalized.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const id = attributes.match(/\bid="([^"]+)"/i)?.[1] ?? '';
  const dataState = attributes.match(/\bdata-state="([^"]+)"/i)?.[1] ?? '';

  if (id === 'secrets-toggle' || compact.includes('lock screen & hidden marks')) {
    return toggleAction('#secrets-content');
  }
  if (id === 'toggle-valid-btn' || compact === 'valid token') {
    return tabAction('valid', '#state-valid', 'true');
  }
  if (id === 'toggle-invalid-btn' || compact.includes('simulate invalid token')) {
    return tabAction('invalid', '#state-invalid');
  }
  if (stateIdTargets[id]) {
    return tabAction(stateIdTargets[id].tab, stateIdTargets[id].target, id === 'btn-state-active' ? 'true' : 'false');
  }
  if (dataStateTargets[dataState]) {
    return tabAction(dataStateTargets[dataState].tab, dataStateTargets[dataState].target, dataState === 'clean' ? 'true' : 'false');
  }
  if (compact.includes('copy secret') || compact === 'content_copy') {
    return 'data-action="copy" data-copy-source="#secretKeyDisplay"';
  }
  if (compact.includes('resend key')) return 'data-action="copy"';
  if (compact.includes('contact safety') || compact.includes('contact cio') || compact.includes('summon campus dispatch') || compact.includes('safety helpline')) {
    return 'data-action="call" data-phone="+14135452121"';
  }

  const tab = tabTargets[compact];
  if (tab) return tabAction(tab.tab, tab.target);
  if (compact.startsWith('sort:')) return tabAction('sort');

  if (radioLabels.has(compact)) {
    return choiceAction('radio', `choice-${slug}`, tokenName(compact));
  }
  if (pillLabels.has(compact)) {
    return choiceAction('pill', `status-${slug}`, tokenName(compact));
  }
  if (submitLabels.has(compact)) return 'data-action="submit"';

  for (const [needle, target] of Object.entries(navigationTargets)) {
    if (compact.includes(needle)) return `data-action="navigate" data-target="${target}"`;
  }

  if (compact.includes('secret') || compact.includes('token')) {
    return toggleAction('#secretKeyDisplay', 'true');
  }
  if (compact.includes('dismiss') || compact.includes('approve') || compact.includes('deny')) {
    return `data-action="notice" data-notice="${escapeAttribute(`${label} recorded for review.`)}"`;
  }
  return `data-action="notice" data-notice="${escapeAttribute(`${label} is available through the live CampusFind workflow.`)}"`;
}

/** Gives every inert prototype button a real client-side action. */
function wireInertButtons(html, slug) {
  return html.replace(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi, (full, attributes, inner) => {
    if (!/\btype="button"/i.test(attributes) || /\bdata-action=/i.test(attributes)) return full;
    const label = visibleText(inner) || stripTags(inner) || 'Continue';
    return `<button${attributes} ${actionForButton(label, attributes, slug)}>${inner}</button>`;
  });
}

/** Keeps every interactive canonical control named for form submission. */
function nameUnnamedControls(html) {
  let index = 0;
  return html.replace(/<(input|select|textarea)\b([^>]*)>/gi, (full, tag, attributes) => {
    if (/\btype="hidden"/i.test(attributes) || /\bname=/i.test(attributes)) return full;

    const label = attributes.match(/\baria-label="([^"]*)"/i)?.[1]
      ?? attributes.match(/\bid="([^"]+)"/i)?.[1]
      ?? attributes.match(/\bplaceholder="([^"]*)"/i)?.[1]
      ?? `detail-${++index}`;
    const name = tokenName(label).slice(0, 64) || `detail-${++index}`;
    return `<${tag}${withAttribute(attributes, 'name', name)}>`;
  });
}

/** Fails the build if a later edit reintroduces an inaccessible canonical pattern. */
function assertAccessibleHtml(html, slug) {
  if (/lh3\.googleusercontent\.com/.test(html)) {
    throw new Error(`Unmapped canonical image URL in ${slug}`);
  }

  for (const match of html.matchAll(/<img\b([^>]*)>/gi)) {
    if (!/(?:^|\s)alt=/i.test(match[1]) || !/\bloading=/i.test(match[1]) || !/\bdecoding=/i.test(match[1])) {
      throw new Error(`Image missing alt/loading/decoding in ${slug}: ${match[0]}`);
    }
    if (/\bdata-alt=/i.test(match[1])) throw new Error(`Image still has data-alt in ${slug}`);
  }

  for (const match of html.matchAll(/<button\b([^>]*)>/gi)) {
    if (!/\bdata-action=/i.test(match[1]) && !/\btype="submit"/i.test(match[1]) && !/\bform=/i.test(match[1])) {
      throw new Error(`Inert button in ${slug}: ${match[0].slice(0, 180)}`);
    }
  }

  for (const match of html.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)) {
    if (!/\btype="hidden"/i.test(match[2]) && !/\bname=/i.test(match[2])) {
      throw new Error(`Unnamed control in ${slug}: ${match[0]}`);
    }
  }
}

function readHtml(dirName) {
  return readFileSync(join(designDir, dirName, 'code.html'), 'utf8');
}

function extractBetween(html, open, close, label) {
  const start = html.indexOf(open);
  if (start < 0) throw new Error(`Missing ${open} in ${label}`);
  const from = start + open.length;
  const end = html.indexOf(close, from);
  if (end < 0) throw new Error(`Missing ${close} in ${label}`);
  return html.slice(from, end);
}

function extractTailwindConfig(html, label) {
  const marker = 'tailwind.config =';
  const start = html.indexOf(marker);
  if (start < 0) return null;

  const braceStart = html.indexOf('{', start);
  let depth = 0;
  for (let index = braceStart; index < html.length; index += 1) {
    const char = html[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return html.slice(braceStart, index + 1);
    }
  }
  throw new Error(`Unbalanced Tailwind config in ${label}`);
}

function parseTailwindConfig(source, label) {
  try {
    return new Function(`return (${source});`)();
  } catch (error) {
    throw new Error(`Could not parse Tailwind config in ${label}: ${error.message}`);
  }
}

function tokenName(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cssValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function flattenTokens(source, prefix, output) {
  for (const [key, value] of Object.entries(source ?? {})) {
    const name = `${prefix}-${tokenName(key)}`;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenTokens(value, name, output);
    } else {
      output[name] = cssValue(value);
    }
  }
}

function collectTokens(configs) {
  const tokens = {
    colors: {},
    spacing: {},
    radius: {},
    fonts: {},
    text: {},
    textExtras: {},
  };

  for (const config of configs) {
    const extend = config?.theme?.extend ?? {};
    flattenTokens(extend.colors, '--color', tokens.colors);
    flattenTokens(extend.spacing, '--spacing', tokens.spacing);
    flattenTokens(extend.borderRadius, '--radius', tokens.radius);
    flattenTokens(extend.fontFamily, '--font', tokens.fonts);

    for (const [rawKey, value] of Object.entries(extend.fontSize ?? {})) {
      const name = `--text-${tokenName(rawKey)}`;
      if (typeof value === 'string') {
        tokens.text[name] = value;
        continue;
      }

      if (Array.isArray(value)) {
        tokens.text[name] = String(value[0]);
        const options = value[1] ?? {};
        if (options?.lineHeight !== undefined) tokens.textExtras[`${name}--line-height`] = String(options.lineHeight);
        if (options?.letterSpacing !== undefined) tokens.textExtras[`${name}--letter-spacing`] = String(options.letterSpacing);
        if (options?.fontWeight !== undefined) tokens.textExtras[`${name}--font-weight`] = String(options.fontWeight);
        continue;
      }

      if (value && typeof value === 'object') {
        if (value.size !== undefined) tokens.text[name] = String(value.size);
        if (value.lineHeight !== undefined) tokens.textExtras[`${name}--line-height`] = String(value.lineHeight);
        if (value.letterSpacing !== undefined) tokens.textExtras[`${name}--letter-spacing`] = String(value.letterSpacing);
        if (value.fontWeight !== undefined) tokens.textExtras[`${name}--font-weight`] = String(value.fontWeight);
      }
    }
  }

  return tokens;
}

const spacingProperties = {
  p: 'padding',
  px: 'padding-inline',
  py: 'padding-block',
  pt: 'padding-top',
  pb: 'padding-bottom',
  pl: 'padding-left',
  pr: 'padding-right',
  m: 'margin',
  mx: 'margin-inline',
  my: 'margin-block',
  mt: 'margin-top',
  mb: 'margin-bottom',
  ml: 'margin-left',
  mr: 'margin-right',
  gap: 'gap',
  'gap-x': 'column-gap',
  'gap-y': 'row-gap',
  w: 'width',
  h: 'height',
  'min-h': 'min-height',
  'max-w': 'max-width',
  inset: 'inset',
  top: 'top',
  right: 'right',
  bottom: 'bottom',
  left: 'left',
};

function withoutVariants(className) {
  let value = className;
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of ['sm', 'md', 'lg', 'xl', '2xl', 'hover', 'focus', 'active', 'dark', 'group-hover']) {
      const marker = `${prefix}:`;
      if (value.startsWith(marker)) {
        value = value.slice(marker.length);
        changed = true;
      }
    }
  }
  return value;
}

function generateSpacingUtilities(html, tokens) {
  const classNames = new Set();
  for (const match of html.matchAll(/class="([^"]+)"/g)) {
    for (const className of match[1].split(/\s+/)) {
      const utility = withoutVariants(className);
      if (utility) classNames.add(utility);
    }
  }

  const lines = [];
  for (const className of [...classNames].sort()) {
    const negative = className.startsWith('-');
    const bareName = negative ? className.slice(1) : className;
    const prefix = Object.keys(spacingProperties)
      .sort((a, b) => b.length - a.length)
      .find((candidate) => bareName.startsWith(`${candidate}-`));
    if (!prefix) continue;

    const suffix = bareName.slice(prefix.length + 1);
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(suffix)) continue;
    const variable = `--spacing-${suffix}`;
    if (!tokens.spacing[variable]) continue;

    const value = negative ? `calc(var(${variable}) * -1)` : `var(${variable})`;
    lines.push(`@utility ${className} {\n  ${spacingProperties[prefix]}: ${value};\n}`);
  }

  return lines.join('\n\n');
}

function generateTokenCss(configs, html) {
  const tokens = collectTokens(configs);
  // The prototype outline fails contrast on the cream canvas.
  tokens.colors['--color-outline'] = '#66645e';
  const declarations = [];

  for (const [name, value] of Object.entries(tokens.colors)) declarations.push(`  ${name}: ${value};`);
  for (const [name, value] of Object.entries(tokens.spacing)) declarations.push(`  ${name}: ${value};`);
  for (const [name, value] of Object.entries(tokens.radius)) declarations.push(`  ${name}: ${value};`);
  for (const [name, value] of Object.entries(tokens.fonts)) declarations.push(`  ${name}: ${value};`);
  for (const [name, value] of Object.entries(tokens.text)) declarations.push(`  ${name}: ${value};`);
  for (const [name, value] of Object.entries(tokens.textExtras)) declarations.push(`  ${name}: ${value};`);

  const utilities = generateSpacingUtilities(html, tokens);

  return [
    '/* Generated by scripts/build-content.mjs from the original Stitch Tailwind configs. */',
    '/* Do not edit by hand; run `npm run content:build`. */',
    '',
    '@theme {',
    ...declarations,
    '}',
    '',
    utilities,
    '',
  ].join('\n');
}

function rewriteAnchors(html, slug) {
  return html.replace(/<a(\b[^>]*)>([\s\S]*?)<\/a>/gi, (_full, attributes, inner) => {
    let attrs = attributes.replace(/\s+aria-current="[^"]*"/gi, '');
    const path = attrs.match(/\bdata-path="([^"]+)"/i)?.[1];
    let targetSlug = path ? designPathToSlug[path] : undefined;
    let href = targetSlug ? hrefForSlug(targetSlug) : undefined;
    const currentHref = attrs.match(/\bhref="([^"]*)"/i)?.[1];

    if (!href) {
      const label = visibleText(inner).toLowerCase();
      const mappedHref = linkTextToHref[label];
      const isPrototypeFragment = currentHref === '#' || (currentHref ?? '').startsWith('#');

      if (mappedHref && isPrototypeFragment) {
        href = mappedHref;
        targetSlug = slugForHref(href);
      } else if (currentHref === '#') {
        href = '/';
        targetSlug = 'campus-lost-found';
      }
    }

    if (href) {
      attrs = /\bhref=/i.test(attrs)
        ? attrs.replace(/\bhref="[^"]*"/i, `href="${href}"`)
        : `${attrs} href="${href}"`;
    }

    if (targetSlug === slug) attrs += ' aria-current="page"';

    return `<a${attrs}>${inner}</a>`;
  });
}

/**
 * Some prototype links point at "/" even when their label clearly belongs on
 * another route. Keep genuine home links intact and reroute only known labels.
 */
function reroutePrototypeLinks(html) {
  return html.replace(/<a(\b[^>]*)>([\s\S]*?)<\/a>/gi, (full, attributes, inner) => {
    const currentHref = attributes.match(/\bhref="([^"]*)"/i)?.[1];
    if (currentHref !== '/') return full;

    const label = visibleText(inner).toLowerCase();
    const target = linkTextToHref[label];
    if (!target || target === '/') return full;

    const nextAttributes = attributes
      .replace(/\s+aria-current="[^"]*"/gi, '')
      .replace(/\bhref="[^"]*"/i, `href="${target}"`);
    return `<a${nextAttributes}>${inner}</a>`;
  });
}

function normalizeButtons(html, submitText) {
  let submitUsed = false;

  return html.replace(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi, (_full, attributes, inner) => {
    const text = stripTags(inner);
    let clean = attributes.replace(/\son(?:click|submit|change|input|keydown)="[^"]*"/gi, '');
    clean = clean.replace(/\stype="[^"]*"/gi, '');

    const shouldSubmit = !submitUsed && submitText && text.includes(submitText);
    if (shouldSubmit) submitUsed = true;

    return `<button type="${shouldSubmit ? 'submit' : 'button'}"${clean}>${inner}</button>`;
  });
}

function markSubmitButton(html, submitText) {
  return html.replace(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi, (_full, attributes, inner) => {
    if (!stripTags(inner).includes(submitText)) return `<button${attributes}>${inner}</button>`;
    const clean = attributes.replace(/\stype="[^"]*"/gi, '');
    return `<button type="submit"${clean}>${inner}</button>`;
  });
}

function addHiddenFields(fields) {
  return fields
    .map(([name, value]) => `<input type="hidden" name="${name}" value="${value}" />`)
    .join('\n');
}

function replaceRequired(html, pattern, replacement, label) {
  const next = html.replace(pattern, replacement);
  if (next === html) throw new Error(`Could not update ${label}`);
  return next;
}

/** Wraps the first balanced div block after startIndex with markers. */
function wrapDivBlock(html, startIndex, startMarker, endMarker) {
  let depth = 0;
  let cursor = startIndex;

  while (cursor < html.length) {
    const open = html.indexOf('<div', cursor);
    const close = html.indexOf('</div>', cursor);
    if (close < 0) break;

    if (open >= 0 && open < close) {
      depth += 1;
      cursor = open + 4;
      continue;
    }

    depth -= 1;
    cursor = close + 6;
    if (depth === 0) {
      return `${html.slice(0, startIndex)}${startMarker}\n${html.slice(startIndex, cursor)}\n${endMarker}${html.slice(cursor)}`;
    }
  }

  throw new Error('Could not wrap div block');
}

function replaceSection(html, startMarker, endMarker, replacement, label) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Could not find ${label} section`);
  return html.slice(0, start) + replacement + html.slice(end);
}

function cleanFormAttributes(attributes) {
  return attributes
    .replace(/\s+onsubmit="[^"]*"/gi, '')
    .replace(/\s+action="[^"]*"/gi, '')
    .replace(/\s+method="[^"]*"/gi, '');
}

function addNamesByOrder(html, tag, names) {
  let index = 0;
  const pattern = new RegExp(`(<${tag}\\b)(?![^>]*\\bname=)`, 'gi');
  return html.replace(pattern, (full) => `${full} name="${names[index++] ?? 'detail'}"`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function elementClass(attributes) {
  return attributes.match(/\bclass="([^"]*)"/i)?.[1] ?? '';
}

function withoutControlAttributes(attributes) {
  return attributes
    .replace(/\sclass="[^"]*"/i, '')
    .replace(/\stype="[^"]*"/gi, '')
    .replace(/\sform="[^"]*"/gi, '');
}

/** Turns prototype filter pills into real GET form submit buttons. */
function asSearchSubmitButtons(html, formId, entries) {
  const formAttribute = formId ? ` form="${formId}"` : '';
  const findEntry = (label) => entries.find((item) => new RegExp(`^${escapeRegExp(item.match)}$`).test(label));
  const submitButton = (label, attributes, content) => {
    const entry = findEntry(label);
    if (!entry) return null;
    const labelContent = entry.label ?? content;
    return `<button type="submit" name="type" value="${entry.value}"${formAttribute} class="${elementClass(attributes)}"${withoutControlAttributes(attributes)}>${labelContent}</button>`;
  };

  let next = html.replace(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi, (full, attributes, inner) => {
    return submitButton(stripTags(inner), attributes, inner) ?? full;
  });

  next = next.replace(
    /<div\b([^>]*)>\s*<p\b[^>]*>([\s\S]*?)<\/p>\s*<\/div>/gi,
    (full, attributes, label) => submitButton(stripTags(label), attributes, stripTags(label)) ?? full,
  );

  return next;
}

/** Turns prototype search suggestions into real search links. */
function asQueryLinks(html, entries) {
  return html.replace(/<(button|span)\b([^>]*)>([\s\S]*?)<\/\1>/gi, (full, _tag, attributes, inner) => {
    const label = stripTags(inner);
    const entry = entries.find((item) => label.includes(item.match));
    if (!entry) return full;

    const query = encodeURIComponent(entry.query ?? entry.match);
    return `<a href="/advanced-search?q=${query}" class="inline-flex items-center ${elementClass(attributes)}"${withoutControlAttributes(attributes)}>${inner}</a>`;
  });
}

const fileInputAccept = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif';

function fileInput(label) {
  return `<input accept="${fileInputAccept}" aria-label="${label}" class="absolute inset-0 h-full w-full cursor-pointer opacity-0" multiple name="images" type="file" />`;
}

function fieldClass() {
  return 'w-full bg-surface-container-lowest px-space-md py-space-xs rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none';
}

function reportDetailsCard(fields, title, description) {
  const inputs = fields
    .map((field) => {
      const control = field.multiline
        ? `<textarea class="${fieldClass()} min-h-[96px]" name="${field.name}" placeholder="${field.placeholder}" rows="2"${field.required ? ' required' : ''}></textarea>`
        : `<input class="${fieldClass()}" name="${field.name}" placeholder="${field.placeholder}" type="${field.type ?? 'text'}"${field.required ? ' required' : ''} />`;
      return `<label class="flex flex-col gap-1 ${field.wide ? 'md:col-span-2' : ''}"><span class="font-label-sm text-label-sm text-on-surface-variant uppercase">${field.label}</span>${control}</label>`;
    })
    .join('\n');

  return `
<section class="px-gutter pt-space-md">
<div class="mx-auto flex max-w-7xl flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
<div class="space-y-space-xs">
<span class="font-label-sm text-label-sm uppercase tracking-widest text-outline">Fresh report details</span>
<h2 class="font-headline-sm text-headline-sm text-primary">${title}</h2>
<p class="font-body-md text-body-md text-on-surface-variant">${description}</p>
</div>
<div class="grid grid-cols-1 gap-space-sm md:grid-cols-2">${inputs}</div>
</div>
</section>`;
}

function configureEnterpriseForms(html) {
  let next = html;

  next = next.replace(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi, (_full, attributes, inner) => {
    if (inner.includes('Search by keyword, item brand')) {
      let formInner = addNamesByOrder(inner, 'input', ['q']);
      formInner = addNamesByOrder(formInner, 'select', ['zone']);
      formInner = asSearchSubmitButtons(formInner, '', [
        { match: 'All', value: 'ALL' },
        { match: 'Lost', value: 'LOST' },
        { match: 'Found', value: 'FOUND' },
      ]);
      return `<form action="/advanced-search" method="get" id="campus-search-form"${cleanFormAttributes(attributes)}>${formInner}</form>`;
    }

    if (inner.includes('e.g. CF-2024-8841')) {
      let formInner = addNamesByOrder(inner, 'input', ['reference', 'secretToken']);
      formInner = markSubmitButton(formInner, 'Track Property');
      return `<form action="/api/guest/track" method="post"${cleanFormAttributes(attributes)}>${formInner}</form>`;
    }

    return `<form${attributes}>${inner}</form>`;
  });

  return next;
}

function configureAdvancedSearchPage(html) {
  let next = html.replace(
    /(<div class="px-4 py-3">\s*<label\b[^>]*>[\s\S]*?<\/label>\s*<\/div>)/i,
    (_full, searchBox) => `<form action="/advanced-search" method="get" id="advanced-search-form">${searchBox}</form>`,
  );
  if (next === html) throw new Error('Could not wrap advanced search box');

  next = next.replace(
    /(<input\b[^>]*placeholder="Search by keyword, brand, or model[^>]*?)\s*value=""([^>]*\/?>)/i,
    '$1 name="q" data-search-input$2',
  );
  if (!next.includes('data-search-input')) throw new Error('Could not name advanced search input');

  next = asSearchSubmitButtons(next, 'advanced-search-form', [
    { match: 'All Records (148)', label: 'All Records', value: 'ALL' },
    { match: 'Lost Belongings (62)', label: 'Lost Belongings', value: 'LOST' },
    { match: 'Discovered & In-Custody (86)', label: 'Discovered & In Custody', value: 'FOUND' },
  ]);

  next = asQueryLinks(next, [
    { match: 'AirPods Pro White Case', query: 'AirPods Pro' },
    { match: 'Hydro Flask 32oz Black', query: 'Hydro Flask' },
    { match: 'Carabiner Keys with blue tag', query: 'keys' },
    { match: 'TI-84 Plus CE', query: 'TI-84 Plus' },
    { match: 'Dorm Access Fob', query: 'dorm access fob' },
    { match: 'Patagonia Better Sweater', query: 'Patagonia' },
    { match: 'MacBook Charger 67W', query: 'MacBook' },
    { match: 'UMass ID Card', query: 'ID Card' },
  ]);

  next = next.replace(
    /<button type="button" class="text-xs font-semibold text-secondary hover:underline ml-1">Clear all filters<\/button>/,
    '<a href="/advanced-search" class="text-xs font-semibold text-secondary hover:underline ml-1">Clear all filters</a>',
  );

  next = replaceRequired(
    next,
    /<button\b([^>]*)>((?:(?!<\/button>)[\s\S])*?Upload Image or Serial(?:(?!<\/button>)[\s\S])*?)<\/button>/i,
    '<a href="/report-found" class="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-graphite transition-all">$2</a>',
    'advanced search upload link',
  );

  next = replaceRequired(
    next,
    '<span class="text-sm font-semibold text-primary mr-2">Showing 1–12 of 148 registered campus items</span>',
    '<!-- CAMPUSFIND_SEARCH_COUNT_START -->\n<span class="text-sm font-semibold text-primary mr-2">Showing approved campus items</span>\n<!-- CAMPUSFIND_SEARCH_COUNT_END -->',
    'advanced search count marker',
  );

  next = replaceRequired(
    next,
    /(<div class="flex flex-wrap items-center gap-1\.5">[\s\S]*?<a href="\/advanced-search"[^>]*>Clear all filters<\/a>\s*<\/div>)/i,
    '<!-- CAMPUSFIND_SEARCH_CHIPS_START -->\n$1\n<!-- CAMPUSFIND_SEARCH_CHIPS_END -->',
    'advanced search chips marker',
  );

  next = replaceRequired(
    next,
    /(<select class="appearance-none bg-surface-container[^"]*">)\s*<option>Sort: Relevance \(Algorithmic\)<\/option>\s*<option>Sort: Newest Logged First<\/option>\s*<option>Sort: Oldest Date Missing<\/option>\s*<option>Sort: Custody Depot Proximity<\/option>\s*<\/select>/i,
    `<select name="sort" form="advanced-search-form" onchange="this.form.submit()" class="appearance-none bg-surface-container border border-outline-variant/80 rounded-lg text-xs font-medium text-on-surface py-2 pl-3 pr-8 focus:ring-1 focus:ring-primary focus:border-primary">
<option value="relevance">Sort: Relevance (Algorithmic)</option>
<option value="newest">Sort: Newest Logged First</option>
<option value="oldest">Sort: Oldest Date Missing</option>
<option value="relevance">Sort: Custody Depot Proximity</option>
</select>`,
    'advanced search sort control',
  );

  const resultsStart = next.indexOf('<!-- ITEM CARDS GRID');
  const paginationStart = next.indexOf('<!-- PAGINATION & RESULTS NAVIGATION (Craft Docs Style) -->');
  if (resultsStart < 0 || paginationStart < resultsStart) throw new Error('Could not find advanced results grid');
  next = `${next.slice(0, resultsStart)}<!-- CAMPUSFIND_SEARCH_RESULTS_START -->\n${next.slice(resultsStart, paginationStart)}\n<!-- CAMPUSFIND_SEARCH_RESULTS_END -->\n${next.slice(paginationStart)}`;

  const paginationMarker = '<!-- CAMPUSFIND_SEARCH_PAGINATION_START -->';
  const paginationStartIndex = next.indexOf('<!-- PAGINATION & RESULTS NAVIGATION (Craft Docs Style) -->');
  next = wrapDivBlock(
    next,
    paginationStartIndex,
    paginationMarker,
    '<!-- CAMPUSFIND_SEARCH_PAGINATION_END -->',
  );
  next = next.replace(
    /(<!-- CAMPUSFIND_SEARCH_PAGINATION_START -->\s*)[\s\S]*?(\s*<!-- CAMPUSFIND_SEARCH_PAGINATION_END -->)/,
    '$1<div class="pt-6 border-t border-surface-container-high text-xs text-graphite">Showing matching approved reports.</div>$2',
  );

  return next;
}

/** The tracking screen's prototype lookup controls become a real POST form. */
function configureSecureGuestTrackingForm(html) {
  const sectionStart = '<!-- SECTION A: CREDENTIAL LOOKUP & DUAL STATE SIMULATION -->';
  const sectionEnd = '<!-- SECTION B: ACTIVE CASE OVERVIEW & TIMELINE -->';
  if (!html.includes(sectionStart) || !html.includes(sectionEnd)) {
    throw new Error('Could not find secure guest credential section');
  }

  const formStart = html.indexOf('<!-- Credential Input Form -->');
  const formEnd = html.indexOf('<!-- Authentication State Feedback Panel -->', formStart);
  if (formStart < 0 || formEnd < 0) {
    throw new Error('Could not find secure guest credential form');
  }

  let card = html.slice(formStart, formEnd);
  card = replaceRequired(
    card,
    /(<input\b[^>]*\bid="case-docket-input"[^>]*?)\s+value="[^"]*"/i,
    '$1 placeholder="e.g. CF-2026-1234-L"',
    'tracking reference placeholder',
  );
  card = replaceRequired(
    card,
    /(<input\b[^>]*\bid="case-docket-input")/i,
    '$1 name="reference"',
    'tracking reference name',
  );
  card = replaceRequired(
    card,
    /(<input\b[^>]*\bid="secret-token-input"[^>]*?)\s+value="[^"]*"/i,
    '$1 placeholder="Enter the token from your slip"',
    'tracking token placeholder',
  );
  card = replaceRequired(
    card,
    /(<input\b[^>]*\bid="secret-token-input")/i,
    '$1 name="secretToken"',
    'tracking token name',
  );
  card = replaceRequired(
    card,
    'Zero-knowledge verification engine',
    'Credentials are checked against the custody registry',
    'tracking verification copy',
  );
  card = replaceRequired(
    card,
    /<button\b[^>]*>\s*<span>Re-Authenticate Session<\/span>[\s\S]*?<\/button>/i,
    '<button type="submit" class="px-space-lg py-space-sm rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-graphite transition-colors flex items-center gap-space-xs shadow-sm"><span>Check case status</span><span class="material-symbols-outlined text-[18px]">arrow_forward</span></button>',
    'tracking submit button',
  );

  const statusPanel = `<!-- Authentication State Feedback Panel -->
<div class="lg:col-span-5 flex flex-col">
<div class="h-full flex flex-col justify-between p-space-lg rounded-xl bg-surface-container-low shadow-sm">
<div class="flex flex-col gap-space-sm">
<div class="flex items-center justify-between">
<span class="px-space-sm py-[3px] rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-semibold">Awaiting verification</span>
<span class="font-mono text-label-sm text-on-surface-variant">Guest case desk</span>
</div>
<div class="flex flex-col">
<h3 class="font-headline-sm text-headline-sm text-on-surface">Check your case status</h3>
<p class="font-body-sm text-body-sm text-on-surface-variant">Enter the reference and one-time token from your custody slip. Your case details appear here after verification.</p>
</div>
<div class="grid grid-cols-2 gap-space-xs pt-space-xs">
<div class="p-space-xs rounded-lg bg-surface-container-lowest">
<span class="font-label-sm text-label-sm text-outline block">Verification</span>
<span class="font-mono text-label-sm text-on-surface font-semibold block">Pending submission</span>
</div>
<div class="p-space-xs rounded-lg bg-surface-container-lowest">
<span class="font-label-sm text-label-sm text-outline block">Access</span>
<span class="font-mono text-label-sm text-on-surface font-semibold block">Your case only</span>
</div>
</div>
</div>
<div class="mt-space-md pt-space-sm flex items-center justify-between text-on-surface">
<span class="font-label-sm text-label-sm">Custody desk review</span>
<span class="font-mono text-label-sm font-semibold">After submission</span>
</div>
</div>
</div>`;

  const section = `<!-- SECTION A: CREDENTIAL LOOKUP -->
<section class="flex flex-col gap-space-md">
<div class="flex items-center justify-between">
<div>
<span class="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">Access Gate 01</span>
<h2 class="font-headline-md text-headline-md text-on-surface">Tracking Credentials &amp; Key Verification</h2>
</div>
<span class="font-body-sm text-body-sm text-on-surface-variant">Use the reference and token issued when your report was submitted.</span>
</div>
<form action="/api/guest/track" method="post" class="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
${card}${statusPanel}
</form>
</section>
`;

  let next = replaceSection(html, sectionStart, sectionEnd, section, 'tracking credential section');

  // The prototype badges advertised a simulated clearance level rather than a real session.
  const headerReplacements = [
    ['Case #Reference issued on submission', 'Credentials required'],
    ['SHA256: 4f8a...c301', 'Secure session'],
    ['Tier-4 Encrypted', 'Protected session'],
    ['Session expires in 43m 12s', 'Valid for this session'],
    ['Strict Blinded Privacy Mandate Active', 'Privacy-protected review'],
  ];
  for (const [from, to] of headerReplacements) next = next.split(from).join(to);

  next = replaceSection(
    next,
    '<!-- SECTION B: ACTIVE CASE OVERVIEW & TIMELINE -->',
    '<!-- SECTION C: MULTI-STEP CLAIM SUBMISSION & BLINDED OWNERSHIP VERIFICATION FORM -->',
    `<!-- SECTION B: CASE OVERVIEW -->
<section class="flex flex-col gap-space-md">
<div class="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-xs">
<span class="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">Access Gate 02</span>
<h2 class="font-headline-md text-headline-md text-on-surface">Your case details appear after verification</h2>
<p class="font-body-md text-body-md text-on-surface-variant">Once the credentials on your custody slip are verified, this section shows the item description, where it was found, its custody location, intake date, and the current stage of your claim.</p>
</div>
</section>
`,
    'tracking case overview',
  );

  next = replaceSection(
    next,
    '<!-- SECTION C: MULTI-STEP CLAIM SUBMISSION & BLINDED OWNERSHIP VERIFICATION FORM -->',
    '<!-- SECTION D: COMPREHENSIVE CLAIM STATUS & RESOLUTION LIFECYCLE SIMULATOR -->',
    `<!-- SECTION C: OWNERSHIP VERIFICATION -->
<section class="flex flex-col gap-space-md">
<div>
<span class="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">Blinded Ownership Verification</span>
<h2 class="font-headline-md text-headline-md text-on-surface">Ownership questions are released after verification</h2>
<p class="font-body-md text-body-md text-on-surface-variant">The custody desk asks about details that are not shown in public listings. Answer them in your verified case view, and never share your one-time token with anyone.</p>
</div>
<div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
<div class="lg:col-span-8 flex flex-col gap-space-md bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
<div class="flex items-center gap-space-xs pb-space-xs">
<span class="w-7 h-7 rounded-lg bg-secondary text-on-secondary flex items-center justify-center font-bold text-label-sm">1</span>
<h3 class="font-title-lg text-title-lg text-on-surface">What you may be asked</h3>
</div>
<ul class="list-disc pl-space-lg flex flex-col gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
<li>Distinctive markings, decals, or accessories on the item.</li>
<li>Serial number fragments or a device name you configured.</li>
<li>Proof of purchase or a photo showing the item in your possession.</li>
</ul>
</div>
<div class="lg:col-span-4 flex flex-col gap-space-md">
<div class="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-sm">
<div class="flex items-center gap-space-xs text-secondary">
<span class="material-symbols-outlined text-[20px]">shield</span>
<span class="font-label-lg text-label-lg font-bold">Privacy Protection</span>
</div>
<p class="font-body-sm text-body-sm text-on-surface-variant">Finder contact details and internal custody notes stay withheld during review. The custody desk sees them only when needed to resolve a conflict.</p>
</div>
<div class="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-sm">
<span class="font-title-md text-title-md text-on-surface">Need help with your claim?</span>
<p class="font-body-sm text-body-sm text-on-surface-variant">Contact the custody desk using the details issued with your case reference.</p>
</div>
</div>
</div>
</section>
`,
    'tracking verification section',
  );

  next = replaceSection(
    next,
    '<!-- SECTION D: COMPREHENSIVE CLAIM STATUS & RESOLUTION LIFECYCLE SIMULATOR -->',
    '<!-- SECTION E: PRIVACY PROTOCOL FOOTNOTE -->',
    `<!-- SECTION D: CASE STATUS REFERENCE -->
<section class="flex flex-col gap-space-md">
<div>
<span class="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">Status reference</span>
<h2 class="font-headline-md text-headline-md text-on-surface">How claim statuses are reported</h2>
<p class="font-body-md text-body-md text-on-surface-variant">Your verified case shows its actual status. The custody desk may request more information or escalate a disputed claim before an item is released.</p>
</div>
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
<div class="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-xs"><span class="font-title-md text-title-md text-on-surface block">Under review</span><span class="font-body-sm text-body-sm text-on-surface-variant">The custody desk is checking your answers.</span></div>
<div class="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-xs"><span class="font-title-md text-title-md text-on-surface block">More information requested</span><span class="font-body-sm text-body-sm text-on-surface-variant">Additional evidence is needed before a decision.</span></div>
<div class="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-xs"><span class="font-title-md text-title-md text-on-surface block">Disputed claim</span><span class="font-body-sm text-body-sm text-on-surface-variant">Conflicting claims are escalated for review.</span></div>
<div class="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-xs"><span class="font-title-md text-title-md text-on-surface block">Approved for pickup</span><span class="font-body-sm text-body-sm text-on-surface-variant">The custody desk issues your release details.</span></div>
</div>
</section>
`,
    'tracking status reference',
  );

  next = next.replace(
    'All claim audit metadata is cryptographically logged under immutable audit roll WSU-2024-CUSTODY.',
    'Claim activity is recorded in the custody audit log.',
  );
  next = next.replace('Intake System Operational (v4.8.2)', 'Intake System Operational');

  return next;
}

function configureVaultForms(html) {
  let next = html.replace(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi, (_full, attributes, inner) => {
    const decodedInner = inner.replace(/&amp;/g, '&');
    const isInline = decodedInner.includes('Commit Handover Record');
    const isModal = decodedInner.includes('Sign & Commit');
    if (!isInline && !isModal) return `<form${attributes}>${inner}</form>`;

    let formInner = `${addHiddenFields([['formKind', isInline ? 'inline' : 'modal']])}\n${inner}`;
    formInner = addNamesByOrder(
      formInner,
      'input',
      isInline ? ['transferringOfficer', 'sealBarcode', 'reason'] : ['transferringOfficer', 'reason'],
    );
    formInner = addNamesByOrder(
      formInner,
      'select',
      isInline ? ['receivingOfficer', 'targetLocation'] : ['receivingOfficer', 'assetTag'],
    );
    formInner = markSubmitButton(formInner, isInline ? 'Commit Handover Record' : 'Sign & Commit');

    return `<form action="/api/custody/handover" method="post"${cleanFormAttributes(attributes)}>${formInner}</form>`;
  });

  return next;
}

function wrapMainInReportForm(html, reportType, submitText, slug) {
  let next = html;
  const hidden = addHiddenFields([
    ['reportType', reportType],
    ['returnTo', hrefForSlug(slug)],
  ]);

  next = next.replace(
    /<main\b/i,
    (tag) => `<form action="/api/reports" method="post" enctype="multipart/form-data">\n${hidden}\n${tag}`,
  );
  next = next.replace(/<\/main>/i, '</main>\n</form>');

  return normalizeButtons(next, submitText);
}

function wireLostUploads(html) {
  let next = replaceSection(
    html,
    '<!-- Drop Area -->',
    '<!-- Image Thumbnails Grid & File Management -->',
    `<!-- Drop Area -->
<div class="bg-canvas hover:bg-surface-container transition-colors rounded-xl p-space-xl flex flex-col items-center justify-center text-center cursor-pointer group shadow-inner relative">
<div class="w-14 h-14 rounded-full bg-surface-container-highest group-hover:bg-primary group-hover:text-on-primary text-primary transition-all flex items-center justify-center mb-space-sm shadow-sm">
<span class="material-symbols-outlined text-[28px]">cloud_upload</span>
</div>
<p class="font-title-md text-title-md text-on-surface mb-0.5">
Drag and drop product photos here, or <span class="text-secondary font-bold underline underline-offset-2">browse files</span>
</p>
<p class="font-body-sm text-body-sm text-outline max-w-md">
Upload actual photos showing serial labels, distinctive scratches, stickers, custom cases, or exact color gradients. JPG, PNG, WebP, GIF, HEIC, or HEIF up to 10MB each.
</p>
${fileInput('Upload lost item photos')}
</div>
`,
    'lost upload dropzone',
  );

  next = replaceSection(
    next,
    '<!-- Image Thumbnails Grid & File Management -->',
    '<!-- Integrated Summary of Captured Steps 1, 2, 3 (Collapsible & Editable Accordions) -->',
    `<div class="font-body-sm text-body-sm text-on-surface-variant">No images selected. Choose photos when you submit this report.</div>\n`,
    'lost upload mockups',
  );

  return next;
}

function wireFoundUploads(html) {
  let next = replaceSection(
    html,
    '<!-- Drag and Drop Box -->',
    '<!-- Uploaded Image List Mockup with Visibility Controls -->',
    `<!-- Drag and Drop Box -->
<div class="p-space-lg rounded-2xl bg-surface-container-low text-center space-y-space-sm hover:bg-canvas transition-colors cursor-pointer relative">
<div class="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto text-secondary">
<span class="material-symbols-outlined text-[32px]">add_a_photo</span>
</div>
<div class="space-y-1">
<div class="font-title-md text-title-md text-primary">Drag custody photographs here, or <span class="text-secondary underline">browse files</span></div>
<div class="font-body-sm text-label-sm text-on-surface-variant">JPG, PNG, WebP, GIF, HEIC, or HEIF up to 10MB each</div>
</div>
${fileInput('Upload found item photos')}
</div>
`,
    'found upload dropzone',
  );

  next = replaceSection(
    next,
    '<!-- Uploaded Image List Mockup with Visibility Controls -->',
    '<!-- Step 6 Preview: Finder Information & Discretion -->',
    `<div class="font-body-sm text-label-sm text-on-surface-variant">No images selected. Choose custody photographs when you submit this report.</div>\n`,
    'found upload mockups',
  );

  return next;
}

function configureLostForm(html, slug) {
  let next = wrapMainInReportForm(html, 'LOST', 'Proceed to Step 5', slug);
  next = wireLostUploads(next);

  const replacements = [
    ['<span class="font-title-md text-body-md text-on-surface mt-0.5 block">Electronics • Apple</span>', `<input aria-label="Category and make" class="mt-0.5 block w-full bg-transparent font-title-md text-body-md text-on-surface placeholder:text-outline focus:outline-none" name="category" placeholder="Category and make" required />`],
    ['<span class="font-body-sm text-body-sm text-on-surface-variant">AirPods Pro (2nd Gen)</span>', `<input aria-label="Model" class="w-full bg-transparent font-body-sm text-body-sm text-on-surface-variant placeholder:text-outline focus:outline-none" name="model" placeholder="Model" />`],
    ['<span class="font-title-md text-body-md text-on-surface mt-0.5 block">A2931 / USB-C Case</span>', `<input aria-label="Color and palette" class="mt-0.5 block w-full bg-transparent font-title-md text-body-md text-on-surface placeholder:text-outline focus:outline-none" name="colour" placeholder="Color and palette" />`],
    ['<span class="font-body-sm text-body-sm text-on-surface-variant">Gloss White / No Accent</span>', `<textarea aria-label="Item description" class="w-full bg-transparent font-body-sm text-body-sm text-on-surface-variant placeholder:text-outline focus:outline-none" name="description" placeholder="Describe the item in detail" rows="2" required></textarea>`],
    ['<span class="font-title-md text-body-md text-on-surface mt-0.5 block">Engraving: "AR-24"</span>', `<input aria-label="Unique markings" class="mt-0.5 block w-full bg-transparent font-title-md text-body-md text-on-surface placeholder:text-outline focus:outline-none" name="distinguishingMark" placeholder="Unique markings" />`],
    ['<span class="font-body-sm text-body-sm text-on-surface-variant">Minor scuff on lid seam</span>', `<input aria-label="Condition notes" class="w-full bg-transparent font-body-sm text-body-sm text-on-surface-variant placeholder:text-outline focus:outline-none" name="custodyNotes" placeholder="Condition notes" />`],
    ['<code class="font-label-md text-label-md bg-ash px-2 py-0.5 rounded text-on-surface">H83K••••••••90L2</code>', `<code class="font-label-md text-label-md bg-ash px-2 py-0.5 rounded text-on-surface">Assigned on submission</code>`],
    ['<span class="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-container text-on-surface font-label-sm text-[10px]">SHA-256 SALT</span>', `<span class="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-container text-on-surface font-label-sm text-[10px]">PRIVACY SHIELD</span>`],
    ['<span class="font-title-md text-body-md text-on-surface">Thursday, Oct 24, 2024</span>', `<input aria-label="Date lost" class="w-full bg-transparent font-title-md text-body-md text-on-surface placeholder:text-outline focus:outline-none" name="incidentDate" type="date" />`],
    ['<span class="font-body-sm text-body-sm text-on-surface-variant">2:15 PM – 3:30 PM (EDT)</span>', `<input aria-label="Estimated time window" class="w-full bg-transparent font-body-sm text-body-sm text-on-surface-variant placeholder:text-outline focus:outline-none" name="incidentWindow" placeholder="Estimated time window" />`],
    ['<span class="font-title-md text-body-md text-on-surface">Du Bois Central Library</span>', `<input aria-label="Location" class="w-full bg-transparent font-title-md text-body-md text-on-surface placeholder:text-outline focus:outline-none" name="location" placeholder="Campus location" required />`],
    ['<span class="font-body-sm text-body-sm text-on-surface-variant">4th Floor Quiet Stacks, Carrel #412</span>', `<input aria-label="Floor or landmark" class="w-full bg-transparent font-body-sm text-body-sm text-on-surface-variant placeholder:text-outline focus:outline-none" name="campusFloor" placeholder="Floor, room, or landmark" />`],
    ['Pre-filled via SSO', 'Entered by reporter'],
    ['<input class="w-full bg-cloud px-space-md py-space-xs rounded-lg font-body-md text-body-md text-on-surface cursor-not-allowed" readonly="" type="text" value="Alex M. Rivers"/>', `<input class="${fieldClass()}" name="reporterName" placeholder="Full name" required type="text" />`],
    ['<span class="font-body-sm text-body-sm text-outline">Locked by University Single Sign-On profile</span>', '<span class="font-body-sm text-body-sm text-outline">Used for custody verification only</span>'],
    ['<input class="w-full bg-cloud px-space-md py-space-xs rounded-lg font-body-md text-body-md text-on-surface cursor-not-allowed" readonly="" type="text" value="arivers9281"/>', `<input class="${fieldClass()}" name="reporterNetId" placeholder="Your NetID" required type="text" />`],
    ['<span class="font-body-sm text-body-sm text-outline">Associated with Faculty/Student Roll</span>', '<span class="font-body-sm text-body-sm text-outline">Used only for custody verification</span>'],
    ['<input class="w-full bg-canvas px-space-md py-space-xs rounded-lg font-body-md text-body-md text-on-surface shadow-inner focus:outline-none focus:bg-surface-container-lowest" type="email" value="alex.rivers@westfield.edu"/>', `<input class="${fieldClass()}" name="contactEmail" placeholder="Institutional email" required type="email" />`],
    ['<input class="w-full bg-canvas px-space-md py-space-xs rounded-lg font-body-md text-body-md text-on-surface shadow-inner focus:outline-none focus:bg-surface-container-lowest" placeholder="+1 (413) 555-0198" type="tel"/>', `<input class="${fieldClass()}" name="contactPhone" placeholder="Phone number (optional)" type="tel" />`],
    ['3 similar items logged at Campus Center &amp; Library desk today', 'Similar items appear after moderation'],
    ['<span class="text-on-surface font-medium truncate">AirPods Pro Case (White)</span>', '<span class="text-on-surface font-medium truncate">New lost item</span>'],
    ['<span class="text-on-surface font-medium truncate">MagSafe USB-C Pod</span>', '<span class="text-on-surface font-medium truncate">Another lost item</span>'],
    ['<span class="font-label-sm text-label-sm text-mint bg-surface-container px-1.5 py-0.5 rounded">Circ Desk #2</span>', '<span class="font-label-sm text-label-sm text-mint bg-surface-container px-1.5 py-0.5 rounded">Custody desk</span>'],
    ['<span class="font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">Holden Center</span>', '<span class="font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">Campus desk</span>'],
  ];

  for (const [from, to] of replacements) next = replaceRequired(next, from, to, `lost field ${from}`);

  return next;
}

function configureFoundForm(html, slug) {
  let next = wrapMainInReportForm(html, 'FOUND', 'Next: Photo Evidence', slug);
  next = wireFoundUploads(next);

  next = replaceRequired(
    next,
    '<!-- Main Workspace Layout: Form Area (8 cols) + Custody Governance Sidebar (4 cols) -->',
    `${reportDetailsCard(
      [
        { name: 'category', label: 'Item category', placeholder: 'e.g. Electronics' },
        { name: 'reporterNetId', label: 'Finder NetID or staff ID', placeholder: 'Your NetID' },
        { name: 'description', label: 'Item description', placeholder: 'Describe the discovered item', wide: true, multiline: true },
        { name: 'location', label: 'Where it was found', placeholder: 'Campus location', wide: true },
        { name: 'reporterName', label: 'Finder name', placeholder: 'Full name (optional)', type: 'text' },
        { name: 'contactEmail', label: 'Contact email', placeholder: 'Institutional email', type: 'email' },
      ],
      'Describe the discovered item',
      'These details create the public custody record. Sensitive identifying marks stay with the custody team.',
    )}
<!-- Main Workspace Layout: Form Area (8 cols) + Custody Governance Sidebar (4 cols) -->`,
    'found details card',
  );

  const replacements = [
    ['CASE #WF-2024-8842', 'Draft case (not yet assigned)'],
    ['Electronics • Computing', 'Category not entered'],
    ['Silver MacBook Pro 14"', 'Item details not entered'],
    ['Science Atrium Bench', 'Location not entered'],
    ['Physical Locker Assigned', 'Custody method pending'],
    ['Science Atrium Hub #04', 'Assigned after submission'],
    ['Slot #18 (Medium Vault)', 'Assigned after review'],
    ['893-412', 'Issued after approval'],
    ['PIN remains valid for 45 minutes to execute physical door latching.', 'A drop PIN will be issued when custody is approved.'],
    ['<input checked="" class="mt-1 w-5 h-5 text-primary accent-primary" id="radio-smart-locker" name="custody_method" type="radio"/>', `<input class="mt-1 w-5 h-5 text-primary accent-primary" id="radio-smart-locker" name="custody_method" required type="radio" />`],
    ['<select class="w-full bg-transparent font-body-md text-body-md text-primary focus:outline-none">', '<select class="w-full bg-transparent font-body-md text-body-md text-primary focus:outline-none" name="custodyDesk">'],
    ['<input class="w-full bg-transparent font-body-md text-body-md text-primary placeholder:text-outline focus:outline-none" placeholder="e.g. Officer M. Vance #1094" type="text" value="Officer M. Vance (#1094)"/>', `<input class="w-full bg-transparent font-body-md text-body-md text-primary placeholder:text-outline focus:outline-none" name="receivingOfficer" placeholder="Receiving officer ID" type="text" />`],
    ['<textarea class="w-full bg-surface-container-low rounded-xl p-space-sm font-body-md text-body-md text-primary placeholder:text-outline focus:outline-none focus:bg-white transition-colors" placeholder="e.g. Laptop left on low table next to lecture hall 102. Found inside gray neoprene case with charging brick and black wireless mouse." rows="3"></textarea>', `<textarea class="w-full bg-surface-container-low rounded-xl p-space-sm font-body-md text-body-md text-primary placeholder:text-outline focus:outline-none focus:bg-white transition-colors" name="custodyNotes" placeholder="Custody notes" rows="3"></textarea>`],
    ['<input checked="" class="mt-1 w-5 h-5 accent-primary text-primary" id="chain-custody-consent" type="checkbox"/>', `<input class="mt-1 w-5 h-5 accent-primary text-primary" id="chain-custody-consent" name="custodyConsent" required type="checkbox" />`],
    ['<input checked="" class="mt-1 w-4 h-4 accent-primary text-primary" name="finder_pref" type="radio"/>', `<input class="mt-1 w-4 h-4 accent-primary text-primary" name="finder_pref" required type="radio" />`],
    ['Punch in your 6-digit drop code <code class="font-mono bg-cloud px-1 py-0.5 rounded text-primary">893-412</code>. Door #18 will release automatically.', 'A drop code will be issued after custody approval.'],
    ['<div class="font-headline-sm text-headline-sm text-primary">Science Atrium • Locker 04</div>', '<div class="font-headline-sm text-headline-sm text-primary">Locker assignment pending</div>'],
    ['<span class="text-secondary font-title-md">Slot #18 Highlighted</span>', '<span class="text-secondary font-title-md">No slot assigned</span>'],
    ['Located on the Ground Floor, West Wing corridor opposite the Chemistry lecture amphitheater.', 'Locker location appears after assignment.'],
  ];

  for (const [from, to] of replacements) next = replaceRequired(next, from, to, `found field ${from}`);

  return next;
}

function configureMobileForm(html, slug) {
  const hidden = addHiddenFields([
    ['reportType', 'LOST'],
    ['returnTo', hrefForSlug(slug)],
  ]);

  let next = html.replace(/<form\b([^>]*)id="lost-report-form"([^>]*)>/i, (_full, before, after) => {
    return `<form${before} id="lost-report-form"${after} action="/api/reports" method="post" enctype="multipart/form-data">
${hidden}${reportDetailsCard(
      [
        { name: 'category', label: 'Item category', placeholder: 'e.g. Electronics' },
        { name: 'reporterNetId', label: 'Your NetID', placeholder: 'Your NetID' },
        { name: 'description', label: 'Item description', placeholder: 'Describe the lost item', wide: true, multiline: true },
      ],
      'Tell us what you lost',
      'These details are searchable after moderation. Private verification secrets stay hidden from the public feed.',
    )}`;
  });

  next = replaceRequired(
    next,
    '<input class="w-full min-h-[50px] px-space-md pr-10 rounded-xl bg-linen text-primary font-body-md text-body-md placeholder:text-on-surface-variant/60 focus:bg-white focus:outline-none transition-colors" id="room-details" placeholder="e.g. Quiet Study Carrel #42 or Cafe Counter" type="text"/>',
    `<input class="w-full min-h-[50px] px-space-md pr-10 rounded-xl bg-linen text-primary font-body-md text-body-md placeholder:text-on-surface-variant/60 focus:bg-white focus:outline-none transition-colors" id="room-details" name="location" placeholder="Room, desk, or landmark" required type="text" />`,
    'mobile location field',
  );
  next = replaceRequired(
    next,
    '<input class="w-full min-h-[48px] px-space-md rounded-xl bg-linen text-primary font-body-md text-body-md placeholder:text-on-surface-variant/60 focus:bg-white focus:outline-none" id="lockscreen-wallpaper" placeholder="e.g. Photo of a golden retriever wearing red bandana" type="text"/>',
    `<input class="w-full min-h-[48px] px-space-md rounded-xl bg-linen text-primary font-body-md text-body-md placeholder:text-on-surface-variant/60 focus:bg-white focus:outline-none" id="lockscreen-wallpaper" name="distinguishingMark" placeholder="Wallpaper or decal description" type="text" />`,
    'mobile lock-screen field',
  );
  next = replaceRequired(
    next,
    '<input class="w-full min-h-[48px] px-space-md rounded-xl bg-linen text-primary font-body-md text-body-md placeholder:text-on-surface-variant/60 focus:bg-white focus:outline-none" id="serial-secret" placeholder="e.g. Last 4 digits of IMEI, sticker peeling at corner" type="text"/>',
    `<input class="w-full min-h-[48px] px-space-md rounded-xl bg-linen text-primary font-body-md text-body-md placeholder:text-on-surface-variant/60 focus:bg-white focus:outline-none" id="serial-secret" name="hiddenMark" placeholder="Hidden serial or scratch details" type="text" />`,
    'mobile serial field',
  );

  next = replaceSection(
    next,
    '<!-- Photo Upload Section (Camera + Gallery Carousel) -->',
    '<!-- Dynamic Collapsible: Identifying Secrets & Lock Screen -->',
    `<!-- Photo Upload Section (Camera + Gallery Carousel) -->
<section class="flex flex-col gap-space-sm p-space-md rounded-2xl bg-white shadow-sm">
<div class="flex items-center justify-between">
<div>
<h2 class="font-title-md text-title-md text-primary font-bold">4. Photos &amp; Verification Imagery</h2>
<p class="font-body-sm text-body-sm text-on-surface-variant">Helps match against recent custody intake photos.</p>
</div>
<span class="px-space-xs py-0.5 rounded-full bg-mint text-primary font-label-sm text-label-sm font-bold">Photos optional</span>
</div>
<div class="grid grid-cols-2 gap-space-sm mt-1 relative">
<label class="flex items-center justify-center gap-2 min-h-[52px] rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold active:scale-[0.98] transition-transform shadow-sm">
<span class="material-symbols-outlined text-[20px]">photo_camera</span>
<span>Choose Photos</span>
</label>
<label class="flex items-center justify-center gap-2 min-h-[52px] rounded-xl bg-cloud text-primary font-label-md text-label-md font-bold active:scale-[0.98] transition-transform hover:bg-surface-container">
<span class="material-symbols-outlined text-[20px]">add_photo_alternate</span>
<span>Photo Library</span>
</label>
${fileInput('Upload lost item photos')}
</div>
<p class="font-body-sm text-body-sm text-on-surface-variant">JPG, PNG, WebP, GIF, HEIC, or HEIF up to 10MB each. No photos are selected yet.</p>
</section>
`,
    'mobile photo section',
  );

  next = next.replace(/name="campus-complex"/g, 'name="campusComplex"');
  next = next.replace(
    '<button aria-label="Navigation Menu" class="w-11 h-11 flex items-center justify-center rounded-lg bg-white text-primary hover:bg-cloud active:scale-95 transition-all shadow-[0_1px_4px_rgba(0,0,0,0.03)]">',
    '<button aria-label="Navigation Menu" class="w-11 h-11 flex items-center justify-center rounded-lg bg-white text-primary hover:bg-cloud active:scale-95 transition-all shadow-[0_1px_4px_rgba(0,0,0,0.03)]" type="button" data-action="notice" data-notice="Navigation is available from the CampusFind home screen.">',
  );
  next = next.replace(/<input checked="" (class="peer sr-only" name="campusComplex" type="radio" value="[^"]+")\/>/g, '<input $1 required />');
  next = next.replace(/<input checked="" (class="sr-only" name="when-day" type="radio" value="[^"]+")\/>/g, '<input $1 />');
  next = next.replace(
    '<input checked="" class="w-5 h-5 rounded accent-primary cursor-pointer" type="checkbox"/>',
    '<input class="w-5 h-5 rounded accent-primary cursor-pointer" name="smsOptIn" type="checkbox" />',
  );
  next = next.replace('<span class="font-label-sm text-label-sm opacity-70">Oct 24</span>', '<span class="font-label-sm text-label-sm opacity-70">Current day</span>');
  next = next.replace('<span class="font-label-sm text-label-sm opacity-70">Oct 23</span>', '<span class="font-label-sm text-label-sm opacity-70">Previous day</span>');

  next = replaceRequired(
    next,
    '<button class="flex-1 min-h-[50px] px-space-lg rounded-full bg-primary text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-space-xs shadow-md active:scale-[0.98] transition-all hover:bg-graphite" id="next-step-btn" type="button">',
    '<button class="flex-1 min-h-[50px] px-space-lg rounded-full bg-primary text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-space-xs shadow-md active:scale-[0.98] transition-all hover:bg-graphite" form="lost-report-form" id="next-step-btn" type="submit">',
    'mobile submit button',
  );

  return next;
}

/** The global Constellation layer owns the page background now. */
function transparentPageBackground(classes) {
  return classes
    .replace(/\bbg-(?:canvas|background|surface|stone-50|white)(?![\w-])(?:\/[0-9.]+)?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A canonical opaque <main> would hide the fixed Constellation canvas. */
function exposeBackgroundThroughMain(html) {
  return html.replace(/<main\b([^>]*)>/gi, (_full, attributes) => {
    const classMatch = attributes.match(/\bclass="([^"]*)"/i);
    if (!classMatch) return `<main${attributes}>`;
    const cleaned = transparentPageBackground(classMatch[1]);
    if (cleaned === classMatch[1]) return `<main${attributes}>`;
    return `<main${attributes.replace(classMatch[0], `class="${cleaned}"`)}>`;
  });
}

/** Gives the client-side Originkit wordmark a canonical hero mount point. */
function mountHomeHeroWordmark(html) {
  let next = html.replace(
    /<h1\b([^>]*)>\s*Belongings reunited across campus with institutional care\.\s*<\/h1>/i,
    (_full, attributes) => `<div id="campusfind-hero-wordmark" class="hero-wordmark-mount">
<h1${attributes}>
          Belongings reunited across campus with institutional care.
        </h1>
</div>`,
  );
  if (next === html) throw new Error('Could not mount home hero wordmark');

  next = next.replace(
    '<div class="text-center max-w-4xl mx-auto space-y-6">',
    '<div class="text-center max-w-6xl mx-auto space-y-6">',
  );
  return next;
}

/** Turns the canonical homepage header into a rounded floating nav bar. */
function roundHomeNavigation(html) {
  return replaceRequired(
    html,
    '<header class="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-ash transition-all">',
    '<header class="sticky z-50 bg-white/90 backdrop-blur-md transition-all site-nav-rounded">',
    'home rounded navigation',
  );
}

function prepareBody(html, definition) {
  const bodyTag = html.match(/<body\b([^>]*)>/i)?.[0] ?? '<body>';
  const bodyClass = bodyTag.match(/\bclass="([^"]*)"/i)?.[1] ?? 'bg-canvas text-on-surface';
  let inner = extractBetween(html, bodyTag, '</body>', definition.dir);

  // The prototype relies on CDN Tailwind and demo-only inline handlers. Next.js owns both.
  inner = inner.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  inner = inner.replace(/\son(?:click|submit|change|input|keydown|mouseover)="[^"]*"/gi, '');

  inner = localizeCanonicalImages(inner);
  inner = normalizeImages(inner);
  inner = rewriteAnchors(inner, definition.slug);
  inner = removePrototypeData(inner);

  if (adminShellSlugs.has(definition.slug)) {
    inner = makeAdminShellResponsive(inner);
  }
  if (definition.slug === 'advanced-search') {
    inner = makeAdvancedSearchResponsive(inner);
    inner = addSrOnlyHeading(inner, 'Search approved campus lost and found listings.');
  }
  if (definition.slug === 'overview-dashboard') {
    inner = addSrOnlyHeading(inner, 'Operations overview dashboard.');
  }
  if (definition.slug === 'report-lost') {
    inner = replaceRequired(
      inner,
      /(<h1\b[^>]*>)[\s\S]*?(<\/h1>)/i,
      (_full, open, close) => `${open}Report a Lost Item${close}`,
      'report lost heading',
    );
  }
  if (definition.slug === 'secure-guest-tracking') {
    inner = configureSecureGuestTrackingForm(inner);
  }

  if (definition.slug === 'report-lost') {
    inner = configureLostForm(inner, definition.slug);
  } else if (definition.slug === 'report-found') {
    inner = configureFoundForm(inner, definition.slug);
  } else if (definition.slug === 'mobile-lost-property') {
    inner = configureMobileForm(inner, definition.slug);
  } else {
    inner = normalizeButtons(
      inner,
      definition.slug === 'secure-guest-tracking' ? 'Check case status' : undefined,
    );
    if (definition.slug === 'campus-lost-found') {
      inner = configureEnterpriseForms(inner);
      inner = asQueryLinks(inner, [
        { match: 'AirPods Pro', query: 'AirPods Pro' },
        { match: 'Hydro Flask', query: 'Hydro Flask' },
        { match: 'Student ID Card', query: 'Student ID Card' },
        { match: 'TI-84 Plus', query: 'TI-84 Plus' },
        { match: 'MacBook Air M2', query: 'MacBook Air M2' },
        { match: 'Car Keys with lanyard', query: 'Car Keys with lanyard' },
      ]);
      inner = mountHomeHeroWordmark(inner);
      inner = roundHomeNavigation(inner);
    }
    if (definition.slug === 'advanced-search') inner = configureAdvancedSearchPage(inner);
    if (definition.slug === 'vault-inventory-and-custody') inner = configureVaultForms(inner);
  }

  if (definition.slug === 'advanced-search') {
    inner = inner.replace(/(<div class="[^"]*)\bbg-stone-50\b([^"]*")/, '$1$2');
  }

  inner = pairLabelsAndControls(inner);
  inner = reroutePrototypeLinks(inner, definition.slug);
  inner = wireInertButtons(inner, definition.slug);
  inner = nameUnnamedControls(inner);
  inner = exposeBackgroundThroughMain(inner);
  assertAccessibleHtml(inner, definition.slug);

  return `<div class="${transparentPageBackground(bodyClass)} min-h-screen site-page-root">${inner}</div>`;
}

function extractTitle(html, definition) {
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  if (title) return title.replace(/&amp;/g, '&');

  const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (heading) return stripTags(heading);

  return definition.label;
}

const catalog = [];
const titles = {};
const content = {};
const allHtmlParts = [];
const configs = [];

for (const definition of pages) {
  const html = readHtml(definition.dir);
  const configSource = extractTailwindConfig(html, definition.dir);
  if (configSource) configs.push(parseTailwindConfig(configSource, definition.dir));

  const body = prepareBody(html, definition);
  catalog.push({ slug: definition.slug, label: definition.label, group: definition.group });
  titles[definition.slug] = definition.label;
  content[definition.slug] = body;
  allHtmlParts.push(body);
}

mkdirSync(outputDir, { recursive: true });

writeFileSync(
  join(outputDir, 'design-tokens.css'),
  generateTokenCss(configs, allHtmlParts.join('\n')),
  'utf8',
);

writeFileSync(
  join(outputDir, 'pages.ts'),
  '// Generated by scripts/build-content.mjs from the original Stitch design export.\n' +
    '// Do not edit by hand; run `npm run content:build`.\n\n' +
    'export type PageDefinition = { slug: string; label: string; group: string };\n\n' +
    `export const pageCatalog: PageDefinition[] = ${JSON.stringify(catalog, null, 2)};\n\n` +
    `export const designPathToSlug: Record<string, string> = ${JSON.stringify(designPathToSlug, null, 2)};\n\n` +
    `export const pageTitles: Record<string, string> = ${JSON.stringify(titles, null, 2)};\n\n` +
    `export const pageContent: Record<string, string> = ${JSON.stringify(content, null, 2)};\n`,
  'utf8',
);

console.log(`Generated ${pages.length} canonical pages and design tokens from the Stitch export.`);
