import { describe, expect, it } from 'vitest';
import { analysisResult, flatAnalysisResult } from './fixtures';
import { buildAnalysisDetailViewModel, buildCapabilitiesViewModel, buildDashboardViewModel, buildRecentResultsViewModel, severityRank, vulnerabilityTypeToDisplayName } from '@/lib/view-models/analysis';

describe('analysis view model parity', () => {
  it('matches dashboard summary transformation from legacy contract', () => {
    const vm = buildDashboardViewModel(analysisResult);
    expect(vm.analysis_id).toBe('analysis-1');
    expect(vm.repo_url).toBe('https://github.com/owner/repo');
    expect(vm.total_vulnerabilities).toBe(3);
    expect(vm.files_analyzed).toBe(7);
    expect(vm.affected_files).toBe(2);
    expect(vm.security_score).toBe(35);
    expect(vm.severity_counts).toEqual({ critical: 1, high: 1, medium: 1, low: 0 });
    expect(vm.vulnerability_types).toEqual([
      { type: 'SQL_INJECTION', name: 'SQL Injection', count: 2 },
      { type: 'XSS', name: 'Cross-Site Scripting (XSS)', count: 1 },
    ]);
    expect(vm.file_list[0]).toEqual({
      file: 'src/A.java',
      vuln: 2,
      lines: 1,
      line_numbers: [10],
      line_summary: '10',
      level: '치명적',
    });
  });

  it('maps vulnerability detail fields with legacy contract parity', () => {
    const vm = buildAnalysisDetailViewModel(analysisResult);
    expect(vm.call_graph).toEqual({ available: true, node_count: 2, edge_count: 1, preview: ['controller → service'] });
    expect(vm.llm_report).toMatchObject({ status: 'generated', available: true, model: 'test-model' });
    expect(vm.llm_report.text).toContain('LLM 리포트입니다.');
    expect(vm.vuln_distribution).toContainEqual({ category: 'SQL Injection', count: 2 });
    expect(vm.vuln_details[0]).toMatchObject({ severity: '치명적', cvss_score: 9.1, description: '취약점 설명이 없습니다.', evidence: '', confidence_reason: '', fix: '취약점에 적합한 보안 패턴을 적용하세요.' });
    expect(vm.vuln_details[1]).toMatchObject({ severity: '위험', cvss_score: 8.1, cvss_vector: 'CVSS:3.1', evidence: 'userId 값이 query에 결합된 뒤 executeQuery로 실행됩니다.', confidence_reason: '외부 입력이 SQL 실행 API까지 도달합니다.', call_chain: ['Controller', 'DAO'] });
  });

  it('derives dashboard severity counts from findings when summary is stale', () => {
    const vm = buildDashboardViewModel({
      analysis_result: {
        repository: 'https://github.com/example/verademo',
        files_analyzed: 3,
        summary: {
          total_vulnerabilities: 2,
          by_severity: { CRITICAL: 0, HIGH: 0, MEDIUM: 2, LOW: 0 },
          by_type: { XSS: 2 },
          score: { overall: 80 },
        },
        vulnerabilities: [
          { id: 'medium', type: 'XSS', severity: 'MEDIUM', file: 'src/B.java', line: 20 },
          { id: 'high', type: 'SQL_INJECTION', severity: 'HIGH', file: 'src/A.java', line: 10 },
        ],
      },
    });

    expect(vm.total_vulnerabilities).toBe(2);
    expect(vm.severity_counts).toEqual({ critical: 0, high: 1, medium: 1, low: 0 });
    expect(vm.vulnerability_types[0]).toMatchObject({ type: 'SQL_INJECTION', count: 1 });
    expect(vm.file_list[0]).toMatchObject({ file: 'src/A.java', line_summary: '10', level: '위험' });
  });

  it('shows actual vulnerable line numbers on dashboard file summaries', () => {
    const vm = buildDashboardViewModel({
      analysis_result: {
        summary: { total_vulnerabilities: 6 },
        vulnerabilities: [
          { type: 'XSS', severity: 'MEDIUM', file: 'src/View.java', line: 11 },
          { type: 'XSS', severity: 'MEDIUM', file: 'src/View.java', line: 3 },
          { type: 'XSS', severity: 'MEDIUM', file: 'src/View.java', line: 7 },
          { type: 'XSS', severity: 'MEDIUM', file: 'src/View.java', line: 20 },
          { type: 'XSS', severity: 'MEDIUM', file: 'src/View.java', line: 25 },
          { type: 'XSS', severity: 'MEDIUM', file: 'src/View.java', line: 7 },
        ],
      },
    });

    expect(vm.file_list[0]).toMatchObject({
      lines: 5,
      line_numbers: [3, 7, 11, 20, 25],
      line_summary: '3, 7, 11, 20 외 1개',
    });
  });

  it('uses the same severity order for Korean and raw labels', () => {
    expect(severityRank('위험')).toBeGreaterThan(severityRank('경고'));
    const vm = buildAnalysisDetailViewModel({
      analysis_result: {
        summary: { total_vulnerabilities: 2 },
        vulnerabilities: [
          { id: 'low', type: 'XSS', severity: '보통', file: 'src/B.java', line: 20 },
          { id: 'high', type: 'SQL_INJECTION', severity: '위험', file: 'src/A.java', line: 10 },
        ],
      },
    });
    expect(vm.vuln_details.map((item) => item.severity)).toEqual(['위험', '보통']);
  });


  it('maps compact finding report fields for finding-first sidebar data', () => {
    const vm = buildAnalysisDetailViewModel({
      analysis_id: 'analysis-report',
      analysis_result: {
        summary: { total_vulnerabilities: 2 },
        vulnerabilities: [
          {
            id: 'fallback-title',
            type: 'SQL_INJECTION',
            severity: 'HIGH',
            file: 'src/A.java',
            line: 10,
            description: 'A '.repeat(100),
          },
          {
            id: 'report-title',
            type: 'XSS',
            severity: 'MEDIUM',
            file: 'src/B.java',
            line: 20,
            finding_report: {
              status: 'static_fallback',
              title: 'Stored finding report title',
              summary: 'Stored report summary',
              markdown_preview: '# Summary preview',
            },
          },
        ],
      },
    });

    expect(vm.vuln_details[0]).toMatchObject({ id: 'fallback-title', title: 'SQL Injection', report_status: 'unavailable' });
    expect(vm.vuln_details[0].summary.length).toBeLessThanOrEqual(140);
    expect(vm.vuln_details[1]).toMatchObject({ id: 'report-title', title: 'Stored finding report title', summary: 'Stored report summary', report_status: 'static_fallback', markdown_preview: '# Summary preview' });
  });

  it('supports legacy flat result objects', () => {
    const vm = buildDashboardViewModel(flatAnalysisResult);
    expect(vm.repo_url).toBe('https://github.com/flat/repo');
    expect(vulnerabilityTypeToDisplayName('UNKNOWN_TYPE')).toBe('Unknown Type');
  });

  it('builds capabilities and recent results defaults', () => {
    expect(buildCapabilitiesViewModel({}).supported_languages).toEqual(['java']);
    expect(buildRecentResultsViewModel({ results: [{ analysis_id: 'a', repository: 'r' }] })[0]).toMatchObject({ analysis_id: 'a', repository: 'r', language: 'java' });
  });
});
