import Link from "next/link";
import { MarkdownContent } from "@/components/analysis/MarkdownContent";
import { ReportDownloadButton } from "@/components/analysis/ReportDownloadButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildDashboardHref } from "@/lib/routes";
import { getFindingDisplayText } from "@/lib/view-models/analysis";
import type { AnalysisDetailViewModel } from "@/lib/view-models/analysis";

type VulnerabilityDetail = AnalysisDetailViewModel["vuln_details"][number];
type GuideDistributionItem =
	AnalysisDetailViewModel["guide_distribution"][number];

type KpiItem = {
	label: string;
	value: string | number;
	tone?: "danger";
	compact?: boolean;
};

function codeLines(code: string, line: number | null) {
	const lines = String(code || "코드 정보가 없습니다.").split("\n");
	const safeLine = line && line > 0 ? line : 1;
	const start = Math.max(1, safeLine - Math.floor(lines.length / 2));

	return lines.map((text, index) => ({
		number: start + index,
		text,
		active: start + index === safeLine,
	}));
}

function groupByType(details: VulnerabilityDetail[]) {
	const grouped = new Map<string, VulnerabilityDetail[]>();
	for (const detail of details) {
		grouped.set(detail.type, [...(grouped.get(detail.type) ?? []), detail]);
	}
	return [...grouped.entries()];
}

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

