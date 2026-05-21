import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ReportDownloadButton } from '@/components/analysis/ReportDownloadButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { buildAnalysisHref } from '@/lib/routes';
import type { DashboardViewModel } from '@/lib/view-models/analysis';

type FileSummary = DashboardViewModel['file_list'][number];
type VulnerabilityType = DashboardViewModel['vulnerability_types'][number];

type KpiItem = {
  label: string;
  value: string | number;
  tone?: 'danger';
  compact?: boolean;
};

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

function ResultHero({ repo, analysisId }: { repo: string; analysisId?: string | null }) {
  return (
    <header className="dashboard-hero-card">
      <div>
        <Badge className="dashboard-eyebrow" variant="outline">Analysis Complete</Badge>
        <h1>보안 취약점 분석 결과</h1>
        <p>{repo || '분석 대상 저장소'}에 대한 정적 분석 결과를 요약했습니다.</p>
      </div>

      <div className="dashboard-hero-actions" aria-label="대시보드 작업">
        <Button className="dashboard-primary-action" nativeButton={false} render={<Link href={buildAnalysisHref(repo, analysisId)} />}>
          상세 분석 보기
        </Button>
        <ReportDownloadButton analysisId={analysisId} className="dashboard-secondary-action" />
      </div>
    </header>
  );
}

function KpiGrid({ items }: { items: KpiItem[] }) {
  return (
    <div className="dashboard-kpi-grid" aria-label="분석 요약 지표">
      {items.map((item) => (
        <Card className="dashboard-card" key={item.label}>
          <CardContent className="dashboard-kpi">
            <span>{item.label}</span>
            <strong className={`${item.compact ? 'small-value' : ''} ${item.tone === 'danger' ? 'danger-text' : ''}`.trim()}>
              {item.value}
            </strong>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ScoreCard({ score }: { score: number }) {
  const tone = scoreTone(score);

  return (
    <Card className="dashboard-card dashboard-score-card">
      <CardContent className="dashboard-card-content">
        <div className="dashboard-card-header">
          <span>보안 점수</span>
          <Badge className={`score-badge ${tone}`} variant="outline">{scoreLabel(score)}</Badge>
        </div>

        <div className={`score-meter ${tone}`} style={{ '--score': `${score}%` } as CSSProperties}>
          <div>
            <strong>{score}</strong>
            <span>/100</span>
          </div>
        </div>

        <p className="dashboard-muted">점수가 낮을수록 우선 조치가 필요한 취약점이 많습니다.</p>
      </CardContent>
    </Card>
  );
}

function SeverityCard({ vm, danger, warning, normal, total }: { vm: DashboardViewModel; danger: number; warning: number; normal: number; total: number }) {
  return (
    <Card className="dashboard-card">
      <CardContent className="dashboard-card-content">
        <div className="dashboard-card-header">
          <span>심각도 분포</span>
          <Badge variant="outline">총 {vm.total_vulnerabilities}건</Badge>
        </div>

        <div className="severity-stack" aria-label="심각도별 취약점 수">
          <SeverityRow count={danger} label="위험" tone="danger" total={total} />
          <SeverityRow count={warning} label="경고" tone="warning" total={total} />
          <SeverityRow count={normal} label="보통" tone="normal" total={total} />
        </div>

        <VulnerabilityTypeChips types={vm.vulnerability_types.slice(0, 5)} />
      </CardContent>
    </Card>
  );
}

function SeverityRow({ count, label, tone, total }: { count: number; label: string; tone: 'danger' | 'warning' | 'normal'; total: number }) {
  return (
    <div className="severity-row">
      <span>{label}</span>
      <div aria-hidden="true">
        <i className={tone} style={{ width: `${severityPercent(count, total)}%` }} />
      </div>
      <b>{count}</b>
    </div>
  );
}

function VulnerabilityTypeChips({ types }: { types: VulnerabilityType[] }) {
  return (
    <div className="type-chip-list" aria-label="상위 취약점 유형">
      {types.length ? (
        types.map((type) => (
          <Badge className="type-chip" key={type.type} variant="secondary">
            {type.name} · {type.count}
          </Badge>
        ))
      ) : (
        <span className="dashboard-muted">발견된 취약점 유형이 없습니다.</span>
      )}
    </div>
  );
}

function FileListCard({ files }: { files: FileSummary[] }) {
  return (
    <Card className="dashboard-card">
      <CardContent className="dashboard-card-content">
        <div className="dashboard-card-header">
          <span>취약점 파일 목록</span>
          <Badge variant="outline">{files.length}개 파일</Badge>
        </div>

        <div className="dashboard-file-table" role="table" aria-label="취약점 파일 목록">
          <div className="dashboard-file-row header" role="row">
            <span role="columnheader">파일명</span>
            <span role="columnheader">취약점</span>
            <span role="columnheader">라인</span>
            <span role="columnheader">위험도</span>
          </div>

          {files.length ? (
            files.map((file) => <FileRow file={file} key={file.file} />)
          ) : (
            <div className="empty-row">발견된 취약점 파일이 없습니다.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FileRow({ file }: { file: FileSummary }) {
  return (
    <div className="dashboard-file-row" role="row">
      <span className="file-name" role="cell">{file.file}</span>
      <span className={vulnCountTone(file.vuln)} role="cell">{file.vuln}</span>
      <span role="cell">{file.lines.toLocaleString()}</span>
      <span role="cell">
        <span className={`level-badge level-${file.level}`}>{file.level}</span>
      </span>
    </div>
  );
}

export function DashboardView({ vm, repo, analysisId }: { vm: DashboardViewModel; repo: string; analysisId?: string | null }) {
  const severity = vm.severity_counts;
  const danger = severity.critical + severity.high;
  const warning = severity.medium;
  const normal = severity.low;
  const totalSeverity = severityTotal(severity);
  const currentAnalysisId = vm.analysis_id || analysisId;

  return (
    <section className="dashboard-container">
      <ResultHero repo={repo} analysisId={currentAnalysisId} />

      <KpiGrid
        items={[
          { label: '검사 시간', value: vm.scan_date, compact: true },
          { label: '발견된 취약점', value: vm.total_vulnerabilities, tone: 'danger' },
          { label: '분석된 파일', value: vm.files_analyzed },
          { label: '영향 파일', value: vm.affected_files },
        ]}
      />

      <div className="dashboard-summary-stack">
        <section className="dashboard-main-grid" aria-label="분석 결과 요약">
          <ScoreCard score={vm.security_score} />
          <SeverityCard danger={danger} normal={normal} total={totalSeverity} vm={vm} warning={warning} />
        </section>

        <FileListCard files={vm.file_list} />
      </div>
    </section>
  );
}
