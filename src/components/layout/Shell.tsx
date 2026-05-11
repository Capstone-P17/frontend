import Link from 'next/link';
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

function userLabel(user?: User | null): string {
  return user?.github_login ?? user?.display_name ?? user?.email ?? '사용자';
}

export function Header({ user }: { user?: User | null }) {
  return (
    <header className="navbar">
      <Link className="navbar-logo" href="/">P17</Link>
      <a href="#team">팀 소개</a>
      <div className="navbar-right">
        {user ? (
          <>
            <span className="user-name">{userLabel(user)}</span>
            <Link className="navbar-login" href="/login">계정</Link>
          </>
        ) : (
          <Link className="navbar-login" href="/login">로그인</Link>
        )}
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
    <footer className="footer" id="team">
      <span className="footer-logo">P17</span>
      <div>
        <p>담당자 P17</p>
        <p>이메일 AAA@AAA.COM</p>
        <p>전화번호 010-0000-0000</p>
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
