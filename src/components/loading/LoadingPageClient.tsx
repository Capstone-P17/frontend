'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { BenchmarkScopeNotice, LoadingClient } from '@/components/loading/LoadingClient';
import { BackendError } from '@/lib/backend-errors';
import { createAnalysisJobClient, getCurrentUserClient } from '@/lib/client/backend';
import type { User } from '@/lib/types';

export function LoadingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const repo = searchParams.get('repo') ?? '';
  const jobId = searchParams.get('job_id');
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(!jobId);
  const startedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!repo) {
        setCreating(false);
        return;
      }
      try {
        const nextUser = await getCurrentUserClient();
        if (cancelled) return;
        setUser(nextUser);
        if (jobId) {
          setCreating(false);
          return;
        }
        if (startedRef.current) return;
        startedRef.current = true;
        const job = await createAnalysisJobClient(repo);
        if (!cancelled) router.replace(`/loading?repo=${encodeURIComponent(repo)}&job_id=${encodeURIComponent(job.job_id)}`);
      } catch (err) {
        if (err instanceof BackendError && err.kind === 'unauthenticated') {
          router.replace(`/login?return_to=${encodeURIComponent(`/loading?repo=${encodeURIComponent(repo)}`)}`);
          return;
        }
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '분석 작업을 시작할 수 없습니다.');
          setCreating(false);
        }
      }
    }

    void start();
    return () => { cancelled = true; };
  }, [jobId, repo, router]);

  if (!repo) return <Shell user={user}><section className="error-card"><h1>분석할 GitHub 저장소 URL이 없습니다.</h1></section></Shell>;

  if (error) {
    return <Shell user={user} active="loading"><section className="center-card error-card"><div className="error-icon">⚠️</div><h1>분석에 실패했습니다</h1><p>{error}</p></section></Shell>;
  }

  if (creating || !jobId) {
    return <Shell user={user} active="loading"><section className="load-wrap"><div className="load-ring" /><h1>분석 작업을 준비하는 중입니다.</h1><div className="load-repo">🔗 {repo}</div><BenchmarkScopeNotice /></section></Shell>;
  }

  return <Shell user={user} active="loading"><LoadingClient repo={repo} jobId={jobId} /></Shell>;
}
