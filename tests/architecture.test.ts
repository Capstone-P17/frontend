import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ROUTE_HANDLER_ALLOWLIST } from '@/lib/routes';

const root = process.cwd();

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function rel(file: string): string {
  return file.replace(root + path.sep, '').split(path.sep).join('/');
}

describe('architecture boundaries', () => {
  it('server modules include server-only protection', () => {
    const files = walk(path.join(root, 'src/lib/server')).filter((file) => file.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      if (file.endsWith('/errors.ts')) continue;
      expect(fs.readFileSync(file, 'utf8'), rel(file)).toContain("import 'server-only'");
    }
  });

  it('client components do not import server-only modules', () => {
    const files = walk(path.join(root, 'src')).filter((file) => /\.(ts|tsx)$/.test(file));
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      if (!source.startsWith("'use client'")) continue;
      expect(source, rel(file)).not.toMatch(/@\/lib\/server|\.\.\/.*lib\/server/);
    }
  });

  it('does not define Next API route handlers for static deployment', () => {
    const routeFiles = walk(path.join(root, 'src/app/api')).filter((file) => file.endsWith('/route.ts')).map((file) => rel(file));
    expect(routeFiles).toEqual([]);
    expect(ROUTE_HANDLER_ALLOWLIST).toEqual([]);
  });

  it('backend client forwards cookies server-side without bearer authorization and disables cache', () => {
    const source = fs.readFileSync(path.join(root, 'src/lib/server/backend.ts'), 'utf8');
    expect(source).toContain("requestHeaders.set('Cookie'");
    expect(source).not.toContain("requestHeaders.set('Authorization'");
    expect(source).toContain("cache: 'no-store'");
  });

  it('uses the documented asynchronous repository analysis API contract', () => {
    const source = fs.readFileSync(path.join(root, 'src/lib/server/backend.ts'), 'utf8');
    expect(source).toContain("'/analyze/repository/jobs'");
    expect(source).toContain('body: { url: repoUrl }');
    expect(source).toContain('`/analyze/jobs/${encodeURIComponent(jobId)}`');
    expect(source).toContain('`/result/${encodeURIComponent(analysisId)}`');
  });

  it('downloads PDF reports directly from the backend with cookie credentials', () => {
    const clientSource = fs.readFileSync(path.join(root, 'src/lib/client/backend.ts'), 'utf8');
    const buttonSource = fs.readFileSync(path.join(root, 'src/components/analysis/ReportDownloadButton.tsx'), 'utf8');
    expect(clientSource).toContain('`/report/${encodeURIComponent(trimmedAnalysisId)}`');
    expect(clientSource).toContain("credentials: 'include'");
    expect(clientSource).toContain("Accept: 'application/pdf'");
    expect(clientSource).toContain('response.blob()');
    expect(buttonSource).toContain('downloadReportClient(analysisId)');
  });

  it('keeps the repository submit form usable before client hydration', () => {
    const source = fs.readFileSync(path.join(root, 'src/components/home/RepoSubmitForm.tsx'), 'utf8');
    expect(source).toContain('action="/loading"');
    expect(source).toContain('method="get"');
    expect(source).toContain('name="repo"');
    expect(source).toContain('event.preventDefault()');
  });

  it('creates missing loading jobs client-side and polls backend without page refresh', () => {
    const pageSource = fs.readFileSync(path.join(root, 'src/components/loading/LoadingPageClient.tsx'), 'utf8');
    const clientSource = fs.readFileSync(path.join(root, 'src/components/loading/LoadingClient.tsx'), 'utf8');
    expect(pageSource).toContain('createAnalysisJobClient(repo)');
    expect(pageSource).toContain('job_id=${encodeURIComponent(job.job_id)}');
    expect(pageSource).toContain('LoadingClient');
    expect(pageSource).not.toContain('<meta httpEquiv="refresh"');
    expect(clientSource).toContain('getAnalysisJobClient(jobId)');
    expect(clientSource).toContain('window.setInterval');
    expect(clientSource).toContain('결과를 기다리는 중입니다.');
    expect(clientSource).toContain('분석이 완료되었습니다.');
    expect(clientSource).toContain('결과 페이지로 이동 중입니다...');
    expect(clientSource).not.toContain('Polling:');
  });

  it('logout uses the deployed backend directly instead of a Next route handler', () => {
    const authMenuSource = fs.readFileSync(path.join(root, 'src/components/layout/AuthMenu.tsx'), 'utf8');
    const logoutButtonSource = fs.readFileSync(path.join(root, 'src/components/layout/LogoutButton.tsx'), 'utf8');
    expect(authMenuSource).toContain('logoutClient()');
    expect(logoutButtonSource).toContain('logoutClient()');
    expect(authMenuSource).not.toContain('/api/auth/logout');
    expect(logoutButtonSource).not.toContain('/api/auth/logout');
  });

  it('authenticated app pages delegate auth/data loading to client components', () => {
    const pages = [
      ['src/app/login/page.tsx', 'LoginClient'],
      ['src/app/auth/callback/page.tsx', 'AuthCallbackClient'],
      ['src/app/loading/page.tsx', 'LoadingPageClient'],
      ['src/app/dashboard/page.tsx', 'DashboardClient'],
      ['src/app/analysis/page.tsx', 'AnalysisClient'],
    ] as const;

    for (const [file, component] of pages) {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      expect(source, file).toContain(component);
      expect(source, file).not.toContain('@/lib/server/backend');
      expect(source, file).not.toContain('getCurrentUser');
    }

    const clientSource = fs.readFileSync(path.join(root, 'src/lib/client/backend.ts'), 'utf8');
    expect(clientSource).toContain("credentials: 'include'");
    expect(clientSource).toContain('PUBLIC_BACKEND_BASE_URL');
  });
});
