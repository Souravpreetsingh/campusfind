# SECURITY REQUIREMENTS

## 1. Overview

This document captures all security requirements for the CampusFind platform. These requirements are mandatory and must be verified before any phase is considered complete. Non-negotiable rules from the master development prompt (Section 4) are restated and expanded with specific implementation requirements.

## 2. Authentication and Authorization

### 2.1 Authentication Requirements

| Requirement | Implementation Detail |
|-------------|----------------------|
| Admin credentials never exposed | Passwords never sent in plaintext; bcrypt hashing with 12+ rounds |
| Session management | HttpOnly, Secure, SameSite=Lax cookies; 24h expiry with refresh |
| Login rate limiting | 5 attempts per 15 minutes per IP address; progressive delays |
| Session invalidation | On logout, password change, admin role revocation |
| No default credentials | No hardcoded usernames/passwords; all configured via environment |
| Re-authentication for sensitive actions | Re-verify password for custody transfers, claim approvals |

### 2.2 Authorization Requirements

| Requirement | Implementation Detail |
|-------------|----------------------|
| Server-side enforcement | Every API route independently verifies authorization; UI hiding is insufficient |
| Role-Based Access Control | RBAC with defined roles: SUPER_ADMIN, COLLEGE_ADMIN, MODERATOR, READ_ONLY_AUDITOR |
| Principle of least privilege | Users/minimum permissions necessary for their role |
| Admin action audit logging | Every admin action records: identity, action, previous state, new state, timestamp, reason |
| No client-trusted roles | Client-supplied role values never accepted at face value |
| Session expiry per role | Different expiry times may be appropriate per role risk level |
| Concurrent session limit | Maximum active sessions per admin account (e.g., 3 simultaneous) |

### 2.3 Public Access Requirements

| Requirement | Implementation Detail |
|-------------|----------------------|
| No authentication for public users in initial release | General users report and browse without account creation |
| Guest tracking credentials | Separate from user authentication; own security model |
| Public data only | Public APIs return safe fields only; private fields never exposed |
| reCAPTCHA on submission forms | Prevent automated abuse; version 3 or risk analysis v3 |
| Rate limiting on public endpoints | 5 report submissions/hour per IP; 3 tracking credential verifications/15min |

## 3. Input Validation

### 3.1 Client-Side Validation

| Requirement | Implementation Detail |
|-------------|----------------------|
| All forms have client-side validation | Zod schemas used both client and server |
- Error messages clear and specific
- Validation runs before form submission
- Disabled submit button while validation pending

### 3.2 Server-Side Validation

| Requirement | Implementation Detail |
|-------------|----------------------|
| All APIs validate inputs | Never trust client-supplied data |
| Zod schemas validated on server | Shared schemas between client and server |
| Rejection of unexpected fields | Strip unknown fields, reject if critical |
- Maximum string lengths enforced
- Type checking via TypeScript
- No regex-based bypasses possible

### 3.3 Data Sanitization

| Requirement | Implementation Detail |
|-------------|----------------------|
| XSS prevention | All user-generated content HTML-encoded before display |
| Database escaping | Prisma ORM parameterized queries (never raw SQL concatenation) |
- Content Security Policy header implemented
- Sandbox attributes on iframes (if any)
- User content displayed in isolated containers

## 4. Data Protection

### 4.1 Two-Tier Data Model

| Requirement | Implementation Detail |
|-------------|----------------------|
| Public representation | API responses for public users contain only safe fields |
| Private representation | Full database records for admins and claim owners |
| Never rely on CSS to hide sensitive data | Field-level access control in API responses |
| Serialization guards | Zod/JSON serialization explicitly includes/excludes fields based on caller role |

| SAFE for Public | NEVER for Public |
|-----------------|------------------|
| Item name | Email addresses |
| Category | Phone numbers |
| General description | Exact storage locations |
| Approximate date | Verification answers |
| Approved photographs | Internal administrator notes |
| Report reference | Private verification details |
| Report status | Finder's contact information |
| Match scores (anonymized) | Finder identity |

### 4.2 Sensitive Data Categories

| Category | Protection Method |
|----------|-------------------|
| Email addresses | Never in public APIs; hashed if stored for matching |
| Phone numbers | Never displayed publicly; used only for authorized contact |
| Exact storage locations | Internal only; never in public reports |
| Verification answers | Known only to admin; never revealed to claimant |
| Finder contact info | Only via approved contact request flow |
| ID numbers, student IDs | Redacted or masked in all public outputs |
| Financial information | Never collected or stored |
| Passwords | bcrypt/argon2 hashing; never in plaintext |
| Tracking secrets | Hashed with bcrypt; only comparison of hash, never store plaintext |

