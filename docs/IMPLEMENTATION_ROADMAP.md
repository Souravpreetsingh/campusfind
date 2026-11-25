# IMPLEMENTATION ROADMAP

## Overview

This roadmap provides a phase-by-phase plan for transforming the static CampusFind frontend into a production-grade College Lost & Found Management Platform. Each phase has explicit scope, deliverables, and exit criteria.

---

## PHASE 0 — Project Audit and Architecture (COMPLETED)

**Status**: ✅ Completed  
**Deliverables**: 
- docs/PROJECT_AUDIT.md
- docs/ARCHITECTURE.md
- docs/IMPLEMENTATION_ROADMAP.md (this file)
- docs/SECURITY_REQUIREMENTS.md
- docs/DATABASE_DESIGN.md
- docs/TESTING_STRATEGY.md

**Exit Criteria**: Documentation approved before Phase 1 begins.

---

## PHASE 1 — Project Foundation and Environment Configuration

**Duration**: 1 week  
**Scope**: Initialize the Next.js project, configure the technology stack, establish the development environment.

**Files to Create/Modify**:
- `package.json` — with all dependencies
- `next.config.mjs` — Next.js configuration
- `tailwind.config.mjs` — local Tailwind config (currently CDN-only)
- `tsconfig.json` — TypeScript strict mode
- `prisma/schema.prisma` — initial schema
- `.env.example` — environment variable template
- `app/layout.tsx` — root layout with ThemeProvider
- `app/page.tsx` — migrated homepage (from index.html)
- `components/ui/` — component library foundation

**Database Impact**:
- Initial Prisma migration `init`
- Creates _prisma_migrations table

**Security Considerations**:
- Environment variable handling
- No credentials committed
- .gitignore setup for .env, node_modules

**Exit Criteria**:
- `pnpm dev` runs without errors
- TypeScript strict mode passes
- Tailwind CSS works locally (not just CDN)
- Prisma schema validates
- Production build `next build` succeeds

---

## PHASE 2 — Database Design and Migrations

**Duration**: 1 week  
**Scope**: Create the full Prisma schema based on the ARCHITECTURE.md design, run migrations, seed initial data.

**Files to Create/Modify**:
- `prisma/schema.prisma` — complete schema (see ARCHITECTURE.md)
- `prisma/migrations/` — version-controlled migration files
- `seed.sql` — initial seed data (colleges, categories, status enums)

**Database Impact**:
- Tables: User, Report, Claim, Match, TrackCredential, CustodyRecord, AuditLog, Category, ReportImage, etc.
- Indexes on: email (User), report type/status (Report), score (Match), etc.
- Enums: ReportType (LOST, FOUND), ReportStatus (PENDING, APPROVED, CLAIMED, ARCHIVED), ClaimStatus, CustodyState, Role

**Security Considerations**:
- Unique constraint on User.email
- Password hashing strategy (bcrypt via Prisma middleware or adapter)
- Sensitive field marking in schema

**Exit Criteria**:
- `pnpm prisma migrate deploy` runs successfully
- Database schema matches ARCHITECTURE.md
- `pnpm prisma generate` produces type-safe client
- Seed data loads without errors

---

## PHASE 3 — Backend Architecture and Common Infrastructure

**Duration**: 1 week  
**Scope**: Implement API routes, authentication, and shared utilities.

**Files to Create/Modify**:
- `app/api/health/route.ts` — health check endpoint
- `app/api/auth/[...nextauth]/route.ts` — Next-Auth configuration
- `lib/zodSchema.ts` — shared Zod validation schemas
- `lib/prisma.ts` — Prisma client singleton
- `middleware.ts` — auth middleware, rate limiting
- `lib/utils.ts` — shared utilities (formatDate, cn helper, etc.)
- `components/providers.tsx` — React Query Provider, ThemeContext

**API Routes Initial Set**:
- `GET /api/health` — OK response
- `GET /api/auth/session` — session status
- `POST /api/auth/signin` — admin sign in
- `POST /api/auth/signout` — sign out

**Database Impact**:
- No new tables (using existing Phase 2 schema)
- Helper functions/views if needed

