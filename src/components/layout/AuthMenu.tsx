'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logoutClient } from '@/lib/client/backend';
import type { User } from '@/lib/types';

type Props = {
  user?: User | null;
  loginUrl: string;
};

const LOGIN_PENDING_KEY = 'p17_login_pending';

function userLabel(user?: User | null): string {
  return user?.github_login ?? user?.display_name ?? user?.email ?? '사용자';
}

function avatarFallback(user?: User | null): string {
  const label = userLabel(user).trim();
  return label ? label.slice(0, 1).toUpperCase() : 'U';
}

function GitHubIcon() {
  return (
    <svg className="github-login-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2.02c-3.22.7-3.9-1.39-3.9-1.39-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.2 1.78 1.2 1.04 1.77 2.72 1.26 3.38.96.11-.75.41-1.26.74-1.55-2.57-.29-5.27-1.28-5.27-5.72 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .98-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.45-2.71 5.43-5.29 5.72.42.36.79 1.07.79 2.16v3.04c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

export function AuthMenu({ user, loginUrl }: Props) {
  const router = useRouter();
  const [loginPending, setLoginPending] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth');
    const authError = params.get('auth_error') ?? params.get('error');
    const hadPendingLogin = window.sessionStorage.getItem(LOGIN_PENDING_KEY) === '1';

    if (user && (hadPendingLogin || authStatus === 'success')) {
      window.sessionStorage.removeItem(LOGIN_PENDING_KEY);
      toast.success(`안녕하세요, ${userLabel(user)}님`);
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }

    if (authError) {
      window.sessionStorage.removeItem(LOGIN_PENDING_KEY);
      toast.error(authError === 'auth_failed' ? 'GitHub 로그인에 실패했습니다.' : authError);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [user]);

  function login() {
    setLoginPending(true);
    window.sessionStorage.setItem(LOGIN_PENDING_KEY, '1');
    toast.loading('GitHub 로그인 중입니다.', { id: 'github-login' });
    window.location.assign(loginUrl);
  }

  async function logout() {
    setLogoutPending(true);
    const toastId = toast.loading('로그아웃 중입니다...');
    try {
      await logoutClient();
      toast.success('로그아웃되었습니다.', { id: toastId });
      router.push('/');
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '로그아웃에 실패했습니다.', { id: toastId });
      setLogoutPending(false);
    }
  }

  if (!user) {
    return (
      <Button className="github-login-button" variant="outline" size="lg" type="button" disabled={loginPending} onClick={login}>
        <GitHubIcon />
        <span>{loginPending ? 'GitHub 로그인 중입니다.' : 'GitHub 로그인'}</span>
      </Button>
    );
  }

  const label = userLabel(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="profile-trigger" aria-label="프로필 메뉴 열기">
        {user.avatar_url ? <Image src={user.avatar_url} alt="" className="profile-avatar" width={34} height={34} /> : <span className="profile-avatar profile-avatar-fallback">{avatarFallback(user)}</span>}
        <span className="profile-name">{label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="profile-menu">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="profile-menu-label">
            <span className="profile-menu-name">{label}</span>
            {user.email ? <span className="profile-menu-email">{user.email}</span> : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="profile-menu-logout" variant="destructive" onClick={logout} disabled={logoutPending}>
          {logoutPending ? '로그아웃 중...' : '로그아웃'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
