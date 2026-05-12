import { Suspense } from 'react';
import { LoginClient } from '@/components/login/LoginClient';

export default function LoginPage() {
  return <Suspense fallback={null}><LoginClient /></Suspense>;
}
