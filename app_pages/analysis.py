import streamlit as st
import requests
from datetime import datetime
from typing import Optional
from utils.ui import render_header, render_footer, render_sidebar

BACKEND_HOSTS = ["http://localhost:8000", "http://127.0.0.1:8000"]
API_HEADERS = {"Content-Type": "application/json"}
FALLBACK_RESULT_PATHS = ["/result", "/api/result"]

TYPE_DISPLAY = {
    "SQL_INJECTION":    "SQL Injection",
    "XSS":             "Cross-Site Scripting (XSS)",
    "HARDCODED_SECRET": "Hardcoded Credentials",
    "COMMAND_INJECTION": "Command Injection",
    "PATH_TRAVERSAL":  "Path Traversal",
    "INSECURE_RANDOM": "Insecure Randomness",
    "WEAK_HASH":       "Weak Cryptographic Hash",
}

TYPE_ICONS = {
    "SQL Injection":              "🗄",
    "Cross-Site Scripting (XSS)": "🌐",
    "Hardcoded Credentials":      "🔑",
    "Command Injection":          "💻",
    "Path Traversal":             "📁",
    "Insecure Randomness":        "🎲",
    "Weak Cryptographic Hash":    "🔓",
}

SEVERITY_LABELS = {
    "CRITICAL": "치명적",
    "HIGH":     "위험",
    "MEDIUM":   "경고",
    "LOW":      "보통",
}

TYPE_DESCRIPTIONS = {
    "SQL_INJECTION": (
        "SQL Injection 취약점입니다. 사용자 입력이 SQL 쿼리에 직접 포함되어 데이터 탈취 및 인증 우회가 발생할 수 있습니다.",
        "파라미터화된 쿼리를 사용하세요.\n예: cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))",
    ),
    "XSS": (
        "XSS 취약점입니다. 사용자 입력이 검증 없이 HTML에 반영되면 악성 스크립트 실행이 가능합니다.",
        "출력 시 textContent 또는 HTML 이스케이프를 적용하세요.",
    ),
    "HARDCODED_SECRET": (
        "하드코딩된 비밀번호/시크릿이 발견되었습니다. 코드에 민감 정보가 포함되면 유출 위험이 커집니다.",
        "환경 변수 또는 시크릿 관리 도구(Vault 등)로 분리하세요.",
    ),
    "COMMAND_INJECTION": (
        "명령 인젝션 취약점입니다. 사용자 입력이 시스템 명령에 포함되어 임의 명령 실행이 가능합니다.",
        "사용자 입력을 명령어에 직접 사용하지 말고 허용 목록(whitelist) 검증을 적용하세요.",
    ),
    "PATH_TRAVERSAL": (
        "경로 조작(Path Traversal) 취약점입니다. 사용자 입력으로 허용되지 않은 파일에 접근할 수 있습니다.",
        "파일 경로를 정규화하고 허용된 디렉토리를 벗어나는지 검증하세요.",
    ),
    "INSECURE_RANDOM": (
        "암호학적으로 안전하지 않은 난수 생성기가 보안 목적으로 사용되고 있습니다.",
        "보안 토큰/세션에는 java.security.SecureRandom을 사용하세요.",
    ),
    "WEAK_HASH": (
        "취약한 해시 알고리즘(MD5, SHA-1 등)이 사용되고 있습니다. 충돌 공격에 취약합니다.",
        "SHA-256 이상의 안전한 해시 알고리즘을 사용하세요.",
    ),
}


def fetch_latest_result():
    for host in BACKEND_HOSTS:
        for path in FALLBACK_RESULT_PATHS:
            try:
                response = requests.get(f"{host}{path}", headers=API_HEADERS, timeout=30)
                response.raise_for_status()
                return response.json()
            except requests.exceptions.RequestException:
                continue
    return None


def get_type_description(vuln_type: str) -> tuple[str, str]:
    return TYPE_DESCRIPTIONS.get(
        vuln_type,
        ("발견된 취약점 유형에 대한 설명입니다.", "취약점에 적합한 보안 패턴을 적용하세요."),
    )


