import Link from 'next/link';
import { MarkdownContent } from '@/components/analysis/MarkdownContent';
import { ReportDownloadButton } from '@/components/analysis/ReportDownloadButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { buildDashboardHref } from '@/lib/routes';
import type { AnalysisDetailViewModel } from '@/lib/view-models/analysis';

function codeLines(code: string, line: number | null) {
  const lines = String(code || '코드 정보가 없습니다.').split('\n');
  const safeLine = line && line > 0 ? line : 1;
  const start = Math.max(1, safeLine - Math.floor(lines.length / 2));
  return lines.map((text, index) => ({ number: start + index, text, active: start + index === safeLine }));
}

export function AnalysisView({ vm, repo, analysisId }: { vm: AnalysisDetailViewModel; repo: string; analysisId?: string | null }) {
  const guideDistribution = vm.guide_distribution.length ? vm.guide_distribution : [{ category: '공식 가이드 매핑 없음', count: 0 }];
  const guideMaxCount = Math.max(1, ...guideDistribution.map((item) => item.count));
  const grouped = new Map<string, typeof vm.vuln_details>();
  const currentAnalysisId = vm.analysis_id || analysisId;
  for (const detail of vm.vuln_details) grouped.set(detail.type, [...(grouped.get(detail.type) ?? []), detail]);

  return (
    <section className="dashboard-container analysis-container">
      <div className="dashboard-hero-card">
        <div>
          <Badge className="dashboard-eyebrow" variant="outline">Detailed Analysis</Badge>
          <h1>상세 보안취약점 분석</h1>
          <p>{repo || '분석 대상 저장소'}에서 발견된 취약점의 코드, 호출 경로, 권장 조치 내용을 확인합니다.</p>
        </div>
        <div className="dashboard-hero-actions">
          <Button className="dashboard-primary-action" nativeButton={false} render={<Link href={buildDashboardHref(repo, currentAnalysisId)} />}>대시보드 보기</Button>
          <ReportDownloadButton analysisId={currentAnalysisId} className="dashboard-secondary-action" />
        </div>
      </div>

      <div className="dashboard-kpi-grid">
        <Card className="dashboard-card"><CardContent className="dashboard-kpi"><span>검사 시간</span><strong className="small-value">{vm.scan_date}</strong></CardContent></Card>
        <Card className="dashboard-card"><CardContent className="dashboard-kpi"><span>발견된 취약점</span><strong className="danger-text">{vm.total_vulnerabilities}</strong></CardContent></Card>
        <Card className="dashboard-card"><CardContent className="dashboard-kpi"><span>분석된 파일</span><strong>{vm.files_analyzed}</strong></CardContent></Card>
        <Card className="dashboard-card"><CardContent className="dashboard-kpi"><span>영향 파일</span><strong>{vm.affected_files}</strong></CardContent></Card>
      </div>

      <div className="dashboard-summary-stack">
          <div className="analysis-overview-grid">
            <Card className="dashboard-card">
              <CardContent className="dashboard-card-content">
                <div className="dashboard-card-header"><span>가이드 대분류 분포</span><Badge variant="outline">{guideDistribution.length}개 분류</Badge></div>
                <div className="analysis-bars">
                  {guideDistribution.map((item) => (
                    <div className="bar-row" key={item.category}>
                      <span>{item.category}</span>
                      <div><i style={{ width: `${Math.round((item.count / guideMaxCount) * 100)}%` }} /></div>
                      <b>{item.count}</b>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {vm.call_graph.available ? (
              <Card className="dashboard-card">
                <CardContent className="dashboard-card-content">
                  <div className="dashboard-card-header"><span>호출 그래프</span><Badge variant="outline">노드 {vm.call_graph.node_count.toLocaleString()} · 엣지 {vm.call_graph.edge_count.toLocaleString()}</Badge></div>
                  <div className="call-preview">{vm.call_graph.preview.length ? vm.call_graph.preview.map((item) => <span key={item}>{item}</span>) : <span className="dashboard-muted">표시할 호출 그래프 미리보기가 없습니다.</span>}</div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          {vm.llm_report.text ? (
            <Card className="dashboard-card llm-report">
              <CardContent className="dashboard-card-content">
                <div className="llm-report-header"><span>LLM 보안 리포트</span>{vm.llm_report.model ? <span>{vm.llm_report.model}</span> : null}</div>
                <MarkdownContent content={vm.llm_report.text} />
              </CardContent>
            </Card>
          ) : vm.llm_report.status === 'failed' ? (
            <Card className="dashboard-card llm-report unavailable">
              <CardContent className="dashboard-card-content">
                <div className="llm-report-header"><span>LLM 보안 리포트</span><span>생성 실패</span></div>
                <p>{vm.llm_report.error ?? 'LLM 리포트 생성에 실패했습니다.'}</p>
              </CardContent>
            </Card>
          ) : null}

          {[...grouped.entries()].length ? [...grouped.entries()].map(([type, items]) => (
            <details className="vgroup analysis-vgroup" key={type}>
              <summary><b>{type}</b><span className={`level-badge level-${items[0].severity}`}>{items[0].severity}</span><span>총 {items.length}건 발견됨</span></summary>
              {items.map((detail) => (
                <article className="vitem" key={detail.id || `${detail.file}-${detail.line}-${detail.type}`}>
                  <div className="vitem-summary">
                    <div className="vitem-header"><span>{detail.file}{detail.function ? <em> · {String(detail.function)}</em> : null}</span><span>Line {detail.line ?? '-'} <b className={`level-badge level-${detail.severity}`}>{detail.severity}</b></span></div>
                    <div className="metadata">{[detail.cwe ? `CWE: ${detail.cwe}` : '', detail.cvss_score !== undefined ? `CVSS: ${detail.cvss_score}` : '', detail.cvss_vector ? String(detail.cvss_vector) : '', detail.confidence ? `신뢰도: ${detail.confidence}` : ''].filter(Boolean).join(' · ')}</div>
                    {detail.guide_category || detail.guide_item ? (
                      <div className="guide-reference">
                        <span>{detail.guide_source || '공식 보안약점 진단가이드 기준'}</span>
                        <strong>{[detail.guide_category, detail.guide_item].filter(Boolean).join(' > ')}</strong>
                      </div>
                    ) : null}
                  </div>

                  <div className="vitem-code-compare">
                    <div className="code-panel code-panel-vulnerable">
                      <div className="code-panel-header"><span>취약 코드</span><b>탐지 위치</b></div>
                      <pre className="vitem-code">{codeLines(detail.code, detail.line).map((line) => <code key={line.number} className={line.active ? 'active' : ''}><span>{line.number}</span>{line.text}</code>)}</pre>
                    </div>
                    <div className="code-panel code-panel-safe">
                      <div className="code-panel-header"><span>권장 수정 예시</span><b>보안 패턴</b></div>
                      {detail.safe_example ? (
                        <pre className="vitem-safe-code">{String(detail.safe_example)}</pre>
                      ) : (
                        <pre className="vitem-safe-code recommendation-preview">{detail.fix}</pre>
                      )}
                    </div>
                  </div>

                  <div className="vitem-evidence-grid">
                    <div className="vitem-callpath"><b>호출 경로</b>{detail.call_chain.length ? detail.call_chain.map((node) => <span key={node}>{node}</span>) : <span className="dashboard-muted">호출 경로 정보 없음</span>}</div>
                    {detail.evidence ? <div className="evidence"><b>탐지 근거</b><p>{detail.evidence}</p></div> : null}
                    {detail.confidence_reason ? <div className="confidence-reason"><b>신뢰도 판단 기준</b><p>{detail.confidence_reason}</p></div> : null}
                  </div>

                  <div className="vitem-explanation-grid">
                    <div className="problem"><b>문제점</b><p>{detail.description}</p></div>
                    <div className="fix"><b>수정 방향</b><pre>{detail.fix}</pre></div>
                  </div>
                </article>
              ))}
            </details>
          )) : <Card className="dashboard-card"><CardContent className="dashboard-card-content empty-row">발견된 취약점이 없습니다.</CardContent></Card>}
      </div>
    </section>
  );
}
