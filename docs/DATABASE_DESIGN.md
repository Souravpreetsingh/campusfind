# DATABASE DESIGN

## 1. Overview

This document presents the PostgreSQL database schema designed for the CampusFind platform. The schema is version-controlled via Prisma ORM migrations and reflects the requirements documented in ARCHITECTURE.md and SECURITY_REQUIREMENTS.md.

All table and column names use singular form (Prisma convention). Enums are explicit and validated. No bare integers for status fields — always typed enums.

## 2. Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// -------------------------------------------------------
// Enums — typed, validated, used across multiple models
// -------------------------------------------------------

enum ReportType {
  LOST
  FOUND
}

enum ReportStatus {
  PENDING
  APPROVED
  CLAIMED
  ARCHIVED
}

enum ClaimStatus {
  SUBMITTED
  UNDER_REVIEW
  ADDITIONAL_INFO
  APPROVED
  REJECTED
  DISPUTED
}

enum CustodyState {
  WITH_FINDER
  SUBMITTED
  STORED
  READY
  RETURNED
}

enum Role {
  SUPER_ADMIN
  COLLEGE_ADMIN
  MODERATOR
  READ_ONLY_AUDITOR
}

enum MatchStatus {
  CANDIDATE
  APPROVED
  DISMISSED
  CLAIMED
}

// -------------------------------------------------------
// Core — Users and Authentication
// -------------------------------------------------------

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String    // bcrypt/argon2 hash, never plaintext
  name         String?
  role         Role     @default(READ_ONLY_AUDITOR)
  createdAt    DateTime @default now()
  updatedAt    DateTime @updatedAt

  // Relations
  reports      Report[]     @relation(cascade) // reports created by this user
  claims       Claim[]      @relation(cascade) // claims filed (as claimant)
  custodyRecords CustodyRecord[] @relation(cascade) // as holder
  auditLogs    AuditLog[]   @relation(cascade) // as performer
  adminSessions AdminSession[] @relation(cascade) // sessions for admins
}

model AdminSession {
  id           String   @id @default(uuid())
  user         User     @relation(fields: [userId], references: [id])
  userId       String
  createdAt    DateTime @default now()
  expiresAt    DateTime
  ipAddress    String?
  userAgent    String?

  @@ index([userId])
  @@ index([expiresAt])
}

// -------------------------------------------------------
// Reports — Lost & Found
// -------------------------------------------------------

model Category {
  id   String @id @default(uuid())
  name String  @unique // e.g., "Electronics", "Stationery", "Accessories"
  createdAt DateTime @default now()
}

model Report {
  id              String       @id @default(uuid())
  type            ReportType   // LOST | FOUND
  status          ReportStatus // PENDING | APPROVED | CLAIMED | ARCHIVED
  category        Category     // FK
  brand           String?      // e.g., "Sony"
  model           String?      // e.g., "WH-1000XM5"
  colour          String?      // e.g., "Black"
  description     Text         // free-form, sanitized
  lostDate        DateTime?    // for LOST reports
  lostTime        String?      // approximate time, for LOST reports
  foundDate       DateTime?    // for FOUND reports
  foundTime       String?      // approximate time, for FOUND reports

  // Approximate location — public-safe only
  campusBuilding  String?      // e.g., "Science Quad"
  campusFloor     String?      // e.g., "2nd Floor"
  campusLandmark  String?      // e.g., "Library entrance"

  // Reporter info — null for LOST (privacy), present for FOUND
  finderName      String?      // for FOUND reports only
  finderEmail     String?      // for FOUND reports only; contact request flow only

  // Audit
  createdAt       DateTime     @default now()
  createdBy       User?        @relation(fields: [createdById], references: [id])
  updatedAt       DateTime     @updatedAt

  // Soft delete marker (not physical delete)
  archivedAt      DateTime?    // if status = ARCHIVED

  // Relations
  images        ReportImage[]     @relation(cascade) // uploaded evidence
  matches         Match[]           @relation(cascade) // matching engine results
  claims          Claim[]           @relation(cascade) // ownership claims
  custodyRecords  CustodyRecord[]   @relation(cascade) // custody tracking

  // Composite index for common queries
  @@ index([type, status, createdAt])
}

// -------------------------------------------------------
// Report Images — File references, not binary data
// -------------------------------------------------------