**Security Considerations**:
- Rate limiting on auth endpoints (100 req/15min)
- CSRF protection for state-changing APIs
- Input validation via Zod on all APIs
- Error handling — never expose stack traces

**Exit Criteria**:
- All API routes return appropriate status codes
- Auth middleware correctly protects/unprotects routes
- Zod validation catches invalid inputs
- TypeScript types match database schema
- No secrets exposed in error responses

---

## PHASE 4 — Lost and Found Reporting

**Duration**: 2 weeks  
**Scope**: Implement the core lost item and found item reporting workflows.

**Files to Create/Modify**:
- `app/(auth)/lost-report/[step]/page.tsx` — multi-step lost report form
- `app/(auth)/found-report/[step]/page.tsx` — multi-step found report form
- `components/report-form/` — shared form components
- `app/api/lost-reports/route.ts` — POST lost report endpoint
- `app/api/found-reports/route.ts` — POST found report endpoint
- `app/api/reports/route.ts` — GET/list reports

**Key Form Features**:
- Step 1: Basic info (item name, category, brand, model, colour, description, dates, location)
- Step 2: Media (image upload, preview)
- Step 3: Review (summary, draft save, submit)
- Client-side validation with Zod
- Server-side validation duplicate check
- Image upload via API to S3-compatible storage
- Draft preservation in database

**Database Impact**:
- New Report records with type LOST/FOUND
- ReportImage records (foreign key to Report)
- AuditLog entries for creation

**Security Considerations**:
- reCAPTCHA on submission forms
- Rate limiting (5 submissions/hour per IP)
- Image content-type verification
- No sensitive data in public report listings
- Draft auto-save with expiration

**Exit Criteria**:
- Can submit a lost report with all required fields
- Can submit a found report with all required fields
- Images upload and appear in report detail
- Validation messages display for missing/invalid fields
- Draft can be resumed within 24h

---

## PHASE 5 — Search, Discovery and Item Details

**Duration**: 1 week  
**Scope**: Implement search functionality and individual report detail pages.

**Files to Create/Modify**:
- `app/(public)/reports/page.tsx` — browse reports with filters
- `app/(public)/reports/[id]/page.tsx` — individual report detail
- `app/api/reports/route.ts` — enhanced search API
- `app/api/reports/[id]/route.ts` — report detail API

**Search Features**:
- Keyword search across item name, description, brand, model
- Filter by: category, type (lost/found), status, campus building
- Sort by: newest, relevance, date
- Pagination (cursor-based)
- No-results state with suggestions
- Loading and error states

**Item Detail Page**:
- Public-safe data display only
- Image gallery
- Potential matches section
- Claim button (if item is found & approved)
- Report reference and status

**Database Impact**:
- Full-text search consideration (PostgreSQL `to_tsvector` or ILIKE)
- Indexes for search performance
- Report-image relationships

**Exit Criteria**:
- Can search across all reports
- Filters work correctly
- Pagination functions
- Detail page shows safe data only
- No sensitive fields in public API response

---

## PHASE 6 — Guest Tracking and Secure Report Access

**Duration**: 1 week  
**Scope**: Implement the tracking credential system for public report access without user accounts.

**Files to Create/Modify**:
- `app/api/track-credential/route.ts` — create/retrieve tracking secret
- `app/(public)/reports/[id]/track/[credential]/page.tsx` — tracked report view
- `lib/tracking.ts` — tracking logic (hash comparison, rate limiting)
- `components/tracking-info.tsx` — displayed after report submission

**Tracking System**:
- On report submission, generate:
  - Public reference number (UUID, displayable)
  - High-entropy private tracking secret (32 random chars)
- Hash the secret with bcrypt/argon2
- Store only the hash
- Display tracking info: "Save this secret: ___"
- One-time display only; not stored unhashed

**Access Control**:
- `GET /api/reports/[id]?credential=...` — verify hash, return public data
- Rate limiting on verification attempts (3 failures/15min)
- Constant-time comparison to prevent timing attacks
- Do not reveal whether reference number exists

**Database Impact**:
- TrackCredential model (see ARCHITECTURE.md)
- Foreign key to Report
- expiresAt field for revocation

