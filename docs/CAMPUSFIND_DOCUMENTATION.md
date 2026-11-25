# CampusFind Complete Documentation

**Version:** 1.0  
**Generated:** 2026-11-25  
**Audience:** students, campus staff, administrators, developers, and operators  
**Repository:** https://github.com/Souravpreetsingh/campusfind  
**Production:** https://campusfind-taupe.vercel.app  
**Local development:** http://localhost:3001

> This is the consolidated CampusFind manual. It replaces the need to piece together the older phase documents. `docs/IMPLEMENTATION_STATUS.md`, `docs/ARCHITECTURE.md`, and `docs/DATABASE_DESIGN.md` remain as historical design records.

---

## 1. Executive overview

CampusFind is a full-stack lost-and-found platform for a multi-college campus environment. It preserves all 15 canonical Stitch screens while replacing prototype behavior with real Next.js routes, PostgreSQL-backed data, authentication, authorization, validation, uploads, search, reporting, tracking, matching, claims, custody, and audit logging.

### 1.1 What the platform does

| Audience | Capabilities |
|---|---|
| Students and visitors | Report lost or found items, attach evidence photos, receive a case reference and one-time tracking token, search approved listings, track a case, and use the conversational report assistant. |
| Campus staff | Review reports, inspect evidence, verify ownership claims, manage custody state, commit handover records, and review candidate matches. |
| Administrators | Access protected operations screens, see tenant-scoped counts, manage college provisioning views, and control role-based access. |
| Operators | Deploy through Vercel, Docker, or Render; validate configuration; run migrations; check readiness; and monitor health. |

### 1.2 Core principles

1. **Canonical design is immutable.** `extracted/stitch_campusfind_platform_design/` is never edited. `npm run content:build` regenerates `src/content/pages.ts` and `src/content/design-tokens.css`.
2. **All 15 screens survive.** Each canonical module is served through a real route with its original shell, navigation, typography, and iconography.
3. **No prototype success states.** The guest tracking screen no longer displays simulated token states, fake confidence scores, invented officer names, or fabricated audit rolls.
4. **Real data flow.** Reports, credentials, claims, matches, custody records, and audit logs are stored in PostgreSQL through Prisma.
5. **Server-side authority.** Authentication, RBAC, validation, CSRF checks, rate limits, and audit logging are enforced in API routes, not only in the UI.
6. **Motion is visible by default.** The Originkit Constellation background and hero Vector Wordmark animate unless the user explicitly selects **Motion off**.

### 1.3 Quick facts

| Item | Value |
|---|---|
| Framework | Next.js 16.4.6, App Router |
| UI | React 19.3.1, TypeScript strict mode, Tailwind CSS 4 |
| Database | PostgreSQL with Prisma 6.19.3 |
| Validation | Zod 4 |
| Authentication | bcryptjs password hashing, `jose` HS256 JWT in httpOnly cookie |
| Uploads | `sharp` with magic-byte validation, EXIF stripping, thumbnails, `UPLOAD_DIR` |
| Animation | three.js / Originkit Constellation and Vector Wordmark |
| Tests | Vitest 5 |
| Local port | 3001 |
| Canonical images | 34 self-hosted files under `public/canonical` |
| Current test baseline | 73 tests passing |

---

## 2. Architecture

### 2.1 Runtime request flow

```text
Browser
  ├── GET /, /advanced-search, /report-lost, ...  ──> Next.js App Router
  │                                                   ├── layout.tsx
  │                                                   │     ├── SiteBackground (z-index 0)
  │                                                   │     ├── site-content (z-index 1)
  │                                                   │     │     ├── generated canonical HTML
  │                                                   │     │     └── CanonicalActions
  │                                                   │     ├── ReportAssistant
  │                                                   │     └── MotionToggle
  │                                                   └── [slug]/page.tsx or app/page.tsx
  │                                                         └── Prisma queries where required
  └── POST /api/... ──> Route handler
                         ├── Zod validation
                         ├── same-origin CSRF check
                         ├── rate limit where applicable
                         ├── session/RBAC check where applicable
                         ├── Prisma transaction
                         ├── audit log with hash chain
                         └── JSON response or safe redirect
```

The Constellation canvas is fixed, pointer-transparent, and rendered behind `.site-content`. Generated page roots and `<main>` elements have opaque full-page background classes removed so the animation is visible through transparent areas without covering text or controls.

### 2.2 Technology stack

| Layer | Technology | Purpose |
|---|---|---|
| Routing/rendering | Next.js App Router, React Server Components | Real routes, metadata, dynamic pages, API handlers |
| Type safety | TypeScript strict mode | Compile-time verification |
| Styling | Tailwind CSS 4, generated CSS variables | Canonical design tokens and responsive utilities |
| Data | PostgreSQL, Prisma Client, migrations | Persistent domain data |
| Validation | Zod | Request schemas for APIs and form submissions |
| Auth | `jose`, `bcryptjs` | Signed session JWT, password verification |
| Security | CSRF origin checks, in-memory rate limits, safe redirects, security headers | Abuse and injection mitigation |
| Files | `sharp`, local `UPLOAD_DIR` | Image normalization, thumbnails, media serving |
| Animation | three.js, Originkit Constellation, Originkit Vector Wordmark | Site-wide background and homepage hero |
| Speech | Web Speech API | Hands-free report assistant with typed fallback |
| Testing | Vitest | Domain, content, security, UI-wiring, and accessibility regression tests |
| Hosting | Vercel primary; Docker and Render provided | Production and portable deployment |

### 2.3 Repository map

| Path | Contents |
|---|---|
| `src/app/` | App Router pages, metadata routes, error/not-found pages, API route handlers |
| `src/app/[slug]/page.tsx` | Renders all 15 canonical pages; handles auth gates, query banners, and search |
| `src/components/` | Client islands: assistant, canonical action delegate, background, hero wordmark, motion toggle, login form |
| `src/lib/` | Auth, RBAC, CSRF, rate limiting, audit, uploads, search, matching, state transitions, navigation, motion, redirects |
| `src/content/` | Generated `pages.ts` and `design-tokens.css`; do not edit manually |
| `extracted/stitch_campusfind_platform_design/` | Canonical Stitch source; read-only source of truth |
| `public/canonical/` | Self-hosted canonical images |
| `scripts/build-content.mjs` | Regenerates content and tokens from canonical `code.html` files |
| `scripts/canonical-assets.json` | Map from original remote image URLs to local asset paths |
| `scripts/` | Environment check, smoke test, asset downloader, documentation PDF builder |
| `prisma/schema.prisma` | Prisma models, enums, relations, and indexes |
| `prisma/migrations/` | Initial migration and migration lock |
| `prisma/seed.mjs` | Categories, colleges, and bootstrap administrator |
| `tests/` | Vitest suites |
| `docs/` | This manual, historical design docs, and implementation status |
| `.github/workflows/ci.yml` | Continuous integration quality gates |
| `Dockerfile`, `render.yaml` | Container and Render deployment definitions |

---

## 3. Canonical design preservation and content generation

