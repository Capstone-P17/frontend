from __future__ import annotations

from html import escape
from typing import Optional
from urllib.parse import quote_plus

import streamlit as st

from services import analysis_service, api_client, auth_service
from services.api_client import ApiError
from state import navigation, session
from utils.ui import render_footer, render_header, render_sidebar


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


def _fetch_result(analysis_id: str | None) -> dict:
    if analysis_id:
        return api_client.get_result(analysis_id)
    return api_client.get_latest_result()


def _resolve_result(repo_url: str) -> tuple[dict | None, str | None]:
    analysis_id = navigation.get_query_analysis_id() or session.get_analysis_id()
    result = _fetch_result(analysis_id)
    result_id = str(result.get("analysis_id") or analysis_id or "") or None
    if result_id:
        session.set_analysis_id(result_id)
    result_repo = (result.get("analysis_result") or {}).get("repository") if isinstance(result.get("analysis_result"), dict) else None
    if result_repo and not repo_url:
        session.set_repo_url(str(result_repo))
    return result, result_id


def render_dashboard(repo_url: Optional[str]):
    if not auth_service.require_auth():
        st.stop()

    repo_url = repo_url or session.get_repo_url("")
    result_data = None
    analysis_id = navigation.get_query_analysis_id() or session.get_analysis_id()

    try:
        with st.spinner("백엔드에서 분석 결과를 불러오는 중입니다..."):
            result_data, analysis_id = _resolve_result(repo_url)
    except ApiError as exc:
        if exc.status_code == 401:
            session.set_return_to(navigation.DASHBOARD_PAGE, repo_url, analysis_id)
            navigation.go_auth_error(exc.message)
        render_header(session.is_logged_in(), session.get_user_id(), extra_css=".stApp { background:#222831; color:#EEEEEE; }")
        st.error(f"분석 결과를 불러올 수 없습니다: {exc.message}")
        if st.button("처음으로 돌아가기"):
            navigation.go_home()
        render_footer()
        return

    vm = analysis_service.build_dashboard_view_model(result_data or {})
    if vm.get("repo_url"):
        repo_url = vm["repo_url"]
        session.set_repo_url(repo_url)
    else:
        vm["repo_url"] = repo_url

    try:
        recent_results = analysis_service.build_recent_results_view_model(api_client.list_results(limit=5))
    except ApiError:
        recent_results = []

    render_header(session.is_logged_in(), session.get_user_id(), extra_css="""
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
    """)

    render_sidebar(repo_url, session.get_user_id(), active="dashboard", analysis_id=analysis_id, recent_results=recent_results)

    severity = vm["severity_counts"]
    danger = severity["critical"] + severity["high"]
    warning = severity["medium"]
    normal = severity["low"]
    total_vuln = vm["total_vulnerabilities"]
    total_files = vm["files_analyzed"]
    affected_files = vm["affected_files"]
    security_score = vm["security_score"]

    vuln_types = vm["vulnerability_types"]
    vuln_types_html = "".join(
        f'<span style="color:#EEEEEE; font-size:1rem; font-weight:600;">'
        f'{escape(v["name"])} <span style="color:#FF4545;">{v["count"]}</span></span>'
        for v in vuln_types
    ) or '<span style="color:#aaaaaa; font-size:0.95rem;">발견된 취약점 유형이 없습니다.</span>'

    file_rows_html = "".join(
        f'<div class="file-row">'
        f'<span style="flex:3; color:#EEEEEE;">📄 {escape(f["file"])}</span>'
        f'<span style="flex:1; text-align:center; color:{vuln_count_color(f["vuln"])};">{f["vuln"]}</span>'
        f'<span style="flex:1; text-align:center;">{f["lines"]:,}</span>'
        f'<span style="flex:1; text-align:center;"><span class="level-badge level-{f["level"]}">{f["level"]}</span></span>'
        f'</div>'
        for f in vm["file_list"]
    ) or '<div style="color:#aaaaaa; padding:14px 0;">발견된 취약점 파일이 없습니다.</div>'

    st.markdown("<div style='height:80px;'></div>", unsafe_allow_html=True)

    _, main_col, _ = st.columns([1, 6, 1])
    with main_col:
        st.markdown(f"""
    <div style="text-align:center; font-size:1.5rem; font-weight:bold; color:#EEEEEE; margin-bottom:20px;">
        <span style="color:#00ADB5;">{escape(repo_url or '분석 결과')}</span>의<br>보안 취약점 분석이 완료되었습니다!
    </div>
    """, unsafe_allow_html=True)

        st.markdown(
            f'<div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; margin-bottom:12px;">'
            f'<div class="stat-box"><div class="stat-label">검사 시간</div><div class="stat-value" style="font-size:1.3rem;">{vm["scan_date"]}</div></div>'
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
        href = f"/?page=analysis&repo={quote_plus(repo_url)}&analysis_id={quote_plus(analysis_id or '')}" if repo_url else "/?page=analysis"
        st.markdown(
            f'<a href="{href}" target="_self" style="text-decoration:none; display:block;">'
            f'<button style="background-color:#393E46; color:#EEEEEE; border:none; border-radius:8px; '
            f'padding:12px 60px; font-size:1rem; cursor:pointer; width:100%; white-space:nowrap;">'
            f'상세 분석결과 확인하기</button></a>',
            unsafe_allow_html=True,
        )

    render_footer()
