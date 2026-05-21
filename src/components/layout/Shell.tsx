'use client';

import Link from 'next/link';
import { AnalysisSidePanel } from '@/components/layout/AnalysisSidePanel';
import { AuthMenu } from '@/components/layout/AuthMenu';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { PUBLIC_BACKEND_BASE_URL } from '@/lib/backend-url';
import type { User } from '@/lib/types';
import type { RecentResultsViewModel } from '@/lib/view-models/analysis';

type ShellProps = {
  user?: User | null;
  children: React.ReactNode;
  active?: 'home' | 'dashboard' | 'analysis' | 'login' | 'loading';
  repo?: string;
  analysisId?: string | null;
  recentResults?: RecentResultsViewModel;
  showAnalysisPanel?: boolean;
};

export function Header({ user }: { user?: User | null }) {
  const loginUrl = `${PUBLIC_BACKEND_BASE_URL}/auth/github`;

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link className="navbar-logo" href="/">P17</Link>
        <div className="navbar-right">
          <ThemeToggle />
          <AuthMenu user={user} loginUrl={loginUrl} />
        </div>
      </div>
    </header>
  );
}

export function Footer({ withAnalysisPanel = false }: { withAnalysisPanel?: boolean }) {
  return (
    <footer className={withAnalysisPanel ? 'footer with-analysis-panel' : 'footer'}>
      <div className="footer-inner">
        <span className="footer-logo">P17</span>
        <a className="footer-link" href="https://github.com/Capstone-P17" target="_blank" rel="noreferrer">
          github.com/Capstone-P17
        </a>
      </div>
    </footer>
  );
}

export function Shell({ user, children, active = 'home', repo, analysisId, recentResults, showAnalysisPanel = false }: ShellProps) {
  return (
    <>
      <Header user={user} />
      {showAnalysisPanel ? <AnalysisSidePanel active={active} repo={repo} analysisId={analysisId} recentResults={recentResults} /> : null}
      <main className={showAnalysisPanel ? 'page-main with-analysis-panel' : 'page-main'}>{children}</main>
      <Footer withAnalysisPanel={showAnalysisPanel} />
    </>
  );
}