**Security Considerations**:
- Never use reference number alone for access
- Brute-force protection on verification endpoint
- Constant-time secret comparison
- Do not leak existence of reference number
- Credential revocation mechanism

**Exit Criteria**:
- After submitting a report, user sees tracking secret (one-time)
- Tracking secret grants access to report detail page
- Wrong credential shows generic "report not found" (not "wrong credential")
- Rate limiting activates after 3 failed attempts
- Credential can be revoked by admin

---

## PHASE 7 — Matching Engine

**Duration**: 1 week  
**Scope**: Implement the deterministic matching engine between lost and found reports.

**Files to Create/Modify**:
- `app/api/matches/route.ts` — candidate generation endpoint
- `lib/matching.ts` — scoring service (deterministic, configurable)
- `components/match-card.tsx` — UI component for displaying matches
- `app/(public)/matches/page.tsx` — matches viewing page

**Matching Algorithm**:
- Weighted scoring across criteria:
  - Category compatibility: +20 if matching
  - Item name similarity: +25 (Levenshtein distance)
  - Brand match: +15
  - Model match: +15
  - Colour match: +10
  - Date proximity: +10 (within 30 days = full, within 90 days = half, else 0)
  - Campus location proximity: +5 (same building = full, else 0)
- Score range: 0-100
- Configurable weight constants in a module

**Match Reason Documentation**:
- For every match, store textual reasons:
  - "Same category: Electronics"
  - "Similar item name: Sony headphones vs Sony WH-1000XM5"
  - "Brand match: Sony"
  - "Date proximity: Reported 5 days apart"
- Store in Match.reasons[] array

**Match Status Lifecycle**:
- CANDIDATE → APPROVED (admin) → CLAIMED
- Or: CANDIDATE → DISMISSED (admin)

**Database Impact**:
- Match model (lostReportId, foundReportId, score, reasons, status)
- Index on (lostReportId, foundReportId) for duplicate prevention

**Exit Criteria**:
- Can generate matches between lost and found reports
- Scoring is deterministic (same inputs → same score)
- Match reasons are stored and displayable
- Admin can approve/dismiss candidates
- Matches page shows candidates with scores and reasons

---

## PHASE 8 — Claims and Ownership Verification

**Duration**: 1 week  
**Scope**: Implement the claim submission and verification workflow.

**Files to Create/Modify**:
- `app/(public)/reports/[id]/claim/page.tsx` — claim submission form
- `app/api/claims/route.ts` — POST claim endpoint
- `app/api/claims/[id]/route.ts` — GET/PATCH claim status
- `components/claim-form.tsx` — claim form UI

**Claim Form Fields**:
- Related report reference (hidden, verified server-side)
- Claimant name
- Claimant email
- Ownership explanation
- Item-specific verification answers (e.g., "What color was the sticker?", "What was the distinguishing mark?")
- Supporting evidence (optional photos)

**Security Rules**:
- Do not reveal private verification answers to claimant
- Do not expose finder's private information
- Do not auto-approve based on high match score
- Prevent repeated claim abuse (rate limiting)
- Verification answers must match those in the original found report

**Claim Lifecycle**:
- SUBMITTED → UNDER_REVIEW → (ADDITIONAL_INFO → UNDER_REVIEW)* → APPROVED/REJECTED/DISPUTED

**Database Impact**:
- Claim model (reportId, claimantName, claimantEmail, ownershipExplanation, verificationAnswers, status, reason, auditLog[])
- AuditLog entries for each status transition

**Exit Criteria**:
- Can submit a claim for an eligible report
- Validation displays for missing/invalid fields
- Claim status transitions work correctly
- Admin can review and update claim status
- Audit logs record all transitions
- Wrong verification answers are rejected

---

## PHASE 9 — Item Custody Management

**Duration**: 1 week  
**Scope**: Implement internal custody management for found belongings.

**Files to Create/Modify**:
- `app/admin/custody/page.tsx` — custody management page (admin only)
- `app/api/custody/route.ts` — custody CRUD endpoints
- `components/custody-table.tsx` — table of custody records
- `components/custody-history.tsx` — transfer history

