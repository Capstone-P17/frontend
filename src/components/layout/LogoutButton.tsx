'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { logoutClient } from '@/lib/client/backend';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await logoutClient();
      router.push('/login');
    } finally {
      setPending(false);
    }
  }

  return <button className="primary-button" onClick={logout} disabled={pending}>{pending ? '로그아웃 중...' : '로그아웃'}</button>;
}
