import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { RepoSubmitForm } from '@/components/home/RepoSubmitForm';
import { buildCapabilitiesViewModel, buildRecentResultsViewModel } from '@/lib/view-models/analysis';
import { buildDashboardHref, buildLegacyRedirectUrl } from '@/lib/routes';
import { getCapabilities, getOptionalCurrentUser, listResults } from '@/lib/server/backend';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const legacy = buildLegacyRedirectUrl(params);
  if (legacy) redirect(legacy);

  const user = await getOptionalCurrentUser();
  const capabilities = buildCapabilitiesViewModel(await getCapabilities().catch(() => ({})));
  const recent = user ? buildRecentResultsViewModel(await listResults(5).catch(() => ({}))) : [];

  return (
    <Shell user={user}>
      <section className="hero">
        <h1>소스코드 보안 취약점 검사 시작하기</h1>
        <p className="subtitle">GitHub 저장소 주소를 입력하면 소스코드 보안 취약점 분석을 시작합니다.<br />예: https://github.com/owner/repo</p>
        <RepoSubmitForm isLoggedIn={Boolean(user)} />
        <div className="capability-box">
          <div className="capability-label">지원 범위</div>
          <div className="capability-grid">
            <div className="capability-item"><div className="capability-label">지원 언어</div>{capabilities.supported_languages.join(', ')}</div>
            <div className="capability-item"><div className="capability-label">분석 방식</div>Rule-based 정적 분석</div>
            <div className="capability-item"><div className="capability-label">지원 파일</div>{capabilities.supported_file_extensions.join(', ')}</div>
            <div className="capability-item"><div className="capability-label">저장소</div>{capabilities.supported_repository_sources.join(', ')}</div>
            <div className="capability-item"><div className="capability-label">LLM 탐지</div>비활성화</div>
            <div className="capability-item"><div className="capability-label">LLM 리포트</div>{capabilities.llm_report_available ? '가능' : '불가'}</div>
          </div>
        </div>
        {recent.length ? <div className="capability-box"><div className="capability-label">최근 분석</div>{recent.map((item) => <Link key={item.analysis_id} className="recent-link" href={buildDashboardHref(item.repository, item.analysis_id)}>• {item.repository} ({item.total_vulnerabilities}건)</Link>)}</div> : null}
        <div className="feature-section">
          <div><div className="feature-title">취약점 탐지</div><p>Java AST 기반 정적 분석으로 SQL Injection, XSS, 하드코딩된 비밀번호 등을 탐지합니다.</p></div>
          <div><div className="feature-title">시각화된 결과</div><p>취약점이 발견된 파일과 라인, 위험도를 대시보드로 제공합니다.</p></div>
          <div><div className="feature-title">AI 수정 제안</div><p>탐지는 rule-based로 수행하고, 리포트/설명 보조에 한해 AI 사용 가능성을 제공합니다.</p></div>
        </div>
      </section>
    </Shell>
  );
}
