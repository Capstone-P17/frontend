import streamlit as st
import requests
from datetime import datetime
from typing import Optional
from urllib.parse import quote_plus
from utils.ui import render_header, render_footer, render_sidebar

BACKEND_HOSTS = ["http://localhost:8000", "http://127.0.0.1:8000"]
API_HEADERS = {"Content-Type": "application/json"}
FALLBACK_RESULT_PATHS = ["/result", "/api/result"]


def get_analysis_result():
    last_error = None
    for host in BACKEND_HOSTS:
        for path in FALLBACK_RESULT_PATHS:
            try:
                response = requests.get(
                    f"{host}{path}",
                    headers=API_HEADERS,
                    timeout=30,
                )
                response.raise_for_status()
                return response.json()
            except requests.exceptions.RequestException as exc:
                last_error = exc

    if last_error is not None:
        st.warning("백엔드 분석 결과를 불러올 수 없어 기본값 0으로 표시합니다.")
    return None


def score_emoji(score):
    if score < 40:
        return "😢"
    if score < 70:
        return "😐"
    return "😊"


def score_color(score):
    if score < 40:
        return "#FF4545"
    if score < 70:
        return "#FFD415"
    return "#4BD33F"


def vuln_count_color(count):
    if count >= 70:
        return "#FF4545"
    if count >= 30:
        return "#FFD415"
    return "#4BD33F"


