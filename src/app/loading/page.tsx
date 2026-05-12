import { Suspense } from 'react';
import { LoadingPageClient } from '@/components/loading/LoadingPageClient';

export default function LoadingPage() {
  return <Suspense fallback={null}><LoadingPageClient /></Suspense>;
}
