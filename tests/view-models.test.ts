import { describe, expect, it } from 'vitest';
import { analysisResult, flatAnalysisResult } from './fixtures';
import { buildAnalysisDetailViewModel, buildCapabilitiesViewModel, buildDashboardViewModel, buildRecentResultsViewModel, vulnerabilityTypeToDisplayName } from '@/lib/view-models/analysis';

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
    expect(vm.file_list).toContainEqual({ file: 'src/A.java', vuln: 2, lines: 1, level: '치명적' });
  });

  it('maps vulnerability detail fields with legacy contract parity', () => {
    const vm = buildAnalysisDetailViewModel(analysisResult);
    expect(vm.call_graph).toEqual({ available: true, node_count: 2, edge_count: 1, preview: ['controller → service'] });
    expect(vm.llm_report).toMatchObject({ status: 'generated', available: true, model: 'test-model' });
    expect(vm.llm_report.text).toContain('LLM 리포트입니다.');
    expect(vm.vuln_distribution).toContainEqual({ category: 'SQL Injection', count: 2 });
    expect(vm.vuln_details[0]).toMatchObject({ severity: '위험', cvss_score: 8.1, cvss_vector: 'CVSS:3.1', call_chain: ['Controller', 'DAO'] });
    expect(vm.vuln_details[1]).toMatchObject({ severity: '치명적', cvss_score: 9.1, description: '취약점 설명이 없습니다.', fix: '취약점에 적합한 보안 패턴을 적용하세요.' });
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