model ReportImage {
  id              String   @id @default(uuid())
  report          Report   @relation(fields: [reportId], references: [id])
  reportId        String
  objectKey       String   // S3/MinIO safe key: reports/{reportId}/images/{uuid}.jpg
  contentType     String   // verified MIME type (image/jpeg, etc.)
  width           Int?
  height        Int?
  sizeBytes       Int
  uploadedAt      DateTime @default now()
  uploadedBy      User?    @relation(fields: [uploadedById], references: [id])

  @@ index([reportId])
}

// -------------------------------------------------------
// Tracking Credentials — Public report access without accounts
// -------------------------------------------------------

model TrackCredential {
  id              String   @id @default(uuid())
  report          Report   @relation(fields: [reportId], references: [id])
  reportId        String
  secretHash      String   // bcrypt/argon2 hash of the tracking secret — never plaintext
  createdAt       DateTime @default now()
  expiresAt       DateTime? // null = never expires; set if revocation needed

  @@ index([reportId])
  @@ index([expiresAt])
}

// -------------------------------------------------------
// Matching Engine — Candidate generation and scoring
// -------------------------------------------------------

model Match {
  id                String     @id @default(uuid())
  lostReport        Report     @relation(fields: [lostReportId], references: [id])
  lostReportId      String
  foundReport       Report     @relation(fields: [foundReportId], references: [id])
  foundReportId     String
  score             Integer    // 0-100, deterministic based on criteria
  status            MatchStatus // CANDIDATE | APPROVED | DISMISSED | CLAIMED
  reasons           String[]   // e.g., ["Same category: Electronics", "Brand match: Sony"]
  createdAt         DateTime   @default now()

  @@ unique([lostReportId, foundReportId]) // prevent duplicate matches
  @@ index([lostReportId])
  @@ index([foundReportId])
  @@ index([status])
}

// -------------------------------------------------------
// Claims and Ownership Verification
// -------------------------------------------------------

model Claim {
  id                String     @id @default(uuid())
  report            Report     @relation(fields: [reportId], references: [id])
  reportId          String
  claimantName      String
  claimantEmail     String
  ownershipExplanation Text   // free-form explanation from claimant
  verificationAnswers Json?    // structured answers to item-specific questions; sensitive, never public
  status            ClaimStatus // SUBMITTED | UNDER_REVIEW | ADDITIONAL_INFO | APPROVED | REJECTED | DISPUTED
  submittedAt       DateTime   @default now()
  resolvedAt        DateTime?
  resolvedBy        User?      @relation(fields: [resolvedById], references: [id])
  reason            String?     // rejection/reason text, if resolved
  auditLog          AuditLog[]   @relation(cascade)

  @@ index([reportId])
  @@ index([status])
  @@ index([claimantEmail])
}

// -------------------------------------------------------
// Item Custody Management
// -------------------------------------------------------

model CustodyRecord {
  id                String   @id @default(uuid())
  report            Report   @relation(fields: [reportId], references: [id])
  reportId          String
  heldBy            User?    @relation(fields: [heldById], references: [id]) // admin who has custody
  state             CustodyState
  location          String?  // internal-only; NEVER in public API responses
  receivedAt        DateTime @default now()
  transferredAt     DateTime?
  transferredBy     User?    @relation(fields: [transferredById], references: [id])
  notes             Text?    // internal only
  createdAt         DateTime @default now()

  @@ index([reportId])
  @@ index([state])
  @@ index([transferredAt])
}

// -------------------------------------------------------
// Audit — Immutable log of all important actions
// -------------------------------------------------------

model AuditLog {
  id                String   @id @default(uuid())
  entity            String   // "REPORT" | "CLAIM" | "CUSTODY" | "MATCH" | "USER" | "SYSTEM"
  entityId          String
  action            String   // CREATE | UPDATE | APPROVE | REJECT | TRANSFER | ARCHIVE | LOGIN | LOGOUT | etc.
  previousState     String?
  newState          String?
  performedBy       User?    @relation(fields: [performedById], references: [id])
  ipAddress         String?
  userAgent         String?
  timestamp         DateTime @default now()
  notes             Text?

  @@ index([entity, entityId, action])
  @@ index([timestamp])
}

