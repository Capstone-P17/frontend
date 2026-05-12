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

export async function listResultsClient(limit = 5): Promise<Record<string, unknown>> {
  return clientBackendRequest<Record<string, unknown>>('/results', { query: { limit } });
}
