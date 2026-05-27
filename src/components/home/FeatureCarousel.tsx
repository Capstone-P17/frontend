'use client';

import { useCallback, useEffect, useState } from 'react';

type Slide = {
  title: string;
  description: string;
  preview: React.ReactNode;
};

const slides: Slide[] = [
  {
    title: '취약점 탐지',
    description:
      'Java AST 기반 정적 분석으로 소스코드를 직접 실행하지 않고 코드 구조를 분석해 SQL Injection, XSS 등 지원 범위에 포함된 보안약점을 자동으로 찾아냅니다.',
    preview: (
      <div className="mock-finding-view">
        {/* 통계 행 */}
        <div className="mock-stat-row">
          <div>
            <span>분석 파일</span>
            <b>128</b>
          </div>
          <div>
            <span>취약점</span>
            <b style={{ color: '#FFB4B4' }}>9</b>
          </div>
          <div>
            <span>위험도</span>
            <b>HIGH</b>
          </div>
        </div>
        {/* 취약점 카드 1 */}
        <div className="mock-vuln-card">
          <div className="mock-vuln-head">
            <b>SQL Injection</b>
            <span style={{ color: '#FFB4B4' }}>HIGH</span>
          </div>
          <p>UserRepository.java:42</p>
          <code>executeQuery(&quot;SELECT ...&quot; + userId)</code>
        </div>
        {/* 취약점 카드 2 */}
        <div className="mock-vuln-card" style={{ opacity: 0.75 }}>
          <div className="mock-vuln-head">
            <b>Hardcoded Secret</b>
            <span style={{ color: '#FDE68A' }}>MEDIUM</span>
          </div>
          <p>application.yml:12</p>
        </div>
      </div>
    ),
  },
  {
    title: '근거 중심 결과',
    description:
      '취약점이 발견된 파일과 라인, 공식 가이드 분류, 탐지 근거, 호출 흐름을 함께 제공합니다.',
    preview: (
      <div className="mock-dashboard-view">
        {/* 탐지 근거 패널 */}
        <div className="mock-evidence-panel">
          <span>탐지 근거</span>
          <b>req.getParameter</b>
          <small>→ SQL 실행 API</small>
        </div>
        {/* 바 차트 */}
        <div className="mock-bars">
          <div>
            <span>입력 흐름</span>
            <i style={{ width: '78%' }} />
          </div>
          <div>
            <span>가이드 매핑</span>
            <i style={{ width: '64%' }} />
          </div>
          <div>
            <span>신뢰도 기준</span>
            <i style={{ width: '48%' }} />
          </div>
        </div>
        {/* 콜그래프 */}
        <div className="mock-callgraph">
          <span>Controller</span>
          <span className="cg-line" />
          <span className="cg-arrow">▶</span>
          <span>Service</span>
          <span className="cg-line" />
          <span className="cg-arrow">▶</span>
          <span>Repository</span>
        </div>
      </div>
    ),
  },
  {
    title: 'AI 수정 제안',
    description:
      '취약점을 발견하면 어떻게 고쳐야 하는지 AI가 수정 방향과 예시 코드를 함께 제안합니다.',
    preview: (
      <div className="mock-report-view">
        <div className="mock-report-title">AI Remediation Report</div>
        <p>
          사용자 입력값이 SQL 쿼리에 직접 연결되고 있습니다.
          PreparedStatement 기반 파라미터 바인딩으로 변경하세요.
        </p>
        <pre>{`String sql = "SELECT * FROM users WHERE id = ?";\nPreparedStatement ps = conn.prepareStatement(sql);\nps.setString(1, userId);`}</pre>
      </div>
    ),
  },
];

export function FeatureCarousel() {
  const [index, setIndex] = useState(0);

  const goNext = useCallback(() => {
    setIndex((prev) => (prev + 1) % slides.length);
  }, []);

  const goPrev = useCallback(() => {
    setIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(goNext, 4000);
    return () => window.clearInterval(timer);
  }, [goNext]);

  return (
    <div className="fc-wrapper">
      {/* 뷰포트 */}
      <div className="fc-viewport">
        <div
          className="fc-track"
          style={{ transform: `translateX(-${index * (100 / 3)}%)` }}
        >
          {slides.map((slide, i) => (
            <div key={i} className="fc-slide">
              <div className="fc-card">
                {/* 왼쪽 텍스트 */}
                <div>
                  <h2 className="fc-title">{slide.title}</h2>
                  <p className="fc-desc">{slide.description}</p>
                </div>
                {/* 오른쪽 프리뷰 */}
                <div className="feature-preview" aria-hidden="true">
                  <div className="feature-preview-toolbar">
                    <span /><span /><span />
                  </div>
                  <div className="feature-preview-body">
                    {slide.preview}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 컨트롤 */}
      <div className="fc-controls">
        <button className="fc-arrow" onClick={goPrev} aria-label="이전 슬라이드" type="button">
          ‹
        </button>
        {slides.map((_, i) => (
          <span
            key={i}
            className={`fc-dot${i === index ? ' fc-dot-active' : ''}`}
            onClick={() => setIndex(i)}
            role="button"
            aria-label={`슬라이드 ${i + 1}`}
          />
        ))}
        <button className="fc-arrow" onClick={goNext} aria-label="다음 슬라이드" type="button">
          ›
        </button>
      </div>
    </div>
  );
}
