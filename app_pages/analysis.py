from __future__ import annotations

from collections import OrderedDict
from html import escape
from typing import Optional

import streamlit as st

from services import analysis_service, api_client, auth_service
from services.api_client import ApiError
from state import navigation, session
from utils.ui import render_footer, render_header, render_sidebar

TYPE_ICONS = {
    "SQL Injection": "🗄",
    "Cross-Site Scripting (XSS)": "🌐",
    "Hardcoded Credentials": "🔑",
    "Command Injection": "💻",
    "Path Traversal": "📁",
    "Insecure Randomness": "🎲",
    "Weak Cryptographic Hash": "🔓",
}


def _line_number(value: int | None) -> int:
    return value if isinstance(value, int) and value > 0 else 1


def make_cards(details):
    groups = OrderedDict()
    for d in details:
        groups.setdefault(d["type"], []).append(d)

    def code_block_html(code, line_num):
        safe_line_num = _line_number(line_num)
        lines = str(code or "코드 정보가 없습니다.").split("\n")
        start = max(1, safe_line_num - len(lines) // 2)
        parts = []
        for i, line in enumerate(lines):
            ln = start + i
            is_vuln = ln == safe_line_num
            bg = "background:rgba(255,69,69,0.18);" if is_vuln else ""
            border = "border-left:3px solid #FF4545;" if is_vuln else "border-left:3px solid transparent;"
            txt = escape(line)
            parts.append(
                f'<div class="vcode-line" style="{bg}{border}">'
                f'<span class="vcode-ln">{ln}</span>'
                f'<span class="vcode-text">{txt}</span>'
                f'</div>'
            )
        return "".join(parts)

    def callpath_html(call_chain):
        if not call_chain:
            return '<div style="color:#555; font-size:0.8rem; padding:4px 0;">호출 경로 정보 없음</div>'
        last = len(call_chain) - 1
        parts = []
        for i, node in enumerate(call_chain):
            cls = "callpath-node vuln" if i == last else "callpath-node"
            parts.append(f'<div class="{cls}">{escape(str(node))}</div>')
            if i < last:
                parts.append('<div class="callpath-arrow">↓</div>')
        return "".join(parts)

    def meta_html(d):
        bits = []
        if d.get("cwe"):
            bits.append(f'CWE: {escape(str(d["cwe"]))}')
        if d.get("cvss_score") is not None:
            bits.append(f'CVSS: {escape(str(d["cvss_score"]))}')
        if d.get("cvss_vector"):
            bits.append(escape(str(d["cvss_vector"])))
        if d.get("confidence"):
            bits.append(f'신뢰도: {escape(str(d["confidence"]))}')
        return " · ".join(bits)

    def item_html(d):
        fix = escape(d.get("fix") or "")
        description = escape(d.get("description") or "")
        safe_example = escape(d.get("safe_example") or "")
        func_tag = (
            f'<span style="color:#888; font-size:0.78rem; margin-left:8px;">⚙ {escape(str(d["function"]))}</span>'
            if d.get("function") else ""
        )
        line_label = d.get("line") if d.get("line") is not None else "-"
        metadata = meta_html(d)
        safe_example_html = (
            f'<div class="vitem-fix"><div style="color:#4BD33F; font-size:0.78rem; font-weight:600; margin-bottom:6px;">✓ 안전한 예시</div><pre>{safe_example}</pre></div>'
            if safe_example else ""
        )
        return (
            f'<div class="vitem">'
            f'<div class="vitem-header">'
            f'<span style="color:#aaaaaa; font-size:0.85rem;">📄 {escape(d["file"])}{func_tag}</span>'
            f'<div style="display:flex; align-items:center; gap:8px;">'
            f'<span style="background:#2a2f38; color:#aaaaaa; font-size:0.75rem; padding:2px 10px; border-radius:4px;">Line {line_label}</span>'
            f'<span class="level-badge level-{d["severity"]}">{d["severity"]}</span>'
            f'</div></div>'
            f'<div style="color:#888; font-size:0.78rem; margin:-4px 0 10px 0;">{metadata}</div>'
            f'<div class="vitem-code">{code_block_html(d["code"], d.get("line"))}</div>'
            f'<div class="vitem-bottom">'
            f'<div class="vitem-callpath">'
            f'<div style="color:#00ADB5; font-size:0.78rem; font-weight:600; margin-bottom:12px;">호출 경로</div>'
            f'{callpath_html(d.get("call_chain", []))}'
            f'</div>'
            f'<div class="vitem-right">'
            f'<div class="vitem-problem">'
            f'<div style="color:#FF6B6B; font-size:0.78rem; font-weight:600; margin-bottom:6px;">⚠ 문제점</div>'
            f'<div style="font-size:0.85rem; color:#EEEEEE; line-height:1.6;">{description}</div>'
            f'</div>'
            f'<div class="vitem-fix">'
            f'<div style="color:#00ADB5; font-size:0.78rem; font-weight:600; margin-bottom:6px;">◎ 해결 방법</div>'
            f'<pre>{fix}</pre>'
            f'</div>'
            f'{safe_example_html}'
            f'</div></div></div>'
        )

    def group_html(i, vtype, items):
        sev = items[0]["severity"]
        icon = TYPE_ICONS.get(vtype, "⚠")
        count = len(items)
        return (
            f'<div class="vgroup">'
            f'<div class="vgroup-header" id="vg-h-{i}">'
            f'<div style="display:flex; align-items:center; gap:12px;">'
            f'<div class="vtype-icon level-{sev}">{icon}</div>'
            f'<span style="font-size:1.05rem; font-weight:700; color:#EEEEEE;">{escape(vtype)}</span>'
            f'<span class="level-badge level-{sev}">{sev}</span>'
            f'<span style="color:#aaaaaa; font-size:0.88rem;">총 {count}건 발견됨</span>'
            f'</div>'
            f'<span class="vg-ci" style="color:#aaaaaa; font-size:0.9rem;">▼</span>'
            f'</div>'
            f'<div class="vgroup-body" id="vg-b-{i}" style="display:none;">'
            f'{"".join(item_html(d) for d in items)}'
            f'</div></div>'
        )

    if not details:
        return '<div style="text-align:center; color:#aaaaaa; padding:40px 20px;">발견된 취약점이 없습니다.</div>'

    return "".join(group_html(i, vtype, items) for i, (vtype, items) in enumerate(groups.items()))


def _fetch_result(analysis_id: str | None) -> dict:
    if analysis_id:
        return api_client.get_result(analysis_id)
    return api_client.get_latest_result()


def render_analysis(repo_url: Optional[str]):
    if not auth_service.require_auth():
        st.stop()

    repo_url = repo_url or session.get_repo_url("")
    analysis_id = navigation.get_query_analysis_id() or session.get_analysis_id()

    try:
        with st.spinner("백엔드에서 분석 결과를 불러오는 중입니다..."):
            result_data = _fetch_result(analysis_id)
    except ApiError as exc:
        if exc.status_code == 401:
            session.set_return_to(navigation.ANALYSIS_PAGE, repo_url, analysis_id)
            navigation.go_auth_error(exc.message)
        render_header(session.is_logged_in(), session.get_user_id(), extra_css=".stApp { background:#222831; color:#EEEEEE; }")
        st.error(f"상세 분석 결과를 불러올 수 없습니다: {exc.message}")
        if st.button("처음으로 돌아가기"):
            navigation.go_home()
        render_footer()
        return

    vm = analysis_service.build_analysis_detail_view_model(result_data)
    analysis_id = vm.get("analysis_id") or analysis_id
    if analysis_id:
        session.set_analysis_id(analysis_id)
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
        .vgroup { background-color: rgba(57,62,70,0.7); border-radius: 10px; margin-bottom: 14px; overflow: hidden; }
        .vgroup-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 16px 20px; cursor: pointer; user-select: none;
        }
        .vgroup-header:hover { background: rgba(255,255,255,0.04); }
        .vtype-icon {
            width: 32px; height: 32px; border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
            font-size: 1rem; flex-shrink: 0;
        }
        .vtype-icon.level-치명적 { background-color: rgba(139,0,0,0.35); }
        .vtype-icon.level-위험 { background-color: rgba(255,69,69,0.25); }
        .vtype-icon.level-경고 { background-color: rgba(255,212,21,0.2); }
        .vtype-icon.level-보통 { background-color: rgba(75,211,63,0.2); }
        .vgroup-body {
            border-top: 1px solid rgba(238,238,238,0.1);
            max-height: 520px; overflow-y: auto;
            scrollbar-width: thin; scrollbar-color: #00ADB5 #393E46;
        }
        .vitem { padding: 16px 20px; border-bottom: 1px solid rgba(238,238,238,0.08); }
        .vitem:last-child { border-bottom: none; }
        .vitem-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .vitem-code {
            background-color: #1a1e24; border-radius: 8px;
            padding: 10px 0; margin-bottom: 12px; overflow-x: auto;
            font-family: 'Courier New', monospace;
        }
        .vcode-line { display: flex; align-items: baseline; padding: 2px 12px; gap: 12px; font-size: 0.82rem; }
        .vcode-ln { color: #555; min-width: 24px; text-align: right; flex-shrink: 0; }
        .vcode-text { color: #e06c75; white-space: pre-wrap; word-break: break-all; }
        .vitem-bottom { display: flex; gap: 16px; align-items: flex-start; }
        .vitem-callpath { flex: 1; background: rgba(255,255,255,0.03); border-radius: 8px; padding: 14px 16px; }
        .callpath-node {
            background: #2e333d; border-radius: 6px;
            padding: 7px 14px; font-size: 0.82rem; color: #EEEEEE;
            text-align: center; white-space: nowrap;
        }
        .callpath-node.vuln { background: rgba(255,69,69,0.25); color: #FF4545; font-weight: 600; }
        .callpath-arrow { text-align: center; color: #555; font-size: 0.85rem; line-height: 1; padding: 3px 0; }
        .vitem-right { flex: 1.4; display: flex; flex-direction: column; gap: 10px; }
        .vitem-problem { background: rgba(255,69,69,0.1); border-radius: 8px; padding: 12px 14px; }
        .vitem-fix { background: #1a1e24; border-radius: 8px; padding: 12px 14px; }
        .vitem-fix pre {
            margin: 6px 0 0 0; font-size: 0.82rem; color: #4BD33F;
            font-family: 'Courier New', monospace; white-space: pre-wrap; word-break: break-all;
        }
        .level-badge { padding: 3px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: bold; color: #EEEEEE; }
        .level-치명적 { background-color: #8B0000; }
        .level-위험 { background-color: #FF4545; }
        .level-경고 { background-color: #FFD415; color: #222; }
        .level-보통 { background-color: #4BD33F; color: #222; }
        .stButton > button {
            background-color: #00ADB5 !important; color: #EEEEEE !important;
            border: none !important; border-radius: 8px !important;
            padding: 12px 60px !important; font-size: 1rem !important;
            white-space: nowrap !important; width: 100% !important;
        }
        .stButton > button:hover { background-color: #009999 !important; }
    """)

    render_sidebar(repo_url, session.get_user_id(), active="analysis", analysis_id=analysis_id, recent_results=recent_results)

    components_html = """
<script>
(function() {
    var doc = window.parent.document;
    function setupCards() {
        if (!doc.getElementById('vg-h-0')) { setTimeout(setupCards, 100); return; }
        var i = 0, h;
        while ((h = doc.getElementById('vg-h-' + i))) {
            (function(hdr, bdy) {
                hdr.onclick = function() {
                    var open = bdy.style.display === 'block';
                    bdy.style.display = open ? 'none' : 'block';
                    var icon = hdr.querySelector('.vg-ci');
                    if (icon) icon.textContent = open ? '▼' : '▲';
                };
            })(h, doc.getElementById('vg-b-' + i));
            i++;
        }
    }
    setupCards();
})();
</script>
"""
    st.components.v1.html(components_html, height=0)

    st.markdown("<div style='height:80px;'></div>", unsafe_allow_html=True)

    _, main_col, _ = st.columns([1, 6, 1])
    with main_col:
        st.markdown(f"""
<div style="text-align:center; font-size:1.5rem; font-weight:bold; color:#EEEEEE; margin-bottom:20px;">
    <span style="color:#00ADB5;">{escape(repo_url or '분석 결과')}</span>의<br>상세 보안취약점 분석 결과
</div>
""", unsafe_allow_html=True)

        st.markdown(
            f'<div style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:12px;">'
            f'<div class="stat-box"><div class="stat-label">검사 시간</div><div class="stat-value" style="font-size:1.3rem;">{vm["scan_date"]}</div></div>'
            f'<div class="stat-box"><div class="stat-label">분석된 파일</div><div class="stat-value">{vm["files_analyzed"]}</div></div>'
            f'<div class="stat-box"><div class="stat-label">발견된 취약점</div><div class="stat-value danger">{vm["total_vulnerabilities"]}</div></div>'
            f'<div class="stat-box"><div class="stat-label">영향 파일</div><div class="stat-value danger">{vm["affected_files"]}</div></div>'
            f'</div>',
            unsafe_allow_html=True,
        )

        distribution = vm["vuln_distribution"]
        if not distribution:
            distribution = [{"category": "취약점", "count": 0}]
        max_count = max((d["count"] for d in distribution), default=1) or 1
        bar_rows = "".join(
            f'<div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">'
            f'<div style="width:130px; text-align:right; font-size:0.8rem; color:#aaaaaa; flex-shrink:0;">{escape(d["category"])}</div>'
            f'<div style="flex:1; background:#393E46; border-radius:4px; height:22px; overflow:hidden;">'
            f'<div style="width:{round(d["count"] / max_count * 100)}%; height:100%; background:#00ADB5; border-radius:4px;"></div></div>'
            f'<div style="width:28px; font-size:0.85rem; color:#EEEEEE; flex-shrink:0;">{d["count"]}</div>'
            f'</div>'
            for d in distribution
        )
        st.markdown(
            f'<div class="stat-box" style="margin-bottom:12px;">'
            f'<div class="stat-label" style="margin-bottom:16px;">취약점 분포</div>'
            f'{bar_rows}'
            f'</div>',
            unsafe_allow_html=True,
        )

        st.markdown("<div style='height:20px;'></div>", unsafe_allow_html=True)
        st.markdown(make_cards(vm["vuln_details"]), unsafe_allow_html=True)

        st.markdown("<div style='height:20px;'></div>", unsafe_allow_html=True)
        if st.button("리포트하기"):
            st.info("리포트 기능은 준비 중입니다.")

    render_footer()
