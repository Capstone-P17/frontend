"use client";

import { useRouter } from "next/navigation";
import { getAnalysisJobClient } from "@/lib/client/backend";
import { useEffect, useState } from "react";

type Props = {
	repo: string;
	jobId: string;
};

const benchmarkScopeItems = [
	{
		label: "공식 샘플 기준",
		text: "OWASP BenchmarkJava와 NIST SARD Juliet Java 1.3 일부 샘플로 회귀 테스트를 수행합니다.",
	},
	{
		label: "탐지 확인",
		text: "SQL Injection, Weak Hash, Insecure Random 일부 패턴은 공식 샘플에서 탐지 가능함을 확인했습니다.",
	},
	{
		label: "한계 관리",
		text: "분기, 컬렉션, 메서드 간 흐름이 필요한 일부 샘플은 known false negative로 분리해 추적합니다.",
	},
];

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
		<div className="loading-benchmark-card" aria-label="공식 샘플 기준 탐지 범위">
			<div className="loading-benchmark-header">
				<span>공식 샘플 기준 탐지 범위</span>
				<b>선별 검증</b>
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
							`/dashboard?repo=${encodeURIComponent(repo)}&analysis_id=${encodeURIComponent(data.analysis_id ?? "")}`,
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
		<section className="load-wrap">
			<div className="load-ring" />
			<h1>
				{status === "completed"
					? "분석이 완료되었습니다."
					: "결과를 기다리는 중입니다."}
			</h1>
			<div className="load-repo">🔗 {repo}</div>
			<p>
				{status === "completed"
					? "결과 페이지로 이동 중입니다..."
					: "GitHub 저장소를 다운로드하고 Java 소스코드의 보안 취약점을 분석하는 중입니다."}
			</p>
			<p className="muted">현재 상태: {jobStatus}</p>
			{status !== "completed" ? <BenchmarkScopeNotice /> : null}
		</section>
	);
}
