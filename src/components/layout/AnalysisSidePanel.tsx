'use client';

import { AlertTriangle, ChevronLeft, ChevronRight, GitBranch, LayoutDashboard, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { ReportDownloadButton } from '@/components/analysis/ReportDownloadButton';
import { Button } from '@/components/ui/button';
import { buildAnalysisHref, buildFindingHref } from '@/lib/routes';
import type { SidebarVulnItem } from '@/components/layout/Shell';

type Props = {
  active?: 'dashboard' | 'analysis' | 'home' | 'login' | 'loading';
  repo?: string;
  analysisId?: string | null;
  vulnList?: SidebarVulnItem[];
  selectedFindingId?: string | null;
};

const STORAGE_KEY = 'p17_analysis_panel_collapsed';

const subscribeMounted = () => () => {};
const getMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;

function useMounted() {
  return useSyncExternalStore(subscribeMounted, getMountedSnapshot, getServerMountedSnapshot);
}

function findingBadgeText(findingId: string): string {
  const match = findingId.match(/(\d+)$/);
  return match ? `#${match[1]}` : findingId || 'Finding';
}

export function AnalysisSidePanel({ repo = '', analysisId, vulnList = [], selectedFindingId }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();

  const logoSrc = mounted && resolvedTheme === 'dark' ? '/logo_dr.png' : '/logo_li.png';

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
          <Image src={logoSrc} alt="DoUSECURE 로고" height={28} width={100} style={{ height: 28, width: 'auto' }} />
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

        <nav className="analysis-side-nav" aria-label="분석 결과 이동">
          <Link className={`analysis-side-nav-item ${!selectedFindingId ? 'active' : ''}`} href={buildAnalysisHref(repo, analysisId)}>
            <LayoutDashboard aria-hidden="true" size={18} />
            <span>분석 개요</span>
          </Link>
        </nav>

        <ReportDownloadButton analysisId={analysisId} className="analysis-side-download" />

        {/* Vulnerability list */}
        {vulnList.length > 0 && (
          <div className="analysis-side-vuln-section">
            <div className="analysis-side-list-header">
              <span><AlertTriangle size={14} aria-hidden="true" />취약점 목록</span>
              <span className="analysis-side-count">{vulnList.length}</span>
            </div>
            <ul className="analysis-side-vuln-list">
              {vulnList.map((v) => {
                const activeFinding = selectedFindingId === v.id;
                const location = [v.file.split('/').pop() ?? v.file, v.line ? `:${v.line}` : ''].join('');
                return (
                  <li key={v.id}>
                    <Link
                      className={`analysis-side-vuln-item ${activeFinding ? 'active' : ''}`}
                      href={buildFindingHref(repo, analysisId, v.id)}
                      title={`${v.title} — ${v.file}${v.line ? `:${v.line}` : ''}`}
                      aria-current={activeFinding ? 'page' : undefined}
                    >
                      <span
                        className="analysis-side-vuln-badge"
                        aria-label={`Finding ${v.id}`}
                      >
                        {findingBadgeText(v.id)}
                      </span>
                      <div className="analysis-side-vuln-info">
                        <span className="analysis-side-vuln-type">{v.title}</span>
                        <span className="analysis-side-vuln-file">{location}</span>
                        {v.summary ? <span className="analysis-side-vuln-file">{v.summary}</span> : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <nav className="analysis-side-collapsed" aria-label="접힌 분석 메뉴" aria-hidden={!collapsed}>
        <Link className={`analysis-side-icon-link ${!selectedFindingId ? 'active' : ''}`} href={buildAnalysisHref(repo, analysisId)} title="분석 개요">
          <LayoutDashboard aria-hidden="true" size={19} />
        </Link>
      </nav>
    </aside>
  );
}
