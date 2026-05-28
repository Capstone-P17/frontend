import Image from "next/image";
import { CodeBlock, MarkdownContent } from "@/components/analysis/MarkdownContent";
import { ReportDownloadButton } from "@/components/analysis/ReportDownloadButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AnalysisDetailViewModel } from "@/lib/view-models/analysis";

type VulnerabilityDetail = AnalysisDetailViewModel["vuln_details"][number];
type GuideDistributionItem = AnalysisDetailViewModel["guide_distribution"][number];
type FileSummaryItem = AnalysisDetailViewModel["file_list"][number];
type VulnerabilityTypeItem = AnalysisDetailViewModel["vulnerability_types"][number];

type KpiItem = {
	label: string;
	value: string | number;
	tone?: "danger";
	compact?: boolean;
};

function metadataText(detail: VulnerabilityDetail): string {
	return [
		detail.cwe ? `CWE: ${detail.cwe}` : "",
		detail.cvss_score !== undefined ? `CVSS: ${detail.cvss_score}` : "",
		detail.cvss_vector ? String(detail.cvss_vector) : "",
		detail.confidence ? `신뢰도: ${detail.confidence}` : "",
	]
		.filter(Boolean)
		.join(" · ");
}

function reportStatusText(status: string): string {
	const labels: Record<string, string> = {
		generated: "생성됨",
		static_fallback: "정적 분석 기반 대체 리포트",
		failed: "생성 실패",
		unavailable: "미생성",
		skipped_context_budget_exceeded: "컨텍스트 한도 초과로 생략",
		loading: "불러오는 중",
	};
	return labels[status] ?? status;
}

function scoreTone(score: number): "danger" | "warning" | "normal" {
	if (score < 40) return "danger";
	if (score < 70) return "warning";
	return "normal";
}

function scoreLabel(score: number): string {
	if (score < 40) return "위험";
	if (score < 70) return "주의";
	return "양호";
}

function severityTotal(severity: AnalysisDetailViewModel["severity_counts"]): number {
	return severity.critical + severity.high + severity.medium + severity.low;
}

function severityPercent(count: number, total: number): number {
	if (!total) return 0;
	return Math.max(3, Math.round((count / total) * 100));
}

function vulnCountTone(count: number): string {
	if (count >= 70) return "danger-text";
	if (count >= 30) return "warning-text";
	return "normal-text";
}

