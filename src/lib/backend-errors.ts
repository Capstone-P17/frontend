export type BackendErrorKind =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'backend_unavailable'
  | 'unknown';

export class BackendError extends Error {
  readonly statusCode: number;
  readonly kind: BackendErrorKind;
  readonly body: unknown;

  constructor(statusCode: number, message: string, body: unknown = null) {
    super(message);
    this.name = 'BackendError';
    this.statusCode = statusCode;
    this.kind = errorKindForStatus(statusCode);
    this.body = body;
  }
}

export function errorKindForStatus(statusCode: number): BackendErrorKind {
  if (statusCode === 401) return 'unauthenticated';
  if (statusCode === 403) return 'forbidden';
  if (statusCode === 404) return 'not_found';
  if (statusCode === 400 || statusCode === 422) return 'validation';
  if (statusCode === 0 || statusCode >= 500) return 'backend_unavailable';
  return 'unknown';
}

export function extractBackendMessage(body: unknown, fallback: string): string {
  if (typeof body === 'string' && body.length > 0) return body;
  if (body && typeof body === 'object') {
    const candidate = body as Record<string, unknown>;
    const detail = candidate.detail ?? candidate.error ?? candidate.message;
    if (typeof detail === 'string' && detail.length > 0) return detail;
    if (Array.isArray(detail)) return detail.map(String).join('; ') || fallback;
  }
  return fallback;
}
