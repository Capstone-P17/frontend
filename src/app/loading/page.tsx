import { redirect } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { LoadingClient } from '@/components/loading/LoadingClient';
import { createAnalysisJob, getCurrentUser } from '@/lib/server/backend';
import { BackendError } from '@/lib/server/errors';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
function first(value: string | string[] | undefined): string | undefined { return Array.isArray(value) ? value[0] : value; }

export default async function LoadingPage({ searchParams }: Props) {
  const params = await searchParams;
  const repo = first(params.repo) ?? '';
  const jobId = first(params.job_id);
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
  return <Shell user={user} active="loading"><LoadingClient repo={repo} jobId={jobId} /></Shell>;
}