### 4.3 Database Security

| Requirement | Implementation Detail |
|-------------|----------------------|
| No plaintext passwords | All auth credentials hashed |
| No plaintext tracking secrets | Hashed before storage |
| Row-level security consideration | Prisma RLS or application-layer enforcement |
| Migration safety | Never run `prisma migrate reset` in production |
- Backup encryption at rest
- Connection strings never in client code
- Read replicas if needed for read-heavy operations

## 5. File Upload Security

### 5.1 Allowed File Types

| Requirement | Implementation Detail |
|-------------|----------------------|
- MIME type verification (browser-supplied, then re-verified server-side)
- Actual content-type verification via file magic bytes/signature
- Allowed extensions: .jpg, .jpeg, .png, .webp (configurable)
- Rejected: .html, .php, .exe, .script, .anything-executable

### 5.2 File Size and Dimensions

| Requirement | Implementation Detail |
|-------------|----------------------|
- Maximum 10MB per image
- Maximum 5 images per report
- Maximum dimensions: 4000 × 4000 pixels
- Minimum dimensions: 200 × 200 pixels (for usability)
- Automatic thumbnail generation (300px width max)
- EXIF metadata stripped on upload (via sharp library)

### 5.3 Upload Path Security

| Requirement | Implementation Detail |
|-------------|----------------------|
- Safe object keys: UUID-based (e.g., `reports/cf-123/images/550e8400-e29b-41d4-a716-446655440000.jpg`)
- Original filenames NEVER stored or used in object keys
- Bucket names not exposed in client code
- Upload API validates: content-type, size, dimensions, virus scan
- Orphaned file cleanup cron job (30-day policy)
- No public direct URLs; all access via signed API endpoints

### 5.4 Malware Scanning

| Requirement | Implementation Detail |
|-------------|----------------------|
- ClamAV or equivalent integrated into upload pipeline
- Infected files rejected with generic error (do not specify virus name)
- Quarantine mechanism for suspicious files
- Logging of rejected uploads for abuse pattern analysis

## 6. Transport Security

| Requirement | Implementation Detail |
|-------------|----------------------|
- HTTPS everywhere (TLS 1.3 minimum)
- HSTS header: `max-age=31536000; includeSubDomains; preload`
- No mixed content (all resources over HTTPS)
- CSP (Content Security Policy) header:
  ```
  default-src 'self';
  script-src 'self' https://www.google.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https:;
  connect-src 'self' https://api.*;
  font-src 'self' https://fonts.gstatic.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  ```
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()

## 7. Abuse Prevention

| Requirement | Implementation Detail |
|-------------|----------------------|
| Rate limiting tiers | - Public report submission: 5/hour per IP<br>- Tracking credential verification: 3/15min per IP<br>- Admin login: 5/15min per IP<br>- API routes: 100/15min per IP |
- Rate limit store: Redis or in-memory with TTL |
- Ban IP after threshold: 20 report submissions/day from same IP |
- Captcha on all submission forms (reCAPTCHA v3 or equivalent) |
- Suspicious pattern detection: same user submitting reports with similar descriptions |
- Account lockout after repeated failed auth attempts (20 min exponential backoff) |

## 7. Audit and Logging

### 7.1 Audit Log Requirements

| Requirement | Implementation Detail |
|-------------|----------------------|
- Every important action is logged: CREATE, UPDATE, APPROVE, REJECT, TRANSFER, ARCHIVE, LOGIN, LOGOUT
- Each log entry contains: entity type, entity ID, action, previous state, new state, actor (user ID), timestamp, IP address, notes
- Immutable audit log (append-only, cannot be edited/deleted after creation)
- Logs stored separately from primary data for tamper protection
- Log retention policy: 7 years minimum (per institutional policy)
- Regular audit log integrity verification (hash chaining or similar)

### 7.2 Log Entity Types

| Entity Type | Actions Logged |
|-------------|----------------|
| REPORT | CREATE, APPROVE, REJECT, ARCHIVE, RESTORE, STATUS_CHANGE |
| CLAIM | CREATE, APPROVE, REJECT, STATUS_CHANGE, ADDITIONAL_INFO_REQUEST |
| CUSTODY | CREATE, STATE_TRANSfer, RETURN |
| MATCH | CREATE, APPROVE, DISMISS |
| USER | LOGIN, LOGOUT, ROLE_CHANGE, PASSWORD_CHANGE |
| SYSTEM | MIGRATION, DEPLOYMENT, CONFIG_CHANGE |