### 3.1 Source of truth

The canonical frontend source is `extracted/stitch_campusfind_platform_design/`. The older `frontend/` folder is retained for reference only and is not used to generate app pages. Every canonical module contributes a `code.html` file. `scripts/build-content.mjs` reads those files and writes trusted HTML strings into `src/content/pages.ts`.

Do not hand-edit `src/content/pages.ts` or `src/content/design-tokens.css`. Both files are generated and include do-not-edit banners. After changing a canonical file, run:

```powershell
npm run content:build
```

### 3.2 Page catalog

| # | Source module | Route | Label | Group |
|---:|---|---|---|---|
| 1 | `campusfind_enterprise_college_lost_found` | `/` (also `/campus-lost-found`) | Campus Lost & Found | Public |
| 2 | `campusfind_advanced_search_listings_discovery` | `/advanced-search` | Search Listings | Public |
| 3 | `campusfind_lost_item_reporting_workflow_desktop` | `/report-lost` | Report a Lost Item | Public |
| 4 | `campusfind_found_item_intake_custody_workflow_desktop` | `/report-found` | Report Found Item | Public |
| 5 | `campusfind_mobile_lost_property_intake` | `/mobile-lost-property` | Mobile Intake | Public |
| 6 | `campusfind_submission_confirmation_custody_credentials` | `/submission-confirmation` | Custody Credential | Public |
| 7 | `campusfind_secure_guest_tracking_blinded_ownership_resolution` | `/secure-guest-tracking` | Track & Verify Claim | Public |
| 8 | `campusfind_intelligent_match_comparison_vector_decomposition` | `/intelligent-match` | Match Comparison | Public |
| 9 | `campusfind_admin_executive_operations_dashboard` | `/overview-dashboard` | Operations Overview | Admin |
| 10 | `campusfind_admin_report_moderation_inspection_workspace` | `/report-moderation` | Report Moderation | Admin |
| 11 | `campusfind_admin_claims_evidence_verification_console` | `/claims-and-verification` | Claims & Verification | Admin |
| 12 | `campusfind_admin_vault_inventory_custody_registry` | `/vault-inventory-and-custody` | Vault & Custody | Admin |
| 13 | `campusfind_intelligent_matching_queue_review_dashboard` | `/intelligent-matching` | Matching Queue | Admin |
| 14 | `campusfind_super_admin_multi_tenant_platform_overview` | `/platform-overview` | Platform Overview | Platform |
| 15 | `campusfind_super_admin_college_registry_provisioning` | `/college-registry-provisioning` | College Registry | Platform |

There are 8 public, 5 admin, and 2 platform screens. Admin and platform screens require a `MODERATOR`, `COLLEGE_ADMIN`, or `SUPER_ADMIN` session; unauthenticated visitors are redirected to `/login?next=/<slug>`.

### 3.3 Generator pipeline

`npm run content:build` performs these steps for each canonical `code.html`:

1. Reads the full `<body>` and body classes.
2. Removes every `<script>` block and inline `onclick`, `onsubmit`, `onchange`, `oninput`, `onkeydown`, and `onmouseover` handler. Next.js owns behavior.
3. Replaces remote canonical image URLs with self-hosted `/canonical/...` paths using `scripts/canonical-assets.json`.
4. Adds accessibility metadata to images: `alt`, `loading="lazy"`, and `decoding="async"`.
5. Rewrites prototype anchors using `data-path`, visible link text, and explicit route maps. Bare `#` links become `/`.
6. Removes invented prototype data such as fake log counts, health percentages, tenancy counts, docket numbers, locker PINs, and fabricated confidence values.
7. Applies responsive fixes to admin sidebars and advanced-search padding.
8. Wires real forms and controls for slug-specific workflows:
   - `secure-guest-tracking` → real `POST /api/guest/track` form and neutral verification copy.
   - `report-lost`, `report-found`, `mobile-lost-property` → real multipart `POST /api/reports` forms.
   - `campus-lost-found` → homepage search, tracking form, frequent-search links, hero wordmark mount, and rounded navigation.
   - `advanced-search` → real `GET /advanced-search` filters and server-rendered result markers.
   - `vault-inventory-and-custody` → real `POST /api/custody/handover` forms.
9. Adds labels and names to controls, converts inert buttons into real `data-action` buttons, and strips opaque full-page `<main>` backgrounds.
10. Fails the build if any unmapped remote image, image without accessibility attributes, inert button, or unnamed control remains.

Token CSS is generated by parsing each canonical inline `tailwind.config`, flattening `colors`, `spacing`, `borderRadius`, `fontFamily`, and `fontSize`, and emitting Tailwind 4 CSS variables and only the spacing utilities actually used by the pages.

### 3.4 Generated exports

`src/content/pages.ts` exports:

```ts
export type PageDefinition = { slug: string; label: string; group: string };
export const pageCatalog: PageDefinition[];
export const designPathToSlug: Record<string, string>;
export const pageTitles: Record<string, string>;
export const pageContent: Record<string, string>;
```

`pageContent` contains trusted, locally generated HTML strings rendered with `dangerouslySetInnerHTML`. There is no runtime sanitizer because the content is produced by the build script, not by users.

### 3.5 Canonical assets and fonts

- 34 original Google-hosted screen images are self-hosted under `public/canonical`.
- `scripts/canonical-assets.json` maps original URLs to local paths.
- `npm run assets:download` extracts URLs from generated `pages.ts`, downloads them, hashes each URL for a stable filename, and rewrites the asset map. If new images are introduced, run `content:build`, then `assets:download`, then `content:build` again.
- Inter, Merriweather, Be Vietnam Pro, and Material Symbols Outlined are bundled through `@fontsource`. No external asset CDN is required at runtime.

---

## 4. Routes and user workflows

### 4.1 Application routes

| Route | Purpose | Access |
|---|---|---|
| `/` | Canonical homepage with hero wordmark and global search | Public |
| `/campus-lost-found` | Same canonical homepage content by slug | Public |
| `/advanced-search` | Database-backed listing search and filters | Public |
| `/report-lost` | Lost item report form | Public |
| `/report-found` | Found item intake and custody form | Public |
| `/mobile-lost-property` | Mobile lost property intake | Public |
| `/submission-confirmation` | Displays the one-time tracking credentials from the tracking cookie | Public |
| `/secure-guest-tracking` | Real credential verification form; no simulated states | Public |
| `/intelligent-match` | Canonical match comparison explanation | Public |
| `/overview-dashboard` | Operations overview | Staff/admin |
| `/report-moderation` | Report moderation workspace | Staff/admin |
| `/claims-and-verification` | Claims evidence console | Staff/admin |
| `/vault-inventory-and-custody` | Custody registry and handover forms | Staff/admin |
| `/intelligent-matching` | Matching queue | Staff/admin |
| `/platform-overview` | Multi-tenant platform overview | Staff/admin |
| `/college-registry-provisioning` | College registry view | Staff/admin |
| `/login` | Staff sign in | Public |
| `/admin` | Server-protected console | Staff/admin |
| `/api/*` | JSON/form APIs | Mixed; see section 8 |
| `/sitemap.xml`, `/robots.txt`, `/icon.svg` | Metadata and branding assets | Public |

