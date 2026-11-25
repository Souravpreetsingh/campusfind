import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthorizationError } from '@/lib/auth';
import { CsrfError } from '@/lib/csrf';
import { logError, logWarn } from '@/lib/logger';
import { RateLimitError } from '@/lib/rate-limit';

export class NotFoundError extends Error {
  constructor(message = 'Resource not found.') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message = 'The requested state change is not allowed.') {
    super(message);
    this.name = 'ConflictError';
  }
}

export function jsonError(
  message: string,
  status: number,
  options?: { details?: unknown; headers?: HeadersInit },
) {
  return NextResponse.json(
    { error: message, ...(options?.details ? { details: options.details } : {}) },
    { status, ...(options?.headers ? { headers: options.headers } : {}) },
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return jsonError(error.message, error.message.includes('Authentication') ? 401 : 403);
  }

  if (error instanceof CsrfError) {
    return jsonError('Forbidden.', 403);
  }

  if (error instanceof RateLimitError) {
    return jsonError(error.message, 429, {
      headers: { 'Retry-After': String(error.retryAfter) },
    });
  }

  if (error instanceof NotFoundError) {
    return jsonError(error.message, 404);
  }

  if (error instanceof ConflictError) {
    return jsonError(error.message, 409);
  }

  if (error instanceof ZodError) {
    logWarn('api.validation_failed', { reason: 'invalid_input' });
    logError('api.validation_details', error, { reason: 'invalid_input' });
    return jsonError('Invalid request.', 400);
  }

  logError('api.unhandled_error', error, { reason: 'unhandled' });
  return jsonError('Internal server error.', 500);
}

export function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
