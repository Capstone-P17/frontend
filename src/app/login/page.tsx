import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { BACKEND_BASE_URL, getOptionalCurrentUser } from '@/lib/server/backend';
import { safeReturnTo } from '@/lib/routes';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function first(value: string | string[] | undefined): string | undefined { return Array.isArray(value) ? value[0] : value; }

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const user = await getOptionalCurrentUser();
  const returnTo = safeReturnTo(first(params.return_to), '/');
  const error = first(params.auth_error) ?? first(params.error);
  if (user && first(params.autoredirect) === '1') redirect(returnTo);
  const loginUrl = `${BACKEND_BASE_URL}/auth/github`;

  return (
    <Shell user={user} active="login">
      <section className="hero">
        <div className="center-card" style={{ maxWidth: 460, margin: '40px auto' }}>
          <h1><span>P</span>17</h1>
          {error ? <p className="form-error">{error === 'auth_failed' ? '인증 확인에 실패했습니다. 다시 로그인해 주세요.' : error}</p> : null}
          {user ? (
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