Unknown canonical slugs return the Next.js not-found page. Admin slugs are protected in `src/app/[slug]/page.tsx`; `/admin` has an additional server-side check and renders an access-denied state for disallowed roles.

### 4.2 Homepage and discovery

The homepage preserves the canonical hero and converts the original search card into a real `GET /advanced-search` form. Supported parameters:

| Parameter | Meaning | Example |
|---|---|---|
| `q` | Keyword across brand, model, colour, category, description, and campus location | `?q=Sony` |
| `type` or `status` | `lost`, `found`, or `all` | `?type=FOUND` |
| `zone` | Campus zone filter | `?zone=library` |
| `sort` | `newest`, `oldest`, or relevance | `?sort=newest` |
| `category` | Exact category name, case-insensitive | `?category=Electronics` |
| `take` | API result count, 1–100, default 20 | `?take=50` |

The advanced-search page queries approved and claimed reports, then renders results into marker sections in the canonical markup. If the database is unavailable, it logs `search.database_failed`, shows a polite outage banner, and renders an empty result state instead of throwing a generic error.

### 4.3 Reporting workflows

All three reporting screens submit multipart forms to `POST /api/reports`. Required fields are `reportType`, `category`, `description`, `location`, and `reporterNetId`. Optional fields capture model, colour, distinguishing marks, hidden verification marks, campus complex/floor, incident date/window, contact details, and custody notes.

The prototype step labels have been replaced with honest submit labels: **Submit Lost Item Report** or **Submit Found Item Report**. Clicking one submits the whole form; there is no separate privacy step. If a required field is empty or invalid, the browser highlights it and an accessible toast explains that all required fields must be completed.

`src/components/report-form-feedback.tsx` is mounted globally and makes uploads visible. Selecting or dropping images updates the status area under the upload box with the file count, names, and sizes; the dropzone gains a focus ring. Unsupported file types, files over 10MB, and selections beyond five images are skipped with a toast. **Clear All Uploads** now clears the real file input. Drag and drop is supported in browsers that expose `DataTransfer`; the browse-files control works everywhere. The server still performs authoritative magic-byte, dimension, and size validation on submission.

On success:

1. A `Report` is created with status `PENDING`.
2. A case reference in the form `CF-YYYY-NNNN[-A]` is generated.
3. Up to five images are validated, re-encoded, stripped of EXIF metadata, stored under `UPLOAD_DIR`, and linked to the report.
4. An 18-byte random tracking token is hashed with bcrypt and stored as a `TrackCredential` with a 30-day expiry.
5. The clear token is returned once in JSON and written to a short-lived tracking cookie for the confirmation screen.
6. Form submissions redirect to a safe return page with `?submitted=1`.

Uploaded image formats are JPEG, PNG, WebP, GIF, HEIC, and HEIF. The server enforces a maximum of 5 images, 10MB per image, and dimensions between 200 and 4000 pixels on each axis.

### 4.4 Submission confirmation and guest tracking

`/submission-confirmation` reads the tracking cookie and, when present, displays the case reference and one-time token in an `aria-live` banner with a warning to store them securely. The token is not shown again.

`/secure-guest-tracking` contains a real form:

```html
<form action="/api/guest/track" method="post">
  <input name="reference" ...>
  <input name="secretToken" ...>
  <button type="submit">Check case status</button>
</form>
```

The screen deliberately displays neutral copy such as **Awaiting verification** and **Your case details appear after verification**. The following states have been removed and are rejected by regression tests:

- `Valid Token` / `Simulate Invalid Token`
- `AUTHENTICATION SUCCESSFUL` / `AUTHENTICATION FAILED`
- `PORT-443 TLS 1.3`, `SHA-256 Validated`, `0 Failures (Nominal)`
- `Ready for Challenge`, `Tier-4 Encrypted`, `Session expires in 43m 12s`
- fabricated case data such as `Sony WH-1000XM5`, `Officer M. Vance (#1094)`, `96.2%`, `749-218`, `CR-9941`, `DA-441`, and `WSU-2024-CUSTODY`

Invalid submissions redirect to `/secure-guest-tracking?error=invalid`; valid submissions redirect to `?tracked=1`. JSON clients receive `200` with the public case data or `401` with a generic credential error.

### 4.5 Conversational report assistant

The floating assistant is mounted globally by `src/app/layout.tsx`. Its launcher is fixed at the lower-left of the viewport. The dialog is accessible: it has `role="dialog"`, `aria-modal`, a labelled heading, focus management, Escape-to-close, and a live region for the newest message.

Conversation steps:

| Step | Behavior |
|---|---|
| `type` | Detects lost intent (`lost`, `misplaced`, `missing`, `cannot find`) or found intent (`found`, `picked up`, `discovered`, `turned in`). |
| `item` | Collects the item name and summarizes a category, capped at 80 characters. |
| `location` | Collects the campus location, capped at 200 characters. |
| `identifier` | Collects distinguishing marks; `skip`, `no`, `none`, or `n/a` clears the mark. |
| `identity` | Requires a NetID; optionally parses name and email. |
| `photo` | Accepts an image or `skip`; submitting files the report through `POST /api/reports` with `Accept: application/json`. |
| `complete` | Shows the case reference and one-time token when available, then offers restart. |

Voice mode uses `SpeechRecognition` or `webkitSpeechRecognition` with interim results and `speechSynthesis`. Speech is muted by default; enabling sound speaks replies and reopens the microphone for hands-free conversation. Browsers without speech support can type every answer.

Restart is available at any point with `restart`, `start over`, or `new report`.

### 4.6 Background, hero animation, and motion control

- `SiteBackground` renders the configured Originkit Constellation with 16 logical nodes, orange/grey palette, pointer hover effects, drift, parallax, and shader-based links.
- The canvas lives in a fixed `aria-hidden` layer at `z-index: 0` with `pointer-events: none`. Page content is `z-index: 1`.
- Generated roots and `<main>` elements no longer carry opaque `bg-canvas`, `bg-surface`, `bg-white`, or `bg-stone-50` classes that would hide the canvas.
- The homepage hero tagline is mounted in `#campusfind-hero-wordmark` and rendered as three animated Vector Wordmark lines. A visible canonical `<h1>` remains until all three WebGL lines are ready; if WebGL fails, the fallback remains visible.
- Motion is **on by default**. `src/lib/motion.ts` stores an explicit `campusfind:motion` preference. The fixed **Motion on / Motion off** control toggles it and reloads the page so both WebGL islands re-evaluate.
- The OS `prefers-reduced-motion` media query still disables CSS transitions, but it no longer suppresses the WebGL animations by itself.

### 4.7 Canonical button actions

A global click delegate in `src/components/canonical-actions.tsx` interprets generated `data-action` attributes:

