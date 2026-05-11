'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Job = { job_id: string; status: string; analysis_id?: string; error?: string };

type Props = { repo: string; initialJobId?: string };

export function LoadingClient({ repo, initialJobId }: Props) {
  const router = useRouter();
  const started = useRef(false);
  const [jobId, setJobId] = useState(initialJobId ?? '');
  const [status, setStatus] = useState(initialJobId ? 'queued' : 'pending');
  const [error, setError] = useState('');

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;

    async function createJob(): Promise<string> {
      if (jobId) return jobId;
      const response = await fetch('/api/analysis/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: repo }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.job_id) throw new Error(data.message ?? data.error ?? '분석 작업 생성에 실패했습니다.');
      if (!cancelled) {
        setJobId(data.job_id);
        setStatus(data.status ?? 'queued');
      }
      return data.job_id;
    }

    async function poll(id: string) {
      const response = await fetch(`/api/analysis/jobs/${encodeURIComponent(id)}`, { credentials: 'include', cache: 'no-store' });
      const data = (await response.json().catch(() => ({}))) as Job & { message?: string };
      if (!response.ok) throw new Error(data.message ?? data.error ?? '분석 작업 상태를 불러올 수 없습니다.');
      if (cancelled) return;
      setStatus(data.status);
      if (data.status === 'succeeded' && data.analysis_id) {
        router.push(`/dashboard?repo=${encodeURIComponent(repo)}&analysis_id=${encodeURIComponent(data.analysis_id)}`);
        return;
      }
      if (data.status === 'failed') {
        setError(data.error ?? '분석에 실패했습니다.');
        return;
      }
      window.setTimeout(() => void poll(id).catch((err) => setError(err instanceof Error ? err.message : '분석 작업 상태를 불러올 수 없습니다.')), 2000);
    }

    createJob().then((id) => poll(id)).catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : '분석 작업을 시작할 수 없습니다.');
    });

    return () => {
      cancelled = true;
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
      <h1>{status === 'queued' || status === 'pending' ? '보안 취약점 분석 준비 중...' : '보안 취약점 분석 중...'}</h1>
      <div className="load-repo">🔗 {repo}</div>
      <p>GitHub 레포지토리를 다운로드하고 Java 소스코드를 rule-based로 분석하는 중입니다.</p>
      <p>상태: {status} · 레포지토리 크기에 따라 수 분이 소요될 수 있습니다.</p>
    </section>
  );
}
