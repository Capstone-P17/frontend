'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      router.push('/login');
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return <button className="primary-button" onClick={logout} disabled={pending}>{pending ? '로그아웃 중...' : '로그아웃'}</button>;
}