| Action | Behavior |
|---|---|
| `navigate` | Navigates to `data-target`. |
| `call` | Opens `tel:` link from `data-phone`. |
| `submit` | Calls `form.requestSubmit()` for the associated form. |
| `clear-uploads` | Clears the report's file input and dispatches a `change` event so the upload status resets. |
| `copy` | Copies text from `data-copy-source` or button text and shows a live status toast. |
| `toggle` | Toggles `hidden`/`aria-hidden` on `data-target` and updates `aria-expanded`. |
| `tab` | Selects a peer group, toggles targets, and manages `aria-selected`. |
| `radio` / `pill` | Updates `aria-checked`/`aria-pressed` and `data-selected`, then shows a notice. |
| `notice` | Shows a fixed `role="status"` toast with `data-notice` text. |

---

## 5. Data model and domain lifecycle

### 5.1 Enums

| Enum | Values |
|---|---|
| `Role` | `SUPER_ADMIN`, `COLLEGE_ADMIN`, `MODERATOR`, `READ_ONLY_AUDITOR` |
| `ReportType` | `LOST`, `FOUND` |
| `ReportStatus` | `PENDING`, `APPROVED`, `CLAIMED`, `ARCHIVED` |
| `ClaimStatus` | `SUBMITTED`, `UNDER_REVIEW`, `ADDITIONAL_INFO`, `APPROVED`, `REJECTED`, `DISPUTED` |
| `CustodyState` | `WITH_FINDER`, `SUBMITTED`, `STORED`, `READY`, `RETURNED` |
| `MatchStatus` | `CANDIDATE`, `APPROVED`, `DISMISSED`, `CLAIMED` |
| `CollegeStatus` | `ACTIVE`, `PENDING`, `SUSPENDED` |
| `NotificationStatus` | `PENDING`, `SENT`, `FAILED` |

### 5.2 Models

| Model | Purpose and key fields |
|---|---|
| `User` | Staff account: unique `email`, `passwordHash`, optional `name`, `role`, `collegeId`, timestamps; relations to sessions, reports, uploads, claims, custody, and audit logs. |
| `AdminSession` | Server-side session row: `userId`, `expiresAt`, `ipAddress`, `userAgent`; the JWT `jti` is the session id. |
| `College` | Tenant: unique `name` and `code`, `status`, users, and reports. |
| `Category` | Unique category name used by report forms and search. |
| `Report` | Core case: unique `caseReference`, `type`, `status`, category, brand/model/colour, public `description`, private `verificationDetails`, incident dates, campus location, finder/reporter metadata, timestamps, and indexes on type/status/date, category, and college. |
| `ReportImage` | Uploaded evidence: `objectKey`, `contentType`, `sizeBytes`, uploader, timestamp, cascade delete with report. |
| `TrackCredential` | Guest access: hashed `secretToken`, `attempts`, `lastAttemptAt`, `expiresAt`; cascade delete with report. |
| `Match` | Candidate lost/found pair: `score`, `status`, `reasons[]`, unique `(lostReportId, foundReportId)`. |
| `Claim` | Ownership claim: claimant details, `ownershipExplanation`, JSON `verificationAnswers`, `status`, resolution metadata, and reason. |
| `CustodyRecord` | Custody movement: `state`, optional `location`, `heldBy`, `receivedAt`, `releasedAt`. |
| `AuditLog` | Tamper-evident event record: actor, claim, action, entity type/id, JSON metadata, `hash`, `previousHash`, timestamp. |
| `Notification` | Delivery foundation: recipient, subject, body, `status`, `sentAt`. |

### 5.3 State transitions

| Entity | Allowed transitions |
|---|---|
| Report | `PENDING → APPROVED|ARCHIVED`; `APPROVED → CLAIMED|ARCHIVED`; `CLAIMED` and `ARCHIVED` are terminal. |
| Claim | `SUBMITTED → UNDER_REVIEW|ADDITIONAL_INFO|REJECTED`; `UNDER_REVIEW → ADDITIONAL_INFO|APPROVED|REJECTED|DISPUTED`; `ADDITIONAL_INFO|DISPUTED → UNDER_REVIEW|APPROVED|REJECTED`; `APPROVED` and `REJECTED` are terminal. |
| Custody | `WITH_FINDER → SUBMITTED → STORED → READY → RETURNED`; `RETURNED` is terminal and requires an approved claim. |
| Match | `CANDIDATE → APPROVED|DISMISSED`; decided matches are immutable. |

### 5.4 Audit chain

Every audited write runs inside a Prisma transaction and calls `writeAuditLog()`. The hash is SHA-256 over canonical JSON containing `actorId`, `action`, `entityType`, `entityId`, folded state metadata, `previousHash`, and ISO `createdAt`. `previousHash` is taken from the newest prior entry by `createdAt desc, id desc`. This creates a tamper-evident chain for report, claim, match, custody, login/logout, and tracking events.

### 5.5 Search behavior

Search reads only `APPROVED` and `CLAIMED` reports. Keyword matching covers brand, model, colour, category name, description, campus building, floor, and landmark. Zone filters map to campus areas such as `quad`, `library`, `science`, `athletic`, `union`, and `engineering`. Results are filtered, sorted, and paginated in application code after a bounded Prisma query (`take: 200` for the page, configurable 1–100 for the API). Public projections exclude private verification details, exact floor, contact details, and uploader identity.

### 5.6 Deterministic matching

`scoreMatch()` compares a lost and a found report:

| Signal | Points |
|---|---:|
| Same category | +40 |
| Same brand | +15 |
| Same colour | +10 |
| Same campus building | +10 |
| Description token Jaccard similarity | up to +25 |
| Incident dates within 7 days | +10 |

Scores are capped at 100. `POST /api/matches` uses a threshold of 50 to create `CANDIDATE` matches. Existing matches in `APPROVED`, `DISMISSED`, or `CLAIMED` state are never overwritten.

---

## 6. Authentication, authorization, and security

### 6.1 Session authentication

| Property | Value |
|---|---|
| Cookie | `campusfind_session`; `__Host-campusfind_session` in production |
| Token | HS256 JWT signed with `SESSION_SECRET` |
| Claims | `sub`, `email`, `role`, `jti`, issuer `campusfind`, audience `campusfind-web` |
| Server binding | JWT `jti` must match an `AdminSession.id` whose `userId` matches `sub` and whose `expiresAt` is in the future |
| Lifetime | 8 hours (`28,800` seconds) |
| Cookie flags | `httpOnly`, `sameSite: lax`, `path: /`, `secure` in production |
| Password verification | bcrypt cost 12; missing users still run a dummy comparison to reduce timing leakage |
| Login throttling | 5 attempts per IP per 15 minutes |
| Session pruning | Only the newest 3 sessions per user are retained after login |

`SESSION_SECRET` must be at least 32 characters and must not contain known placeholder markers. `scripts/check-env.mjs` validates values without printing them.

### 6.2 Role-based access control

`requireRole([...])` reads the **current database role**, not the role embedded in the JWT. Role membership is exact; higher roles do not automatically inherit lower-role access.

