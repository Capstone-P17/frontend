import type { AnalysisDetailViewModel } from '@/lib/view-models/analysis';

const TYPE_ICONS: Record<string, string> = {
  'SQL Injection': '🗄',
  'Cross-Site Scripting (XSS)': '🌐',
  'Hardcoded Credentials': '🔑',
  'Command Injection': '💻',
  'Path Traversal': '📁',
  'Insecure Randomness': '🎲',
  'Weak Cryptographic Hash': '🔓',
};

function codeLines(code: string, line: number | null) {
  const lines = String(code || '코드 정보가 없습니다.').split('\n');
  const safeLine = line && line > 0 ? line : 1;
  const start = Math.max(1, safeLine - Math.floor(lines.length / 2));
  return lines.map((text, index) => ({ number: start + index, text, active: start + index === safeLine }));
}

export function AnalysisView({ vm, repo }: { vm: AnalysisDetailViewModel; repo: string }) {
  const distribution = vm.vuln_distribution.length ? vm.vuln_distribution : [{ category: '취약점', count: 0 }];
  const maxCount = Math.max(1, ...distribution.map((item) => item.count));
  const grouped = new Map<string, typeof vm.vuln_details>();
  for (const detail of vm.vuln_details) grouped.set(detail.type, [...(grouped.get(detail.type) ?? []), detail]);

  return (
    <section className="content-wrap">
      <h1 className="page-title"><span>{repo || '분석 결과'}</span>의<br />상세 보안취약점 분석 결과</h1>
      <div className="stats-grid four">
        <div className="stat-box"><div className="stat-label">검사 시간</div><div className="stat-value small">{vm.scan_date}</div></div>
        <div className="stat-box"><div className="stat-label">분석된 파일</div><div className="stat-value">{vm.files_analyzed}</div></div>
        <div className="stat-box"><div className="stat-label">발견된 취약점</div><div className="stat-value danger">{vm.total_vulnerabilities}</div></div>
        <div className="stat-box"><div className="stat-label">영향 파일</div><div className="stat-value danger">{vm.affected_files}</div></div>
      </div>
      <div className="stat-box bars">
        <div className="stat-label">취약점 분포</div>
        {distribution.map((item) => <div className="bar-row" key={item.category}><span>{item.category}</span><div><i style={{ width: `${Math.round((item.count / maxCount) * 100)}%` }} /></div><b>{item.count}</b></div>)}
      </div>
      {vm.call_graph.available ? (
        <div className="stat-box call-graph">
          <div className="call-header"><span>호출 그래프</span><span>노드 {vm.call_graph.node_count.toLocaleString()} · 엣지 {vm.call_graph.edge_count.toLocaleString()}</span></div>
          <div className="call-preview">{vm.call_graph.preview.length ? vm.call_graph.preview.map((item) => <span key={item}>{item}</span>) : <span className="muted">표시할 호출 그래프 미리보기가 없습니다.</span>}</div>
        </div>
      ) : null}
      {vm.llm_report.text ? (
        <div className="stat-box llm-report">
          <div className="llm-report-header"><span>LLM 보안 리포트</span>{vm.llm_report.model ? <span>{vm.llm_report.model}</span> : null}</div>
          <pre>{vm.llm_report.text}</pre>
        </div>
      ) : vm.llm_report.status === 'failed' ? (
        <div className="stat-box llm-report unavailable">
          <div className="llm-report-header"><span>LLM 보안 리포트</span><span>생성 실패</span></div>
          <p>{vm.llm_report.error ?? 'LLM 리포트 생성에 실패했습니다.'}</p>
        </div>
      ) : null}
      {[...grouped.entries()].length ? [...grouped.entries()].map(([type, items]) => (
        <details className="vgroup" key={type}>
          <summary><span className={`vtype-icon level-${items[0].severity}`}>{TYPE_ICONS[type] ?? '⚠'}</span><b>{type}</b><span className={`level-badge level-${items[0].severity}`}>{items[0].severity}</span><span>총 {items.length}건 발견됨</span></summary>
          {items.map((detail) => (
            <article className="vitem" key={detail.id || `${detail.file}-${detail.line}-${detail.type}`}>
              <div className="vitem-header"><span>📄 {detail.file}{detail.function ? <em> ⚙ {String(detail.function)}</em> : null}</span><span>Line {detail.line ?? '-'} <b className={`level-badge level-${detail.severity}`}>{detail.severity}</b></span></div>
              <div className="metadata">{[detail.cwe ? `CWE: ${detail.cwe}` : '', detail.cvss_score !== undefined ? `CVSS: ${detail.cvss_score}` : '', detail.cvss_vector ? String(detail.cvss_vector) : '', detail.confidence ? `신뢰도: ${detail.confidence}` : ''].filter(Boolean).join(' · ')}</div>
              <pre className="vitem-code">{codeLines(detail.code, detail.line).map((line) => <code key={line.number} className={line.active ? 'active' : ''}><span>{line.number}</span>{line.text}</code>)}</pre>
              <div className="vitem-bottom"><div className="vitem-callpath"><b>호출 경로</b>{detail.call_chain.length ? detail.call_chain.map((node) => <span key={node}>{node}</span>) : <span className="muted">호출 경로 정보 없음</span>}</div><div className="vitem-right"><div className="problem"><b>⚠ 문제점</b><p>{detail.description}</p></div><div className="fix"><b>◎ 해결 방법</b><pre>{detail.fix}</pre></div>{detail.safe_example ? <div className="fix"><b>✓ 안전한 예시</b><pre>{String(detail.safe_example)}</pre></div> : null}</div></div>
            </article>
          ))}
        </details>
      )) : <div className="stat-box empty-row">발견된 취약점이 없습니다.</div>}
    </section>
  );
}
