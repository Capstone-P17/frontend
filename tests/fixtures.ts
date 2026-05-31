export const analysisResult = {
  analysis_id: 'analysis-1',
  analysis_result: {
    repository: 'https://github.com/owner/repo',
    files_analyzed: 7,
    analyzed_at: '2026-05-11T12:00:00Z',
    summary: {
      total_vulnerabilities: 3,
      by_type: { SQL_INJECTION: 2, XSS: 1 },
      score: { overall: 35 },
    },
    vulnerabilities: [
      { id: 'v1', type: 'SQL_INJECTION', guide_category: '입력데이터 검증 및 표현', guide_item: 'SQL 삽입', file: 'src/A.java', line: 10, code_snippet: 'query', description: 'desc', evidence: 'userId 값이 query에 결합된 뒤 executeQuery로 실행됩니다.', recommendation: 'fix', confidence_reason: '외부 입력이 SQL 실행 API까지 도달합니다.', call_chain: ['Controller', 'DAO'] },
      { id: 'v2', type: 'SQL_INJECTION', guide_category: '입력데이터 검증 및 표현', guide_item: 'SQL 삽입', file: 'src/A.java', line: 10, code_snippet: '' },
      { id: 'v3', type: 'XSS', guide_category: '입력데이터 검증 및 표현', guide_item: '크로스사이트 스크립트', file: 'src/B.java', line: 20, safe_example: 'escape(input)' },
    ],
    call_graph: { nodes: [{ id: 'controller' }, { id: 'service' }], edges: [{ source: 'controller', target: 'service' }] },
    llm_report: '전체 요약\n정적 분석 결과를 바탕으로 한 LLM 리포트입니다.',
    llm_report_status: 'generated',
    llm_report_available: true,
    llm_model: 'test-model',
  },
};

export const flatAnalysisResult = {
  analysis_id: 'flat-1',
  repository_url: 'https://github.com/flat/repo',
  summary: { total_vulnerabilities: 1, by_type: { HARDCODED_SECRET: 1 }, score: { overall: 90 } },
  vulnerabilities: [{ type: 'UNKNOWN_TYPE', file: 'secret.java', line: 'bad' }],
};
