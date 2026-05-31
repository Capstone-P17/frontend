import { describe, expect, it } from 'vitest';
import { analysisResult, flatAnalysisResult } from './fixtures';
import { buildAnalysisDetailViewModel, buildCapabilitiesViewModel, buildDashboardViewModel, buildFindingDetailViewModel, buildRecentResultsViewModel, vulnerabilityTypeToDisplayName } from '@/lib/view-models/analysis';

describe('analysis view model parity', () => {
  it('matches dashboard summary transformation from legacy contract', () => {
    const vm = buildDashboardViewModel(analysisResult);
    expect(vm.analysis_id).toBe('analysis-1');
    expect(vm.repo_url).toBe('https://github.com/owner/repo');
    expect(vm.total_vulnerabilities).toBe(3);
    expect(vm.files_analyzed).toBe(7);
    expect(vm.affected_files).toBe(2);
    expect(vm.security_score).toBe(35);
    expect(vm.vulnerability_types).toEqual([
      { type: 'SQL_INJECTION', name: 'SQL Injection', count: 2 },
      { type: 'XSS', name: 'Cross-Site Scripting (XSS)', count: 1 },
    ]);
    expect(vm.guide_categories).toEqual([
      {
        category: '입력값 검증',
        raw_category: '입력데이터 검증 및 표현',
        count: 3,
        items: [
          { item: 'SQL 인젝션', raw_item: 'SQL 삽입', count: 2 },
          { item: '크로스사이트 스크립트', raw_item: '크로스사이트 스크립트', count: 1 },
        ],
      },
    ]);
    expect(vm.file_list[0]).toEqual({
      file: 'src/A.java',
      vuln: 2,
      lines: 1,
      line_numbers: [10],
      line_summary: '10',
    });
  });

  it('maps vulnerability detail fields with legacy contract parity', () => {
    const vm = buildAnalysisDetailViewModel(analysisResult);
    expect(vm.call_graph).toEqual({ available: true, node_count: 2, edge_count: 1, preview: ['controller → service'] });
    expect(vm.llm_report).toMatchObject({ status: 'generated', available: true, model: 'test-model' });
    expect(vm.llm_report.text).toContain('LLM 리포트입니다.');
    expect(vm.vuln_distribution).toContainEqual({ category: 'SQL Injection', count: 2 });
    expect(vm.guide_distribution[0]).toMatchObject({
      category: '입력값 검증',
      count: 3,
    });
    expect(vm.guide_distribution[0].items).toContainEqual({ item: 'SQL 인젝션', raw_item: 'SQL 삽입', count: 2 });
    expect(vm.vuln_details[0]).toMatchObject({ evidence: 'userId 값이 query에 결합된 뒤 executeQuery로 실행됩니다.', confidence_reason: '외부 입력이 SQL 실행 API까지 도달합니다.', call_chain: ['Controller', 'DAO'] });
    expect(vm.vuln_details[1]).toMatchObject({ description: '취약점 설명이 없습니다.', evidence: '', confidence_reason: '', fix: '취약점에 적합한 보안 패턴을 적용하세요.' });
  });

  it('derives dashboard counts from findings when summary is stale', () => {
    const vm = buildDashboardViewModel({
      analysis_result: {
        repository: 'https://github.com/example/verademo',
        files_analyzed: 3,
        summary: {
          total_vulnerabilities: 2,
          by_type: { XSS: 2 },
          score: { overall: 80 },
        },
        vulnerabilities: [
          { id: 'xss', type: 'XSS', file: 'src/B.java', line: 20 },
          { id: 'sql', type: 'SQL_INJECTION', file: 'src/A.java', line: 10 },
        ],
      },
    });

    expect(vm.total_vulnerabilities).toBe(2);
    expect(vm.vulnerability_types).toContainEqual({ type: 'SQL_INJECTION', name: 'SQL Injection', count: 1 });
    expect(vm.file_list[0]).toMatchObject({ file: 'src/A.java', line_summary: '10' });
  });

  it('shows actual vulnerable line numbers on dashboard file summaries', () => {
    const vm = buildDashboardViewModel({
      analysis_result: {
        summary: { total_vulnerabilities: 6 },
        vulnerabilities: [
          { type: 'XSS', file: 'src/View.java', line: 11 },
          { type: 'XSS', file: 'src/View.java', line: 3 },
          { type: 'XSS', file: 'src/View.java', line: 7 },
          { type: 'XSS', file: 'src/View.java', line: 20 },
          { type: 'XSS', file: 'src/View.java', line: 25 },
          { type: 'XSS', file: 'src/View.java', line: 7 },
        ],
      },
    });

    expect(vm.file_list[0]).toMatchObject({
      lines: 5,
      line_numbers: [3, 7, 11, 20, 25],
      line_summary: '3, 7, 11, 20 외 1개',
    });
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
            file: 'src/A.java',
            line: 10,
            description: 'A '.repeat(100),
          },
          {
            id: 'report-title',
            type: 'XSS',
            file: 'src/B.java',
            line: 20,
            finding_report: {
              status: 'static_fallback',
              title: 'Stored finding report title',
              summary: 'Stored report summary',
              markdown_preview: '# 요약 preview',
            },
          },
        ],
      },
    });

    expect(vm.vuln_details[0]).toMatchObject({ id: 'fallback-title', title: 'SQL Injection', report_status: 'unavailable' });
    expect(vm.vuln_details[0].summary.length).toBeLessThanOrEqual(140);
    expect(vm.vuln_details[1]).toMatchObject({ id: 'report-title', title: 'Stored finding report title', summary: 'Stored report summary', report_status: 'static_fallback', markdown_preview: '# 요약 preview' });
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

