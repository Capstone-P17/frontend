'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { PUBLIC_BACKEND_BASE_URL } from '@/lib/backend-url';
import { getOptionalCurrentUserClient } from '@/lib/client/backend';
import { safeReturnTo } from '@/lib/routes';
import type { User } from '@/lib/types';

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const returnTo = useMemo(() => safeReturnTo(searchParams.get('return_to') ?? undefined, '/'), [searchParams]);
  const error = searchParams.get('auth_error') ?? searchParams.get('error');
  const loginUrl = `${PUBLIC_BACKEND_BASE_URL}/auth/github`;

  useEffect(() => {
    let cancelled = false;
    getOptionalCurrentUserClient().then((nextUser) => {
      if (cancelled) return;
      setUser(nextUser);
      setLoading(false);
      if (nextUser && searchParams.get('autoredirect') === '1') router.replace(returnTo);
    });
    return () => { cancelled = true; };
  }, [returnTo, router, searchParams]);

  return (
    <Shell user={user} active="login">
      <section className="hero">
        <div className="center-card" style={{ maxWidth: 460, margin: '40px auto' }}>
          <h1><span>P</span>17</h1>
          {error ? <p className="form-error">{error === 'auth_failed' ? '인증 확인에 실패했습니다. 다시 로그인해 주세요.' : error}</p> : null}
          {loading ? <p className="muted">로그인 상태를 확인하는 중입니다.</p> : user ? (
            <>
              <p>현재 <b>{user.github_login ?? user.display_name ?? '사용자'}</b> 계정으로 로그인되어 있습니다.</p>
              <LogoutButton />
              <p><Link href={returnTo}>돌아가기</Link></p>
            </>
          ) : (
            <>
              <p className="muted">GitHub 계정으로 로그인하여 취약점 분석을 시작하세요.</p>
              <a className="primary-button" href={loginUrl}>GitHub 로그인</a>
              <p className="muted">GitHub 로그인을 통해 JWT 인증 기반 소스코드 분석 기능을 이용할 수 있습니다.</p>
            </>
          )}
        </div>
      </section>
    </Shell>
  );
}
