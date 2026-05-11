import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, EXPIRED_COOKIE_OPTIONS, OAUTH_STATE_COOKIE_NAME } from '@/lib/auth-cookies';
import { logout } from '@/lib/server/backend';
import { BackendError } from '@/lib/server/errors';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function expireAuthCookies(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE_NAME, '', EXPIRED_COOKIE_OPTIONS);
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, '', EXPIRED_COOKIE_OPTIONS);
}

export async function POST() {
  try {
    const body = await logout();
    const response = NextResponse.json(body, { status: 200 });
    expireAuthCookies(response);
    return response;
  } catch (error) {
    const status = error instanceof BackendError && error.statusCode > 0 ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : '로그아웃에 실패했습니다.';
    const response = NextResponse.json({ message }, { status });
    if (status === 401) expireAuthCookies(response);
    return response;
  }
}
