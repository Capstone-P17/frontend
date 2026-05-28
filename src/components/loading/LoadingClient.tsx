"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { getAnalysisJobClient } from "@/lib/client/backend";
import { useEffect, useState } from "react";

type Props = {
	repo: string;
	jobId: string;
};

const benchmarkScopeItems = [
	{
		label: "저장소 구조 파악",
		text: "Java 소스 파일을 수집하고 분석 가능한 파일 경로와 호출 그래프 후보를 정리합니다.",
	},
	{
		label: "취약 흐름 추적",
		text: "입력값, 민감 API, sink 호출부를 연결해 실제 코드 위치 중심으로 finding을 구성합니다.",
	},
	{
		label: "상세 리포트 생성",
		text: "각 finding별 근거, 코드 맥락, 수정 방향을 Markdown 리포트로 정리합니다.",
	},
];

const scanSteps = [
	"Repository clone",
	"Java file indexing",
	"Static flow analysis",
	"Finding report build",
];

const statusLabels: Record<string, string> = {
	queued: "대기열 등록",
	running: "정적 분석 진행",
	succeeded: "리포트 생성 완료",
	failed: "분석 실패",
	preparing: "작업 준비",
};

export function BenchmarkScopeNotice() {
	const [activeIndex, setActiveIndex] = useState(0);
	const activeItem = benchmarkScopeItems[activeIndex];

	useEffect(() => {
		const interval = window.setInterval(() => {
			setActiveIndex((current) => (current + 1) % benchmarkScopeItems.length);
		}, 3200);

		return () => window.clearInterval(interval);
	}, []);

	return (
		<div className="loading-benchmark-card" aria-label="분석 진행 안내">
			<div className="loading-benchmark-header">
				<span>분석 파이프라인</span>
				<b>Finding-first</b>
			</div>
			<div className="loading-benchmark-slide" aria-live="polite">
				<strong>{activeItem.label}</strong>
				<p>{activeItem.text}</p>
			</div>
			<div className="loading-benchmark-dots" aria-hidden="true">
				{benchmarkScopeItems.map((item, index) => (
					<span
						key={item.label}
						className={index === activeIndex ? "active" : ""}
					/>
				))}
			</div>
		</div>
	);
}

export function LoadingScanPanel({
	repo,
	status,
	completed = false,
}: {
	repo: string;
	status: string;
	completed?: boolean;
}) {
	const activeStep = completed
		? scanSteps.length - 1
		: status === "running"
			? 2
			: status === "queued"
				? 1
				: 0;

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
					<span className="loading-status-pill">{statusLabels[status] ?? status}</span>
					<h1>{completed ? "분석이 완료되었습니다." : "저장소 보안 분석을 진행 중입니다."}</h1>
					<p>
						{completed
							? "결과 페이지로 이동 중입니다..."
							: "소스코드의 취약 흐름을 추적하고 finding별 상세 리포트를 생성하고 있습니다."}
					</p>
					<div className="load-repo">🔗 {repo}</div>
				</div>

				<div className="loading-step-list" aria-label="분석 단계">
					{scanSteps.map((step, index) => (
						<div
							className={`loading-step ${index < activeStep ? "done" : ""} ${index === activeStep && !completed ? "active" : ""}`}
							key={step}
						>
							<span>{index + 1}</span>
							<b>{step}</b>
						</div>
					))}
				</div>
			</div>

			{!completed ? <BenchmarkScopeNotice /> : null}
		</section>
	);
}

export function LoadingClient({ repo, jobId }: Props) {
	const router = useRouter();
	const [status, setStatus] = useState<"waiting" | "completed">("waiting");
	const [jobStatus, setJobStatus] = useState("queued");
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
			repo={repo}
			status={status === "completed" ? "succeeded" : jobStatus}
		/>
	);
}
