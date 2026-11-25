# CampusFind

College lost & found management platform. The runnable application lives in this folder; the canonical frontend source is `extracted/stitch_campusfind_platform_design/`. The older curated `frontend/` directory is retained for reference only and is no longer used to generate pages.

## Live deployment

- Public repository: https://github.com/Souravpreetsingh/campusfind
- Vercel production URL: https://campusfind-taupe.vercel.app

## Complete documentation

- Markdown: `docs/CAMPUSFIND_DOCUMENTATION.md`
- PDF: `docs/CAMPUSFIND_DOCUMENTATION.pdf`
- Regenerate the HTML/PDF with `npm run docs:pdf` after editing the Markdown.

## Current status

- Next.js 16 App Router + React 19 + TypeScript strict mode
- Tailwind CSS 4 with tokens translated from each original Stitch `tailwind.config`
- Self-hosted Material Symbols Outlined font so icon ligatures render without a Google Fonts runtime request
- All 15 canonical Stitch screens rendered through real Next.js routes, with their original sidebar/top bar/footer shells preserved
- Prisma 6 schema, generated client, and initial PostgreSQL migration
- Session authentication (httpOnly JWT cookie), bcrypt password verification, RBAC helpers
- APIs for reports, claims, matches, custody, guest tracking, admin overview, and health checks
- Real form handling for report intake (including JPG/PNG/WebP/GIF/HEIC/HEIF uploads up to 10MB each), guest tracking, public discovery search, and custody handover; report screens no longer submit prototype placeholder values
- Working keyword/brand/model/zone/status search: the homepage search bar, Lost/Found pills, frequent-search links, and advanced-search filters all query the database and render approved reports
- Responsive report assistant: speak or type what happened, hear spoken replies, answer a few questions, attach a photo, and the lost/found report is filed automatically
- Originkit Constellation WebGL animation remains visible through the site background on every canonical screen, rendered behind page content so it never overlays text or controls
- Homepage hero tagline rendered as a larger Originkit Vector Wordmark client island, with a visible canonical heading fallback until WebGL mounts
- Rounded floating homepage navigation bar generated from the canonical header without editing the Stitch source
- Deterministic matching service with unit tests

> The earlier empty scaffold at `C:\campusfind-next` is superseded by this project.

## Setup

Requirements: Node.js 20.9+ (Node 22 recommended), npm, and PostgreSQL 15+.

1. Install dependencies:

   ```powershell
   npm ci
   ```

2. Copy the environment template and replace every placeholder, then validate it:

   ```powershell
   Copy-Item .env.example .env
   npm run check:env
   ```

   `SESSION_SECRET` must be at least **32 characters** (not 32 bytes). Generate one with
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` and use a strong,
   unique `SEED_ADMIN_PASSWORD`. `npm run check:env` refuses known placeholders and never prints values.

   The app listens on port **3001** in both development and production, so keep
   `NEXT_PUBLIC_APP_URL=http://localhost:3001` locally.

3. Create a PostgreSQL database named `campusfind`, then apply migrations and seed reference data:

   ```powershell
   npm run prisma:migrate
   npm run db:seed
   ```

4. Start the development server:

   ```powershell
   npm run dev
   ```

   Open http://localhost:3001.

Uploaded evidence is written to `UPLOAD_DIR` (default `.data/uploads` locally). The directory is
git-ignored, must be writable by the app process, and must be persisted across deploys.

## Report assistant

Click the bot button in the lower-left corner. It accepts speech (Chrome/Edge with microphone permission) or typed answers, works out whether the item was lost or found, asks for the item, location, identifying marks, and NetID, then asks for a photo. Attach a photo or type `skip`; the report is created through the real report API automatically.

For a hands-free conversation, press the microphone button once. The assistant listens with live/interim transcription, speaks each reply aloud, then reopens the microphone automatically for your next answer. Use the volume button to mute speech and the restart button to start a new report. Browsers without the Web Speech API can still use every feature by typing; speech synthesis is optional and typed replies remain fully readable.

## Discovery search

The global search card on the homepage and the search form on `/advanced-search` submit real `GET` parameters (`q`, `zone`, `type`, `sort`). Keywords match the report's brand (for example `Sony` or `Hydro Flask`), model, colour, category, description, and campus location. The Lost/Found pills, frequent-search links, recent searches, trending chips, and sort control are all wired to those parameters. Results are read from PostgreSQL and only include approved/claimed reports; pending reports stay private until moderation. The same filters are available through `GET /api/reports`.

