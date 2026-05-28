import Image from 'next/image';
import Link from 'next/link';
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

function ResultHero({ repo, analysisId, score }: { repo: string; analysisId?: string | null; score: number }) {
  const tone = scoreTone(score);

  return (
    <header className="dashboard-hero-card">
      <div className="dashboard-hero-text">
        <Badge className="dashboard-eyebrow" variant="outline">Analysis Complete</Badge>
        <h1>보안 취약점 분석 결과</h1>
        <p>{repo || '분석 대상 저장소'}에 대한 정적 분석 결과를 요약했습니다.</p>
        <div className="dashboard-hero-actions" aria-label="대시보드 작업">
          <Button className="dashboard-primary-action" nativeButton={false} render={<Link href={buildAnalysisHref(repo, analysisId)} />}>
            상세 분석 보기
          </Button>
          <ReportDownloadButton analysisId={analysisId} className="dashboard-secondary-action" />
        </div>
      </div>

      <div className="dashboard-hero-bean">
        <Image src={`/bean_${tone}.png`} alt={`보안 상태: ${scoreLabel(score)}`} width={180} height={180} className="dashboard-hero-bean-img" priority />
      </div>
    </header>
  );
}

function KpiGrid({ items }: { items: KpiItem[] }) {
  return (
    <Card className="dashboard-card dashboard-kpi-bar" aria-label="분석 요약 지표">
      {items.map((item) => (
        <div className="dashboard-kpi" key={item.label}>
          <span>{item.label}</span>
          <strong className={`${item.compact ? 'small-value' : ''} ${item.tone === 'danger' ? 'danger-text' : ''}`.trim()}>
            {item.value}
          </strong>
        </div>
      ))}
    </Card>
  );
}

function SeverityCard({ vm, total }: { vm: DashboardViewModel; total: number }) {
  return (
    <Card className="dashboard-card">
      <CardContent className="dashboard-card-content">
        <div className="dashboard-card-header">
          <span>심각도 분포</span>
          <Badge variant="outline">총 {vm.total_vulnerabilities}건</Badge>
        </div>

        <div className="severity-stack" aria-label="심각도별 취약점 수">
          <SeverityRow count={vm.severity_counts.critical} label="치명적" tone="danger" total={total} />
          <SeverityRow count={vm.severity_counts.high} label="위험" tone="danger" total={total} />
          <SeverityRow count={vm.severity_counts.medium} label="경고" tone="warning" total={total} />
          <SeverityRow count={vm.severity_counts.low} label="보통" tone="normal" total={total} />
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
            <span role="columnheader">탐지 라인</span>
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
      <span className="line-summary" role="cell">{file.line_summary}</span>
      <span role="cell">
        <span className={`level-badge level-${file.level}`}>{file.level}</span>
      </span>
    </div>
  );
}

export function DashboardView({ vm, repo, analysisId }: { vm: DashboardViewModel; repo: string; analysisId?: string | null }) {
  const severity = vm.severity_counts;
  const totalSeverity = severityTotal(severity);
  const currentAnalysisId = vm.analysis_id || analysisId;

  return (
    <section className="dashboard-container">
      <ResultHero repo={repo} analysisId={currentAnalysisId} score={vm.security_score} />

      <KpiGrid
        items={[
          { label: '검사 시간', value: vm.scan_date, compact: true },
          { label: '발견된 취약점', value: vm.total_vulnerabilities, tone: 'danger' },
          { label: '분석된 파일', value: vm.files_analyzed },
          { label: '영향 파일', value: vm.affected_files },
        ]}
      />

      <div className="dashboard-summary-stack">
        <SeverityCard total={totalSeverity} vm={vm} />
        <FileListCard files={vm.file_list} />
      </div>
    </section>
  );
}