function ResultHero({
	repo,
	analysisId,
}: {
	repo: string;
	analysisId?: string | null;
}) {
	return (
		<header className="dashboard-hero-card">
			<div>
				<Badge className="dashboard-eyebrow" variant="outline">
					상세 분석
				</Badge>
				<h1>상세 보안취약점 분석</h1>
				<p>
					{repo || "분석 대상 저장소"}에서 발견된 취약점의 코드, 호출 경로, 권장
					조치 내용을 확인합니다.
				</p>
			</div>

			<div className="dashboard-hero-actions" aria-label="상세 분석 작업">
				<Button
					className="dashboard-primary-action"
					nativeButton={false}
					render={<Link href={buildDashboardHref(repo, analysisId)} />}
				>
					대시보드 보기
				</Button>
				<ReportDownloadButton
					analysisId={analysisId}
					className="dashboard-secondary-action"
				/>
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

function LlmReportCard({
	report,
}: {
	report: AnalysisDetailViewModel["llm_report"];
}) {
	if (report.text) {
		return (
			<Card className="dashboard-card llm-report">
				<CardContent className="dashboard-card-content">
					<div className="llm-report-header">
						<span>보안 분석 리포트</span>
						{report.model ? <span>{report.model}</span> : null}
					</div>
					<MarkdownContent content={report.text} />
				</CardContent>
			</Card>
		);
	}

	if (report.status !== "failed") return null;

	return (
		<Card className="dashboard-card llm-report unavailable">
			<CardContent className="dashboard-card-content">
				<div className="llm-report-header">
					<span>보안 분석 리포트</span>
					<span>생성 실패</span>
				</div>
				<p>{report.error ?? "보안 리포트를 생성하지 못했습니다."}</p>
			</CardContent>
		</Card>
	);
}

function VulnerabilityGroups({
	grouped,
}: {
	grouped: [string, VulnerabilityDetail[]][];
}) {
	if (!grouped.length) {
		return (
			<Card className="dashboard-card">
				<CardContent className="dashboard-card-content empty-row">
					발견된 취약점이 없습니다.
				</CardContent>
			</Card>
		);
	}

	return grouped.map(([type, items]) => (
		<details className="vgroup analysis-vgroup" key={type}>
			<summary>
				<b>{type}</b>
				<span className={`level-badge level-${items[0].severity}`}>
					{items[0].severity}
				</span>
				<span>총 {items.length}건 발견됨</span>
			</summary>

			{items.map((detail) => (
				<VulnerabilityArticle
					detail={detail}
					key={detail.id || `${detail.file}-${detail.line}-${detail.type}`}
				/>
			))}
		</details>
	));
}

function VulnerabilityArticle({ detail }: { detail: VulnerabilityDetail }) {
	return (
		<article className="vitem">
			<VulnerabilitySummary detail={detail} />
			<CodeComparison detail={detail} />
			<EvidenceGrid detail={detail} />
			<ExplanationGrid detail={detail} />
		</article>
	);
}

function VulnerabilitySummary({ detail }: { detail: VulnerabilityDetail }) {
	const metadata = metadataText(detail);

	return (
		<header className="vitem-summary">
			<div className="vitem-header">
				<span>
					{detail.file}
					{detail.function ? <em> · {String(detail.function)}</em> : null}
				</span>
				<span>
					Line {detail.line ?? "-"}{" "}
					<b className={`level-badge level-${detail.severity}`}>
						{detail.severity}
					</b>
				</span>
			</div>

			{metadata ? <div className="metadata">{metadata}</div> : null}
			<GuideReference detail={detail} />
		</header>
	);
}

function GuideReference({ detail }: { detail: VulnerabilityDetail }) {
	if (!detail.guide_category && !detail.guide_item) return null;

	return (
		<div className="guide-reference">
			<span>{detail.guide_source || "공식 보안약점 진단가이드 기준"}</span>
			<strong>
				{[detail.guide_category, detail.guide_item].filter(Boolean).join(" > ")}
			</strong>
		</div>
	);
}

function CodeComparison({ detail }: { detail: VulnerabilityDetail }) {
	const highlightedLines = codeLines(detail.code, detail.line);
	const display = getFindingDisplayText(detail);

	return (
		<section
			className="vitem-code-compare"
			aria-label="취약 코드와 권장 수정 예시"
		>
			<div className="code-panel code-panel-vulnerable">
				<div className="code-panel-header">
					<span>취약 코드</span>
					<b>탐지 위치</b>
				</div>
				<pre className="vitem-code">
					{highlightedLines.map((line) => (
						<code className={line.active ? "active" : ""} key={line.number}>
							<span>{line.number}</span>
							{line.text}
						</code>
					))}
				</pre>
			</div>

			{detail.safe_example || !display.isDynamic ? (
				<div className="code-panel code-panel-safe">
					<div className="code-panel-header">
						<span>권장 수정 예시</span>
						<b>보안 패턴</b>
					</div>
					{detail.safe_example ? (
						<pre className="vitem-safe-code">{String(detail.safe_example)}</pre>
					) : (
						<pre className="vitem-safe-code recommendation-preview">
							{display.howToFix}
						</pre>
					)}
				</div>
			) : null}
		</section>
	);
}

function EvidenceGrid({ detail }: { detail: VulnerabilityDetail }) {
	return (
		<section className="vitem-evidence-grid" aria-label="탐지 근거와 신뢰도">
			<div className="vitem-callpath">
				<b>호출 경로</b>
				{detail.call_chain.length ? (
					detail.call_chain.map((node) => <span key={node}>{node}</span>)
				) : (
					<span className="dashboard-muted">호출 경로 정보 없음</span>
				)}
			</div>

			{detail.evidence ? (
				<div className="evidence">
					<b>탐지 근거</b>
					<p>{detail.evidence}</p>
				</div>
			) : null}

			{detail.confidence_reason ? (
				<div className="confidence-reason">
					<b>신뢰도 판단 기준</b>
					<p>{detail.confidence_reason}</p>
				</div>
			) : null}
		</section>
	);
}

function ExplanationGrid({ detail }: { detail: VulnerabilityDetail }) {
	const display = getFindingDisplayText(detail);

	return (
		<section className="vitem-explanation-grid" aria-label="문제점과 수정 방향">
			<div className="problem">
				<b>문제점</b>
				<p>{display.whyVulnerable}</p>
			</div>

			<div className="fix">
				<b>수정 방향</b>
				<pre>{display.howToFix}</pre>
				{display.fixSteps.length ? (
					<ol className="fix-steps">
						{display.fixSteps.map((step, index) => (
							<li key={`${index}-${step}`}>{step}</li>
						))}
					</ol>
				) : null}
			</div>
		</section>
	);
}

export function AnalysisView({
	vm,
	repo,
	analysisId,
}: {
	vm: AnalysisDetailViewModel;
	repo: string;
	analysisId?: string | null;
}) {
	const guideDistribution = vm.guide_distribution.length
		? vm.guide_distribution
		: [{ category: "공식 가이드 매핑 없음", count: 0 }];
	const guideMaxCount = Math.max(
		1,
		...guideDistribution.map((item) => item.count),
	);
	const currentAnalysisId = vm.analysis_id || analysisId;

	return (
		<section className="dashboard-container analysis-container">
			<ResultHero repo={repo} analysisId={currentAnalysisId} />

			<KpiGrid
				items={[
					{ label: "검사 시간", value: vm.scan_date, compact: true },
					{
						label: "발견된 취약점",
						value: vm.total_vulnerabilities,
						tone: "danger",
					},
					{ label: "분석된 파일", value: vm.files_analyzed },
					{ label: "영향 파일", value: vm.affected_files },
				]}
			/>

			<div className="dashboard-summary-stack">
				<section className="analysis-overview-grid" aria-label="상세 분석 개요">
					<GuideDistributionCard
						items={guideDistribution}
						maxCount={guideMaxCount}
					/>
					<CallGraphCard callGraph={vm.call_graph} />
				</section>

				<LlmReportCard report={vm.llm_report} />
				<VulnerabilityGroups grouped={groupByType(vm.vuln_details)} />
			</div>
		</section>
	);
}
