import 'server-only';

import { cookies, headers } from 'next/headers';
import { BackendError, extractBackendMessage } from '@/lib/backend-errors';
import { PUBLIC_BACKEND_BASE_URL } from '@/lib/backend-url';
import type { User } from '@/lib/types';

export { PUBLIC_BACKEND_BASE_URL };
export type RequestQuery = Record<string, string | number | boolean | null | undefined>;

export type BackendRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: RequestQuery;
  includeAuth?: boolean;
  cookieHeaderOverride?: string;
};

function buildUrl(path: string, query?: RequestQuery): string {
  const url = new URL(`${PUBLIC_BACKEND_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export function serializeCookiePairs(pairs: Array<{ name: string; value: string }>): string {
  return pairs
    .filter((cookie) => cookie.name && cookie.value !== undefined)
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
}

async function incomingCookieHeader(): Promise<string> {
  const headerCookie = (await headers()).get('cookie');
  if (headerCookie) return headerCookie;
  const cookieStore = await cookies();
  return serializeCookiePairs(cookieStore.getAll().map(({ name, value }) => ({ name, value })));
}

export async function backendRequest<T>(path: string, options: BackendRequestOptions = {}): Promise<T> {
  const method = options.method ?? (options.body === undefined ? 'GET' : 'POST');
  const requestHeaders = new Headers({ Accept: 'application/json' });
  if (options.body !== undefined) requestHeaders.set('Content-Type', 'application/json');

  if (options.includeAuth !== false) {
    const cookieHeader = options.cookieHeaderOverride ?? (await incomingCookieHeader());
    if (cookieHeader) requestHeaders.set('Cookie', cookieHeader);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers: requestHeaders,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: 'no-store',
    });
  } catch (error) {
    throw new BackendError(0, `백엔드에 연결할 수 없습니다: ${String(error)}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('json') ? await response.json().catch(() => null) : await response.text().catch(() => '');

  if (!response.ok) {
    throw new BackendError(response.status, extractBackendMessage(body, '백엔드 요청에 실패했습니다.'), body);
  }

  if (body === '' || body === null) return {} as T;
  return body as T;
}


export type AnalysisJob = {
  job_id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | string;
  phase?: string;
  message?: string;
  progress?: {
    percent?: number;
    files_analyzed?: number;
    files_total?: number;
    findings_total?: number;
    finding_reports_completed?: number;
    finding_reports_total?: number;
  };
  analysis_id?: string | null;
  error?: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function getCurrentUser(): Promise<User> {
  return backendRequest<User>('/auth/me');
}

export async function getOptionalCurrentUser(): Promise<User | null> {
  try {
    return await getCurrentUser();
  } catch (error) {
    if (error instanceof BackendError && ['unauthenticated', 'not_found'].includes(error.kind)) return null;
    return null;
  }
}

export async function logout(): Promise<Record<string, unknown>> {
  return backendRequest<Record<string, unknown>>('/auth/logout', { method: 'POST' });
}

export async function getCapabilities(): Promise<Record<string, unknown>> {
  return backendRequest<Record<string, unknown>>('/capabilities', { includeAuth: false });
}

export async function createAnalysisJob(repoUrl: string): Promise<AnalysisJob> {
  return backendRequest<AnalysisJob>('/analyze/repository/jobs', { method: 'POST', body: { url: repoUrl } });
}

export async function getAnalysisJob(jobId: string): Promise<AnalysisJob> {
  return backendRequest<AnalysisJob>(`/analyze/jobs/${encodeURIComponent(jobId)}`);
}

export async function getAnalysisResult(analysisId?: string | null): Promise<Record<string, unknown>> {
  if (analysisId) return backendRequest<Record<string, unknown>>(`/result/${encodeURIComponent(analysisId)}`);
  return backendRequest<Record<string, unknown>>('/result');
}

export async function listResults(limit = 5): Promise<Record<string, unknown>> {
  return backendRequest<Record<string, unknown>>('/results', { query: { limit } });
}
