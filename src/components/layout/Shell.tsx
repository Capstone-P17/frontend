'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { AnalysisListNav } from '@/components/layout/AnalysisListNav';
import { AnalysisSidePanel } from '@/components/layout/AnalysisSidePanel';
import { AuthMenu } from '@/components/layout/AuthMenu';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { PUBLIC_BACKEND_BASE_URL } from '@/lib/backend-url';
import type { User } from '@/lib/types';

const BRAND_NAME = 'DoUSECURE';

export type SidebarVulnItem = {
  id: string;
  title: string;
  type: string;
  cwe?: string;
  file: string;
  line: number | null;
  summary: string;
  report_status?: string;
};

type ShellProps = {
  user?: User | null;
  children: React.ReactNode;
  active?: 'home' | 'dashboard' | 'analysis' | 'login' | 'loading';
  repo?: string;
  analysisId?: string | null;
  vulnList?: SidebarVulnItem[];
  selectedFindingId?: string | null;
  showAnalysisPanel?: boolean;
};

const subscribeMounted = () => () => {};
const getMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;

function useMounted() {
  return useSyncExternalStore(subscribeMounted, getMountedSnapshot, getServerMountedSnapshot);
}

export function Header({ user }: { user?: User | null }) {
  const loginUrl = `${PUBLIC_BACKEND_BASE_URL}/auth/github`;
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();

  const logoSrc = mounted && resolvedTheme === 'dark' ? '/logo_dr.png' : '/logo_li.png';

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link className="navbar-logo" href="/" aria-label="홈으로 이동">
          <Image src={logoSrc} alt={`${BRAND_NAME} 로고`} height={54} width={180} style={{ height: 54, width: 'auto' }} priority />
        </Link>
        <div className="navbar-right">
          <AnalysisListNav user={user} />
          <ThemeToggle />
          <AuthMenu user={user} loginUrl={loginUrl} />
        </div>
      </div>
    </header>
  );
}

export function Footer({ withAnalysisPanel = false }: { withAnalysisPanel?: boolean }) {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const logoSrc = mounted && resolvedTheme === 'dark' ? '/logo_dr.png' : '/logo_li.png';

  return (
    <footer className={withAnalysisPanel ? 'footer with-analysis-panel' : 'footer'}>
      <div className="footer-inner">
        <Image src={logoSrc} alt={`${BRAND_NAME} 로고`} height={32} width={120} style={{ height: 32, width: 'auto' }} />
        <a className="footer-link" href="https://github.com/Capstone-P17" target="_blank" rel="noreferrer">
          DoUSECURE GitHub
        </a>
      </div>
    </footer>
  );
}

export function Shell({ user, children, active = 'home', repo, analysisId, vulnList, selectedFindingId, showAnalysisPanel = false }: ShellProps) {
  return (
    <>
      <Header user={user} />
      {showAnalysisPanel ? <AnalysisSidePanel active={active} repo={repo} analysisId={analysisId} vulnList={vulnList} selectedFindingId={selectedFindingId} /> : null}
      <main className={showAnalysisPanel ? 'page-main with-analysis-panel' : 'page-main'}>{children}</main>
      <Footer withAnalysisPanel={showAnalysisPanel} />
    </>
  );
}