### 7.3 Log Integrity

| Requirement | Implementation Detail |
|-------------|----------------------|
- Each log entry includes hash of previous entry (chain integrity)
- Logs stored in append-only database table or write-storage system
- Regular integrity verification jobs (daily/weekly)
- Tamper-evident logging system
- Export capability for external audit tools |

## 8. Error Handling and Error Responses

### 8.1 Error Response Format

| Requirement | Implementation Detail |
|-------------|----------------------|
- All API errors follow consistent format:
```json
{
  "error": "ERROR_CATEGORY",
  "message": "Human-readable explanation",
  "requestId": "uuid-for-tracing",
  "timestamp": "ISO-8601"
}
```
- Never expose stack traces to public users
- Development mode may show additional details (behind auth)
- HTTP status codes appropriate: 400, 401, 403, 404, 409, 415, 422, 500

### 8.2 Error Categories

| Category | Example | HTTP Status |
|----------|---------|-------------|
| VALIDATION | Missing required field, invalid format | 400 |
| AUTHENTICATION | Invalid credentials, expired session | 401 |
| AUTHORIZATION | Insufficient permissions | 403 |
| NOT_FOUND | Report ID does not exist | 404 |
| CONFLICT | Duplicate submission, claim already exists | 409 |
| UNSUPPORTED_MEDIA | Invalid content type for upload | 415 |
| SERVER_ERROR | Unexpected condition, log and monitor | 500 |

### 8.3 Error Handling Don'ts

- ❌ Never expose database schema or column names
- ❌ Never show raw stack traces to unauthenticated users
- ❌ Never say "error on line X" in production
- ❌ Never reveal whether a report ID exists or not (constant-time responses)
- ❌ Never email passwords or sensitive secrets

## 9. Communication Security

| Requirement | Implementation Detail |
|-------------|----------------------|
- All public-facing pages served over HTTPS
- No external HTTP resources loaded on HTTPS pages
- Email communication (if added later) over authenticated TLS
- No password sent via email under any circumstances
- Tracking secrets communicated only once, to the reporter only
- Recovery process for lost tracking secrets does not reveal whether a report exists

## 10. Compliance and Institutional Requirements

| Requirement | Implementation Detail |
|-------------|----------------------|
- Data retention: 7 years minimum for audit logs, 2 years for resolved reports |
- GDPR/privacy considerations: data subject access request capability |
- FERPA considerations: student data protection if applicable |
- Institutional policy alignment: college-specific rules incorporated |
- All legal requirements documented and reviewed by institutional counsel |
- Privacy policy published and accessible from all pages |
- Terms of service published and accessible |

## 11. Incident Response

| Requirement | Implementation Detail |
|-------------|----------------------|
- Security incident reporting path defined |
- Breach notification procedures documented |
- Contact: institutional IT security team + project security contact |
- Incident containment steps documented |
- Post-incident review process |
- Documentation of any data compromise and mitigation |

## 12. Security Testing Verification

Each phase must verify the following before completion:

- [ ] Input validation tested (invalid inputs rejected, valid inputs accepted)
- [ ] Authentication tested (valid credentials accepted, invalid rejected)
- [ ] Authorization tested (different roles have appropriate access)
- [ ] Input sanitization tested (XSS attempts blocked)
- [ ] Upload security tested (invalid file types, sizes, dimensions rejected)
- [ ] Rate limiting tested (thresholds enforced)
- [ ] Audit log verification (every important action logged)
- [ ] Error responses tested (proper status codes, no data leakage)
- [ ] XSS testing (user-generated content safely encoded)
- [ ] CSRF protection verified (where applicable)
- [ ] Session management tested (logout invalidates, concurrent session limits)
- [ ] Tracking credential brute-force protection verified
- [ ] Sensitive data leakage check (public pages source inspection)
- [ ] Database query safety verified (no raw SQL concatenation)

---

*These security requirements are non-negotiable. Every phase must demonstrate compliance before progressing to the next phase. Violations require immediate remediation and may necessitate reverting to a previous phase.* 

*Implementation status for these requirements — including which controls are shipped, which are
partial (for example in-memory, per-process rate limiting), and which remain future enhancements
(shared rate-limit store, CAPTCHA, object storage) — is tracked in
`docs/IMPLEMENTATION_STATUS.md`. This note does not relax any requirement above.*

*End of SECURITY_REQUIREMENTS.md*