def make_cards(details):
    groups = {}
    for d in details:
        groups.setdefault(d["type"], []).append(d)

    def code_block_html(code, line_num):
        lines = code.split("\n")
        start = max(1, line_num - len(lines) // 2)
        parts = []
        for i, line in enumerate(lines):
            ln = start + i
            is_vuln = (ln == line_num)
            bg = "background:rgba(255,69,69,0.18);" if is_vuln else ""
            border = "border-left:3px solid #FF4545;" if is_vuln else "border-left:3px solid transparent;"
            txt = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
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
            parts.append(f'<div class="{cls}">{node}</div>')
            if i < last:
                parts.append('<div class="callpath-arrow">↓</div>')
        return "".join(parts)

    def item_html(d):
        fix = d["fix"].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        func_tag = (
            f'<span style="color:#888; font-size:0.78rem; margin-left:8px;">⚙ {d["function"]}</span>'
            if d.get("function") else ""
        )
        return (
            f'<div class="vitem">'
            f'<div class="vitem-header">'
            f'<span style="color:#aaaaaa; font-size:0.85rem;">📄 {d["file"]}{func_tag}</span>'
            f'<div style="display:flex; align-items:center; gap:8px;">'
            f'<span style="background:#2a2f38; color:#aaaaaa; font-size:0.75rem; padding:2px 10px; border-radius:4px;">Line {d["line"]}</span>'
            f'<span class="level-badge level-{d["severity"]}">{d["severity"]}</span>'
            f'</div></div>'
            f'<div class="vitem-code">{code_block_html(d["code"], d["line"])}</div>'
            f'<div class="vitem-bottom">'
            f'<div class="vitem-callpath">'
            f'<div style="color:#00ADB5; font-size:0.78rem; font-weight:600; margin-bottom:12px;">호출 경로</div>'
            f'{callpath_html(d.get("call_chain", []))}'
            f'</div>'
            f'<div class="vitem-right">'
            f'<div class="vitem-problem">'
            f'<div style="color:#FF6B6B; font-size:0.78rem; font-weight:600; margin-bottom:6px;">⚠ 문제점</div>'
            f'<div style="font-size:0.85rem; color:#EEEEEE; line-height:1.6;">{d["description"]}</div>'
            f'</div>'
            f'<div class="vitem-fix">'
            f'<div style="color:#00ADB5; font-size:0.78rem; font-weight:600; margin-bottom:6px;">◎ 해결 방법</div>'
            f'<pre>{fix}</pre>'
            f'</div>'
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
            f'<span style="font-size:1.05rem; font-weight:700; color:#EEEEEE;">{vtype}</span>'
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


def render_analysis(repo_url: Optional[str]):
    repo_url = repo_url or st.session_state.get("repo_url", "github.com/example/web-app")

    result_data = None
    if repo_url:
        with st.spinner("백엔드에서 분석 결과를 불러오는 중입니다..."):
            result_data = fetch_latest_result()
        if result_data is None:
            st.warning("백엔드 분석 결과를 불러올 수 없어 기본값으로 표시합니다.")

    analysis = (result_data or {}).get("analysis_result", {})
    summary = analysis.get("summary", {})
    vulnerabilities = analysis.get("vulnerabilities", [])

    scan_date = analysis.get("analyzed_at")
    try:
        scan_date = datetime.fromisoformat(scan_date).strftime("%y/%m/%d %H:%M")
    except Exception:
        scan_date = scan_date or datetime.now().strftime("%y/%m/%d %H:%M")

    total_vuln = summary.get("total_vulnerabilities", len(vulnerabilities))
    total_files = analysis.get("files_analyzed", 0)
    affected_files = len({v.get("file") for v in vulnerabilities if v.get("file")})

    by_type = summary.get("by_type", {})
    vuln_distribution = [
        {"category": TYPE_DISPLAY.get(k, k), "count": v}
        for k, v in by_type.items()
        if v > 0
    ]
    if not vuln_distribution:
        vuln_distribution = [{"category": name, "count": 0} for name in list(TYPE_DISPLAY.values())[:3]]

    vuln_details = []
    for vuln in vulnerabilities:
        vuln_type = vuln.get("type", "UNKNOWN")
        severity = SEVERITY_LABELS.get(vuln.get("severity", "LOW"), "보통")
        _, fix = get_type_description(vuln_type)
        description = vuln.get("description") or get_type_description(vuln_type)[0]
        vuln_details.append({
            "type": TYPE_DISPLAY.get(vuln_type, vuln_type),
            "severity": severity,
            "file": vuln.get("file", "Unknown"),
            "line": vuln.get("line", 0),
            "code": vuln.get("code_snippet") or vuln.get("code", "코드 정보가 없습니다."),
            "description": description,
            "fix": fix,
            "call_chain": vuln.get("call_chain", vuln.get("call_path", [])),
            "function": vuln.get("function", ""),
        })

    logged_in = st.session_state.get("logged_in", False)
    user_id = st.session_state.get("user_id", "사용자")

    render_header(logged_in, user_id, extra_css="""
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
            max-height: 480px; overflow-y: auto;
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

    render_sidebar(repo_url, user_id, active="analysis")

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
    <span style="color:#00ADB5;">{repo_url}</span>의<br>상세 보안취약점 분석 결과
</div>
""", unsafe_allow_html=True)

        st.markdown(
            f'<div style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:12px;">'
            f'<div class="stat-box"><div class="stat-label">검사 시간</div><div class="stat-value" style="font-size:1.3rem;">{scan_date}</div></div>'
            f'<div class="stat-box"><div class="stat-label">분석된 파일</div><div class="stat-value">{total_files}</div></div>'
            f'<div class="stat-box"><div class="stat-label">발견된 취약점</div><div class="stat-value danger">{total_vuln}</div></div>'
            f'<div class="stat-box"><div class="stat-label">영향 파일</div><div class="stat-value danger">{affected_files}</div></div>'
            f'</div>',
            unsafe_allow_html=True,
        )

        max_count = max((d["count"] for d in vuln_distribution), default=1) or 1
        bar_rows = "".join(
            f'<div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">'
            f'<div style="width:90px; text-align:right; font-size:0.8rem; color:#aaaaaa; flex-shrink:0;">{d["category"]}</div>'
            f'<div style="flex:1; background:#393E46; border-radius:4px; height:22px; overflow:hidden;">'
            f'<div style="width:{round(d["count"] / max_count * 100)}%; height:100%; background:#00ADB5; border-radius:4px;"></div></div>'
            f'<div style="width:28px; font-size:0.85rem; color:#EEEEEE; flex-shrink:0;">{d["count"]}</div>'
            f'</div>'
            for d in vuln_distribution
        )
        st.markdown(
            f'<div class="stat-box" style="margin-bottom:12px;">'
            f'<div class="stat-label" style="margin-bottom:16px;">취약점 분포</div>'
            f'{bar_rows}'
            f'</div>',
            unsafe_allow_html=True,
        )

        st.markdown("<div style='height:20px;'></div>", unsafe_allow_html=True)
        st.markdown(make_cards(vuln_details), unsafe_allow_html=True)

        st.markdown("<div style='height:20px;'></div>", unsafe_allow_html=True)
        if st.button("리포트하기"):
            st.info("리포트 기능은 준비 중입니다.")

    render_footer()
