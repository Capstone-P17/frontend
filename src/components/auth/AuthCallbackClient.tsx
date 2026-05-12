'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { Shell } from '@/components/layout/Shell';
import { getCurrentUserClient } from '@/lib/client/backend';
import { safeReturnTo } from '@/lib/routes';

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const returnTo = safeReturnTo(searchParams.get('return_to') ?? undefined, '/');
    getCurrentUserClient()
      .then(() => router.replace(returnTo))
      .catch((error) => router.replace(`/login?error=${encodeURIComponent(error instanceof Error ? error.message : 'auth_failed')}`));
  }, [router, searchParams]);

  return <Shell><section className="load-wrap"><div className="load-ring" /><h1>로그인 처리 중...</h1></section></Shell>;
}
