export const ROUTE_HANDLER_ALLOWLIST = [] as const;

export type SearchLike = URLSearchParams | Record<string, string | string[] | undefined>;

function readParam(params: SearchLike, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function appendIfPresent(url: URL, source: SearchLike, key: string): void {
  const value = readParam(source, key);
  if (value) url.searchParams.set(key, value);
}

export function canonicalPathForLegacyPage(page: string | undefined): string | null {
  switch (page) {
    case 'login':
      return '/login';
    case 'loading':
      return '/loading';
    case 'dashboard':
      return '/analysis';
    case 'analysis':
      return '/analysis';
    default:
      return null;
  }
}

export function buildLegacyRedirectUrl(params: SearchLike, origin = 'http://localhost:3000'): string | null {
  const targetPath = canonicalPathForLegacyPage(readParam(params, 'page'));
  if (!targetPath) return null;
  const url = new URL(targetPath, origin);
  for (const key of ['repo', 'analysis_id', 'finding', 'auth_error', 'error', 'return_to']) {
    appendIfPresent(url, params, key);
  }
  return `${url.pathname}${url.search}`;
}

export function buildDashboardHref(repo: string, analysisId?: string | null): string {
  return buildAnalysisHref(repo, analysisId);
}

export function buildAnalysisHref(repo: string, analysisId?: string | null): string {
  const params = new URLSearchParams();
  if (repo) params.set('repo', repo);
  if (analysisId) params.set('analysis_id', analysisId);
  const query = params.toString();
  return `/analysis${query ? `?${query}` : ''}`;
}

export function buildFindingHref(repo: string, analysisId: string | null | undefined, findingId: string | null | undefined): string {
  const params = new URLSearchParams();
  if (repo) params.set('repo', repo);
  if (analysisId) params.set('analysis_id', analysisId);
  if (findingId) params.set('finding', findingId);
  const query = params.toString();
  return `/analysis${query ? `?${query}` : ''}`;
}

export function safeReturnTo(value: string | undefined, fallback = '/'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}
