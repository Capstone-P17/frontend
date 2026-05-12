import { redirect } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { createAnalysisJob, getAnalysisJob, getCurrentUser } from '@/lib/server/backend';
import { BackendError } from '@/lib/server/errors';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
function first(value: string | string[] | undefined): string | undefined { return Array.isArray(value) ? value[0] : value; }
function toPollCount(value: string | undefined): number {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
}

export default async function LoadingPage({ searchParams }: Props) {
  const params = await searchParams;
  const repo = first(params.repo) ?? '';
  const jobId = first(params.job_id);
  const pollCount = toPollCount(first(params.poll));
  let user;
  try { user = await getCurrentUser(); } catch (error) {
    if (error instanceof BackendError && error.kind === 'unauthenticated') redirect(`/login?return_to=${encodeURIComponent(`/loading?repo=${encodeURIComponent(repo)}`)}`);
    throw error;
  }
  if (!repo) return <Shell user={user}><section className="error-card"><h1>분석할 GitHub 저장소 URL이 없습니다.</h1></section></Shell>;
  if (!jobId) {
    let createdJobId: string;
    try {
      const job = await createAnalysisJob(repo);
      createdJobId = job.job_id;
    } catch (error) {
      const message = error instanceof Error ? error.message : '분석 작업을 시작할 수 없습니다.';
      return <Shell user={user} active="loading"><section className="center-card error-card"><div className="error-icon">⚠️</div><h1>분석에 실패했습니다</h1><p>{message}</p></section></Shell>;
    }
    redirect(`/loading?repo=${encodeURIComponent(repo)}&job_id=${encodeURIComponent(createdJobId)}`);
  }

  let status = 'queued';
  let analysisId: string | null | undefined;
  let jobError: string | null | undefined;
  const checkedAt = new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' });
  try {
    const job = await getAnalysisJob(jobId);
    status = job.status;
    analysisId = job.analysis_id;
    jobError = job.error;
  } catch (error) {
    const message = error instanceof Error ? error.message : '분석 작업 상태를 불러올 수 없습니다.';
    return <Shell user={user} active="loading"><section className="center-card error-card"><div className="error-icon">⚠️</div><h1>분석에 실패했습니다</h1><p>{message}</p></section></Shell>;
  }
  if (status === 'succeeded' && analysisId) {
    redirect(`/dashboard?repo=${encodeURIComponent(repo)}&analysis_id=${encodeURIComponent(analysisId)}`);
  }
  if (status === 'failed') {
    return <Shell user={user} active="loading"><section className="center-card error-card"><div className="error-icon">⚠️</div><h1>분석에 실패했습니다</h1><p>{jobError ?? '분석에 실패했습니다.'}</p></section></Shell>;
  }

  const nextPoll = pollCount + 1;
  const refreshUrl = `/loading?repo=${encodeURIComponent(repo)}&job_id=${encodeURIComponent(jobId)}&poll=${nextPoll}`;
  return (
    <>
      <meta httpEquiv="refresh" content={`2;url=${refreshUrl}`} />
      <Shell user={user} active="loading">
        <section className="load-wrap">
          <div className="load-ring" />
          <h1>{status === 'queued' ? '보안 취약점 분석 준비 중...' : '보안 취약점 분석 중...'}</h1>
          <div className="load-repo">🔗 {repo}</div>
          <p>GitHub 레포지토리를 다운로드하고 Java 소스코드를 rule-based로 분석하는 중입니다.</p>
          <p>상태: {status} · 레포지토리 크기에 따라 수 분이 소요될 수 있습니다.</p>
          <p>Polling: {pollCount + 1}회 · 최근 조회 {checkedAt}</p>
        </section>
      </Shell>
    </>
  );
}
