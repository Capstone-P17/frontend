import { PUBLIC_BACKEND_BASE_URL } from '@/lib/backend-url';
import { BackendError, extractBackendMessage } from '@/lib/backend-errors';
import type { User } from '@/lib/types';

export type RequestQuery = Record<string, string | number | boolean | null | undefined>;

export type ClientBackendRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: RequestQuery;
};

export type AnalysisJob = {
  job_id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | string;
  analysis_id?: string | null;
  error?: string | null;
  created_at?: string;
  updated_at?: string;
};

function buildUrl(path: string, query?: RequestQuery): string {
  const url = new URL(`${PUBLIC_BACKEND_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export function buildReportDownloadFilename(analysisId: string): string {
  const prefix = analysisId.trim().slice(0, 8);
  return `report-${prefix || 'analysis'}.pdf`;
}

function cleanDownloadFilename(filename: string): string | null {
  const clean = filename.trim().replace(/[\u0000-\u001f\u007f/\\]/g, '_');
  if (!clean || clean === '.' || clean === '..') return null;
  return clean;
}

function decodeRfc5987Filename(value: string): string | null {
  const match = value.match(/^([^']*)'[^']*'(.*)$/);
  if (!match) return null;
  const [, charset, encodedFilename] = match;
  if (charset && charset.toLowerCase() !== 'utf-8') return null;
  try {
    return decodeURIComponent(encodedFilename);
  } catch {
    return null;
  }
}

function unquoteHeaderValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1).replace(/\\(["\\])/g, '$1');
  return trimmed;
}

export function filenameFromContentDisposition(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;

  const encodedMatch = contentDisposition.match(/(?:^|;)\s*filename\*\s*=\s*("[^"]*"|[^;]+)/i);
  if (encodedMatch) {
    const decoded = decodeRfc5987Filename(unquoteHeaderValue(encodedMatch[1]));
    const clean = decoded ? cleanDownloadFilename(decoded) : null;
    if (clean) return clean;
  }

  const plainMatch = contentDisposition.match(/(?:^|;)\s*filename\s*=\s*("(?:\\["\\]|[^"])*"|[^;]+)/i);
  if (!plainMatch) return null;
  return cleanDownloadFilename(unquoteHeaderValue(plainMatch[1]));
}

export async function clientBackendRequest<T>(path: string, options: ClientBackendRequestOptions = {}): Promise<T> {
  const method = options.method ?? (options.body === undefined ? 'GET' : 'POST');
  const requestHeaders = new Headers({ Accept: 'application/json' });
  if (options.body !== undefined) requestHeaders.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers: requestHeaders,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'include',
      cache: 'no-store',
    });
  } catch (error) {
    throw new BackendError(0, `백엔드에 연결할 수 없습니다: ${String(error)}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('json') ? await response.json().catch(() => null) : await response.text().catch(() => '');

  if (!response.ok) throw new BackendError(response.status, extractBackendMessage(body, '백엔드 요청에 실패했습니다.'), body);
  if (body === '' || body === null) return {} as T;
  return body as T;
}

export async function getCurrentUserClient(): Promise<User> {
  return clientBackendRequest<User>('/auth/me');
}

export async function getOptionalCurrentUserClient(): Promise<User | null> {
  try {
    return await getCurrentUserClient();
  } catch (error) {
    if (error instanceof BackendError && ['unauthenticated', 'not_found'].includes(error.kind)) return null;
    return null;
  }
}

export async function logoutClient(): Promise<Record<string, unknown>> {
  return clientBackendRequest<Record<string, unknown>>('/auth/logout', { method: 'POST' });
}

export async function createAnalysisJobClient(repoUrl: string): Promise<AnalysisJob> {
  return clientBackendRequest<AnalysisJob>('/analyze/repository/jobs', { method: 'POST', body: { url: repoUrl } });
}

export async function getAnalysisJobClient(jobId: string): Promise<AnalysisJob> {
  return clientBackendRequest<AnalysisJob>(`/analyze/jobs/${encodeURIComponent(jobId)}`);
}

export async function getAnalysisResultClient(analysisId?: string | null): Promise<Record<string, unknown>> {
  if (analysisId) return clientBackendRequest<Record<string, unknown>>(`/result/${encodeURIComponent(analysisId)}`);
  return clientBackendRequest<Record<string, unknown>>('/result');
}

export async function getFindingDetailClient(analysisId: string, findingId: string): Promise<Record<string, unknown>> {
  return clientBackendRequest<Record<string, unknown>>(
    `/result/${encodeURIComponent(analysisId)}/findings/${encodeURIComponent(findingId)}`,
  );
}

export async function listResultsClient(limit = 5): Promise<Record<string, unknown>> {
  return clientBackendRequest<Record<string, unknown>>('/results', { query: { limit } });
}

export async function getCapabilitiesClient(): Promise<Record<string, unknown>> {
  return clientBackendRequest<Record<string, unknown>>('/capabilities');
}

export async function downloadReportClient(analysisId: string): Promise<void> {
  const trimmedAnalysisId = analysisId.trim();
  if (!trimmedAnalysisId) throw new BackendError(400, 'PDF를 다운로드할 분석 ID가 없습니다.');

  let response: Response;
  try {
    response = await fetch(buildUrl(`/report/${encodeURIComponent(trimmedAnalysisId)}`), {
      method: 'GET',
      headers: { Accept: 'application/pdf' },
      credentials: 'include',
      cache: 'no-store',
    });
  } catch (error) {
    throw new BackendError(0, `백엔드에 연결할 수 없습니다: ${String(error)}`);
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? '';
    const body = contentType.includes('json') ? await response.json().catch(() => null) : await response.text().catch(() => '');
    throw new BackendError(response.status, extractBackendMessage(body, 'PDF 다운로드에 실패했습니다.'), body);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filenameFromContentDisposition(response.headers.get('content-disposition')) ?? buildReportDownloadFilename(trimmedAnalysisId);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}
