import Link from 'next/link';
import { AuthMenu } from '@/components/layout/AuthMenu';
import { BACKEND_BASE_URL } from '@/lib/backend-url';
import { buildAnalysisHref, buildDashboardHref } from '@/lib/routes';
import type { User } from '@/lib/types';

type RecentResult = {
  analysis_id: string;
  repository: string;
  total_vulnerabilities: number;
};

type ShellProps = {
  user?: User | null;
  children: React.ReactNode;
  active?: 'home' | 'dashboard' | 'analysis' | 'login' | 'loading';
  repo?: string;
  analysisId?: string | null;
  recentResults?: RecentResult[];
  showSidebar?: boolean;
};

export function Header({ user }: { user?: User | null }) {
  const loginUrl = `${BACKEND_BASE_URL}/auth/github`;

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link className="navbar-logo" href="/">P17</Link>
        <div className="navbar-right">
          <AuthMenu user={user} loginUrl={loginUrl} />
        </div>
      </div>
    </header>
  );
}

export function Sidebar({ active, repo, analysisId, recentResults = [] }: Pick<ShellProps, 'active' | 'repo' | 'analysisId' | 'recentResults'>) {
  const repoValue = repo ?? '';
  return (
    <aside className="p17-sidebar">
      <div className="p17-sidebar-header"><span className="p17-sidebar-logo">P17</span></div>
      {repoValue ? <div className="p17-sidebar-url">{repoValue}</div> : null}
      <Link className={`p17-nav-btn ${active === 'home' ? 'active' : ''}`} href="/">메인페이지</Link>
      <Link className={`p17-nav-btn ${active === 'dashboard' ? 'active' : ''}`} href={buildDashboardHref(repoValue, analysisId)}>대시보드</Link>
      <Link className={`p17-nav-btn ${active === 'analysis' ? 'active' : ''}`} href={buildAnalysisHref(repoValue, analysisId)}>상세 분석</Link>
      {recentResults.length > 0 ? (
        <div className="recent-box">
          <div className="recent-title">최근 분석</div>
          {recentResults.map((item) => (
            <Link key={item.analysis_id} className="recent-link" href={buildDashboardHref(item.repository, item.analysis_id)}>
              <span>{item.repository}</span>
              <b>{item.total_vulnerabilities}건</b>
            </Link>
          ))}
        </div>
      ) : null}
    </aside>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span className="footer-logo">P17</span>
        <a className="footer-link" href="https://github.com/Capstone-P17" target="_blank" rel="noreferrer">
          github.com/Capstone-P17
        </a>
      </div>
    </footer>
  );
}

export function Shell({ user, children, active = 'home', repo, analysisId, recentResults, showSidebar = false }: ShellProps) {
  return (
    <>
      <Header user={user} />
      {showSidebar ? <Sidebar active={active} repo={repo} analysisId={analysisId} recentResults={recentResults} /> : null}
      <main className={showSidebar ? 'page-main with-sidebar' : 'page-main'}>{children}</main>
      <Footer />
    </>
  );
}