| Role | Typical use |
|---|---|
| `SUPER_ADMIN` | Full staff operations and platform views |
| `COLLEGE_ADMIN` | College-scoped operations |
| `MODERATOR` | Report moderation, claims, custody, and matching |
| `READ_ONLY_AUDITOR` | Default for new users; no write/admin API access |

Admin pages accept `MODERATOR`, `COLLEGE_ADMIN`, and `SUPER_ADMIN`. `PATCH /api/reports/[id]` is intentionally narrower: only `MODERATOR` and `SUPER_ADMIN`.

### 6.3 CSRF and same-origin checks

Every state-changing API that accepts browser credentials calls `assertSameOrigin()`:

- Rejects `Sec-Fetch-Site: cross-site`.
- Otherwise verifies `Origin` or `Referer` against the request protocol, host, and port.
- Rejects `Origin: null` and URLs containing userinfo.
- Allows non-browser clients that send none of `sec-fetch-site`, `origin`, or `referer`.

CSRF failures return `403 { "error": "Forbidden." }`.

### 6.4 Rate limits

Rate limiting is in-memory per process, keyed by client IP, and stored on `globalThis`. It is not shared between serverless instances.

| Bucket | Limit | Window | Endpoints |
|---|---:|---:|---|
| `login` | 5 | 15 minutes | `POST /api/auth/login` |
| `reports` | 5 | 1 hour | `POST /api/reports` |
| `claims` | 5 | 1 hour | `POST /api/claims` |
| `guest-track` | 3 | 15 minutes | `POST /api/guest/track` |

A throttled request returns `429` with `Retry-After` in seconds.

### 6.5 Upload safety

- Maximum 5 images per report.
- Maximum 10MB per image.
- Dimensions must be between 200 and 4000 pixels on both axes.
- Content type is detected from magic bytes and must match the declared MIME type.
- Accepted formats: JPEG, PNG, WebP, GIF, HEIC, HEIF. HEIC/HEIF are re-encoded to JPEG.
- EXIF metadata is stripped by rotate and re-encode.
- Files are written to `UPLOAD_DIR` (default `.data/uploads`) with generated UUID-based keys.
- Thumbnails are generated as WebP at width 300 without enlargement.
- Media keys are validated by regex and resolved under the upload base directory, blocking path traversal.
- `GET /api/media/[key]` serves bytes with `Cache-Control: private, no-store` and `nosniff`.

### 6.6 Safe redirects

`isSafeReturnPath()` allows only exact pathnames:

```text
/, /admin, /login, and /<canonical-slug> for all 15 canonical screens
```

Absolute URLs must use `http(s)`, contain no userinfo, and have the same origin as `NEXT_PUBLIC_APP_URL`, `APP_URL`, or `SITE_URL`. Protocol-relative URLs, backslashes, control characters, overlong values, and percent-encoding tricks are rejected.

### 6.7 Security headers

