'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnalysisView } from '@/components/analysis/AnalysisView';
import { Shell, type SidebarVulnItem } from '@/components/layout/Shell';
import { BackendError } from '@/lib/backend-errors';
import { getAnalysisResultClient, getCurrentUserClient, getFindingDetailClient } from '@/lib/client/backend';
import { buildAnalysisDetailViewModel, buildFindingDetailViewModel, type AnalysisDetailViewModel } from '@/lib/view-models/analysis';
import type { User } from '@/lib/types';

function loginReturnTo(repo: string, analysisId: string | null, findingId: string | null): string {
  const params = new URLSearchParams();
  if (repo) params.set('repo', repo);
  if (analysisId) params.set('analysis_id', analysisId);
  if (findingId) params.set('finding', findingId);
  const query = params.toString();
  return `/analysis${query ? `?${query}` : ''}`;
}

export function AnalysisClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRepo = searchParams.get('repo') ?? '';
  const analysisId = searchParams.get('analysis_id');
  const selectedFindingId = searchParams.get('finding');
  const [user, setUser] = useState<User | null>(null);
  const [vm, setVm] = useState<AnalysisDetailViewModel | null>(null);
  const [repo, setRepo] = useState(requestedRepo);
  const [error, setError] = useState('');
  const [findingError, setFindingError] = useState('');
  const [findingLoading, setFindingLoading] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<AnalysisDetailViewModel['vuln_details'][number] | null>(null);

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
        const nextVm = buildAnalysisDetailViewModel(result);
        setVm(nextVm);
        setRepo(nextVm.repo_url || requestedRepo);
      } catch (err) {
        if (err instanceof BackendError && err.kind === 'unauthenticated') {
          router.replace(`/login?return_to=${encodeURIComponent(loginReturnTo(requestedRepo, analysisId, selectedFindingId))}`);
          return;
        }
        if (!cancelled) setError(err instanceof Error ? err.message : '분석 결과를 불러올 수 없습니다.');
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [analysisId, requestedRepo, router, selectedFindingId]);

  const currentAnalysisId = vm?.analysis_id || analysisId;
  const activeFindingId = vm?.vuln_details.some((v) => v.id === selectedFindingId) ? selectedFindingId : null;

  useEffect(() => {
    let cancelled = false;

    async function loadFinding() {
      setSelectedFinding(null);
      setFindingError('');
      if (!currentAnalysisId || !activeFindingId) return;
      setFindingLoading(true);
      try {
        const detail = await getFindingDetailClient(currentAnalysisId, activeFindingId);
        if (cancelled) return;
        setSelectedFinding(buildFindingDetailViewModel(detail).finding);
      } catch (err) {
        if (!cancelled) setFindingError(err instanceof Error ? err.message : '취약점 상세 Markdown을 불러올 수 없습니다.');
      } finally {
        if (!cancelled) setFindingLoading(false);
      }
    }

    void loadFinding();
    return () => { cancelled = true; };
  }, [activeFindingId, currentAnalysisId]);

  if (error) {
    return <Shell user={user} active="analysis"><section className="center-card error-card"><h1>분석 결과를 불러올 수 없습니다</h1><p>{error}</p></section></Shell>;
  }

  if (!vm) {
    return <Shell user={user} active="analysis"><section className="load-wrap"><div className="load-ring" /><h1>분석 결과를 불러오는 중입니다.</h1></section></Shell>;
  }

  const vulnList: SidebarVulnItem[] = vm.vuln_details.map((v) => ({
    id: v.id,
    title: v.title,
    type: v.type,
    cwe: v.cwe,
    file: v.file,
    line: v.line,
    summary: v.summary,
    report_status: v.report_status,
  }));
  return <Shell user={user} active="analysis" repo={repo} analysisId={currentAnalysisId} vulnList={vulnList} selectedFindingId={activeFindingId} showAnalysisPanel><AnalysisView vm={vm} repo={repo} analysisId={currentAnalysisId} selectedFindingId={activeFindingId} selectedFinding={selectedFinding} findingLoading={findingLoading} findingError={findingError} /></Shell>;
}
