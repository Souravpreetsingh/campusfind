-- Security hardening: case references, private report fields, college scoping,
-- track-credential throttling, and hash-chained audit logs.

ALTER TABLE "User" ADD COLUMN "collegeId" TEXT;

ALTER TABLE "Report"
    ADD COLUMN "caseReference" TEXT,
    ADD COLUMN "verificationDetails" TEXT,
    ADD COLUMN "incidentWindow" TEXT,
    ADD COLUMN "custodyNotes" TEXT,
    ADD COLUMN "collegeId" TEXT;

ALTER TABLE "TrackCredential"
    ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "lastAttemptAt" TIMESTAMP(3);

-- Nullable so pre-existing audit rows remain valid.
ALTER TABLE "AuditLog"
    ADD COLUMN "hash" TEXT,
    ADD COLUMN "previousHash" TEXT;

-- Backfill stable, unique case references for existing reports.
UPDATE "Report" r
SET "caseReference" = 'CF-' || TO_CHAR(r."createdAt", 'YYYY') || '-' || LPAD(n.row_num::text, 4, '0')
FROM (
    SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS row_num
    FROM "Report"
) n
WHERE r."id" = n."id";

-- Move legacy private notes out of the public description column.
UPDATE "Report"
SET
    "verificationDetails" = NULLIF(BTRIM(SUBSTRING("description" FROM E'(?m)^Hidden verification details:[ \\t]*([^\\r\\n]*)')), ''),
    "incidentWindow" = NULLIF(BTRIM(SUBSTRING("description" FROM E'(?m)^Time window:[ \\t]*([^\\r\\n]*)')), ''),
    "custodyNotes" = NULLIF(BTRIM(SUBSTRING("description" FROM E'(?m)^Custody notes:[ \\t]*([^\\r\\n]*)')), ''),
    "description" = REGEXP_REPLACE(
        REGEXP_REPLACE(
            REGEXP_REPLACE("description", E'(?m)^Hidden verification details:[^\\r\\n]*(\\r?\\n|$)', ''),
            E'(?m)^Time window:[^\\r\\n]*(\\r?\\n|$)', ''
        ),
        E'(?m)^Custody notes:[^\\r\\n]*(\\r?\\n|$)', ''
    );

ALTER TABLE "Report" ALTER COLUMN "caseReference" SET NOT NULL;

CREATE UNIQUE INDEX "Report_caseReference_key" ON "Report"("caseReference");
CREATE INDEX "User_collegeId_idx" ON "User"("collegeId");
CREATE INDEX "Report_collegeId_idx" ON "Report"("collegeId");

ALTER TABLE "User"
    ADD CONSTRAINT "User_collegeId_fkey"
    FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Report"
    ADD CONSTRAINT "Report_collegeId_fkey"
    FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE SET NULL ON UPDATE CASCADE;
