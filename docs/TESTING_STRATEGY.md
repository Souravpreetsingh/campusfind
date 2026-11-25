# TESTING STRATEGY

## 1. Overview

This document describes how CampusFind is tested in this repository. Tests are not optional: a
change is not complete until the automated gates pass. Results must come from an actual run —
see `npm test` output for the current test count rather than any number recorded in a document.

Guiding rules:

- No mock functionality disguised as real functionality.
- Seed and fixture data must be clearly fictional.
- Every critical workflow has a test.
- Never report a passing suite unless the tests were actually executed.

## 2. Test layers

| Layer | Tool | Focus |
|---|---|---|
| Unit / component | Vitest | Generated content, forms, links, search filtering and rendering, matching, report-assistant flow, homepage wordmark mount |
| API / integration | Vitest + Route Handlers | Validation, authorization, report/claim/custody flows |
| Runtime smoke | `scripts/smoke.mjs` + fetch | Deployed instance health, readiness and key pages |
| Browser E2E | Playwright (future) | Full user journeys in a real browser |

Historical documents list target counts (150+ unit, 40+ integration, 20+ E2E); those are goals,
not claims about the current suite.

## 3. Commands

```bash
npm run check:env      # validate configuration (no values printed)
npm run content:build  # regenerate canonical page/token artifacts before tests
npm run typecheck      # tsc --noEmit
npm run lint           # eslint .
npm test               # vitest run
npm run audit          # npm audit --audit-level=high
npm run build          # check:env + content:build + prisma generate + next build
npm run smoke          # runtime checks against BASE_URL (default http://localhost:3001)
```

All commands use **npm**. `npm ci` is used in CI for reproducible installs.

## 4. What is covered today

- Generated content: canonical pages, links, nav and form fields match `pageCatalog`.
- Forms and validation: report intake, guest tracking, search, custody handover.
- Search: keyword/brand/model/zone/type/status/sort filtering with status gating.
- Matching: deterministic scoring and explanation reasons.
- Assistant: conversation state, voice wiring and JSON multipart submission.
- Self-hosted assets: canonical image mapping and font wiring; no CDN dependency.

## 5. Runtime smoke checks

`npm run smoke` performs unauthenticated `GET` requests and prints a concise pass/fail table:

| Path | Purpose |
|---|---|
| `/api/health` | Liveness probe |
| `/api/ready` | Readiness probe; the `healthCheckPath` in `render.yaml` |
| `/` | Landing page renders |
| `/campus-lost-found` | Canonical discovery page renders |
| `/advanced-search` | Search page renders |
| `/login` | Sign-in page renders |

Set `BASE_URL` to test a staging or production instance. The script reads no credentials and
prints no secrets. It is intended to run after a deployment, not as a unit test.

## 6. Test data and environment

- Use `.env.example` as the template; `npm run check:env` rejects placeholders and requires
  `SESSION_SECRET` of at least 32 characters.
- In CI, `.env` is copied from the template and `SESSION_SECRET` / `SEED_ADMIN_PASSWORD` are
  replaced with freshly generated random values without echoing them.
- Fixtures are fictional and never use real student data.
- Uploads during tests go to `UPLOAD_DIR` (default `.data/uploads`), which is git-ignored and
  must not be treated as durable storage.
- No NextAuth, S3 bucket or reCAPTCHA keys are required to run the suite. Those are future
  enhancements, not current test prerequisites.

## 7. Known limitations to account for in future tests

- **Rate limiting is in-memory per process.** Tests that assert 429 behaviour must target a single
  instance; a shared store is required before asserting limits across replicas.
- **Local uploads.** File tests should use the local `UPLOAD_DIR` and clean up afterward; object
  storage tests are out of scope until that enhancement lands.
- **Self-hosted assets.** Font and image tests should assert local paths under `public/`, not
  external CDN hosts.
- **Browser E2E.** Playwright is a future enhancement; browser-level assertions are not yet part
  of `npm test`.

## 8. CI integration

`.github/workflows/ci.yml` runs on Node 22 with `npm ci`, then executes `check:env`,
`content:build`, `typecheck`, `lint`, `test`, `audit`, and `build`. The Docker image uses the same
build script, and deployments are verified with `npm run smoke` against `/api/ready`.

## 9. Reporting results

Report the actual command output: total, passed, failed and skipped tests, plus the exact failing
file/line/error and any fixes applied. Do not substitute a count from a planning document.

---

*This strategy reflects the current repository. Target counts in older planning docs are aspirational.*
