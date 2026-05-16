import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ReportDownloadButton } from '@/components/analysis/ReportDownloadButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { buildAnalysisHref } from '@/lib/routes';
import type { DashboardViewModel } from '@/lib/view-models/analysis';

function scoreTone(score: number): 'danger' | 'warning' | 'normal' {
  if (score < 40) return 'danger';
  if (score < 70) return 'warning';
  return 'normal';
}

function scoreLabel(score: number): string {
  if (score < 40) return '위험';
  if (score < 70) return '주의';
  return '양호';
}

function severityTotal(severity: DashboardViewModel['severity_counts']): number {
  return severity.critical + severity.high + severity.medium + severity.low;
}

function severityPercent(count: number, total: number): number {
  if (!total) return 0;
  return Math.max(3, Math.round((count / total) * 100));
}

function vulnCountTone(count: number): string {
  if (count >= 70) return 'danger-text';
  if (count >= 30) return 'warning-text';
  return 'normal-text';
}

export function DashboardView({ vm, repo, analysisId }: { vm: DashboardViewModel; repo: string; analysisId?: string | null }) {
  const severity = vm.severity_counts;
  const danger = severity.critical + severity.high;
  const warning = severity.medium;
  const normal = severity.low;
  const totalSeverity = severityTotal(severity);
  const tone = scoreTone(vm.security_score);
  const topTypes = vm.vulnerability_types.slice(0, 5);
  const currentAnalysisId = vm.analysis_id || analysisId;

  return (
    <section className="dashboard-container">
      <div className="dashboard-hero-card">
        <div>
          <Badge className="dashboard-eyebrow" variant="outline">Analysis Complete</Badge>
          <h1>보안 취약점 분석 결과</h1>
          <p>{repo || '분석 대상 저장소'}에 대한 정적 분석 결과를 요약했습니다.</p>
        </div>
        <div className="dashboard-hero-actions">
          <Button className="dashboard-primary-action" nativeButton={false} render={<Link href={buildAnalysisHref(repo, currentAnalysisId)} />}>상세 분석 보기</Button>
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
          <div className="dashboard-main-grid">
            <Card className="dashboard-card dashboard-score-card">
              <CardContent className="dashboard-card-content">
                <div className="dashboard-card-header">
                  <span>보안 점수</span>
                  <Badge className={`score-badge ${tone}`} variant="outline">{scoreLabel(vm.security_score)}</Badge>
                </div>
                <div className={`score-meter ${tone}`} style={{ '--score': `${vm.security_score}%` } as CSSProperties}>
                  <div><strong>{vm.security_score}</strong><span>/100</span></div>
                </div>
                <p className="dashboard-muted">점수가 낮을수록 우선 조치가 필요한 취약점이 많습니다.</p>
              </CardContent>
            </Card>

            <Card className="dashboard-card">
              <CardContent className="dashboard-card-content">
                <div className="dashboard-card-header"><span>심각도 분포</span><Badge variant="outline">총 {vm.total_vulnerabilities}건</Badge></div>
                <div className="severity-stack">
                  <div className="severity-row"><span>위험</span><div><i className="danger" style={{ width: `${severityPercent(danger, totalSeverity)}%` }} /></div><b>{danger}</b></div>
                  <div className="severity-row"><span>경고</span><div><i className="warning" style={{ width: `${severityPercent(warning, totalSeverity)}%` }} /></div><b>{warning}</b></div>
                  <div className="severity-row"><span>보통</span><div><i className="normal" style={{ width: `${severityPercent(normal, totalSeverity)}%` }} /></div><b>{normal}</b></div>
                </div>
                <div className="type-chip-list">
                  {topTypes.length ? topTypes.map((type) => <Badge key={type.type} className="type-chip" variant="secondary">{type.name} · {type.count}</Badge>) : <span className="dashboard-muted">발견된 취약점 유형이 없습니다.</span>}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="dashboard-card">
            <CardContent className="dashboard-card-content">
              <div className="dashboard-card-header"><span>취약점 파일 목록</span><Badge variant="outline">{vm.file_list.length}개 파일</Badge></div>
              <div className="dashboard-file-table">
                <div className="dashboard-file-row header"><span>파일명</span><span>취약점</span><span>라인</span><span>위험도</span></div>
                {vm.file_list.length ? vm.file_list.map((file) => (
                  <div className="dashboard-file-row" key={file.file}>
                    <span className="file-name">{file.file}</span>
                    <span className={vulnCountTone(file.vuln)}>{file.vuln}</span>
                    <span>{file.lines.toLocaleString()}</span>
                    <span><span className={`level-badge level-${file.level}`}>{file.level}</span></span>
                  </div>
                )) : <div className="empty-row">발견된 취약점 파일이 없습니다.</div>}
              </div>
            </CardContent>
          </Card>
      </div>
    </section>
  );
}
