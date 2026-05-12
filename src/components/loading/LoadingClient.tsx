'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Job = {
  job_id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | string;
  analysis_id?: string | null;
  error?: string | null;
};

type Props = {
  repo: string;
  jobId: string;
};

export function LoadingClient({ repo, jobId }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<'waiting' | 'completed'>('waiting');
  const [jobStatus, setJobStatus] = useState('queued');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    async function poll() {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const response = await fetch(`/api/analysis/jobs/${encodeURIComponent(jobId)}`, { credentials: 'include', cache: 'no-store' });
        const data = (await response.json().catch(() => ({}))) as Job & { message?: string };
        if (!response.ok) throw new Error(data.message ?? data.error ?? '분석 작업 상태를 불러올 수 없습니다.');
        if (cancelled) return;

        setJobStatus(data.status);
        if (data.status === 'succeeded' && data.analysis_id) {
          setStatus('completed');
          window.setTimeout(() => {
            router.push(`/dashboard?repo=${encodeURIComponent(repo)}&analysis_id=${encodeURIComponent(data.analysis_id ?? '')}`);
          }, 900);
          return;
        }
        if (data.status === 'failed') {
          setError(data.error ?? '분석에 실패했습니다.');
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '분석 작업 상태를 불러올 수 없습니다.');
      } finally {
        inFlight = false;
      }
    }

    void poll();
    const interval = window.setInterval(() => void poll(), 2000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [jobId, repo, router]);

  if (error) {
    return (
      <section className="center-card error-card">
        <div className="error-icon">⚠️</div>
        <h1>분석에 실패했습니다</h1>
        <p>{error}</p>
        <button className="primary-button" onClick={() => router.push('/')}>처음으로</button>
      </section>
    );
  }

  return (
    <section className="load-wrap">
      <div className="load-ring" />
      <h1>{status === 'completed' ? '분석이 완료되었습니다.' : '결과를 기다리는 중입니다.'}</h1>
      <div className="load-repo">🔗 {repo}</div>
      <p>{status === 'completed' ? '결과 페이지로 이동 중입니다...' : 'GitHub 레포지토리를 다운로드하고 Java 소스코드를 rule-based로 분석하는 중입니다.'}</p>
      <p className="muted">현재 상태: {jobStatus}</p>
    </section>
  );
}