Applied to all paths in `next.config.mjs`:

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` | `DENY` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| Content-Security-Policy | `default-src 'self'`; self-hosted scripts/styles/images/fonts; `object-src 'none'`; `form-action 'self'`; `frame-ancestors 'none'` |

`poweredByHeader` is disabled. Development CSP additionally allows `'unsafe-eval'` for the framework toolchain.

### 6.8 Error mapping

| Error | HTTP response |
|---|---|
| `AuthenticationError` | 401 |
| `AuthorizationError` | 403 (401 when the message begins with `Authentication`) |
| `CsrfError` | 403 `Forbidden.` |
| `RateLimitError` | 429 with `Retry-After` |
| `NotFoundError` | 404 |
| `ConflictError` | 409 |
| `ZodError` | 400 `Invalid request.`; details are logged, not returned |
| Unknown error | 500 `Internal server error.`; details are logged |

---

## 7. API reference

### 7.1 Endpoint index

| Method and path | Access | Purpose |
|---|---|---|
| `GET /api/health` | Public | Liveness probe |
| `GET /api/ready` | Public | Readiness: secret, database, upload directory |
| `GET /api/media/[key]` | Public | Serve validated uploaded media |
| `POST /api/auth/login` | Public, CSRF, rate limited | Staff sign in |
| `POST /api/auth/logout` | CSRF | End session |
| `GET /api/auth/me` | Public | Current user or `{ user: null }` |
| `GET /api/reports` | Public | Search approved reports |
| `POST /api/reports` | Public, CSRF, rate limited | Create lost/found report with uploads |
| `PATCH /api/reports/[id]` | Moderator/Super Admin, CSRF | Moderate report status |
| `GET /api/claims` | Moderator/College Admin/Super Admin | List tenant-scoped claims |
| `POST /api/claims` | Public, CSRF, rate limited | Submit ownership claim |
| `PATCH /api/claims/[id]` | Moderator/College Admin/Super Admin, CSRF | Resolve or escalate claim |
| `GET /api/custody` | Moderator/College Admin/Super Admin | List custody records |
| `POST /api/custody` | Moderator/College Admin/Super Admin, CSRF | Advance custody state |
| `POST /api/custody/handover` | Moderator/College Admin/Super Admin, CSRF | Commit audited handover record |
| `POST /api/matches` | Moderator/College Admin/Super Admin, CSRF | Evaluate candidate matches |
| `PATCH /api/matches/[id]` | Moderator/College Admin/Super Admin, CSRF | Approve or dismiss match |
| `POST /api/guest/track` | Public, CSRF, rate limited | Verify guest tracking credentials |
| `GET /api/admin/overview` | Moderator/College Admin/Super Admin | Tenant-scoped counts |

### 7.2 Health and readiness

`GET /api/health` returns:

```json
{ "status": "ok", "service": "campusfind", "timestamp": "ISO-8601" }
```

`GET /api/ready` checks, in order:

1. `SESSION_SECRET` is valid.
2. Prisma can execute `SELECT 1`.
3. `UPLOAD_DIR` can be created and a `.ready-<uuid>` file can be written and deleted.

Success:

```json
{ "status": "ready", "checks": { "database": true, "uploads": true, "secrets": true } }
```

Failure returns `503` with `details.reason` equal to `secrets`, `database`, or `uploads`.

### 7.3 Authentication endpoints

#### `POST /api/auth/login`

JSON body:

```json
{ "email": "staff@example.edu", "password": "..." }
```

Validation: valid email, lowercased; password string 1–200 characters. On success, the route creates an `AdminSession`, prunes older sessions, writes a `LOGIN` audit entry, issues the JWT, sets the cookie, and returns:

```json
{ "user": { "id": "...", "email": "...", "name": null, "role": "SUPER_ADMIN" } }
```

Invalid credentials return `401 Invalid email or password.`

#### `POST /api/auth/logout`

Deletes the current `AdminSession`, writes a `LOGOUT` audit entry, clears both cookie names, and returns `{ "ok": true }`.

#### `GET /api/auth/me`

Returns the current user projection (`id`, `email`, `name`, `role`, `collegeId`, `createdAt`) or `{ "user": null }` with `401`.

### 7.4 Reports

#### `GET /api/reports`

Query parameters: `q`, `type`/`status`, `zone`, `sort`, `category`, `take`. Only `APPROVED` reports are returned by the API. Responses use a public allowlist that excludes finder contact details, reporter NetID, hidden verification details, exact campus floor, and uploader identity.

```json
{ "reports": [], "total": 0, "filters": {} }
```

#### `POST /api/reports`

Accepts JSON or multipart/form-data. Core fields:

| Field | Rule |
|---|---|
| `reportType` | `LOST` or `FOUND` |
| `category` | One of Electronics, Documents, Stationery, Accessories, Sports Equipment, Other; `Personal item` maps to `Other` |
| `description` | 10–5000 characters |
| `location` | 2–200 characters |
| `reporterNetId` | 2–50 characters |
| `images` / `image` | Up to 5 files, repeated parts |

Optional fields include `reporterName`, `contactEmail`, `contactPhone`, `model`, `colour`, `distinguishingMark`, `hiddenMark`, `custodyNotes`, `campusComplex`, `campusFloor`, `incidentDate`, `incidentWindow`, and `returnTo`.

JSON success:

```json
{ "report": {}, "caseReference": "CF-2026-1234-L", "trackingToken": "..." }
```

Form success redirects with `303` to a safe page plus `?submitted=1`. Validation failures redirect with `?error=required`; upload failures use `?error=upload`.

#### `PATCH /api/reports/[id]`

JSON body `{ "status": "APPROVED" | "ARCHIVED" | "CLAIMED" }`. Illegal transitions return `409 Invalid report status transition.` The change and previous/new state are audited in one transaction.

### 7.5 Claims

#### `POST /api/claims`

JSON body:

```json
{
  "reportId": "uuid",
  "claimantName": "Full Name",
  "claimantEmail": "name@example.edu",
  "ownershipExplanation": "At least 20 characters describing the item.",
  "verificationAnswers": { "mark": "blue sticker" }
}
```

The report must exist and be `APPROVED`. `verificationAnswers` supports at most 20 keys of at most 100 characters, each value at most 500 characters. Success returns `201 { "claim": {} }`.

#### `GET /api/claims`

Lists tenant-scoped claims newest first, limited to 100. `status` query values are matched against `ClaimStatus`; invalid values are ignored.

#### `PATCH /api/claims/[id]`

JSON body `{ "status": "UNDER_REVIEW", "reason": "..." }`. `REJECTED` requires a non-empty reason. Terminal states set `resolvedById` and `resolvedAt`; non-terminal transitions clear them. All transitions are audited.

### 7.6 Custody

#### `GET /api/custody`

Lists tenant-scoped custody records with report and holder details, newest first, limited to 100.

#### `POST /api/custody`

JSON body `{ "reportId": "uuid", "state": "STORED", "location": "Vault A" }`. State must follow the custody chain. Returning an item requires an `APPROVED` claim and also sets the report to `CLAIMED`. Each record stores `heldById` as the acting user.

#### `POST /api/custody/handover`

Accepts JSON or form data. Fields: `formKind` (`inline` or `modal`), `transferringOfficer`, `receivingOfficer`, `reason`, optional `targetLocation`, `assetTag`, `sealBarcode`, and `reportId`. This endpoint writes a `CUSTODY_HANDOVER_COMMITTED` audit entry; it does not mutate custody state. Form success redirects to `/vault-inventory-and-custody?handover=1`; unauthenticated form posts redirect to `/login?next=/vault-inventory-and-custody`.

### 7.7 Matching

#### `POST /api/matches`

No body. Evaluates all approved lost/found pairs in the caller's tenant scope using `scoreMatch()`. Pairs scoring at least 50 become `CANDIDATE` matches; existing candidates are rescored; decided matches are preserved.

```json
{ "evaluated": 12, "created": 3, "updated": 2, "preserved": 1 }
```

#### `PATCH /api/matches/[id]`

JSON body `{ "action": "APPROVE" | "DISMISS" }`. Only `CANDIDATE` matches can be decided; later attempts return `409 Match has already been decided.`

### 7.8 Guest tracking

`POST /api/guest/track` accepts JSON or form fields:

| Field | Rule |
|---|---|
| `reference` | `CF-YYYY-NNNN` with optional `-A` suffix, case-insensitive |
| `secretToken` | 8–64 characters |

Missing values may be filled from the short-lived tracking cookie. The newest unexpired credential is used. Failures increment an attempt counter with a 15-minute window and a maximum of 5 attempts before lockout; a bcrypt comparison always runs against a real or dummy hash to reduce timing leakage.

Form results:

- Success → `303 /secure-guest-tracking?tracked=1`
- Failure → `303 /secure-guest-tracking?error=invalid`

JSON results:

- Success → `200 { "ok": true, "reference": "...", "status": "...", "report": {} }`
- Failure → `401 Invalid reference or tracking credential.`

Success clears the tracking cookie and writes a `TRACK_SUCCESS` audit entry; failures write `TRACK_FAILURE`.

### 7.9 Admin overview

`GET /api/admin/overview` returns `{ reports, pendingClaims, matches, colleges }`. Users with `collegeId` see only their college plus unassigned records; users without `collegeId` see all tenants. `pendingClaims` counts `SUBMITTED` claims.

---

## 8. Local setup and configuration

### 8.1 Requirements

| Requirement | Version |
|---|---|
| Node.js | `>=20.9.0 <27`; Node 22 recommended |
| npm | Bundled with Node |
| PostgreSQL | 15+ recommended |
| Chrome or Edge | Only needed to regenerate the PDF from Markdown |

### 8.2 First-time setup

```powershell
npm ci
Copy-Item .env.example .env
npm run check:env
npm run prisma:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3001. The development and production scripts both use port 3001.

Generate a strong session secret with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Never commit `.env`; it is git-ignored. `npm run check:env` prints variable names and problems only, never values.

### 8.3 Environment variables

| Variable | Required | Default / example | Notes |
|---|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://postgres:postgres@localhost:5432/campusfind?schema=public` | Prisma PostgreSQL connection string. Must be reachable, not merely well-formed. |
| `SESSION_SECRET` | Yes | Replace with 48 random hex characters | Minimum 32 characters; placeholder values rejected. |
| `NEXT_PUBLIC_APP_URL` | Yes | `http://localhost:3001` | Public origin for links, cookies, and sitemap. Use the deployed origin in production. |
| `SEED_ADMIN_EMAIL` | Yes in production | `admin@campusfind.local` | Bootstrap administrator email. |
| `SEED_ADMIN_PASSWORD` | Yes in production | Strong unique value | Production validation requires at least 16 characters and rejects known weak defaults. |
| `UPLOAD_DIR` | No | `.data/uploads` | Writable, persistent evidence directory. |
| `SEED_DEMO_DATA` | No | `false` | When true, seed creates the demo colleges. |
| `SEED_ADMIN_ROTATE` | No | `false` | When true, reseeding rotates the bootstrap admin password. |

