"use client";

import { ReactNode, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	type CarouselApi,
} from "@/components/ui/carousel";

type FeatureSlide = {
	title: string;
	description: string;
	badge: string;
	preview: ReactNode;
};

const slides: FeatureSlide[] = [
	{
		title: "취약점 탐지",
		description:
			"Java AST 기반 정적 분석으로 지원 범위에 포함된 8개 취약점 유형을 탐지합니다.",
		badge: "탐지",
		preview: (
			<div className="mock-finding-view">
				<div className="mock-stat-row">
					<div>
						<span>분석 파일</span>
						<b>128</b>
					</div>
					<div>
						<span>취약점</span>
						<b className="preview-danger">9</b>
					</div>
					<div>
						<span>위험도</span>
						<b>HIGH</b>
					</div>
				</div>
				<div className="mock-vuln-card">
					<div className="mock-vuln-head">
						<b>SQL Injection</b>
						<span className="preview-danger">HIGH</span>
					</div>
					<p>UserRepository.java:42</p>
					<code>executeQuery(&quot;SELECT ...&quot; + userId)</code>
				</div>
				<div className="mock-vuln-card muted">
					<div className="mock-vuln-head">
						<b>Hardcoded Secret</b>
						<span className="preview-warning">MEDIUM</span>
					</div>
					<p>application.yml:12</p>
				</div>
			</div>
		),
	},
	{
		title: "근거 중심 결과",
		description:
			"취약점이 발견된 파일과 라인, 공식 가이드 분류, 탐지 근거, 호출 흐름을 함께 제공합니다.",
		badge: "결과",
		preview: (
			<div className="mock-dashboard-view">
				<div className="mock-evidence-panel">
					<span>탐지 근거</span>
					<b>req.getParameter</b>
					<small>→ SQL 실행 API</small>
				</div>
				<div className="mock-bars">
					<div>
						<span>입력 흐름</span>
						<i style={{ width: "78%" }} />
					</div>
					<div>
						<span>가이드 매핑</span>
						<i style={{ width: "64%" }} />
					</div>
					<div>
						<span>신뢰도 기준</span>
						<i style={{ width: "48%" }} />
					</div>
				</div>
				<div className="mock-callgraph">
					<span>Controller</span>
					<em /> <span>Service</span>
					<em /> <span>Repository</span>
				</div>
			</div>
		),
	},
	{
		title: "수정 가이드",
		description: "탐지 결과를 바탕으로 수정 방향과 예시 코드를 제공합니다.",
		badge: "리포트",
		preview: (
			<div className="mock-report-view">
				<div className="mock-report-title">보안 조치 리포트</div>
				<p>
					사용자 입력값이 SQL 쿼리에 직접 연결되고 있습니다. PreparedStatement
					기반 파라미터 바인딩으로 변경하세요.
				</p>
				<pre>{`String sql = "SELECT * FROM users WHERE id = ?";\nPreparedStatement ps = conn.prepareStatement(sql);\nps.setString(1, userId);`}</pre>
			</div>
		),
	},
];

export function FeatureCarousel({
	detectorCount = 8,
}: {
	detectorCount?: number;
}) {
	const [api, setApi] = useState<CarouselApi>();
	const [selected, setSelected] = useState(0);

	useEffect(() => {
		if (!api) return;
		const updateSelected = () => setSelected(api.selectedScrollSnap());
		updateSelected();
		api.on("select", updateSelected);
		return () => {
			api.off("select", updateSelected);
		};
	}, [api]);

	useEffect(() => {
		if (!api) return;
		const timer = window.setInterval(() => {
			if (api.canScrollNext()) api.scrollNext();
			else api.scrollTo(0);
		}, 3000);
		return () => window.clearInterval(timer);
	}, [api]);

	return (
		<section className="feature-carousel-section" aria-label="주요 기능">
			<Carousel
				setApi={setApi}
				opts={{ align: "start", loop: true }}
				className="feature-carousel"
			>
				<CarouselContent>
					{slides.map((slide) => {
						const description =
							slide.title === "취약점 탐지"
								? `Java AST 기반 정적 분석으로 지원 범위에 포함된 ${detectorCount}개 취약점 유형을 탐지합니다.`
								: slide.description;

						return (
							<CarouselItem key={slide.title}>
								<Card className="feature-carousel-card">
									<CardContent className="feature-carousel-content">
										<div className="feature-carousel-copy">
											<Badge
												className="feature-carousel-badge"
												variant="outline"
											>
												{slide.badge}
											</Badge>
											<h2>{slide.title}</h2>
											<p>{description}</p>
										</div>
										<div className="feature-preview" aria-hidden="true">
											<div className="feature-preview-toolbar">
												<span />
												<span />
												<span />
											</div>
											<div className="feature-preview-body">
												{slide.preview}
											</div>
										</div>
									</CardContent>
								</Card>
							</CarouselItem>
						);
					})}
				</CarouselContent>
			</Carousel>
			<div className="feature-carousel-dots" aria-hidden="true">
				{slides.map((slide, index) => (
					<span
						key={slide.title}
						className={index === selected ? "active" : ""}
					/>
				))}
			</div>
		</section>
	);
}
