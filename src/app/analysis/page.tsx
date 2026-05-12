import { Suspense } from 'react';
import { AnalysisClient } from '@/components/analysis/AnalysisClient';

export default function AnalysisPage() {
  return <Suspense fallback={null}><AnalysisClient /></Suspense>;
}