**Custody States**:
- WITH_FINDER → SUBMITTED → STORED → READY → RETURNED

**Required Functionality**:
- Record when item received from finder
- Track storage location (internal only)
- Record transfer to admin custody
- Record return to owner
- History of all state changes with timestamps and actor

**Database Impact**:
- CustodyRecord model (reportId, heldBy, state, location, receivedAt, transferredAt, transferredBy, notes)
- AuditLog entries for each custody transition

**Security Considerations**:
- Custody information never publicly accessible
- Only admin roles can CREATE/UPDATE/CLOSE custody records
- Every state change creates an AuditLog entry
- Location field internal-only; never in public API responses

**Exit Criteria**:
- Can create custody record when item submitted to admin
- State transitions are valid per workflow
- Every change creates audit log entry
- Custody data never leaks to public pages
- Admin can view custody history

---

## PHASE 10 — Administrator Authentication and Authorization

**Duration**: 1 week  
**Scope**: Full admin authentication system with role-based access control.

**Files to Create/Modify**:
- `app/admin/login/page.tsx` — admin login page
- `app/admin/dashboard/page.tsx` — admin dashboard
- `middleware.ts` — auth middleware (enhanced)
- `lib/auth.ts` — auth utilities
- `constants/roles.ts` — role definitions and permissions
- `app/api/admin/login/route.ts` — auth API endpoint

**Roles and Permissions** (RBAC):

| Role | Reports | Claims | Custody | Analytics | Moderation |
|------|---------|--------|---------|-----------|------------|
| SUPER_ADMIN | CRUD all | CRUD all | CRUD all | CRUD all | CRUD all |
| COLLEGE_ADMIN | CRUD college reports | CRUD claims | CRUD own college | View analytics | Moderate |
| MODERATOR | CRUD reports | View claims | View custody | View analytics | Moderate/reject |
| READ_ONLY_AUDITOR | View all | View all | View all | View all | None |

**Each permission enforced server-side**, not merely by hiding UI elements.

**Authentication Flow**:
1. GET /admin/login → show login form
2. POST /api/auth/signin → verify credentials, create session
3. GET /admin/dashboard → middleware checks auth, redirects if unauthenticated
4. GET /api/auth/signout → destroy session

**Exit Criteria**:
- Login page functions with valid credentials
- Invalid credentials show generic error (not "invalid email/password")
- Session persists across page navigations
- Protected routes redirect unauthenticated users
- Admin dashboard loads only for authenticated users
- RBAC correctly restricts actions per role

---

## PHASE 11 — Moderation and Administration

**Duration**: 2 weeks  
**Scope**: Full administrator moderation capabilities.

**Files to Create/Modify**:
- `app/admin/reports/page.tsx` — report management dashboard
- `app/api/admin/reports/route.ts` — report moderation API
- `app/api/admin/reports/[id]/route.ts` — single report moderation
- `app/admin/claims/page.tsx` — claims management
- `app/api/admin/claims/route.ts` — claims moderation API
- `app/admin/analytics/page.tsx` — analytics dashboard
- `app/api/admin/analytics/route.ts` — analytics API

**Report Moderation Actions**:
- View all reports with filters (status, type, category, date range)
- Search reports (keywords, category)
- Sort (newest, oldest, most claims)
- Approve report → change status to APPROVED, make visible public
- Reject report → change status to REJECTED, require reason
- Request corrections → send to claimant, change status to ADDITIONAL_INFO
- Detect duplicates → show similarity score
- Archive report → soft delete, change status to ARCHIVED
- Restore eligible archived report

**Claim Moderation Actions**:
- View all claims with filter (status, report)
- Approve claim → item ready for collection
- Reject claim → provide reason, send to claimant
- Update claim status with audit logging

**Analytics Dashboard**:
- Lost vs found reports (monthly trends)
- Item category distribution
- Recovery rate (claimed/total)
- Average processing time (submission to resolution)
- Pending claims trend
- Unresolved reports trend
- Administrator activity log

**Database Impact**:
- All queries against existing schema
- New analytics views or materialized views if needed
- AuditLog continues to grow