it('maps canonical finding detail responses with full markdown separately from compact previews', () => {
  const detail = buildFindingDetailViewModel({
    analysis_id: 'analysis-detail',
    repository: 'owner/repo',
    finding: {
      id: 'v1',
      type: 'SQL_INJECTION',
      file: 'src/Login.java',
      line: 42,
      description: 'SQL 문자열 결합',
      recommendation: 'PreparedStatement 사용',
      source_link: 'https://github.com/acme/repo/blob/main/src/Login.java#L40-L44',
      call_chain_details: [
        {
          label: 'LoginService.authenticate',
          kind: 'function',
          file: 'src/Login.java',
          line: 40,
          function: 'authenticate',
          source_link: 'https://github.com/acme/repo/blob/main/src/Login.java#L40',
        },
        {
          label: 'stmt.executeQuery',
          kind: 'sink',
          file: 'src/Login.java',
          line: 42,
          function: 'authenticate',
          source_link: 'https://github.com/acme/repo/blob/main/src/Login.java#L42',
        },
      ],
      finding_report: {
        status: 'generated',
        title: 'Unauthenticated custom payment management endpoints',
        summary: 'Full markdown summary',
        markdown: '# 요약\nfull report\n\n# 수정 예시\n```diff\n+ safe\n```',
        metadata: { source: 'llm', model: 'test-model', generated_at: '2026-05-28T00:00:00Z' },
      },
    },
  });

  expect(detail.finding).toMatchObject({
    id: 'v1',
    title: 'Unauthenticated custom payment management endpoints',
    report_status: 'generated',
    report_model: 'test-model',
    report_source: 'llm',
    source_link: 'https://github.com/acme/repo/blob/main/src/Login.java#L40-L44',
  });
  expect(detail.finding.call_chain_details[1]).toMatchObject({
    label: 'stmt.executeQuery',
    kind: 'sink',
    file: 'src/Login.java',
    line: 42,
    function: 'authenticate',
    source_link: 'https://github.com/acme/repo/blob/main/src/Login.java#L42',
  });
  expect(detail.finding.report_markdown).toContain('# 수정 예시');
  expect(detail.finding.markdown_preview.length).toBeLessThanOrEqual(220);
});
