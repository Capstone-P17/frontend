import Image from "next/image";
import { CodeBlock, MarkdownContent } from "@/components/analysis/MarkdownContent";
import { ReportDownloadButton } from "@/components/analysis/ReportDownloadButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AnalysisDetailViewModel } from "@/lib/view-models/analysis";

type VulnerabilityDetail = AnalysisDetailViewModel["vuln_details"][number];
type GuideDistributionItem = AnalysisDetailViewModel["guide_distribution"][number];
type FileSummaryItem = AnalysisDetailViewModel["file_list"][number];

type KpiItem = {
	label: string;
	value: string | number;
	tone?: "danger";
	compact?: boolean;
};

type StaticGuideItem = {
	name: string;
	pages: string;
	action: string;
};

type StaticGuideCategory = {
	category: string;
	summary: string;
	items: StaticGuideItem[];
};

const STATIC_GUIDE_REFERENCE: StaticGuideCategory[] = [
	{
		category: "입력값 검증",
		summary: "외부 입력이 쿼리, 경로, 스크립트, 명령어, 파일 처리에 들어가기 전 허용값 중심으로 검증합니다.",
		items: [
			{ name: "SQL 인젝션", pages: "p.178-191", action: "동적 SQL 결합을 제거하고 PreparedStatement·파라미터 바인딩을 적용합니다." },
			{ name: "경로 조작 및 자원 삽입", pages: "p.192-201", action: "입력 경로를 정규화한 뒤 허용된 base path 내부인지 확인하고 파일명을 allowlist로 제한합니다." },
			{ name: "크로스사이트 스크립트", pages: "p.202-213", action: "출력 위치별 인코딩을 적용하고 HTML/스크립트가 필요한 값은 허용 태그만 통과시킵니다." },
			{ name: "운영체제 명령어 삽입", pages: "p.214-222", action: "쉘 문자열 실행을 피하고, 고정 명령과 검증된 인자 배열만 사용합니다." },
			{ name: "위험한 형식 파일 업로드", pages: "p.223-229", action: "확장자·MIME·매직바이트를 함께 확인하고 업로드 파일은 실행 경로 밖에 저장합니다." },
			{ name: "신뢰되지 않는 URL 자동접속", pages: "p.230-234", action: "리다이렉트/요청 대상은 도메인 allowlist로 제한하고 내부망 주소 접근을 차단합니다." },
			{ name: "XQuery/XPath/LDAP 삽입", pages: "p.235-256", action: "질의 문자열 결합을 금지하고 바인딩 API와 특수문자 이스케이프를 사용합니다." },
			{ name: "CSRF / HTTP 응답분할", pages: "p.257-266", action: "상태 변경 요청에는 CSRF 토큰을 요구하고 헤더 값에는 개행 문자를 허용하지 않습니다." },
			{ name: "정수·버퍼·포맷 입력 오류", pages: "p.267-290", action: "자료형 범위와 버퍼 길이를 먼저 검증하고 사용자 입력을 포맷 문자열로 직접 사용하지 않습니다." },
		],
	},
	{
		category: "보안 기능",
		summary: "인증·인가·암호·난수·비밀값처럼 보안 결정을 담당하는 코드는 안전한 저장/검증/알고리즘을 강제합니다.",
		items: [
			{ name: "인증 없는 중요기능 / 부적절한 인가", pages: "p.291-301", action: "서버 측 권한 검사를 기능 진입점마다 수행하고 역할·소유자 기준을 명시합니다." },
			{ name: "중요 자원 권한 설정", pages: "p.302-306", action: "파일·디렉터리·객체 저장소 권한을 최소 권한으로 고정하고 배포 시 검증합니다." },
			{ name: "취약한 암호화 알고리즘", pages: "p.307-313", action: "MD5/SHA-1 등 약한 알고리즘을 제거하고 용도에 맞는 안전한 알고리즘으로 교체합니다." },
			{ name: "중요정보 평문 저장/전송", pages: "p.314-326", action: "저장 전 암호화와 전송 구간 TLS를 적용하고 로그·응답에 민감정보를 남기지 않습니다." },
			{ name: "하드코드된 비밀번호/암호화 키", pages: "p.327-347", action: "소스 내 비밀값을 제거하고 환경 변수 또는 시크릿 저장소에서 주입합니다." },
			{ name: "적절하지 않은 난수값", pages: "p.336-341", action: "토큰·키·인증값에는 일반 Random 대신 보안 난수 생성기를 사용합니다." },
			{ name: "솔트 없는 일방향 해시", pages: "p.361-364", action: "비밀번호에는 salt와 반복 비용이 있는 전용 KDF를 적용합니다." },
		],
	},
	{
		category: "기타 구현 보안",
		summary: "상태 경쟁, 에러 처리, 코드 오류, 캡슐화, API 오용은 장애와 정보노출을 막는 방어 코딩 기준입니다.",
		items: [
			{ name: "시간 및 상태", pages: "p.377-389", action: "검사와 사용 사이 상태가 바뀌지 않도록 잠금·원자적 연산·타임아웃을 적용합니다." },
			{ name: "에러 처리", pages: "p.390-402", action: "사용자에게 내부 오류 정보를 노출하지 않고 예외별 복구/차단 흐름을 명확히 둡니다." },
			{ name: "코드 오류", pages: "p.403-432", action: "Null, 자원 해제, 초기화 상태를 명시적으로 검증하고 안전한 finally/try-with-resources 패턴을 씁니다." },
			{ name: "캡슐화", pages: "p.433-459", action: "디버그 코드와 내부 데이터를 제거하고 private 배열/상태가 외부로 직접 노출되지 않게 복사합니다." },
			{ name: "API 오용", pages: "p.460-471", action: "금지 API 사용을 대체 API로 바꾸고 보안 결정에 DNS lookup 등 불안정한 값을 사용하지 않습니다." },
		],
	},
];

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