**Exit Criteria**:
- Admin can filter and search reports
- Approve/reject actions change status and create audit logs
- Correction requests function
- Duplicate detection works
- Analytics figures match actual database counts
- All dashboard data is from real queries, not hardcoded

---

## PHASE 12 — Analytics and Notifications

**Duration**: 1 week  
**Scope**: Operational analytics and notification foundation.

**Files to Create/Modify**:
- `app/api/admin/analytics/route.ts` — analytics data API
- `lib/analytics.ts` — analytics calculation functions
- `lib/notifications.ts` — notification foundation
- `components/notification-bell.tsx` — in-app notification UI
- `app/(public)/notifications/page.tsx` — user notification page (if applicable)

**Analytics Functions** (from actual database data):
- Monthly report submission trends
- Lost vs found ratio
- Category distribution percentages
- Recovery rate: SUM(CASE WHEN claim.status = 'APPROVED' THEN 1 ELSE 0 END) / COUNT(*) * 100
- Average processing time: AVG(resolvedAt - submittedAt) for resolved claims
- Pending claims count
- Expiration trends (reports older than 90 days without resolution)

**Notification Foundation**:
- In-memory/database-backed notifications model
- Event types: reportSubmitted, claimSubmitted, claimStatusChanged, etc.
- User-specific notification collections
- Mark-as-read functionality
- Do NOT claim email/SMS sent without provider confirmation

**Database Impact**:
- Notification model (userId, type, title, message, read, createdAt, relatedEntityId, relatedEntityType)
- May add denormalized counts on Report/Claim if performance requires

**Exit Criteria**:
- Analytics API returns correct calculations from database
- Notification UI displays unread count
- Can mark notifications as read
- No hardcoded/synthetic statistics presented
- All numbers clearly labeled with "based on X reports"

---

## PHASE 13 — Security Hardening

**Duration**: 2 weeks  
**Scope**: Comprehensive security review and penetration testing.

**Files to Modify/Review**:
- All API routes (security review)
- Authentication and authorization flows
- Input validation across all forms
- Error response handling
- Database query safety
- CSP, headers, middleware configuration

**Security Test Activities**:
- OWASP Top 10 verification:
  - A01: Injection (parameterized queries, Prisma safe usage)
  - A02: Broken Authentication (session management, rate limiting)
  - A03: Sensitive Data Exposure (never publicize private fields)
  - A04: XML External Entity (not using XML, but verify)
  - A05: Broken Access Control (RBAC verification)
  - A06: Security Misconfiguration (env vars, defaults)
  - A07: Identification and Authentication Failures (tracking credential system)
  - A08: Software and Data Failures (dependency versions, updates)
  - A09: Security Logging and Monitoring (audit log verification)
  - A10: Server-Side Request Forgery (upload URL validation)

