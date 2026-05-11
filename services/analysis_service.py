from __future__ import annotations

from datetime import datetime
from typing import Any

SEVERITY_LABELS = {
    "CRITICAL": "치명적",
    "HIGH": "위험",
    "MEDIUM": "경고",
    "LOW": "보통",
}

TYPE_DISPLAY = {
    "SQL_INJECTION": "SQL Injection",
    "XSS": "Cross-Site Scripting (XSS)",
    "HARDCODED_SECRET": "Hardcoded Credentials",
    "COMMAND_INJECTION": "Command Injection",
    "PATH_TRAVERSAL": "Path Traversal",
    "INSECURE_RANDOM": "Insecure Randomness",
    "WEAK_HASH": "Weak Cryptographic Hash",
}


def severity_to_korean_label(severity: str) -> str:
    return SEVERITY_LABELS.get((severity or "").upper(), "보통")


def severity_rank(severity: str) -> int:
    return {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}.get((severity or "").upper(), 0)


def vulnerability_type_to_display_name(vuln_type: str) -> str:
    if not vuln_type:
        return "Unknown"
    return TYPE_DISPLAY.get(vuln_type, vuln_type.replace("_", " ").title())


def build_dashboard_view_model(response: dict) -> dict:
    analysis_id, analysis = _split_response(response)
    vulnerabilities = _vulnerabilities(analysis)
    summary = _summary(analysis)
    by_severity = {str(k).upper(): int(v) for k, v in (summary.get("by_severity") or {}).items()}
    by_type = {str(k): int(v) for k, v in (summary.get("by_type") or {}).items()}
    score = summary.get("score") or {}
    file_summary: dict[str, dict[str, Any]] = {}
    for vuln in vulnerabilities:
        file_path = str(vuln.get("file") or "")
        if not file_path:
            continue
        entry = file_summary.setdefault(file_path, {"count": 0, "severity": "LOW", "lines": set()})
        entry["count"] += 1
        if vuln.get("line"):
            entry["lines"].add(vuln.get("line"))
        raw_severity = str(vuln.get("severity") or "LOW").upper()
        if severity_rank(raw_severity) > severity_rank(entry["severity"]):
            entry["severity"] = raw_severity

    file_list = [
        {
            "file": file_path,
            "vuln": info["count"],
            "lines": len(info["lines"]),
            "level": severity_to_korean_label(info["severity"]),
        }
        for file_path, info in sorted(file_summary.items())
    ]

    return {
        "analysis_id": analysis_id,
        "repo_url": str(analysis.get("repository") or ""),
        "scan_date": _format_datetime(analysis.get("analyzed_at")),
        "total_vulnerabilities": int(summary.get("total_vulnerabilities") or len(vulnerabilities)),
        "files_analyzed": int(analysis.get("files_analyzed") or 0),
        "affected_files": len(file_summary),
        "security_score": int(score.get("overall") or 0),
        "severity_counts": {
            "critical": by_severity.get("CRITICAL", 0),
            "high": by_severity.get("HIGH", 0),
            "medium": by_severity.get("MEDIUM", 0),
            "low": by_severity.get("LOW", 0),
        },
        "vulnerability_types": [
            {"type": vuln_type, "name": vulnerability_type_to_display_name(vuln_type), "count": count}
            for vuln_type, count in sorted(by_type.items())
            if count > 0
        ],
        "file_list": file_list,
    }


def build_analysis_detail_view_model(response: dict) -> dict:
    analysis_id, analysis = _split_response(response)
    vulnerabilities = _vulnerabilities(analysis)
    summary = _summary(analysis)
    by_type = summary.get("by_type") or {}
    affected_files = len({v.get("file") for v in vulnerabilities if v.get("file")})
    return {
        "analysis_id": analysis_id,
        "repo_url": str(analysis.get("repository") or ""),
        "scan_date": _format_datetime(analysis.get("analyzed_at")),
        "total_vulnerabilities": int(summary.get("total_vulnerabilities") or len(vulnerabilities)),
        "files_analyzed": int(analysis.get("files_analyzed") or 0),
        "affected_files": affected_files,
        "call_graph": _build_call_graph_view(analysis.get("call_graph")),
        "vuln_distribution": [
            {"category": vulnerability_type_to_display_name(str(k)), "count": int(v)}
            for k, v in by_type.items()
            if int(v) > 0
        ],
        "vuln_details": [_build_vulnerability_detail(vuln) for vuln in vulnerabilities],
    }


def build_capabilities_view_model(response: dict) -> dict:
    return {
        "supported_languages": response.get("supported_languages") or ["java"],
        "supported_file_extensions": response.get("supported_file_extensions") or [".java"],
        "supported_repository_sources": response.get("supported_repository_sources") or ["github"],
        "analysis_mode": response.get("analysis_mode") or "rule_based",
        "llm_detection_enabled": bool(response.get("llm_detection_enabled", False)),
        "llm_report_available": bool(response.get("llm_report_available", False)),
        "static_analysis_available": bool(response.get("static_analysis_available", True)),
        "detectors": response.get("detectors") or [],
    }