function ResultHero({ repo, analysisId, score }: { repo: string; analysisId?: string | null; score: number }) {
	const tone = scoreTone(score);
	return (
		<header className="dashboard-hero-card analysis-overview-hero">
			<div className="dashboard-hero-text">
				<Badge className="dashboard-eyebrow" variant="outline">분석 결과 Overview</Badge>
				<h1>보안 취약점 분석 결과</h1>
				<p>{repo || "분석 대상 저장소"}에서 발견된 취약점 현황과 파일별 영향을 요약했습니다. 좌측 취약점 목록을 선택하면 상세 분석 리포트로 이동합니다.</p>
				<div className="dashboard-hero-actions" aria-label="분석 결과 작업">
					<ReportDownloadButton analysisId={analysisId} className="dashboard-secondary-action" />
				</div>
			</div>

			<div className="dashboard-hero-bean" aria-label={`보안 상태: ${scoreLabel(score)}`}>
				<Image src={`/bean_${tone}.png`} alt="" width={180} height={180} className="dashboard-hero-bean-img" priority />
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
						<strong
							className={`${item.compact ? "small-value" : ""} ${item.tone === "danger" ? "danger-text" : ""}`.trim()}
						>
							{item.value}
						</strong>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

function GuideDistributionCard({
	items,
	maxCount,
}: {
	items: GuideDistributionItem[];
	maxCount: number;
}) {
	return (
		<Card className="dashboard-card">
			<CardContent className="dashboard-card-content">
				<div className="dashboard-card-header">
					<span>가이드 대분류 분포</span>
					<Badge variant="outline">{items.length}개 분류</Badge>
				</div>

				<div className="analysis-bars" aria-label="가이드 대분류별 취약점 수">
					{items.map((item) => (
						<div className="bar-row" key={item.category}>
							<span>{item.category}</span>
							<div aria-hidden="true">
								<i
									style={{
										width: `${Math.round((item.count / maxCount) * 100)}%`,
									}}
								/>
							</div>
							<b>{item.count}</b>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function CallGraphCard({
	callGraph,
}: {
	callGraph: AnalysisDetailViewModel["call_graph"];
}) {
	if (!callGraph.available) return null;

	return (
		<Card className="dashboard-card">
			<CardContent className="dashboard-card-content">
				<div className="dashboard-card-header">
					<span>호출 그래프</span>
					<Badge variant="outline">
						노드 {callGraph.node_count.toLocaleString()} · 엣지{" "}
						{callGraph.edge_count.toLocaleString()}
					</Badge>
				</div>

				<div className="call-preview">
					{callGraph.preview.length ? (
						callGraph.preview.map((item) => <span key={item}>{item}</span>)
					) : (
						<span className="dashboard-muted">
							표시할 호출 그래프 미리보기가 없습니다.
						</span>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

function SeverityCard({ vm, total }: { vm: AnalysisDetailViewModel; total: number }) {
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

function SeverityRow({ count, label, tone, total }: { count: number; label: string; tone: "danger" | "warning" | "normal"; total: number }) {
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

function VulnerabilityTypeChips({ types }: { types: VulnerabilityTypeItem[] }) {
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

function FileListCard({ files }: { files: FileSummaryItem[] }) {
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

function FileRow({ file }: { file: FileSummaryItem }) {
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

function OverviewPage({ vm, repo, analysisId }: { vm: AnalysisDetailViewModel; repo: string; analysisId?: string | null }) {
	const guideDistribution = vm.guide_distribution.length
		? vm.guide_distribution
		: [{ category: "공식 가이드 매핑 없음", count: 0 }];
	const guideMaxCount = Math.max(1, ...guideDistribution.map((item) => item.count));
	const totalSeverity = severityTotal(vm.severity_counts);

	return (
		<>
			<ResultHero repo={repo} analysisId={analysisId} score={vm.security_score} />
			<KpiGrid
				items={[
					{ label: "검사 시간", value: vm.scan_date, compact: true },
					{ label: "발견된 취약점", value: vm.total_vulnerabilities, tone: "danger" },
					{ label: "분석된 파일", value: vm.files_analyzed },
					{ label: "영향 파일", value: vm.affected_files },
				]}
			/>
			<div className="dashboard-summary-stack">
				<SeverityCard total={totalSeverity} vm={vm} />
				<section className="analysis-overview-grid" aria-label="분석 개요 보조 정보">
					<GuideDistributionCard items={guideDistribution} maxCount={guideMaxCount} />
					<CallGraphCard callGraph={vm.call_graph} />
				</section>
				<FileListCard files={vm.file_list} />
			</div>
		</>
	);
}

function buildFallbackMarkdown(detail: VulnerabilityDetail): string {
	const location = `${detail.file}${detail.line ? `:${detail.line}` : ""}`;
	const callPath = detail.call_chain.length
		? detail.call_chain.map((node) => `- \`${node}\``).join("\n")
		: "- 저장된 호출 경로 정보가 없습니다.";
	const patch = detail.safe_example
		? buildFallbackDiff(detail)
		: "백엔드 상세 Markdown을 불러오지 못한 경우입니다. 원본 파일 문맥 확인 후 아래 수정 방법을 적용하세요.";
	return `# 요약
${detail.summary || detail.description}

# 검증
## 검증 기준
- [x] 선택된 finding ID와 위치만 표시합니다.
- [x] 저장된 코드 스니펫과 호출 경로만 사용해 맥락을 정리합니다.
- [ ] 런타임 검증은 수행하지 않았습니다.

## 검토 보고
- 취약점 ID: \`${detail.id}\`
- 발견 위치: \`${location}\`
- 함수: \`${detail.function ?? "unknown"}\`

# 근거와 코드 맥락
## 발견 위치
${detail.evidence || "저장된 근거가 없습니다."}

## 호출 경로
${callPath}

# 공격 경로 분석
## 판단 근거
${detail.confidence_reason || "저장된 신뢰도 판단 근거가 제한적입니다."}

## 악용 가능성
정적 분석 결과 기준으로 ${detail.severity} 심각도 검토가 필요합니다.

## 영향
${detail.description}

## 가정
- 존재하지 않는 파일/라인/검증 결과를 추정하지 않습니다.

# 수정 방법
${detail.recommendation}

# 수정 예시
${patch}`;
}

function buildFallbackDiff(detail: VulnerabilityDetail): string {
	const snippetLines = parseNumberedSnippet(detail.code);
	const safeLines = (detail.safe_example ?? "")
		.split("\n")
		.map((line) => line.trimEnd())
		.filter((line) => line.trim().length > 0)
		.slice(0, 12);
	const activeIndex = Math.max(0, snippetLines.findIndex((line) => line.active));
	const context = snippetLines.length
		? snippetLines.slice(Math.max(0, activeIndex - 1), Math.min(snippetLines.length, activeIndex + 2))
		: [];
	const startLine = context[0]?.line ?? detail.line ?? 1;
	const deletedCount = context.filter((line) => line.active).length || 1;
	const oldCount = Math.max(1, context.length);
	const newCount = oldCount - deletedCount + safeLines.length;
	const diffLines = [
		"```diff",
		"--- 취약 코드",
		"+++ 수정 방향",
		`@@ -${startLine},${oldCount} +${startLine},${newCount} @@`,
	];
	let inserted = false;
	for (const line of context) {
		diffLines.push(`${line.active ? "-" : " "} ${line.content}`);
		if (line.active && !inserted) {
			diffLines.push(...safeLines.map((safeLine) => `+ ${safeLine}`));
			inserted = true;
		}
	}
	if (!inserted) {
		diffLines.push("- 취약 코드 위치는 위 탐지 코드 맥락을 확인하세요.");
		diffLines.push(...safeLines.map((safeLine) => `+ ${safeLine}`));
	}
	diffLines.push("```");
	return diffLines.join("\n");
}

function parseNumberedSnippet(code: string): Array<{ active: boolean; line: number; content: string }> {
	return code
		.split("\n")
		.map((rawLine, index) => {
			const match = rawLine.match(/^\s*(>?)\s*(\d+)\s*\|\s?(.*)$/);
			if (!match) {
				return rawLine.trim()
					? { active: index === 0, line: index + 1, content: rawLine.trimEnd() }
					: null;
			}
			return {
				active: Boolean(match[1]),
				line: Number(match[2]),
				content: match[3].trimEnd(),
			};
		})
		.filter((line): line is { active: boolean; line: number; content: string } => Boolean(line));
}

function MetadataItem({ label, value }: { label: string; value: string | number | null | undefined }) {
	return (
		<div className="finding-meta-item">
			<span>{label}</span>
			<strong>{value === null || value === undefined || value === "" ? "-" : value}</strong>
		</div>
	);
}


function FindingContextPanel({ detail }: { detail: VulnerabilityDetail }) {
	const location = `${detail.file}${detail.line ? `:${detail.line}` : ""}`;
	const callPathDetails = detail.call_chain_details.length
		? detail.call_chain_details
		: detail.call_chain.map((label) => ({
			label,
			kind: "unknown",
			file: "",
			line: null,
			function: null,
			source_link: null,
		}));
	return (
		<section className="finding-context-card" aria-label="정적 분석 메타와 호출 맥락">
			<div className="finding-context-header">
				<div>
					<span>정적 분석 메타</span>
					<strong>{location}</strong>
				</div>
				<div className="finding-context-actions">
					{detail.function ? <code>{detail.function}</code> : null}
					{detail.source_link ? (
						<a href={detail.source_link} target="_blank" rel="noreferrer">GitHub Blob에서 열기</a>
					) : null}
				</div>
			</div>
			<div className="finding-context-grid">
				<div className="finding-context-code">
					<b>탐지 코드 스니펫</b>
					<CodeBlock code={detail.code || "저장된 코드 스니펫이 없습니다."} language="java" title="취약 지점" />
				</div>

				<div className="finding-context-path">
					<b>호출 경로</b>
					{callPathDetails.length ? (
						<ol>
							{callPathDetails.map((node, index) => {
								const nodeLocation = node.file ? `${node.file}${node.line ? `:${node.line}` : ""}` : "";
								return (
									<li key={`${index}-${node.label}`}>
										<div className="finding-call-node">
											<strong>{node.label}</strong>
											{nodeLocation || node.function ? (
												<span>
													{[nodeLocation, node.function].filter(Boolean).join(" · ")}
												</span>
											) : null}
											{node.source_link ? (
												<a href={node.source_link} target="_blank" rel="noreferrer">GitHub에서 보기</a>
											) : null}
										</div>
									</li>
								);
							})}
						</ol>
					) : (
						<p>저장된 호출 경로 정보가 없습니다.</p>
					)}
				</div>
			</div>
		</section>
	);
}

function FindingDetailPage({
	detail,
	repo,
	findingLoading,
	findingError,
}: {
	detail: VulnerabilityDetail;
	repo: string;
	findingLoading?: boolean;
	findingError?: string;
}) {
	const location = `${detail.file}${detail.line ? `:${detail.line}` : ""}`;
	const reportStatus = detail.report_status === "unavailable" && findingLoading ? "loading" : detail.report_status;
	const markdown = detail.report_markdown || buildFallbackMarkdown(detail);
	const metadata = metadataText(detail);

	return (
		<article className="finding-detail-page" id={`finding-${detail.id}`}>
			<div className="finding-detail-kicker">취약점 상세</div>
			<header className="finding-detail-header">
				<div>
					<h2>{detail.title}</h2>
					<p>{detail.summary || detail.description}</p>
				</div>
				<Badge className={`level-badge level-${detail.severity}`} variant="outline">
					{detail.severity}
				</Badge>
			</header>

			<div className="finding-meta-grid" aria-label="선택된 취약점 메타데이터">
				<MetadataItem label="심각도" value={detail.severity} />
				<MetadataItem label="파일 / 라인" value={location} />
				<MetadataItem label="함수" value={detail.function} />
				<MetadataItem label="CWE / CVSS / 신뢰도" value={metadata} />
				<MetadataItem label="저장소" value={repo || "-"} />
				<MetadataItem label="리포트 상태" value={[reportStatusText(reportStatus), detail.report_model].filter(Boolean).join(" · ")} />
			</div>

			{detail.guide_category || detail.guide_item ? (
				<div className="guide-reference finding-guide-reference">
					<span>{detail.guide_source || "공식 보안약점 진단가이드 기준"}</span>
					<strong>
						{[detail.guide_category, detail.guide_item].filter(Boolean).join(" > ")}
					</strong>
				</div>
			) : null}

			<FindingContextPanel detail={detail} />

			{findingError ? <p className="finding-detail-warning">{findingError}</p> : null}
			{findingLoading ? <p className="finding-detail-warning">취약점 상세 리포트를 생성하는 중입니다.</p> : null}

			<section className="finding-markdown-shell" aria-label="선택된 취약점 Markdown 리포트">
				<MarkdownContent content={markdown} />
			</section>
		</article>
	);
}

export function AnalysisView({
	vm,
	repo,
	analysisId,
	selectedFindingId,
	selectedFinding,
	findingLoading,
	findingError,
}: {
	vm: AnalysisDetailViewModel;
	repo: string;
	analysisId?: string | null;
	selectedFindingId?: string | null;
	selectedFinding?: VulnerabilityDetail | null;
	findingLoading?: boolean;
	findingError?: string;
}) {
	const currentAnalysisId = vm.analysis_id || analysisId;
	const compactSelected = selectedFindingId
		? vm.vuln_details.find((detail) => detail.id === selectedFindingId) ?? null
		: null;
	const detail = selectedFinding && selectedFinding.id === compactSelected?.id ? selectedFinding : compactSelected;

	return (
		<section className="dashboard-container analysis-container">
			{detail ? (
				<FindingDetailPage
					detail={detail}
					repo={repo}
					findingLoading={findingLoading}
					findingError={findingError}
				/>
			) : (
				<OverviewPage vm={vm} repo={repo} analysisId={currentAnalysisId} />
			)}
		</section>
	);
}
