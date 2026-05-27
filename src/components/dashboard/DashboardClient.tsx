'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { getAnalysisResultClient, getCurrentUserClient } from '@/lib/client/backend';
import { BackendError } from '@/lib/backend-errors';
import { buildDashboardViewModel, type DashboardViewModel } from '@/lib/view-models/analysis';
import type { User } from '@/lib/types';

function loginReturnTo(repo: string, analysisId: string | null): string {
  return `/dashboard?repo=${encodeURIComponent(repo)}${analysisId ? `&analysis_id=${encodeURIComponent(analysisId)}` : ''}`;
}

export function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRepo = searchParams.get('repo') ?? '';
  const analysisId = searchParams.get('analysis_id');
  const [user, setUser] = useState<User | null>(null);
  const [vm, setVm] = useState<DashboardViewModel | null>(null);
  const [repo, setRepo] = useState(requestedRepo);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError('');
      try {
        const nextUser = await getCurrentUserClient();
        if (cancelled) return;
        setUser(nextUser);
        const result = await getAnalysisResultClient(analysisId);
        if (cancelled) return;
        const nextVm = buildDashboardViewModel(result);
        setVm(nextVm);
        setRepo(nextVm.repo_url || requestedRepo);
      } catch (err) {
        if (err instanceof BackendError && err.kind === 'unauthenticated') {
          router.replace(`/login?return_to=${encodeURIComponent(loginReturnTo(requestedRepo, analysisId))}`);
          return;
        }
        if (!cancelled) setError(err instanceof Error ? err.message : '대시보드를 불러올 수 없습니다.');
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [analysisId, requestedRepo, router]);

  if (error) {
    return <Shell user={user} active="dashboard"><section className="center-card error-card"><h1>대시보드를 불러올 수 없습니다</h1><p>{error}</p></section></Shell>;
  }

  if (!vm) {
    return <Shell user={user} active="dashboard"><section className="load-wrap"><div className="load-ring" /><h1>대시보드를 불러오는 중입니다.</h1></section></Shell>;
  }

  const currentAnalysisId = vm.analysis_id || analysisId;
  return <Shell user={user} active="dashboard" repo={repo} analysisId={currentAnalysisId} showAnalysisPanel><DashboardView vm={vm} repo={repo} analysisId={currentAnalysisId} /></Shell>;
}
