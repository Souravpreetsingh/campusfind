# ARCHITECTURE

## 1. Overview

This document describes the architecture of the runnable CampusFind application in this folder.
The canonical frontend design source is `extracted/stitch_campusfind_platform_design/`; it is never
edited by hand. `scripts/build-content.mjs` generates `src/content/pages.ts` and
`src/content/design-tokens.css` from it, and self-hosted copies of the canonical images live in
`public/canonical/`.

## 2. Technology stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Framework | Next.js App Router | 16 | React 19, file-based routes and Route Handlers |
| Language | TypeScript | strict | Shared types between pages, components and APIs |
| Styling | Tailwind CSS | 4 | Tokens translated from the canonical Stitch Tailwind configs |
| ORM | Prisma | 6 | Typed client, committed migrations, PostgreSQL |
| Database | PostgreSQL | 15+ | Relational data and JSON fields |
| Validation | Zod | 4 | Shared client/server schemas |
| Testing | Vitest | 5 | Unit/component tests |
| Auth | Custom signed httpOnly JWT cookie | — | bcrypt password verification; server-side RBAC helpers |
| Assets | Self-hosted fonts and canonical images | — | Inter, Merriweather, Be Vietnam Pro, Material Symbols; no asset CDN |
| Deployment | Docker on Render (blueprint `render.yaml`) | Node 22 | Non-root runtime on port 3001 |

**Future enhancements, not current requirements:** NextAuth/Auth.js providers, S3/MinIO object
storage, Google reCAPTCHA, SMTP delivery, and a distributed rate-limit store. The current
implementation deliberately uses a local upload directory, a signed JWT session cookie, and
in-process rate limiting.

## 3. Request and data flow

```
Browser
  │
  ├─ Canonical pages (/, /campus-lost-found, /advanced-search, ...) ──► pageCatalog + generated shells
  ├─ App pages (/login, /admin) ─────────────────────────────────────► server-side auth helpers
  └─ Route Handlers (/api/health, /api/ready, /api/reports, ...) ────► Zod validation
                                                                        │
                                                                        ▼
                                                                     Prisma
                                                                        │
                                                                        ▼
                                                                  PostgreSQL
```

Uploaded evidence is written to `UPLOAD_DIR` (default `.data/uploads` locally,
`/app/.data/uploads` in the container). The directory must be writable and persisted; in the
Render blueprint it is backed by a disk mounted at `/app/.data`. Canonical images and fonts are
served from `public/` and require no external requests.

## 4. Module map

### 4.1 Public discovery
- `/` — landing page and global search
- `/campus-lost-found`, `/advanced-search` — discovery and filters
- `GET /api/reports` — approved/claimed report search

### 4.2 Reporting and custody
- `/report-lost`, `/report-found`, `/mobile-lost-property`, `/submission-confirmation`
- `POST /api/reports` — JSON and multipart intake, writes evidence to `UPLOAD_DIR`
- `/api/custody`, `/api/custody/handover` — custody state and handover

### 4.3 Matching, claims and guest tracking
- `/intelligent-match`, `/secure-guest-tracking`
- Deterministic scoring service and `/api/matches`
- `/api/claims`, `/api/claims/[id]`, `/api/guest/track`

### 4.4 Administration
- `/login`, `/admin`, and the operations screens generated from the canonical design
- `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/admin/overview`
- RBAC checks are enforced server-side on every protected route; UI hiding is never the control

## 5. Data model (summary)

See `docs/DATABASE_DESIGN.md` for the full schema. The core entities are `User`, `Report`,
`ReportImage`, `Claim`, `Match`, `TrackCredential`, `CustodyRecord` and `AuditLog`. Reports carry
type/status/category/brand/model/colour/description/location fields and relations to images,
matches, claims and custody records. Tracking credentials are stored as hashes, never plaintext.

Public API responses expose only approved/claimed, safe fields; private fields (contact details,
exact storage locations, verification answers, internal notes) stay server-side.

## 6. Security architecture

### 6.1 Implemented controls

- Zod validation on all API inputs; Prisma parameterized queries (no concatenated raw SQL)
- bcrypt password hashing and signed httpOnly, SameSite session cookies
- Server-side RBAC on protected routes and APIs
- Two-tier data model with field-level serialization for public responses
- Upload type/size checks, UUID-based file names, and storage under a git-ignored `UPLOAD_DIR`
- Security headers in `next.config.mjs`: `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `X-Frame-Options: DENY`, `Permissions-Policy`, HSTS, and a CSP for self-hosted assets
  (`'unsafe-eval'` in `script-src` only in development)
- Environment validation via `npm run check:env`, which refuses placeholders without printing values

### 6.2 In-memory rate limiting caveat

Rate limits are currently held **in memory per Node process**. They are effective for a single
instance but are not shared across replicas, and they reset on restart. Before scaling
horizontally, move counters to a shared store (for example Redis) and revisit CAPTCHA as part of
that abuse-prevention work.

### 6.3 Self-hosted assets

All fonts and canonical imagery are bundled locally. The CSP therefore uses `'self'`, `data:` and
`blob:` sources only; no Google Fonts, CDN scripts or third-party image hosts are required.

## 7. Health and deployment

- `GET /api/health` — lightweight liveness probe (process is up)
- `GET /api/ready` — readiness probe used by `render.yaml` `healthCheckPath`
- `npm run smoke` — checks both probes plus `/`, `/campus-lost-found`, `/advanced-search` and
  `/login`, printing a pass/fail table; override the target with `BASE_URL`

### 7.1 Docker

`Dockerfile` is multi-stage on `node:22-alpine`: `npm ci`, Prisma client generation,
`npm run build`, then a runtime stage with a non-root `node` user, `.next`, `public`, `prisma`
and `node_modules`, port 3001 exposed, and `npm start` as the command. No secret values are baked
into the image; build-time values are non-secret placeholders and real values are injected at
runtime. `.dockerignore` excludes VCS metadata, build output, dependencies, env files, cookies,
local data, coverage and uploads.

### 7.2 Render and CI

`render.yaml` defines a Docker web service with `/api/ready` health checks, a persistent disk for
uploads, and all secrets supplied through the dashboard (no values in the file). A pre-deploy
command runs `npm run prisma:migrate`.

`.github/workflows/ci.yml` uses Node 22 and `npm ci`, generates throwaway values for
`SESSION_SECRET` and `SEED_ADMIN_PASSWORD`, then runs `check:env`, `content:build`, `typecheck`,
`lint`, `test`, `audit`, and `build`.

## 8. Testing

See `docs/TESTING_STRATEGY.md`. Current results are reported by `npm test`; historical target
counts in older planning documents are not authoritative.

## 9. Operating notes

- Port 3001 is used by `npm run dev` and `npm start`; set `NEXT_PUBLIC_APP_URL` to the public origin.
- `SESSION_SECRET` must be at least 32 characters; rotate it and the seed admin password before
  any non-local use.
- Never commit `.env`, `cookies.txt`, `*.pem`, or `.data/`; keep `public/canonical` tracked.
- Attribution for third-party and supplied assets is in `NOTICE.md`.
