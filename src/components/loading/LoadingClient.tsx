"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { getAnalysisJobClient, type AnalysisJob } from "@/lib/client/backend";
import { useEffect, useState } from "react";

type Props = {
	repo: string;
	jobId: string;
};

const scanSteps = [
	{ phase: "cloning", label: "저장소 복제" },
	{ phase: "indexing", label: "Java 파일 수집" },
	{ phase: "static_analysis", label: "정적 분석" },
	{ phase: "finding_validation", label: "가이드 매핑" },
	{ phase: "report_generation", label: "리포트 생성" },
	{ phase: "saving", label: "결과 저장" },
];

const statusLabels: Record<string, string> = {
	queued: "대기열 등록",
	preparing: "작업 준비",
	cloning: "저장소 복제",
	indexing: "Java 파일 수집",
	static_analysis: "정적 분석",
	finding_validation: "가이드 매핑",
	report_generation: "상세 리포트 생성",
	summary_generation: "요약 리포트 생성",
	saving: "결과 저장",
	succeeded: "리포트 생성 완료",
	failed: "분석 실패",
};

const fallbackMessages: Record<string, string> = {
	queued: "분석 작업이 대기열에 등록되었습니다.",
	preparing: "분석 작업을 준비하고 있습니다.",
	cloning: "GitHub 저장소를 내려받고 분석 대상을 준비하고 있습니다.",
	indexing: "Java 파일과 호출 그래프 후보를 수집하고 있습니다.",
	static_analysis: "정적 분석기로 취약 후보와 코드 위치를 탐지하고 있습니다.",
	finding_validation: "탐지 결과를 보안 가이드 항목과 연결하고 finding 맥락을 정리하고 있습니다.",
	report_generation: "finding별 상세 리포트와 수정 방향을 생성하고 있습니다.",
	summary_generation: "전체 분석 요약 리포트를 정리하고 있습니다.",
	saving: "분석 결과를 저장하고 있습니다.",
	succeeded: "결과 페이지로 이동 중입니다.",
	failed: "분석 작업이 실패했습니다.",
};

export function LoadingScanPanel({
	repo,
	status,
	job,
	completed = false,
}: {
	repo: string;
	status: string;
	job?: AnalysisJob | null;
	completed?: boolean;
}) {
	const phase = completed ? "succeeded" : (job?.phase || status);
	const progress = job?.progress;
	const percent = completed ? 100 : Math.max(0, Math.min(100, Math.round(progress?.percent ?? fallbackPercent(phase))));
	const message = completed
		? fallbackMessages.succeeded
		: job?.message || fallbackMessages[phase] || "분석 작업을 진행 중입니다.";
	const activeStep = completed
		? scanSteps.length - 1
		: Math.max(0, scanSteps.findIndex((step) => step.phase === phase));
	const filesAnalyzed = progress?.files_analyzed ?? 0;
	const filesTotal = progress?.files_total ?? 0;
	const findingsTotal = progress?.findings_total ?? 0;
	const reportsDone = progress?.finding_reports_completed ?? 0;
	const reportsTotal = progress?.finding_reports_total ?? 0;

	return (
		<section className="load-wrap">
			<div className="loading-scan-card" aria-live="polite">
				<div className="loading-scan-visual" aria-hidden="true">
					<div className="loading-bean-stage">
						<Image
							src="/bean_normal.png"
							alt=""
							width={164}
							height={164}
							className="loading-bean"
							priority
						/>
						<div className="loading-magnifier" />
						<div className="loading-scan-dot dot-one" />
						<div className="loading-scan-dot dot-two" />
						<div className="loading-scan-dot dot-three" />
					</div>
				</div>

				<div className="loading-scan-copy">
					<span className="loading-status-pill">{statusLabels[phase] ?? statusLabels[status] ?? phase}</span>
					<h1>{completed ? "분석이 완료되었습니다." : "저장소 보안 분석을 진행 중입니다."}</h1>
					<p>{message}</p>
					<div className="load-repo">🔗 {repo}</div>
					<div className="loading-progress" aria-label={`분석 진행률 ${percent}%`}>
						<div>
							<span>진행률</span>
							<b>{percent}%</b>
						</div>
						<i style={{ width: `${percent}%` }} />
					</div>
				</div>

				<div className="loading-metrics" aria-label="분석 진행 상세">
					<ProgressMetric label="분석 파일" value={filesTotal ? `${filesAnalyzed}/${filesTotal}` : filesAnalyzed ? String(filesAnalyzed) : "-"} />
					<ProgressMetric label="발견 finding" value={findingsTotal ? `${findingsTotal}건` : "-"} />
					<ProgressMetric label="리포트 생성" value={reportsTotal ? `${reportsDone}/${reportsTotal}` : "-"} />
				</div>

				<div className="loading-step-list" aria-label="분석 단계">
					{scanSteps.map((step, index) => (
						<div
							className={`loading-step ${index < activeStep || completed ? "done" : ""} ${index === activeStep && !completed ? "active" : ""}`}
							key={step.phase}
						>
							<span>{index + 1}</span>
							<b>{step.label}</b>
						</div>
					))}
				</div>
			</div>

		</section>
	);
}

function fallbackPercent(phase: string): number {
	const fallback: Record<string, number> = {
		queued: 0,
		preparing: 2,
		cloning: 8,
		indexing: 22,
		static_analysis: 45,
		finding_validation: 62,
		report_generation: 76,
		summary_generation: 94,
		saving: 98,
		succeeded: 100,
	};
	return fallback[phase] ?? 5;
}

function ProgressMetric({ label, value }: { label: string; value: string }) {
	return (
		<div className="loading-metric">
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	);
}

export function LoadingClient({ repo, jobId }: Props) {
	const router = useRouter();
	const [status, setStatus] = useState<"waiting" | "completed">("waiting");
	const [jobStatus, setJobStatus] = useState("queued");
	const [job, setJob] = useState<AnalysisJob | null>(null);
	const [error, setError] = useState("");

	useEffect(() => {
		let cancelled = false;
		let inFlight = false;

		async function poll() {
			if (cancelled || inFlight) return;
			inFlight = true;
			try {
				const data = await getAnalysisJobClient(jobId);
				if (cancelled) return;

				setJobStatus(data.status);
				setJob(data);
				if (data.status === "succeeded" && data.analysis_id) {
					setStatus("completed");
					window.setTimeout(() => {
						router.push(
							`/analysis?repo=${encodeURIComponent(repo)}&analysis_id=${encodeURIComponent(data.analysis_id ?? "")}`,
						);
					}, 900);
					return;
				}
				if (data.status === "failed") {
					setError(data.error ?? "분석에 실패했습니다.");
				}
			} catch (err) {
				if (!cancelled)
					setError(
						err instanceof Error
							? err.message
							: "분석 작업 상태를 불러올 수 없습니다.",
					);
			} finally {
				inFlight = false;
			}
		}

		void poll();
		const interval = window.setInterval(() => void poll(), 2000);

		return () => {
			cancelled = true;
			window.clearInterval(interval);
		};
	}, [jobId, repo, router]);

	if (error) {
		return (
			<section className="center-card error-card">
				<div className="error-icon">⚠️</div>
				<h1>분석에 실패했습니다</h1>
				<p>{error}</p>
				<button className="primary-button" onClick={() => router.push("/")}>
					처음으로
				</button>
			</section>
		);
	}

	return (
		<LoadingScanPanel
			completed={status === "completed"}
			job={job}
			repo={repo}
			status={status === "completed" ? "succeeded" : jobStatus}
		/>
	);
}