- Specific tests:
  - Unauthorized admin route access attempts
  - Cross-report data access (user A tries to access user B's report)
  - Tracking secret brute-force (automated attempts)
  - Sensitive data leakage checks (public pages source inspection)
  - Upload security (invalid file types, oversized files)
  - Privilege escalation attempts
  - Rate limiting effectiveness
  - CSRF token validation
  - HTTPS-only enforcement
  - Cookie security (httpOnly, secure, sameSite)

**Remediation**:
- Document all findings
- Prioritize fixes by severity
- Retest all remediated vulnerabilities
- Update threat model

**Exit Criteria**:
- Zero critical vulnerabilities
- Zero high-severity vulnerabilities
- All medium issues documented with risk acceptance
- Penetration test report completed
- All API routes pass security validation

---

## PHASE 14 — Complete Testing and Independent Verification

**Duration**: 2 weeks  
**Scope**: Full test suite execution and verification.

**Test Execution**:
- `pnpm test` — unit + integration tests
- `pnpm test:e2e` — Playwright end-to-end tests
- `pnpm lint` — linting check
- `pnpm typecheck` — TypeScript strict mode
- `pnpm build` — production build verification

**Test Categories**:

| Test Type | Focus | Minimum Pass |
|-----------|-------|--------------|
| Unit | Validation, scoring, status transitions, auth checks | 100% pass |
| Integration | Report CRUD, search, matching, custody, claims | 100% pass |
| E2E | Submit lost report → track → claim → admin review | All critical paths |
| Security | Unauthorized access, XSS, injection, brute-force | Zero failures |

**Independent Verification**:
- Test suite executed by party not involved in implementation
- All test commands and results documented
- Verification report generated
- Known limitations clearly identified and documented

**Exit Criteria**:
- `pnpm test` — all pass
- `pnpm test:e2e` — all critical paths pass
- `pnpm lint` — zero errors
- `pnpm typecheck` — zero errors
- `pnpm build` — production build, no warnings
- Independent verification report completed and approved

---

## PHASE 15 — Production Deployment Preparation

**Duration**: 1 week  
**Scope**: Prepare the application for production deployment.

**Files to Modify/Verify**:
- `next.config.mjs` — production optimizations
- `tailwind.config.mjs` — purge configuration
- `public/robots.txt` — search engine directives
- `public/sitemap.xml` — SEO map
- `vercel.json` or `render.yaml` — deployment config
- Environment variables (all required vars present)
- Domain SSL certificate verified

**Deployment Checklist**:
- [ ] PostgreSQL initialized with all migrations
- [ ] S3-compatible bucket created and tested
- [ ] Next-Auth secrets generated and configured
- [ ] reCAPTCHA keys configured
- [ ] Domain SSL (HTTPS) verified
- [ ] Backup strategy documented and tested
- [ ] Monitoring/alerting configured (UptimeRobot, Sentry)
- [ ] Health check endpoints operational
- [ ] Rollback procedure documented
- [ ] All Phase 14 tests passing
- [ ] Security hardening completed (Phase 13)
- [ ] Audit log verification complete

**Deployment Commands**:
- `pnpm prisma migrate deploy` — run pending migrations
- `pnpm build` — Next.js production build
- `pnpm start` — verify production server starts
- `pnpm deploy` — deploy to chosen platform

**Exit Criteria**:
- Production build succeeds (`next build` → `.next/`)
- Production server starts (`next start`) on specified port
- All environment variables configured and accessible
- Database migrated to latest version
- Custom domain with HTTPS verified
- Backup system operational
- Monitoring dashboard operational
- Rollback procedure documented and tested

---

## Cross-Phase Dependencies

| Phase | Depends On | Required By |
|-------|------------|-------------|
| Phase 2 | Phase 1 | Phase 3, all subsequent |
| Phase 3 | Phase 1, Phase 2 | Phase 4, all subsequent |
| Phase 4 | Phase 1, Phase 2, Phase 3 | Phase 5, Phase 8 |
| Phase 5 | Phase 1, Phase 2, Phase 3, Phase 4 | Public discovery |
| Phase 6 | Phase 1, Phase 2, Phase 4 | Guest tracking |
| Phase 7 | Phase 1, Phase 2, Phase 4, Phase 6 | Matching engine |
| Phase 8 | Phase 1, Phase 2, Phase 4, Phase 7 | Claims workflow |
| Phase 9 | Phase 1, Phase 2, Phase 4, Phase 8 | Custody management |
| Phase 10 | Phase 1, Phase 3 | Admin portal, all admin features |
| Phase 11 | Phase 10, Phase 8 | Admin moderation |
| Phase 12 | Phase 1, Phase 10 | Analytics, notifications |
| Phase 13 | All previous | Security assurance |
| Phase 14 | All previous | Test verification |
| Phase 15 | Phase 14 | Production deployment |

---

## Phase Gate Reviews

At the end of each phase, a gate review determines readiness for the next phase:

**Gate Review Checklist**:
- [ ] All deliverables complete for phase
- [ ] All tests passing (unit/integration as applicable)
- [ ] Security review completed (relevant phases)
- [ ] Code review completed (relevant phases)
- [ ] Documentation updated (all phases)
- [ ] Demo/verification performed
- [ ] Known issues documented with mitigation plans
- [ ] Stakeholder approval obtained

If any gate criteria are not met, the project reverts to the previous phase for remediation before proceeding.

---

*Roadmap version 1.0 — Subject to adjustment based on project constraints and approvals.*