## Useful scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the development server on port 3001 |
| `npm start` | Start the production server on port 3001 |
| `npm run check:env` | Validate `.env` (no values printed) |
| `npm run build` | Validate env, rebuild content, generate Prisma client, then `next build` |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint |
| `npm test` | Unit tests |
| `npm run audit` | `npm audit --audit-level=high` |
| `npm run smoke` | Check health, readiness, and key pages (set `BASE_URL` to override the default) |
| `npm run content:build` | Regenerate pages and design tokens from the canonical Stitch export |
| `npm run assets:download` | Refresh the canonical self-hosted assets |
| `npm run prisma:migrate` | Apply committed migrations (`prisma migrate deploy`) |
| `npm run prisma:validate` | Validate the Prisma schema |
| `npm run prisma:generate` | Regenerate the Prisma client |
| `npm run db:seed` | Seed categories, colleges, and the bootstrap admin |

## Deployment

The repository includes a multi-stage `Dockerfile` (Node 22 Alpine, non-root runtime, port 3001)
and a `render.yaml` blueprint. Set `DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`,
`SEED_ADMIN_EMAIL`, and `SEED_ADMIN_PASSWORD` in the hosting dashboard — never commit real values.
No secrets are baked into the image. The image builds with `npm run build` and starts with
`npm start`; Render runs `npm run prisma:migrate` before starting. `UPLOAD_DIR` must point at a
persistent writable volume (`/app/.data/uploads` in the blueprint) or evidence files will be lost.

After deploying, verify the instance:

```powershell
$env:BASE_URL = "https://your-host"
npm run smoke
```

`npm run smoke` checks `/api/health`, `/api/ready`, `/`, `/campus-lost-found`, `/advanced-search`,
and `/login` and prints a concise pass/fail table. It never reads or prints secrets.

CI (`.github/workflows/ci.yml`) runs on Node 22 and executes `check:env`, `content:build`,
`typecheck`, `lint`, `test`, `audit`, and `build`, using freshly generated non-committed values for
`SESSION_SECRET` and `SEED_ADMIN_PASSWORD`.

All fonts and canonical images are self-hosted; the app does not require external asset CDNs.
Security headers (CSP, HSTS, `nosniff`, referrer/permissions/frame policies) are configured in
`next.config.mjs`. See `NOTICE.md` for third-party and supplied-asset attribution.

### Operational caveats

- Rate limiting is currently **in-memory per process**. Counters are not shared between instances;
  introduce a shared store before scaling horizontally.
- Remote CAPTCHA, object storage (S3/MinIO), and NextAuth are future enhancements. The current
  implementation uses a signed httpOnly JWT session cookie and the local `UPLOAD_DIR`.
- `/api/ready` is the deployment health check target; `/api/health` is a lightweight liveness probe.

## Routes

### Public design pages

| Route | Original screen |
|---|---|
| `/` | Enterprise college lost & found landing |
| `/advanced-search` | Advanced search & listings discovery |
| `/report-lost` | Lost item reporting workflow |
| `/report-found` | Found item intake custody workflow |
| `/mobile-lost-property` | Mobile lost property intake |
| `/submission-confirmation` | Custody credential confirmation |
| `/secure-guest-tracking` | Guest case tracking & blinded ownership resolution |
| `/intelligent-match` | Match comparison & vector decomposition |

### Operations pages

| Route | Original screen |
|---|---|
| `/overview-dashboard` | Executive operations dashboard |
| `/report-moderation` | Report moderation inspection workspace |
| `/claims-and-verification` | Claims evidence verification console |
| `/vault-inventory-and-custody` | Vault inventory & custody registry |
| `/intelligent-matching` | Intelligent matching queue |
| `/platform-overview` | Multi-tenant platform overview |
| `/college-registry-provisioning` | College registry provisioning |

### Application routes

- `/login` — administrator sign in
- `/admin` — server-side protected console
- `/api/health`, `/api/ready`, `/api/auth/*`, `/api/reports`, `/api/claims`, `/api/matches`, `/api/custody`, `/api/custody/handover`, `/api/guest/track`, `/api/admin/overview`

## Frontend preservation

The source HTML is not edited. `scripts/build-content.mjs` reads every `extracted/stitch_campusfind_platform_design/*/code.html`, extracts the full body shell, removes prototype-only CDN/config scripts and demo handlers, rewrites placeholder links to real routes, wires the original forms to API handlers, and writes `src/content/pages.ts` plus `src/content/design-tokens.css`. Run `npm run content:build` after changing any canonical Stitch file.

`warm_editorial_craft/DESIGN.md` is a design brief rather than executable markup; the inline Tailwind config in each `code.html` remains the authoritative token source.
