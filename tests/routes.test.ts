import { describe, expect, it } from 'vitest';
import { buildDashboardHref, buildLegacyRedirectUrl, ROUTE_HANDLER_ALLOWLIST, safeReturnTo } from '@/lib/routes';

describe('route helpers', () => {
  it('redirects legacy pages to canonical routes and preserves query parameters', () => {
    expect(buildLegacyRedirectUrl(new URLSearchParams('page=login'))).toBe('/login');
    expect(buildLegacyRedirectUrl(new URLSearchParams('page=loading&repo=x'))).toBe('/loading?repo=x');
    expect(buildLegacyRedirectUrl(new URLSearchParams('page=dashboard&repo=x&analysis_id=y'))).toBe('/dashboard?repo=x&analysis_id=y');
    expect(buildLegacyRedirectUrl(new URLSearchParams('page=analysis&repo=x&analysis_id=y'))).toBe('/analysis?repo=x&analysis_id=y');
  });

  it('preserves auth_error and error in legacy login redirects', () => {
    expect(buildLegacyRedirectUrl(new URLSearchParams('page=login&auth_error=expired&error=auth_failed'))).toBe('/login?auth_error=expired&error=auth_failed');
  });

  it('returns null for unknown legacy pages and protects return_to', () => {
    expect(buildLegacyRedirectUrl(new URLSearchParams('page=unknown'))).toBeNull();
    expect(safeReturnTo('//evil.example')).toBe('/');
    expect(safeReturnTo('/dashboard')).toBe('/dashboard');
  });

  it('keeps route handler allowlist empty for static deployment', () => {
    expect(ROUTE_HANDLER_ALLOWLIST).toEqual([]);
    expect(buildDashboardHref('repo', 'id')).toBe('/dashboard?repo=repo&analysis_id=id');
  });
});
