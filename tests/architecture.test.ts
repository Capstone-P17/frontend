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

  it('only allows approved browser same-origin route handlers', () => {
    const routeFiles = walk(path.join(root, 'src/app/api')).filter((file) => file.endsWith('/route.ts')).map((file) => rel(file).replace(/^src\/app/, '').replace(/\/route\.ts$/, ''));
    expect(routeFiles.sort()).toEqual([...ROUTE_HANDLER_ALLOWLIST].sort());
    expect(routeFiles.some((file) => file.includes('[...') || file.includes('/proxy') || file.includes('/backend'))).toBe(false);
  });

  it('backend client forwards cookies server-side without bearer authorization and disables cache', () => {
    const source = fs.readFileSync(path.join(root, 'src/lib/server/backend.ts'), 'utf8');
    expect(source).toContain("requestHeaders.set('Cookie'");
    expect(source).not.toContain("requestHeaders.set('Authorization'");
    expect(source).toContain("cache: 'no-store'");
  });



  it('logout route expires auth cookies on the Next response', () => {
    const source = fs.readFileSync(path.join(root, 'src/app/api/auth/logout/route.ts'), 'utf8');
    expect(source).toContain('expireAuthCookies(response)');
    expect(source).toContain('AUTH_COOKIE_NAME');
    expect(source).toContain('OAUTH_STATE_COOKIE_NAME');
    expect(source).toContain('response.cookies.set');
  });

  it('dynamic pages opt out of static authenticated rendering', () => {
    for (const file of ['src/app/login/page.tsx', 'src/app/auth/callback/page.tsx', 'src/app/loading/page.tsx', 'src/app/dashboard/page.tsx', 'src/app/analysis/page.tsx']) {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      expect(source, file).toContain("dynamic = 'force-dynamic'");
      expect(source, file).toContain('revalidate = 0');
    }
  });
});
