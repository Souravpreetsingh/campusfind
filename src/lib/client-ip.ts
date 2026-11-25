/** Best-effort client IP extraction for rate limiting and audit metadata. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded
      .split(',')
      .map((value) => value.trim())
      .find(Boolean);
    if (first) return first.slice(0, 128);
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp.slice(0, 128);

  return 'unknown';
}