`scripts/check-env.mjs` gives real process environment variables precedence over `.env`, rejects known placeholder markers, and validates the secret length. It does not test database connectivity.

### 8.4 npm scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `next dev -p 3001` | Development server |
| `build` | `check:env` → `content:build` → `prisma generate` → `next build` | Production build |
| `start` | `next start -p 3001` | Production server |
| `typecheck` | `tsc --noEmit` | TypeScript strict check |
| `lint` | `eslint .` | ESLint |
| `test` | `vitest run` | Unit and structural tests |
| `audit` | `npm audit --audit-level=high` | Dependency vulnerability check |
| `check:env` | `node scripts/check-env.mjs` | Environment validation |
| `content:build` | `node scripts/build-content.mjs` | Regenerate pages and tokens |
| `assets:download` | `node scripts/download-canonical-assets.mjs` | Refresh self-hosted canonical images |
| `prisma:generate` | `prisma generate` | Regenerate Prisma Client |
| `prisma:migrate` | `prisma migrate deploy` | Apply committed migrations |
| `prisma:migrate:dev` | `prisma migrate dev` | Create/apply a development migration |
| `prisma:validate` | `prisma validate` | Validate schema |
| `db:seed` | `node --env-file=.env prisma/seed.mjs` | Seed categories, colleges, admin |
| `smoke` | `node scripts/smoke.mjs` | Check health, readiness, and key pages |
| `docs:pdf` | `node scripts/build-docs-pdf.mjs` | Render this manual to HTML and PDF |

### 8.5 Seed data

Always seeded by category name:

```text
Electronics, Documents, Stationery, Accessories, Sports Equipment, Other
```

With `SEED_DEMO_DATA=true`:

| College | Code | Status |
|---|---|---|
| Westfield University | `WR-2024-8841` | `ACTIVE` |
| Eastwood College | `ER-2024-8702` | `PENDING` |
| Northside College | `NR-2024-8690` | `ACTIVE` |

The bootstrap administrator is created with `role: SUPER_ADMIN`, name `CampusFind Administrator`, and a bcrypt cost-12 hash of `SEED_ADMIN_PASSWORD`. The password is changed by reseeding only when `SEED_ADMIN_ROTATE=true`.

### 8.6 Migrations

| Migration | Purpose |
|---|---|
| `20261125000000_init` | Creates schema, enums, tables, constraints, indexes, and foreign keys. |
| `20261126000000_security_hardening` | Adds `User.collegeId`, case references, private verification fields, credential attempt tracking, audit hash columns, tenant-scoped indexes and FKs; backfills legacy rows. |

Apply committed migrations with:

```powershell
npm run prisma:migrate
```

---

## 9. Testing and quality gates

### 9.1 Test suites

| File | Coverage |
|---|---|
| `tests/search.test.ts` | Query parsing, keyword/brand/model/colour/location matching, type/zone filters, sorting, HTML escaping, marker replacement, empty states |
| `tests/matching.test.ts` | High/low match scores and explanation reasons |
| `tests/security.test.ts` | Env validation, dummy hash, readiness secret check, public-report allowlist, rate limits, CSRF, case references, transitions, JWT claims and role strings |
| `tests/report-assistant.test.ts` | Spoken intent extraction, identifier step, photo prompt/skip, field construction, unclear-type retry |
| `tests/hero-wordmark.test.ts` | Wordmark source, WebGL availability, fallback heading, homepage mounts, static frame |
| `tests/frontend-a11y.test.ts` | 15 screens/titles, local image attributes, no prototype values, admin guards, cookie banner, global actions, assistant dialog, motion opt-out, layering |
| `tests/content.test.ts` | Generated pages, forms, uploads, search parameters, background layering, tracking cleanup, labels and headings |
| `tests/assistant-ui.test.ts` | Live speech, spoken replies, microphone controls, typed input, photo upload, modal accessibility, token display |

Most tests are pure-function or source/structural assertions. There is no Playwright browser E2E suite or live database integration suite yet.

### 9.2 Full verification command

```powershell
npm run check:env
npm run prisma:validate
npm run content:build
npm run typecheck
npm run lint
npm test
npm run audit
npm run build
```

Current baseline: typecheck pass, lint pass, **73/73 tests pass**, dependency audit clean, production build pass.

### 9.3 Runtime smoke test

```powershell
npm run smoke
$env:BASE_URL = "https://campusfind-taupe.vercel.app"
npm run smoke
```

The smoke script expects HTTP 200 for:

```text
/api/health
/api/ready
/
/campus-lost-found
/advanced-search
/login
```

It prints a pass/fail table and exits non-zero on failure. It never reads or prints secrets.

---

## 10. Deployment and operations

### 10.1 Vercel production

Primary deployment: https://campusfind-taupe.vercel.app