def render_dashboard(repo_url: Optional[str]):
    repo_url = repo_url or st.session_state.get("repo_url", "github.com/example/web-app")

    result_data = None
    if repo_url:
        with st.spinner("백엔드에서 분석 결과를 불러오는 중입니다..."):
            result_data = get_analysis_result()

    if result_data:
        analysis = result_data.get("analysis_result", result_data)
        summary = analysis.get("summary", {})
        vulnerabilities = analysis.get("vulnerabilities", [])

        analyzed_at = analysis.get("analyzed_at")
        try:
            scan_date = datetime.fromisoformat(analyzed_at).strftime("%y/%m/%d %H:%M")
        except Exception:
            scan_date = analyzed_at or datetime.now().strftime("%y/%m/%d %H:%M")

        total_vuln = summary.get("total_vulnerabilities", 0)
        total_files = analysis.get("files_analyzed", 0)
        affected_files = len({v.get("file") for v in vulnerabilities if v.get("file")})

        by_type = summary.get("by_type", {})
        vuln_types = [
            {"name": "SQL Injection",              "count": by_type.get("SQL_INJECTION", 0)},
            {"name": "Cross-Site Scripting (XSS)", "count": by_type.get("XSS", 0)},
            {"name": "Hardcoded Credentials",      "count": by_type.get("HARDCODED_SECRET", 0)},
        ]

        by_severity = summary.get("by_severity", {})
        danger = by_severity.get("HIGH", 0)
        warning = by_severity.get("MEDIUM", 0)
        normal = by_severity.get("LOW", 0)

        security_score = (summary.get("score") or {}).get("overall", 0)

        severity_rank = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
        level_map = {"HIGH": "위험", "MEDIUM": "경고", "LOW": "보통"}
        file_summary = {}
        for vuln in vulnerabilities:
            file_path = vuln.get("file") or ""
            if not file_path:
                continue

            entry = file_summary.setdefault(file_path, {"count": 0, "severity": "LOW"})
            entry["count"] += 1
            severity = vuln.get("severity", "LOW")
            if severity_rank.get(severity, 0) > severity_rank.get(entry["severity"], 0):
                entry["severity"] = severity

        file_list = [
            {
                "file": file_path,
                "vuln": info["count"],
                "lines": 0,
                "level": level_map.get(info["severity"], "보통"),
            }
            for file_path, info in file_summary.items()
        ]
    else:
        scan_date = datetime.now().strftime("%y/%m/%d %H:%M")
        total_vuln = 0
        total_files = 0
        affected_files = 0
        danger = 0
        warning = 0
        normal = 0
        security_score = 0
        vuln_types = [
            {"name": "SQL Injection",              "count": 0},
            {"name": "Cross-Site Scripting (XSS)", "count": 0},
            {"name": "Hardcoded Credentials",      "count": 0},
        ]
        file_list = []

    logged_in = st.session_state.get("logged_in", False)
    user_id = st.session_state.get("user_id", "사용자")

    render_header(logged_in, user_id, extra_css="""
        .stApp { background: #222831; color: #EEEEEE; }
        .footer { margin-top: 60px; }
        .score-box {
            background-color: rgba(57,62,70,0.7); border-radius: 10px;
            padding: 30px; text-align: center; box-sizing: border-box;
        }
        .vuln-summary {
            background-color: rgba(57,62,70,0.7); border-radius: 10px;
            padding: 20px; box-sizing: border-box;
        }
        .file-table {
            background-color: rgba(57,62,70,0.7); border-radius: 10px;
            padding: 20px; margin-top: 12px; box-sizing: border-box;
        }
        .file-row {
            display: flex; justify-content: space-between; align-items: center;
            padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 0.9rem;
        }
        .stButton > button {
            background-color: #393E46 !important; color: #EEEEEE !important;
            border: none !important; border-radius: 8px !important;
            padding: 12px 60px !important; font-size: 1rem !important;
            white-space: nowrap !important; width: 100% !important;
        }
    """)

    render_sidebar(repo_url, user_id, active="dashboard")

    vuln_types_html = "".join(
        f'<span style="color:#EEEEEE; font-size:1rem; font-weight:600;">'
        f'{v["name"]} <span style="color:#FF4545;">{v["count"]}</span></span>'
        for v in vuln_types
    )

    file_rows_html = "".join(
        f'<div class="file-row">'
        f'<span style="flex:3; color:#EEEEEE;">📄 {f["file"]}</span>'
        f'<span style="flex:1; text-align:center; color:{vuln_count_color(f["vuln"])};">{f["vuln"]}</span>'
        f'<span style="flex:1; text-align:center;">{f["lines"]:,}</span>'
        f'<span style="flex:1; text-align:center;"><span class="level-badge level-{f["level"]}">{f["level"]}</span></span>'
        f'</div>'
        for f in file_list
    )

    st.markdown("<div style='height:80px;'></div>", unsafe_allow_html=True)

    _, main_col, _ = st.columns([1, 6, 1])
    with main_col:
        st.markdown(f"""
    <div style="text-align:center; font-size:1.5rem; font-weight:bold; color:#EEEEEE; margin-bottom:20px;">
        <span style="color:#00ADB5;">{repo_url}</span>의<br>보안 취약점 분석이 완료되었습니다!
    </div>
    """, unsafe_allow_html=True)

        st.markdown(
            f'<div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; margin-bottom:12px;">'
            f'<div class="stat-box"><div class="stat-label">검사 시간</div><div class="stat-value" style="font-size:1.3rem;">{scan_date}</div></div>'
            f'<div class="stat-box"><div class="stat-label">발견된 취약점</div><div class="stat-value danger">{total_vuln}</div></div>'
            f'<div class="stat-box"><div class="stat-label">분석된 파일</div><div class="stat-value">{total_files}</div></div>'
            f'<div class="stat-box"><div class="stat-label">영향 파일</div><div class="stat-value accent">{affected_files}</div></div>'
            f'</div>',
            unsafe_allow_html=True,
        )

        st.markdown("<div style='height:12px;'></div>", unsafe_allow_html=True)

        st.markdown(f"""
    <div style="display:flex; gap:16px; align-items:stretch;">
        <div class="score-box" style="flex:1;">
            <div style="font-size:2rem; margin-bottom:10px;">{score_emoji(security_score)}</div>
            <div style="font-size:3rem; font-weight:bold; color:{score_color(security_score)};">
                {security_score}<span style="font-size:1rem; color:#aaa;">/100</span>
            </div>
            <div style="color:#aaaaaa; margin-top:5px;">보안점수</div>
        </div>
        <div class="vuln-summary" style="flex:2;">
            <div style="margin-bottom:20px; font-size:1rem; font-weight:600; color:#EEEEEE;">총 취약점 {total_vuln}건</div>
            <div style="display:flex; gap:30px; margin-bottom:28px;">
                <span style="color:#FF4545; font-size:1rem; font-weight:600;">위험 {danger}</span>
                <span style="color:#FFD415; font-size:1rem; font-weight:600;">경고 {warning}</span>
                <span style="color:#4BD33F; font-size:1rem; font-weight:600;">보통 {normal}</span>
            </div>
            <div style="margin-bottom:16px; color:#EEEEEE; font-size:1rem; font-weight:600;">취약점 유형별 건수</div>
            <div style="display:flex; flex-wrap:wrap; gap:24px;">{vuln_types_html}</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

        st.markdown(f"""
    <div class="file-table">
        <div style="margin-bottom:15px; font-weight:bold;">상세 취약점 리스트</div>
        <div class="file-row" style="color:#aaaaaa; font-size:0.8rem;">
            <span style="flex:3">파일명</span>
            <span style="flex:1; text-align:center;">취약점 건수</span>
            <span style="flex:1; text-align:center;">라인 수</span>
            <span style="flex:1; text-align:center;">위험도</span>
        </div>
        <div style="max-height:180px; overflow-y:scroll; scrollbar-width:thin; scrollbar-color:#00ADB5 #393E46;">
            {file_rows_html}
        </div>
    </div>
    """, unsafe_allow_html=True)

        st.markdown("<div style='height:20px;'></div>", unsafe_allow_html=True)
        href = f"/?page=analysis&repo={quote_plus(repo_url)}" if repo_url else "/?page=analysis"
        st.markdown(
            f'<a href="{href}" target="_self" style="text-decoration:none; display:block;">'
            f'<button style="background-color:#393E46; color:#EEEEEE; border:none; border-radius:8px; '
            f'padding:12px 60px; font-size:1rem; cursor:pointer; width:100%; white-space:nowrap;">'
            f'상세 분석결과 확인하기</button></a>',
            unsafe_allow_html=True,
        )

    render_footer()
