'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { FeatureCarousel } from '@/components/home/FeatureCarousel';
import { RepoSubmitForm } from '@/components/home/RepoSubmitForm';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getOptionalCurrentUserClient, listResultsClient } from '@/lib/client/backend';
import { buildRecentResultsViewModel, type RecentResultsViewModel } from '@/lib/view-models/analysis';
import { buildDashboardHref, buildLegacyRedirectUrl } from '@/lib/routes';
import type { User } from '@/lib/types';

const capabilityItems = [
  'JAVA 소스코드 지원',
  '정적 분석 방식과 호출 그래프 분석을 통한 탐지',
  'GitHub 저장소 분석 지원',
  'LLM 기반 분석 리포트 생성 지원',
];

export function HomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [recent, setRecent] = useState<RecentResultsViewModel>([]);

  useEffect(() => {
    const legacy = buildLegacyRedirectUrl(searchParams);
    if (legacy) router.replace(legacy);
  }, [router, searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const nextUser = await getOptionalCurrentUserClient();
      if (cancelled) return;
      setUser(nextUser);
      setAuthLoading(false);
      if (!nextUser) {
        setRecent([]);
        return;
      }
      const results = await listResultsClient(5).catch(() => ({}));
      if (!cancelled) setRecent(buildRecentResultsViewModel(results));
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Shell user={user}>
      <section className="hero">
        <div className="home-container">
          <Badge className="home-eyebrow" variant="outline">P17 Security Analyzer</Badge>
          <h1>소스코드 보안 취약점 검사 시작하기</h1>
          <p className="subtitle">GitHub 저장소 주소를 입력하면 소스코드 보안 취약점 분석을 시작합니다.<br />예: https://github.com/owner/repo</p>
          <RepoSubmitForm isLoggedIn={Boolean(user)} authLoading={authLoading} />

          <Card className="capability-box home-shadcn-card">
            <CardContent className="home-card-content">
              <div className="capability-label">소스코드 보안 취약점 검사는 아래 기능을 수행합니다</div>
              <div className="capability-feature-grid">
                {capabilityItems.map((item, index) => (
                  <div key={item} className="capability-feature-card">
                    <span className="capability-feature-index">{String(index + 1).padStart(2, '0')}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {user ? (
            <Card className="capability-box home-shadcn-card">
              <CardContent className="home-card-content">
                <div className="capability-label">최근 분석</div>
                {recent.length ? (
                  <div className="recent-card-list">
                    {recent.map((item) => (
                      <Link key={item.analysis_id} className="recent-result-card" href={buildDashboardHref(item.repository, item.analysis_id)}>
                        <div>
                          <span className="recent-result-label">Repository</span>
                          <strong>{item.repository}</strong>
                        </div>
                        <div className="recent-result-meta">
                          <Badge className="recent-vuln-badge" variant="outline">{item.total_vulnerabilities}건</Badge>
                          <span>대시보드 보기 →</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="recent-empty">아직 저장된 분석 기록이 없습니다.</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="capability-box home-shadcn-card">
              <CardContent className="home-card-content">
                <div className="capability-label">최근 분석</div>
                <p className="recent-empty">{authLoading ? '로그인 상태를 확인하는 중입니다.' : '분석 기록 확인을 위해서는 GitHub 로그인이 필요합니다.'}</p>
              </CardContent>
            </Card>
          )}

          <FeatureCarousel />
        </div>
      </section>
    </Shell>
  );
}
