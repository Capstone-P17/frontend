import { redirect } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { AnalysisView } from '@/components/analysis/AnalysisView';
import { getAnalysisResult, getCurrentUser, listResults } from '@/lib/server/backend';
import { BackendError } from '@/lib/server/errors';
import { buildAnalysisDetailViewModel, buildRecentResultsViewModel } from '@/lib/view-models/analysis';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
function first(value: string | string[] | undefined): string | undefined { return Array.isArray(value) ? value[0] : value; }

export default async function AnalysisPage({ searchParams }: Props) {
  const params = await searchParams;
  const requestedRepo = first(params.repo) ?? '';
  const analysisId = first(params.analysis_id);
  let user;
  try { user = await getCurrentUser(); } catch (error) {
    if (error instanceof BackendError && error.kind === 'unauthenticated') redirect(`/login?return_to=${encodeURIComponent(`/analysis?repo=${encodeURIComponent(requestedRepo)}${analysisId ? `&analysis_id=${encodeURIComponent(analysisId)}` : ''}`)}`);
    throw error;
  }
  const result = await getAnalysisResult(analysisId);
  const vm = buildAnalysisDetailViewModel(result);
  const repo = vm.repo_url || requestedRepo;
  const recent = buildRecentResultsViewModel(await listResults(8).catch(() => ({})));
  return <Shell user={user} active="analysis" repo={repo} analysisId={vm.analysis_id || analysisId} recentResults={recent} showAnalysisPanel><AnalysisView vm={vm} repo={repo} /></Shell>;
}
