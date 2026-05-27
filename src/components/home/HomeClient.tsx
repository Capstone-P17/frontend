'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { NavbarHeroEffect } from '@/components/layout/NavbarHeroEffect';
import { FeatureCarousel } from '@/components/home/FeatureCarousel';
import { RepoSubmitForm } from '@/components/home/RepoSubmitForm';
import { VulnGrid } from '@/components/home/VulnGrid';
import { getOptionalCurrentUserClient } from '@/lib/client/backend';
import { buildLegacyRedirectUrl } from '@/lib/routes';
import type { User } from '@/lib/types';

export function HomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

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
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Shell user={user}>
      {/* 스크롤 감지 → navbar-hero / navbar-scrolled 클래스 토글 */}
      <NavbarHeroEffect />

      {/* ── [2] 히어로 ── */}
      <section className="hero">
        <div className="home-container">
          <h1>
            <span className="hero-doyou">DoYou</span><span className="hero-secure">SECURE</span><span className="hero-q">?</span>
          </h1>
          <p className="subtitle">
            GitHub 저장소 주소를 입력하면 행정안전부 공식 보안약점 진단가이드(2019.6) 기준으로
            소스코드 보안 취약점을 탐지합니다.
          </p>
          <RepoSubmitForm isLoggedIn={Boolean(user)} authLoading={authLoading} />
        </div>
      </section>

      {/* ── [3] 히어로 아래 ── */}
      <div className="home-below-hero">
        {/* [3-1] 서비스 소개 */}
        <section className="service-intro">
          <div className="home-container">
            <h2 className="service-intro-title">서비스 소개</h2>
            <p className="service-intro-desc">
              행정안전부 소프트웨어 보안약점 진단가이드(2019.6 개정)에서 정의한 47가지 취약점 유형 중
              현재 8가지를 탐지하며, 각 항목마다 왜 탐지됐는지 확인할 수 있는 근거를 함께 제공합니다.
              지원하는 취약점 유형은 향후 지속적으로 업데이트될 예정입니다.
            </p>
          </div>
        </section>

        {/* [3-2] 주요 기능 캐러셀 */}
        <div className="home-container">
          <FeatureCarousel />
        </div>

        {/* [3-3] 취약점 유형 그리드 */}
        <VulnGrid />
      </div>
    </Shell>
  );
}
