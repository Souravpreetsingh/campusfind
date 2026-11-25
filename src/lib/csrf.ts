/** Same-origin enforcement for state-changing browser requests. */
export class CsrfError extends Error {
  constructor() {
    super('Cross-site requests are not allowed.');
    this.name = 'CsrfError';
  }
}

function reject(): never {
  throw new CsrfError();
}

function sameTarget(origin: string, requestUrl: URL): boolean {
  try {
    const candidate = new URL(origin);
    return (
      candidate.protocol === requestUrl.protocol &&
      candidate.host === requestUrl.host &&
      candidate.username === '' &&
      candidate.password === ''
    );
  } catch {
    return false;
  }
}

/**
 * Rejects cross-site browser requests. Non-browser clients that send none of
 * the browser-supplied origin headers are allowed.
 */
export function assertSameOrigin(request: Request): void {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite.toLowerCase() === 'cross-site') reject();

  const requestUrl = new URL(request.url);
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  if (!fetchSite && !origin && !referer) return;

  if (origin && origin !== 'null' && !sameTarget(origin, requestUrl)) reject();
  if (origin === 'null') reject();

  if (referer && !sameTarget(referer, requestUrl)) reject();
}
