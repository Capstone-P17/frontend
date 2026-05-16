'use client';

import { ChevronLeft, ChevronRight, FileSearch, GitBranch, LayoutDashboard, ListChecks, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ReportDownloadButton } from '@/components/analysis/ReportDownloadButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buildAnalysisHref, buildDashboardHref } from '@/lib/routes';
import type { RecentResultsViewModel } from '@/lib/view-models/analysis';

type Props = {
  active?: 'dashboard' | 'analysis' | 'home' | 'login' | 'loading';
  repo?: string;
  analysisId?: string | null;
  recentResults?: RecentResultsViewModel;
};

const STORAGE_KEY = 'p17_analysis_panel_collapsed';

export function AnalysisSidePanel({ active, repo = '', analysisId, recentResults = [] }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const buildResultHref = active === 'analysis' ? buildAnalysisHref : buildDashboardHref;

  useEffect(() => {
    document.documentElement.dataset.analysisPanel = collapsed ? 'collapsed' : 'expanded';
    window.localStorage.setItem(STORAGE_KEY, String(collapsed));
    return () => {
      delete document.documentElement.dataset.analysisPanel;
    };
  }, [collapsed]);

  return (
    <aside className="analysis-side-panel" aria-label="분석 탐색 패널" data-collapsed={collapsed}>
      <div className="analysis-side-header">
        <Link className="analysis-side-brand" href="/" aria-label="홈으로 이동">
          <span className="analysis-side-brand-mark"><ShieldCheck aria-hidden="true" size={18} /></span>
          <span className="analysis-side-brand-text">P17</span>
        </Link>
        <Button
          aria-label={collapsed ? '분석 패널 펼치기' : '분석 패널 접기'}
          className="analysis-side-toggle"
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <ChevronRight aria-hidden="true" size={18} /> : <ChevronLeft aria-hidden="true" size={18} />}
        </Button>
      </div>

      <div className="analysis-side-expanded">
        {repo ? (
          <div className="analysis-side-repo-card">
            <GitBranch aria-hidden="true" size={16} />
            <div>
              <span>현재 저장소</span>
              <strong>{repo}</strong>
            </div>
          </div>
        ) : null}

        <nav className="analysis-side-nav" aria-label="결과 페이지 이동">
          <Link className={`analysis-side-nav-item ${active === 'dashboard' ? 'active' : ''}`} href={buildDashboardHref(repo, analysisId)}>
            <LayoutDashboard aria-hidden="true" size={18} />
            <span>대시보드</span>
          </Link>
          <Link className={`analysis-side-nav-item ${active === 'analysis' ? 'active' : ''}`} href={buildAnalysisHref(repo, analysisId)}>
            <FileSearch aria-hidden="true" size={18} />
            <span>상세 분석</span>
          </Link>
        </nav>

        <ReportDownloadButton analysisId={analysisId} className="analysis-side-download" />

        <div className="analysis-side-list-header">
          <span><ListChecks aria-hidden="true" size={16} /> 분석 목록</span>
          <Badge className="analysis-side-count" variant="outline">{recentResults.length}</Badge>
        </div>
        <div className="analysis-side-list">
          {recentResults.length ? recentResults.map((item) => {
            const isActive = item.analysis_id === analysisId;
            return (
              <Link
                className={`analysis-side-list-item ${isActive ? 'active' : ''}`}
                href={buildResultHref(item.repository, item.analysis_id)}
                key={item.analysis_id || item.repository}
              >
                <span>{item.repository || '저장소 정보 없음'}</span>
                <b>{item.scan_date} · 취약점 {item.total_vulnerabilities}건</b>
              </Link>
            );
          }) : <p className="analysis-side-empty">표시할 분석 기록이 없습니다.</p>}
        </div>
      </div>

      <nav className="analysis-side-collapsed" aria-label="접힌 분석 메뉴" aria-hidden={!collapsed}>
        <Link className={`analysis-side-icon-link ${active === 'dashboard' ? 'active' : ''}`} href={buildDashboardHref(repo, analysisId)} title="대시보드">
          <LayoutDashboard aria-hidden="true" size={19} />
        </Link>
        <Link className={`analysis-side-icon-link ${active === 'analysis' ? 'active' : ''}`} href={buildAnalysisHref(repo, analysisId)} title="상세 분석">
          <FileSearch aria-hidden="true" size={19} />
        </Link>
      </nav>
    </aside>
  );
}
