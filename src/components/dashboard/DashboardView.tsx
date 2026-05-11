import Link from 'next/link';
import { buildAnalysisHref } from '@/lib/routes';
import type { DashboardViewModel } from '@/lib/view-models/analysis';

function scoreEmoji(score: number): string {
  if (score < 40) return '😢';
  if (score < 70) return '😐';
  return '😊';
}

function scoreColor(score: number): string {
  if (score < 40) return '#FF4545';
  if (score < 70) return '#FFD415';
  return '#4BD33F';
}

function vulnCountColor(count: number): string {
  if (count >= 70) return '#FF4545';
  if (count >= 30) return '#FFD415';
  return '#4BD33F';
}

export function DashboardView({ vm, repo, analysisId }: { vm: DashboardViewModel; repo: string; analysisId?: string | null }) {
  const severity = vm.severity_counts;
  const danger = severity.critical + severity.high;
  const warning = severity.medium;
  const normal = severity.low;
  return (
    <section className="content-wrap">
      <h1 className="page-title"><span>{repo || '분석 결과'}</span>의<br />보안 취약점 분석이 완료되었습니다!</h1>
      <div className="stats-grid four">
        <div className="stat-box"><div className="stat-label">검사 시간</div><div className="stat-value small">{vm.scan_date}</div></div>
        <div className="stat-box"><div className="stat-label">발견된 취약점</div><div className="stat-value danger">{vm.total_vulnerabilities}</div></div>
        <div className="stat-box"><div className="stat-label">분석된 파일</div><div className="stat-value">{vm.files_analyzed}</div></div>
        <div className="stat-box"><div className="stat-label">영향 파일</div><div className="stat-value accent">{vm.affected_files}</div></div>
      </div>
      <div className="dashboard-row">
        <div className="score-box">
          <div className="score-emoji">{scoreEmoji(vm.security_score)}</div>
          <div className="score-value" style={{ color: scoreColor(vm.security_score) }}>{vm.security_score}<span>/100</span></div>
          <div className="muted">보안점수</div>
        </div>
        <div className="vuln-summary">
          <div className="summary-title">총 취약점 {vm.total_vulnerabilities}건</div>
          <div className="severity-line"><span className="danger-text">위험 {danger}</span><span className="warning-text">경고 {warning}</span><span className="normal-text">보통 {normal}</span></div>
          <div className="summary-title">취약점 유형별 건수</div>
          <div className="type-list">
            {vm.vulnerability_types.length ? vm.vulnerability_types.map((type) => <span key={type.type}>{type.name} <b>{type.count}</b></span>) : <span className="muted">발견된 취약점 유형이 없습니다.</span>}
          </div>
        </div>
      </div>
      <div className="file-table">
        <div className="table-title">상세 취약점 리스트</div>
        <div className="file-row header"><span>파일명</span><span>취약점 건수</span><span>라인 수</span><span>위험도</span></div>
        {vm.file_list.length ? vm.file_list.map((file) => (
          <div className="file-row" key={file.file}>
            <span>📄 {file.file}</span>
            <span style={{ color: vulnCountColor(file.vuln) }}>{file.vuln}</span>
            <span>{file.lines.toLocaleString()}</span>
            <span><span className={`level-badge level-${file.level}`}>{file.level}</span></span>
          </div>
        )) : <div className="empty-row">발견된 취약점 파일이 없습니다.</div>}
      </div>
      <Link className="wide-button" href={buildAnalysisHref(repo, analysisId)}>상세 분석결과 확인하기</Link>
    </section>
  );
}
