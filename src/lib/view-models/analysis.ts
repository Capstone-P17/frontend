export const SEVERITY_LABELS: Record<string, string> = {
  CRITICAL: '치명적',
  HIGH: '위험',
  MEDIUM: '경고',
  LOW: '보통',
};

export const TYPE_DISPLAY: Record<string, string> = {
  SQL_INJECTION: 'SQL Injection',
  XSS: 'Cross-Site Scripting (XSS)',
  HARDCODED_SECRET: 'Hardcoded Credentials',
  COMMAND_INJECTION: 'Command Injection',
  PATH_TRAVERSAL: 'Path Traversal',
  INSECURE_RANDOM: 'Insecure Randomness',
  WEAK_HASH: 'Weak Cryptographic Hash',
  DANGEROUS_FILE_UPLOAD: 'Dangerous File Upload',
};

export type Dict = Record<string, unknown>;

export type LlmExplanationStatus =
  | 'unavailable'
  | 'generated'
  | 'skipped'
  | 'failed'
  | 'skipped_context_budget_exceeded';

export type FindingLlmExplanation = {
  why_vulnerable: string;
  how_to_fix: string;
  fix_steps: string[];
  cited_guideline_ids?: string[];
  citations?: unknown[];
  grounding_notes?: string | null;
};

export type VulnerabilityFinding = {
  id: string;
  type: string;
  severity: string;
  file: string;
  line?: number | null;
  function?: string | null;

  description: string;
  recommendation: string;
  safe_example?: string;
  confidence_reason?: string;

  llm_explanation_status?: LlmExplanationStatus;
  llm_explanation?: FindingLlmExplanation | null;
  llm_explanation_error?: string | null;
};

export function getFindingDisplayText(finding: VulnerabilityFinding) {
  const explanation = finding.llm_explanation;

  if (finding.llm_explanation_status === 'generated' && explanation) {
    return {
      isDynamic: true,
      whyVulnerable: explanation.why_vulnerable,
      howToFix: explanation.how_to_fix,
      fixSteps: explanation.fix_steps ?? [],
    };
  }

  return {
    isDynamic: false,
    whyVulnerable: finding.description,
    howToFix: finding.recommendation,
    fixSteps: [],
  };
}

export function severityToKoreanLabel(severity: unknown): string {
  return SEVERITY_LABELS[String(severity ?? '').toUpperCase()] ?? '보통';
}