function findingBadgeText(findingId: string): string {
	const match = findingId.match(/(\d+)$/);
	return match ? `#${match[1]}` : findingId || "Finding";
}

function sanitizeFindingMarkdownForDisplay(markdown: string): string {
	const hiddenMetadataTerms = [
		"심각" + "도",
		"위험" + "도",
		"sever" + "ity",
		"C" + "WE",
		"C" + "VSS",
		"C" + "VSS\\s*점수",
		"C" + "VSS\\s*벡터",
		"신뢰도",
		"confidence",
		"검증\\s*기준",
		"검증기준",
		"검증\\s*결과",
		"런타임\\s*검증",
		"실제\\s*공격\\s*수행",
		"수행\\s*여부",
		"validation",
		"criteria",
	].join("|");
	const metadataLinePattern = new RegExp(
		`^\\s*(?:[-*]\\s*)?(?:\\*\\*)?(?:${hiddenMetadataTerms})(?:\\*\\*)?\\s*[:：|]`,
		"i",
	);
	const metadataHeadingPattern = new RegExp(
		`^\\s{0,3}#{1,6}\\s*(?:${hiddenMetadataTerms})\\b`,
		"i",
	);
	const metadataTablePattern = new RegExp(
		`^\\s*\\|.*(?:${hiddenMetadataTerms}).*\\|\\s*$`,
		"i",
	);

	const visibleLines: string[] = [];
	let removedMetadataTableHeader = false;
	for (const line of markdown.split("\n")) {
		const isMarkdownTableSeparator = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
		if (removedMetadataTableHeader && isMarkdownTableSeparator) {
			removedMetadataTableHeader = false;
			continue;
		}
		removedMetadataTableHeader = false;
		if (metadataLinePattern.test(line)) continue;
		if (metadataHeadingPattern.test(line)) continue;
		if (metadataTablePattern.test(line)) {
			removedMetadataTableHeader = true;
			continue;
		}
		visibleLines.push(line);
	}

	return visibleLines
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
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
					<span>가이드 분류별 취약점</span>
					<Badge variant="outline">{items.length}개 분류</Badge>
				</div>

				<div className="guide-breakdown-list" aria-label="가이드 대분류와 세부 항목별 취약점 수">
					{items.map((item) => (
						<div className="guide-breakdown-group" key={item.category}>
							<div className="bar-row guide-category-row">
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
							{item.items.length ? (
								<div className="guide-item-list" aria-label={`${item.category} 세부 항목별 취약점 수`}>
									{item.items.map((subItem) => (
										<div className="guide-item-row" key={subItem.raw_item || subItem.item}>
											<span>{subItem.item}</span>
											<i aria-hidden="true" />
											<b>{subItem.count}</b>
										</div>
									))}
								</div>
							) : (
								<p className="guide-item-empty">세부 항목 정보가 없습니다.</p>
							)}
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function StaticGuideReferenceCard() {
	const totalItems = STATIC_GUIDE_REFERENCE.reduce((sum, category) => sum + category.items.length, 0);

	return (
		<section className="static-guide-reference" aria-label="정적 보안약점 조치 가이드">
			<div className="static-guide-reference-header">
				<div>
					<Badge className="dashboard-eyebrow" variant="outline">Security Guide</Badge>
					<h2>보안약점 조치 가이드</h2>
					<p>분석 결과와 별개로 바로 조회할 수 있는 2019.6 개정 소프트웨어 보안약점 진단가이드 기반 조치 요약입니다.</p>
				</div>
				<Badge variant="outline">{totalItems}개 항목</Badge>
			</div>

			<div className="static-guide-reference-grid">
				{STATIC_GUIDE_REFERENCE.map((category) => (
					<div className="static-guide-category" key={category.category}>
						<div className="static-guide-category-title">
							<span>{category.category}</span>
							<b>{category.items.length}개 항목</b>
						</div>
						<p>{category.summary}</p>
						<div className="static-guide-item-list">
							{category.items.map((item) => (
								<article className="static-guide-item" key={`${category.category}-${item.name}`}>
									<div>
										<strong>{item.name}</strong>
										<span>{item.pages}</span>
									</div>
									<p>{item.action}</p>
								</article>
							))}
						</div>
					</div>
				))}
			</div>
		</section>
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
			<span role="cell">
				<span className="finding-number-badge">{file.vuln}</span>
			</span>
			<span className="line-summary" role="cell">{file.line_summary}</span>
		</div>
	);
}

function OverviewPage({ vm, repo, analysisId }: { vm: AnalysisDetailViewModel; repo: string; analysisId?: string | null }) {
	const guideDistribution = vm.guide_distribution.length
		? vm.guide_distribution
		: [{ category: "공식 가이드 매핑 없음", raw_category: "", count: 0, items: [] }];
	const guideMaxCount = Math.max(1, ...guideDistribution.map((item) => item.count));

	return (
		<>
			<StaticGuideReferenceCard />
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
				<section className="analysis-overview-grid" aria-label="분석 개요 보조 정보">
					<GuideDistributionCard items={guideDistribution} maxCount={guideMaxCount} />
					<FileListCard files={vm.file_list} />
				</section>
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

# 기본 정보
- 취약점 ID: \`${detail.id}\`
- 발견 위치: \`${location}\`
- 함수: \`${detail.function ?? "unknown"}\`

# 근거와 코드 맥락
## 발견 위치
${detail.evidence || "저장된 근거가 없습니다."}

## 호출 경로
${callPath}

# 영향
## 악용 가능성
저장된 정적 분석 근거와 코드 맥락을 기준으로 우선 확인이 필요합니다.

## 영향 범위
${detail.description}

# 수정 방향
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
	const markdown = sanitizeFindingMarkdownForDisplay(detail.report_markdown || buildFallbackMarkdown(detail));

	return (
		<article className="finding-detail-page" id={`finding-${detail.id}`}>
			<div className="finding-detail-kicker">취약점 상세</div>
			<header className="finding-detail-header">
				<div>
					<h2>{detail.title}</h2>
					<p>{detail.summary || detail.description}</p>
				</div>
				<div className="finding-detail-badge-stack" aria-label="취약점 식별자">
					<Badge className="finding-number-badge" variant="outline">
						{findingBadgeText(detail.id)}
					</Badge>
					{detail.cwe ? (
						<Badge className="cwe-badge finding-cwe-badge" variant="outline">
							{detail.cwe}
						</Badge>
					) : null}
				</div>
			</header>

			<div className="finding-meta-grid" aria-label="선택된 취약점 메타데이터">
				<MetadataItem label="파일 / 라인" value={location} />
				<MetadataItem label="함수" value={detail.function} />
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