Environment variables are configured in the Vercel dashboard and are not stored in the repository. Set `DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `UPLOAD_DIR`, `SEED_DEMO_DATA`, and `SEED_ADMIN_ROTATE`.

Deploy from the repository root:

```powershell
vercel --prod
```

Post-deploy checks:

```powershell
curl.exe -sS -o NUL -w "%{http_code}" https://campusfind-taupe.vercel.app/api/health
curl.exe -sS https://campusfind-taupe.vercel.app/api/ready
$env:BASE_URL = "https://campusfind-taupe.vercel.app"
npm run smoke
```

Because uploads use a local filesystem directory, configure durable storage on platforms where ephemeral filesystems are used. The current Vercel deployment relies on its runtime filesystem for uploads.

### 10.2 Docker

`Dockerfile` is a multi-stage Node 22 Alpine build:

1. `deps` runs `npm ci`.
2. `builder` copies dependencies and source, uses non-secret build-time placeholders, runs `npx prisma generate` and `npm run build`.
3. `runner` copies `package.json`, `node_modules`, `.next`, `public`, and `prisma`, creates `/app/.data/uploads`, chowns it, switches to the `node` user, exposes port 3001, and runs `npm start`.

`.dockerignore` excludes VCS metadata, `.next`, `node_modules`, `.env*`, cookies, `.data`, coverage, uploads, PEM files, and logs. No real secrets are baked into the image.

### 10.3 Render

`render.yaml` defines a Docker web service:

| Setting | Value |
|---|---|
| Health check | `/api/ready` |
| Pre-deploy command | `npm run prisma:migrate` |
| Upload disk | `campusfind-uploads` mounted at `/app/.data`, size 1GB |
| Dashboard secrets | `DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` |
| Static values | `UPLOAD_DIR=/app/.data/uploads`, `SEED_DEMO_DATA=false`, `SEED_ADMIN_ROTATE=false`, `NODE_ENV=production` |

### 10.4 Continuous integration

`.github/workflows/ci.yml` runs on pushes and pull requests to `main` and `master`. On Node 22 it executes `npm ci`, generates temporary non-committed secrets, then runs `check:env`, `content:build`, `typecheck`, `lint`, `test`, `audit`, and `build`.

### 10.5 Operational caveats

- Rate limiting is in-memory per process; use a shared store before scaling horizontally.
- Uploads are local files under `UPLOAD_DIR`; object storage is a future enhancement.
- Notification rows exist, but no SMTP/in-app delivery worker is implemented.
- The audit chain is append-only and tamper-evident, but no verification endpoint is exposed yet.
- Some canonical admin buttons still render informational notices rather than full dialogs.
- The public claims API exists, but a dedicated claim submission UI wired to `POST /api/claims` is still future work.
- `ThemeToggle` exists but is not rendered in the layout; dark mode is applied by the inline boot script and CSS.

---

## 11. Troubleshooting

| Symptom | Likely cause | Resolution |
|---|---|---|
| `Something went wrong` on an older deployed build | Search query threw because the database was unreachable | Current build catches the error and shows a temporary-unavailable banner. Redeploy if still seeing the generic error. |
| `Search is temporarily unavailable because the database could not be reached.` | `DATABASE_URL` is wrong, stale, or unreachable | Verify the connection string, network access, and that migrations were applied. Check `/api/ready`. |
| `/api/ready` returns 503 with `reason: database` | Prisma cannot execute `SELECT 1` | Test the connection string directly; confirm provider status and credentials. |
| `/api/ready` returns 503 with `reason: uploads` | `UPLOAD_DIR` is not writable | Create the directory and grant write access to the app process. |
| `/api/ready` returns 503 with `reason: secrets` | `SESSION_SECRET` missing, short, or placeholder-like | Generate a fresh 48-byte hex secret and redeploy. |
| Images do not appear | Canonical asset map missing or build not regenerated | Run `npm run assets:download` then `npm run content:build`. |
| Constellation not visible | Opaque page background reintroduced or motion explicitly disabled | Confirm generated `<main>` has no `bg-canvas`/`bg-surface`; switch the Motion control back on. |
| Guest tracking shows simulation controls | Stale cached build | Hard-refresh, then confirm the build includes `bb9e886` or newer. |
| Upload rejected | File type, magic bytes, dimensions, or 10MB limit failed | Use JPG/PNG/WebP/GIF/HEIC/HEIF under 10MB with dimensions 200–4000 px. |
| `401` on an admin API | No session or expired `AdminSession` | Sign in again. |
| `403` on an admin API | Wrong role or CSRF origin failure | Use an allowed role and submit from the configured origin. |
| `429` | Rate limit reached | Wait for `Retry-After` seconds. |
| Media URL returns 404 | Invalid key, traversal attempt, or missing file | Confirm the key and that `UPLOAD_DIR` persisted. |
| CI does not run on a push | Branch not covered by workflow | Workflow currently covers `main` and `master`. |

---

## 12. Current verification record

### 12.1 Local environment

Local server: http://localhost:3001

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm test` | 73/73 pass |
| `npm run build` | Pass |
| `npm run smoke` | 6/6 pass |
| `/api/ready` | 200 |
| `/advanced-search` | 200 |

### 12.2 Live environment, 2026-11-25

| Route | Result |
|---|---:|
| `/` | 200 |
| `/advanced-search` | 200 with live database-backed search |
| `/report-lost` | 200 |
| `/report-found` | 200 |
| `/mobile-lost-property` | 200 |
| `/submission-confirmation` | 200 |
| `/secure-guest-tracking` | 200, no simulated states |
| `/intelligent-match` | 200 |
| `/login` | 200 |
| `/api/health` | 200 |
| `/api/ready` | 200 — database and uploads ready |
| Admin canonical routes | 307 redirect to `/login?next=/<slug>` when signed out |

The Supabase **Session pooler** connection string is now configured on Vercel as `DATABASE_URL`. Both committed migrations were applied to the production database, the six categories were seeded, and the bootstrap `SUPER_ADMIN` account was created. `/api/ready` now reports `database: true`, `uploads: true`, and `secrets: true`.

> Treat the database password as a secret. It was shared in a chat message during setup and should be rotated in Supabase, then updated in Vercel after handover if this deployment is used beyond the demonstration environment.

### 12.3 Change history highlights

| Change | Commit / deployment |
|---|---|
| Restore WebGL animations by default | `805e22c` |
| Remove simulated auth states from guest tracking | `bb9e886`; deployment `dpl_Cd5YUqJDiycUvtG6WzM5HpAujqrW` |
| Degrade search gracefully when database is unreachable | `66429e7`; deployment `dpl_6fwphU6xAPaH5S5TxQFxqRiSZ1fX` |
| Expose constellation through canonical page mains | `cfef030`; deployment `dpl_RT4sRegXZsa9iDfwG9JkA4rW5rKe` |
| Add complete documentation and upload-limit consistency | `d95f8c6`; deployment `dpl_6NpowGSTN6nS7MZVidXfQL4jgwxM` |
| Add live upload feedback, drag-and-drop, real clear action, and honest submit labels | `16b8cb3`; deployment `dpl_93PRkHZNnd6W3a8ShMgf24p7iPEB` |

---

## 13. Documentation artifacts

| File | Format | Purpose |
|---|---|---|
| `docs/CAMPUSFIND_DOCUMENTATION.md` | Markdown | Editable canonical manual |
| `docs/CAMPUSFIND_DOCUMENTATION.html` | HTML | Print-ready intermediate generated from Markdown |
| `docs/CAMPUSFIND_DOCUMENTATION.pdf` | PDF | Portable manual for sharing and printing |
| `scripts/build-docs-pdf.mjs` | Node script | Renders Markdown to HTML/PDF using headless Chrome or Edge |

Regenerate the HTML and PDF after editing the Markdown:

```powershell
npm run docs:pdf
```

The script accepts optional overrides:

```powershell
node scripts/build-docs-pdf.mjs input.md output.html output.pdf
```

---

## Appendix A: Glossary

| Term | Meaning |
|---|---|
| Canonical screen | One of the 15 original Stitch designs preserved as a real app route. |
| Case reference | Public identifier in the form `CF-YYYY-NNNN[-A]`. |
| Tracking token | One-time secret issued with a report; hashed at rest and shown once in clear text. |
| Tenant | A college account identified by `collegeId`; staff may be scoped to one tenant. |
| Candidate match | A deterministic lost/found pair awaiting staff approval or dismissal. |
| Custody chain | Ordered movement of a found item from finder to vault to return. |
| Audit hash chain | Sequence of audit entries where each hash includes the previous hash. |
| Query banner | Success/error message injected from URL parameters such as `?submitted=1`. |

## Appendix B: Quick command reference

```powershell
# Development
npm ci
npm run dev

# Content and database
npm run content:build
npm run assets:download
npm run prisma:validate
npm run prisma:migrate
npm run db:seed

# Quality gates
npm run typecheck
npm run lint
npm test
npm run audit
npm run build
npm run smoke

# Documentation
npm run docs:pdf

# Production
npm start
vercel --prod
```

## Appendix C: Links

| Resource | URL |
|---|---|
| Public repository | https://github.com/Souravpreetsingh/campusfind |
| Production application | https://campusfind-taupe.vercel.app |
| Local application | http://localhost:3001 |