def build_recent_results_view_model(response: dict) -> list[dict]:
    results = response.get("results") if isinstance(response, dict) else []
    if not isinstance(results, list):
        return []
    view_models = []
    for item in results:
        if not isinstance(item, dict):
            continue
        view_models.append(
            {
                "analysis_id": str(item.get("analysis_id") or ""),
                "repository": str(item.get("repository") or ""),
                "scan_date": _format_datetime(item.get("analyzed_at")),
                "language": str(item.get("language") or "java"),
                "files_analyzed": int(item.get("files_analyzed") or 0),
                "total_vulnerabilities": int(item.get("total_vulnerabilities") or 0),
                "severity_counts": item.get("severity_counts") or {},
            }
        )
    return view_models


def _split_response(response: dict) -> tuple[str, dict]:
    analysis = response.get("analysis_result") if isinstance(response, dict) else {}
    if not isinstance(analysis, dict):
        analysis = response if isinstance(response, dict) else {}
    # Support both the latest AnalysisResponse shape and older flat result objects during migration.
    if "repository" not in analysis and "repository_url" in (response or {}):
        analysis = {**analysis, "repository": response.get("repository_url")}
    if "vulnerabilities" not in analysis and "vulnerabilities" in (response or {}):
        analysis = {**analysis, "vulnerabilities": response.get("vulnerabilities")}
    if "summary" not in analysis and "summary" in (response or {}):
        analysis = {**analysis, "summary": response.get("summary")}
    analysis_id = str((response or {}).get("analysis_id") or analysis.get("analysis_id") or "")
    return analysis_id, analysis


def _summary(analysis: dict) -> dict:
    summary = analysis.get("summary") or {}
    return summary if isinstance(summary, dict) else {}


def _vulnerabilities(analysis: dict) -> list[dict]:
    vulnerabilities = analysis.get("vulnerabilities") or []
    return [v for v in vulnerabilities if isinstance(v, dict)]


def _build_vulnerability_detail(vuln: dict) -> dict:
    raw_severity = str(vuln.get("severity") or "LOW").upper()
    cvss_raw = vuln.get("cvss")
    if isinstance(cvss_raw, dict):
        cvss = cvss_raw
    elif isinstance(cvss_raw, (int, float)):
        cvss = {"score": cvss_raw}
    else:
        cvss = {}
    line = vuln.get("line")
    try:
        line_value = int(line) if line is not None else None
    except (TypeError, ValueError):
        line_value = None
    call_chain = vuln.get("call_chain") or []
    if not isinstance(call_chain, list):
        call_chain = []
    return {
        "id": str(vuln.get("id") or ""),
        "type": vulnerability_type_to_display_name(str(vuln.get("type") or "UNKNOWN")),
        "severity": severity_to_korean_label(raw_severity),
        "raw_severity": raw_severity,
        "cwe": vuln.get("cwe"),
        "cvss_score": cvss.get("score"),
        "cvss_vector": cvss.get("vector"),
        "file": str(vuln.get("file") or "Unknown"),
        "line": line_value,
        "function": vuln.get("function"),
        "code": str(vuln.get("code_snippet") or "코드 정보가 없습니다."),
        "description": str(vuln.get("description") or "취약점 설명이 없습니다."),
        "fix": str(vuln.get("recommendation") or "취약점에 적합한 보안 패턴을 적용하세요."),
        "safe_example": vuln.get("safe_example"),
        "confidence": vuln.get("confidence"),
        "call_chain": [str(item) for item in call_chain],
    }


def _build_call_graph_view(call_graph: object) -> dict[str, Any]:
    if not call_graph:
        return {"available": False, "node_count": 0, "edge_count": 0, "preview": []}

    if isinstance(call_graph, dict):
        nodes = _first_list(call_graph, ("nodes", "functions", "vertices"))
        edges = _first_list(call_graph, ("edges", "calls", "links"))
        preview = [_edge_label(edge) for edge in edges[:8]] if edges else [_node_label(node) for node in nodes[:8]]
        if nodes or edges:
            return {
                "available": True,
                "node_count": len(nodes),
                "edge_count": len(edges),
                "preview": [item for item in preview if item],
            }
        summary = [
            f"{key}: {len(value) if isinstance(value, (list, dict)) else value}"
            for key, value in list(call_graph.items())[:8]
        ]
        return {"available": True, "node_count": 0, "edge_count": 0, "preview": summary}

    if isinstance(call_graph, list):
        return {
            "available": True,
            "node_count": len(call_graph),
            "edge_count": 0,
            "preview": [_node_label(item) for item in call_graph[:8]],
        }

    return {"available": True, "node_count": 0, "edge_count": 0, "preview": [str(call_graph)]}


def _first_list(source: dict, keys: tuple[str, ...]) -> list:
    for key in keys:
        value = source.get(key)
        if isinstance(value, list):
            return value
    return []


def _node_label(node: object) -> str:
    if isinstance(node, dict):
        for key in ("label", "name", "function", "id"):
            value = node.get(key)
            if value:
                return str(value)
    return str(node)


def _edge_label(edge: object) -> str:
    if isinstance(edge, dict):
        source = edge.get("source") or edge.get("from") or edge.get("caller")
        target = edge.get("target") or edge.get("to") or edge.get("callee")
        if source or target:
            return f"{source or '?'} → {target or '?'}"
    return str(edge)


def _format_datetime(value: object) -> str:
    if not isinstance(value, str) or not value:
        return "-"
    try:
        normalized = value.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized).strftime("%y/%m/%d %H:%M")
    except ValueError:
        return value
