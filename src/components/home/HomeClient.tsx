'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { FeatureCarousel } from '@/components/home/FeatureCarousel';
import { RepoSubmitForm } from '@/components/home/RepoSubmitForm';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getCapabilitiesClient, getOptionalCurrentUserClient, listResultsClient } from '@/lib/client/backend';
import {
  buildCapabilitiesViewModel,
  buildRecentResultsViewModel,
  vulnerabilityTypeToDisplayName,
  type RecentResultsViewModel,
} from '@/lib/view-models/analysis';
import { buildDashboardHref, buildLegacyRedirectUrl } from '@/lib/routes';
import type { User } from '@/lib/types';

const analysisCriteria = [
  '취약점 유형',
  '공식 가이드 분류',
  '탐지 근거',
  '신뢰도 판단 기준',
];

const fallbackSupportedWeaknesses = [
  'SQL Injection',
  'XSS',
  'Hardcoded Secret',
  'Path Traversal',
  'Command Injection',
  'Insecure Random',
  'Weak Hash',
  'Dangerous File Upload',
];

export function HomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [recent, setRecent] = useState<RecentResultsViewModel>([]);
  const [supportedWeaknesses, setSupportedWeaknesses] = useState(fallbackSupportedWeaknesses);

  useEffect(() => {
    const legacy = buildLegacyRedirectUrl(searchParams);
    if (legacy) router.replace(legacy);
  }, [router, searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadCapabilities() {
      const response = await getCapabilitiesClient().catch(() => ({}));
      if (cancelled) return;
      const capabilities = buildCapabilitiesViewModel(response);
      const detectorNames = capabilities.detectors
        .map((detector) => vulnerabilityTypeToDisplayName((detector as { type?: unknown }).type))
        .filter((name) => name && name !== 'Unknown');
      if (detectorNames.length) setSupportedWeaknesses(detectorNames);
    }

    async function load() {
      void loadCapabilities();
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
          <Badge className="home-eyebrow" variant="outline">행정안전부 2019.6 진단가이드 기반</Badge>
          <h1>소스코드 취약점 분석 서비스</h1>
          <p className="subtitle">GitHub 저장소 주소를 입력하면 행정안전부 공식 보안약점 진단가이드(2019.6) 기준으로 취약점을 탐지합니다.<br />예: https://github.com/owner/repo</p>
          <RepoSubmitForm isLoggedIn={Boolean(user)} authLoading={authLoading} />

          <Card className="capability-box home-shadcn-card">
            <CardContent className="home-card-content">
              <div className="home-standard-header">
                <div>
                  <div className="capability-label">분석 기준</div>
                  <h2>점수보다 근거를 먼저 보여줍니다</h2>
                </div>
                <Badge className="home-standard-badge" variant="outline">소프트웨어 보안약점 진단가이드</Badge>
              </div>
              <p className="capability-description">
                분석 결과는 행정안전부 소프트웨어 보안약점 진단가이드(2019.6 개정)를 기준으로 분류하고, 각 항목마다 왜 탐지됐는지 확인할 수 있는 근거를 함께 제공합니다.
              </p>
              <div className="capability-feature-grid">
                {analysisCriteria.map((item, index) => (
                  <div key={item} className="capability-feature-card">
                    <span className="capability-feature-index">{String(index + 1).padStart(2, '0')}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="capability-box home-shadcn-card">
            <CardContent className="home-card-content">
              <div className="capability-label">탐지 가능한 취약점 유형 ({supportedWeaknesses.length}개)</div>
              <div className="supported-weakness-grid">
                {supportedWeaknesses.map((weakness) => (
                  <Badge key={weakness} className="supported-weakness-chip" variant="secondary">{weakness}</Badge>
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

          <FeatureCarousel detectorCount={supportedWeaknesses.length} />
        </div>
      </section>
    </Shell>
  );
}
