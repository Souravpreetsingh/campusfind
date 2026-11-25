import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';

type AuditState = Record<string, unknown> | string | number | boolean | null;

export interface WriteAuditLogInput {
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  previousState?: AuditState;
  newState?: AuditState;
}

/**
 * Appends a tamper-evident audit entry. Each entry hashes its canonical fields
 * together with the previous entry's hash, forming a chain.
 */
export async function writeAuditLog(tx: Prisma.TransactionClient, input: WriteAuditLogInput) {
  const latest = await tx.auditLog.findFirst({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { hash: true },
  });

  const previousHash = latest?.hash ?? null;
  const createdAt = new Date();
  const metadata: Record<string, unknown> = { ...(input.metadata ?? {}) };

  if (input.previousState !== undefined) metadata.previousState = input.previousState;
  if (input.newState !== undefined) metadata.newState = input.newState;

  const canonical = JSON.stringify({
    actorId: input.actorId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata,
    previousHash,
    createdAt: createdAt.toISOString(),
  });

  const hash = createHash('sha256').update(canonical).digest('hex');

  return tx.auditLog.create({
    data: {
      actorId: input.actorId,
      claimId: input.entityType === 'Claim' ? input.entityId : undefined,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: metadata as Prisma.InputJsonValue,
      hash,
      previousHash,
      createdAt,
    },
  });
}