// -------------------------------------------------------
// Platform Configuration — Flexible key-value store
// -------------------------------------------------------

model PlatformConfiguration {
  key   String  @id // e.g., "matching.weight.category", "site.name", "upload.maxImages"
  value String  // serialized as needed
  updatedAt DateTime @default now()
  updatedBy User?   @relation(fields: [updatedById], references: [id])

  @@ unique([key])
}
```

## 3. Migration Strategy

### 3.1 Initial Migration (`init`)

Creates all tables, enums, and indexes from the schema above. Run:

```bash
pnpm prisma migrate init
pnpm prisma migrate save --create-only --name "init_schema"
# Review generated SQL, then:
pnpm prisma migrate deploy
```

### 3.2 Subsequent Migrations

Each additive change gets its own migration file:

| Change | Migration Name |
|--------|----------------|
| Add `Report.lostDate` field | `add_report_lost_date`
| Add `Claim.verificationAnswers` | `add_claim_verification_answers`
| Add `Match.reasons` array | `add_match_reasons`
| Add `CustodyRecord.location` | `add_custody_location`
| Add `User.role` enum | `add_user_role_enum`

Run migrations incrementally:

```bash
pnpm prisma migrate make --name "add_custody_location"
pnpm prisma migrate deploy
```

### 3.3 Migration Safety Rules

- ❌ Never run `prisma migrate reset` in production
- ❌ Never delete migration files
- ❌ Always review generated SQL before applying
- ❌ Test migrations on a copy of production DB first
- ✅ Document each migration's purpose
- ✅ Keep migrations version-controlled (git)
- ✅ Run `prisma migrate status` regularly

## 4. Indexes and Performance

| Table | Index | Purpose |
|-------|-------|---------|
| User | `email` (unique) | Auth lookups, uniqueness |
| Report | `[type, status, createdAt]` | Listing reports filtered by type/status sorted by date |
| Report | `[id]` (primary) | Primary key |
| ReportImage | `[reportId]` | Load images for a report |
| Match | `[lostReportId, foundReportId]` (unique) | Prevent duplicate matches |
| Match | `[lostReportId]` | Find all matches for a lost report |
| Match | `[foundReportId]` | Find all matches for a found report |
| Claim | `[reportId]` | Find claims for a report |
| Claim | `[claimantEmail]` | Look up claims by email |
| CustodyRecord | `[reportId]` | Track custody for a report |
| CustodyRecord | `[state]` | Filter by custody state |
| TrackCredential | `[reportId]` | Verify tracking secret for a report |
| AuditLog | `[entity, entityId, action]` | Audit queries |
| AuditLog | `[timestamp]` | Temporal audits |
| PlatformConfiguration | `[key]` (unique) | Config lookups |

## 5. Constraints and Unique Keys

| Table/Model | Constraint | Purpose |
|-------------|------------|---------|
| User | `email @unique` | No duplicate accounts |
| Match | `unique([lostReportId, foundReportId])` | One match per report pair |
| PlatformConfiguration | `key @unique` | Single source of config values |
| ReportImage | composite index on `[reportId]` | Efficient image loading |
| TrackCredential | `[reportId]` | One credential per report (can be revoked/reissued) |

## 6. Relationships and Cascades

| Parent | Child | OnDelete |
|--------|-------|----------|
| User → AdminSession | cascade | Delete sessions on user delete |
| User → AuditLog | cascade | Audit entries retained even if user deleted (set null instead?) |
| User → Report (createdBy) | set null | Reports remain if user deleted |
| User → Claim (claimant) | set null | Claims remain if user deleted |
| User → CustodyRecord (heldBy) | set null | Custody records remain |
| Report → ReportImage | cascade | Images deleted if report deleted |
| Report → Match (lostReport/foundReport) | cascade | Matches deleted if report deleted |
| Report → Claim | cascade | Claims deleted if report deleted |
| Report → CustodyRecord | cascade | Custody records deleted if report deleted |
| Report → TrackCredential | cascade | Credential deleted if report deleted |
| Category → Report | restrict | Cannot delete category if reports exist (protects data integrity) |

## 7. Enum Validation Details

### 7.1 ReportType

| Value | Description |
|-------|-------------|
| LOST | Visitor reports item lost |
| FOUND | Visitor reports item found |

### 7.2 ReportStatus

| Value | Description |
|-------|-------------|
| PENDING | Submitted, awaiting initial review |
| APPROVED | Verified, eligible for public display and matching |
| CLAIMED | Ownership claimed and approved |
| ARCHIVED | No longer active; retained per retention policy |

### 7.3 ClaimStatus

| Value | Description |
|-------|-------------|
| SUBMITTED | Claim form submitted, not yet reviewed |
| UNDER_REVIEW | Admin reviewing claim |
| ADDITIONAL_INFO | Admin requesting more information from claimant |
| APPROVED | Claim approved, item ready for collection |
| REJECTED | Claim denied with reason |
| DISPUTED | Competing claims; arbitration needed |

### 7.4 CustodyState

| Value | Description |
|-------|-------------|
| WITH_FINDER | Item with original finder |
| SUBMITTED | Item submitted to college office |
| STORED | Item in secure storage |
| READY | Ready for claimant collection |
| RETURNED | Item returned to owner |

### 7.5 Role

| Value | Description |
|-------|-------------|
| SUPER_ADMIN | Full platform access, multi-tenant capabilities |
| COLLEGE_ADMIN | College-level administration |
| MODERATOR | Report moderation capabilities |
| READ_ONLY_AUDITOR | View-only access, audit log review |

### 7.6 MatchStatus

| Value | Description |
|-------|-------------|
| CANDIDATE | Generated match, awaiting admin review |
| APPROVED | Admin approved as valid match |
| DISMISSED | Admin dismissed as not valid |
| CLAIMED | Match led to successful claim |

## 8. Stored Procedures / Functions (Optional but Recommended)

### 8.1 fn_verify_tracking_credential(report_id, secret_text)

```sql
CREATE OR REPLACE FUNCTION fn_verify_tracking_credential(
  p_report_id UUID,
  p_secret TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_record TrackCredential%ROWTYPE;
  v_valid BOOLEAN;
BEGIN
  SELECT * INTO v_record FROM TrackCredential WHERE report_id = p_report_id;
  
  IF v_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Constant-time comparison to prevent timing attacks
  v_valid := crypt(p_secret, v_record.secretHash) = v_record.secretHash;
  
  RETURN v_valid;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 8.2 fn_audit_report_action(report_id, action, performed_by_ip, notes)

```sql
CREATE OR REPLACE FUNCTION fn_audit_report_action(
  p_report_id UUID,
  p_action TEXT,
  p_performed_by_ip TEXT,
  p_notes TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO AuditLog (entity, entityId, action, ipAddress, notes)
  VALUES ('REPORT', p_report_id, p_action, p_performed_by_ip, p_notes);
END;
$$ LANGUAGE plpgsql STABLE;
```

## 9. Backup and Recovery

| Component | Backup Frequency | Retention |
|-----------|-----------------|-----------|
| PostgreSQL data | Daily base backup + WAL archiving | 35 days |
| PostgreSQL transaction logs | Continuous archiving | 35 days |
| Uploaded images (S3) | Versioning enabled | Configurable (default 365 days) |
| Audit logs | Daily export to compressed storage | 7 years minimum |
| Platform configuration | With each deployment | Permanent |

### 9.1 Backup Command Example

```bash
# Base backup
pg_dump -Fc -b -v -f "backup_$(date +%Y%m%d).dump" dbname

# WAL segment archiving (configured in postgresql.conf)
# Ensure archive_mode = on
# archive_command = 'cp %p /path/to/archive/%f'
```

### 9.2 Restore Procedure

1. Stop application during restore window
2. `pg_restore -d dbname_new backup.dump`
3. Validate data integrity (row counts, critical fields)
4. Switch application to new database
5. Update DNS/connection strings
6. Keep old database read-only for 48h as verification
7. Delete old database after confirmation

## 10. Prisma Schema Validation

After any schema change:

```bash
# Generate Prisma client
pnpm prisma generate

# Check for errors
pnpm prisma migrate resolve --apply --name <migration_name>

# Validate schema against database
pnpm prisma migrate status

# Run in CI as part of test suite
```

## 11. Diagrams

![Entity Relationship Diagram](placeholder-mermaid-diagram)

*Entity Relationship Diagram to be generated via Prisma schema analyzer or Mermaid.js specification.*

---

*End of DATABASE_DESIGN.md*