export function severityRank(severity: unknown): number {
  return { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[String(severity ?? '').toUpperCase() as 'LOW'] ?? 0;
}

export function vulnerabilityTypeToDisplayName(vulnType: unknown): string {
  const raw = String(vulnType ?? '');
  if (!raw) return 'Unknown';
  return TYPE_DISPLAY[raw] ?? raw.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function compareFindingOrder(a: Dict, b: Dict): number {
  const severityDiff = severityRank(b.severity) - severityRank(a.severity);
  if (severityDiff !== 0) return severityDiff;

  const fileDiff = String(a.file ?? '').localeCompare(String(b.file ?? ''));
  if (fileDiff !== 0) return fileDiff;

  const lineDiff = toInt(a.line, Number.MAX_SAFE_INTEGER) - toInt(b.line, Number.MAX_SAFE_INTEGER);
  if (lineDiff !== 0) return lineDiff;

  return String(a.type ?? '').localeCompare(String(b.type ?? ''));
}

function asRecord(value: unknown): Dict {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Dict) : {};
}

function asArray(value: unknown): Dict[] {
  return Array.isArray(value) ? value.filter((item): item is Dict => Boolean(item && typeof item === 'object' && !Array.isArray(item))) : [];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function toLlmExplanationStatus(value: unknown): LlmExplanationStatus | undefined {
  const status = String(value ?? '');
  return ['unavailable', 'generated', 'skipped', 'failed', 'skipped_context_budget_exceeded'].includes(status)
    ? status as LlmExplanationStatus
    : undefined;
}

function toFindingLlmExplanation(value: unknown): FindingLlmExplanation | null {
  const explanation = asRecord(value);
  if (!explanation.why_vulnerable || !explanation.how_to_fix) return null;

  return {
    why_vulnerable: String(explanation.why_vulnerable),
    how_to_fix: String(explanation.how_to_fix),
    fix_steps: asStringArray(explanation.fix_steps),
    cited_guideline_ids: Array.isArray(explanation.cited_guideline_ids) ? explanation.cited_guideline_ids.map(String) : undefined,
    citations: Array.isArray(explanation.citations) ? explanation.citations : undefined,
    grounding_notes: explanation.grounding_notes === null || explanation.grounding_notes === undefined ? null : String(explanation.grounding_notes),
  };
}

function toInt(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function splitResponse(response: Dict): { analysisId: string; analysis: Dict } {
  let analysis = asRecord(response.analysis_result);
  if (Object.keys(analysis).length === 0) analysis = response;
  if (!('repository' in analysis) && 'repository_url' in response) analysis = { ...analysis, repository: response.repository_url };
  if (!('vulnerabilities' in analysis) && 'vulnerabilities' in response) analysis = { ...analysis, vulnerabilities: response.vulnerabilities };
  if (!('summary' in analysis) && 'summary' in response) analysis = { ...analysis, summary: response.summary };
  return { analysisId: String(response.analysis_id ?? analysis.analysis_id ?? ''), analysis };
}

function formatDatetime(value: unknown): string {
  if (typeof value !== 'string' || !value) return '-';
  const date = new Date(value.replace('Z', '+00:00'));
  if (Number.isNaN(date.getTime())) return value;
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${yy}/${mm}/${dd} ${hh}:${mi}`;
}

export type DashboardViewModel = ReturnType<typeof buildDashboardViewModel>;
export type AnalysisDetailViewModel = ReturnType<typeof buildAnalysisDetailViewModel>;
export type RecentResultsViewModel = ReturnType<typeof buildRecentResultsViewModel>;

export function buildDashboardViewModel(response: Dict) {
  const { analysisId, analysis } = splitResponse(response);
  const vulnerabilities = asArray(analysis.vulnerabilities);
  const sortedVulnerabilities = [...vulnerabilities].sort(compareFindingOrder);
  const summary = asRecord(analysis.summary);
  const bySeverity = asRecord(summary.by_severity);
  const byType = asRecord(summary.by_type);
  const byGuideCategory = asRecord(summary.by_guide_category);
  const score = asRecord(summary.score);
  const fileSummary = new Map<string, { count: number; severity: string; lines: Set<unknown> }>();

  for (const vuln of sortedVulnerabilities) {
    const file = String(vuln.file ?? '');
    if (!file) continue;
    const entry = fileSummary.get(file) ?? { count: 0, severity: 'LOW', lines: new Set<unknown>() };
    entry.count += 1;
    if (vuln.line) entry.lines.add(vuln.line);
    const rawSeverity = String(vuln.severity ?? 'LOW').toUpperCase();
    if (severityRank(rawSeverity) > severityRank(entry.severity)) entry.severity = rawSeverity;
    fileSummary.set(file, entry);
  }

  return {
    analysis_id: analysisId,
    repo_url: String(analysis.repository ?? ''),
    scan_date: formatDatetime(analysis.analyzed_at),
    total_vulnerabilities: toInt(summary.total_vulnerabilities, vulnerabilities.length),
    files_analyzed: toInt(analysis.files_analyzed),
    affected_files: fileSummary.size,
    security_score: toInt(score.overall),
    severity_counts: {
      critical: toInt(bySeverity.CRITICAL),
      high: toInt(bySeverity.HIGH),
      medium: toInt(bySeverity.MEDIUM),
      low: toInt(bySeverity.LOW),
    },
    vulnerability_types: Object.entries(byType)
      .map(([type, count]) => ({ type, name: vulnerabilityTypeToDisplayName(type), count: toInt(count) }))
      .filter((item) => item.count > 0)
      .sort((a, b) => a.type.localeCompare(b.type)),
    guide_categories: Object.entries(byGuideCategory)
      .map(([category, count]) => ({ category, count: toInt(count) }))
      .filter((item) => item.count > 0),
    file_list: [...fileSummary.entries()]
      .sort(([fileA, infoA], [fileB, infoB]) => {
        const severityDiff = severityRank(infoB.severity) - severityRank(infoA.severity);
        if (severityDiff !== 0) return severityDiff;
        const countDiff = infoB.count - infoA.count;
        if (countDiff !== 0) return countDiff;
        return fileA.localeCompare(fileB);
      })
      .map(([file, info]) => ({
        file,
        vuln: info.count,
        lines: info.lines.size,
        level: severityToKoreanLabel(info.severity),
      })),
  };
}

export function buildCapabilitiesViewModel(response: Dict) {
  return {
    supported_languages: Array.isArray(response.supported_languages) ? response.supported_languages.map(String) : ['java'],
    supported_file_extensions: Array.isArray(response.supported_file_extensions) ? response.supported_file_extensions.map(String) : ['.java'],
    supported_repository_sources: Array.isArray(response.supported_repository_sources) ? response.supported_repository_sources.map(String) : ['github'],
    analysis_mode: String(response.analysis_mode ?? 'rule_based'),
    llm_detection_enabled: Boolean(response.llm_detection_enabled ?? false),
    llm_report_available: Boolean(response.llm_report_available ?? false),
    static_analysis_available: Boolean(response.static_analysis_available ?? true),
    detectors: Array.isArray(response.detectors) ? response.detectors : [],
  };
}

export function buildRecentResultsViewModel(response: Dict) {
  return asArray(response.results).map((item) => ({
    analysis_id: String(item.analysis_id ?? ''),
    repository: String(item.repository ?? ''),
    scan_date: formatDatetime(item.analyzed_at),
    language: String(item.language ?? 'java'),
    files_analyzed: toInt(item.files_analyzed),
    total_vulnerabilities: toInt(item.total_vulnerabilities),
    severity_counts: asRecord(item.severity_counts),
  }));
}

function nodeLabel(node: unknown): string {
  const record = asRecord(node);
  for (const key of ['label', 'name', 'function', 'id']) {
    if (record[key]) return String(record[key]);
  }
  return String(node);
}

function edgeLabel(edge: unknown): string {
  const record = asRecord(edge);
  const source = record.source ?? record.from ?? record.caller;
  const target = record.target ?? record.to ?? record.callee;
  if (source || target) return `${source ?? '?'} → ${target ?? '?'}`;
  return String(edge);
}

function buildCallGraphView(callGraph: unknown) {
  if (!callGraph) return { available: false, node_count: 0, edge_count: 0, preview: [] as string[] };
  if (Array.isArray(callGraph)) {
    return { available: true, node_count: callGraph.length, edge_count: 0, preview: callGraph.slice(0, 8).map(nodeLabel) };
  }
  const record = asRecord(callGraph);
  const nodes = (['nodes', 'functions', 'vertices'].map((key) => record[key]).find(Array.isArray) ?? []) as unknown[];
  const edges = (['edges', 'calls', 'links'].map((key) => record[key]).find(Array.isArray) ?? []) as unknown[];
  if (nodes.length || edges.length) {
    return { available: true, node_count: nodes.length, edge_count: edges.length, preview: (edges.length ? edges.slice(0, 8).map(edgeLabel) : nodes.slice(0, 8).map(nodeLabel)).filter(Boolean) };
  }
  return { available: true, node_count: 0, edge_count: 0, preview: Object.entries(record).slice(0, 8).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.length : String(value)}`) };
}

function buildVulnerabilityDetail(vuln: Dict) {
  const rawSeverity = String(vuln.severity ?? 'LOW').toUpperCase();
  const cvss = typeof vuln.cvss === 'number' ? { score: vuln.cvss } : asRecord(vuln.cvss);
  const line = Number(vuln.line);
  const callChain = Array.isArray(vuln.call_chain) ? vuln.call_chain.map(String) : [];
  const recommendation = String(vuln.recommendation ?? '취약점에 적합한 보안 패턴을 적용하세요.');
  return {
    id: String(vuln.id ?? ''),
    type: vulnerabilityTypeToDisplayName(vuln.type ?? 'UNKNOWN'),
    severity: severityToKoreanLabel(rawSeverity),
    raw_severity: rawSeverity,
    cwe: vuln.cwe,
    guide_source: String(vuln.guide_source ?? ''),
    guide_category: String(vuln.guide_category ?? ''),
    guide_item: String(vuln.guide_item ?? ''),
    cvss_score: cvss.score,
    cvss_vector: cvss.vector,
    file: String(vuln.file ?? 'Unknown'),
    line: Number.isFinite(line) && line > 0 ? Math.trunc(line) : null,
    function: vuln.function ? String(vuln.function) : null,
    code: String(vuln.code_snippet ?? '코드 정보가 없습니다.'),
    description: String(vuln.description ?? '취약점 설명이 없습니다.'),
    evidence: String(vuln.evidence ?? ''),
    recommendation,
    fix: recommendation,
    safe_example: typeof vuln.safe_example === 'string' ? vuln.safe_example : undefined,
    confidence: vuln.confidence,
    confidence_reason: String(vuln.confidence_reason ?? ''),
    call_chain: callChain,
    llm_explanation_status: toLlmExplanationStatus(vuln.llm_explanation_status),
    llm_explanation: toFindingLlmExplanation(vuln.llm_explanation),
    llm_explanation_error: vuln.llm_explanation_error ? String(vuln.llm_explanation_error) : null,
  };
}

export function buildAnalysisDetailViewModel(response: Dict) {
  const { analysisId, analysis } = splitResponse(response);
  const vulnerabilities = asArray(analysis.vulnerabilities);
  const sortedVulnerabilities = [...vulnerabilities].sort(compareFindingOrder);
  const summary = asRecord(analysis.summary);
  const byType = asRecord(summary.by_type);
  const byGuideCategory = asRecord(summary.by_guide_category);
  const llmReport = typeof analysis.llm_report === 'string' ? analysis.llm_report.trim() : '';
  const llmStatus = String(analysis.llm_report_status ?? (llmReport ? 'generated' : 'unavailable'));
  return {
    analysis_id: analysisId,
    repo_url: String(analysis.repository ?? ''),
    scan_date: formatDatetime(analysis.analyzed_at),
    total_vulnerabilities: toInt(summary.total_vulnerabilities, vulnerabilities.length),
    files_analyzed: toInt(analysis.files_analyzed),
    affected_files: new Set(vulnerabilities.map((vuln) => vuln.file).filter(Boolean)).size,
    call_graph: buildCallGraphView(analysis.call_graph),
    guide_distribution: Object.entries(byGuideCategory).map(([category, count]) => ({ category, count: toInt(count) })).filter((item) => item.count > 0),
    vuln_distribution: Object.entries(byType).map(([category, count]) => ({ category: vulnerabilityTypeToDisplayName(category), count: toInt(count) })).filter((item) => item.count > 0),
    vuln_details: sortedVulnerabilities.map(buildVulnerabilityDetail),
    llm_report: {
      text: llmReport,
      status: llmStatus,
      available: Boolean(analysis.llm_report_available ?? llmReport),
      model: analysis.llm_model ? String(analysis.llm_model) : null,
      error: analysis.llm_report_error ? String(analysis.llm_report_error) : null,
    },
  };
}
