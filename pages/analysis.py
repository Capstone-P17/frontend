import streamlit as st
import streamlit.components.v1 as components
from datetime import datetime
from utils.ui import render_header, render_footer, render_sidebar

st.set_page_config(page_title="P17 - 상세 분석", layout="wide")

repo_url = st.query_params.get("repo") or st.session_state.get("repo_url", "github.com/example/web-app")

# TODO: 백엔드 분석 결과로 교체
scan_date      = datetime.now().strftime("%y/%m/%d %H:%M")
total_vuln     = 46
total_files    = 126
affected_files = 15

vuln_distribution = [
    {"category": "WEB",   "count": 15},
    {"category": "DATA",  "count": 28},
    {"category": "AUTH",  "count": 18},
    {"category": "INFRA", "count": 7},
    {"category": "API",   "count": 8},
]

vuln_details = [
    {
        "type": "SQL Injection",
        "severity": "위험",
        "file": "src/auth/login_service.py",
        "line": 42,
        "code": 'user_id = request.args.get("id")\nquery = "SELECT * FROM users WHERE id = " + user_id\ncursor.execute(query)',
        "description": "사용자 입력값이 SQL 쿼리에 직접 삽입됩니다. 공격자가 OR 1=1 등의 조건을 삽입해 인증을 우회하거나 전체 데이터를 탈취할 수 있습니다.",
        "fix": "파라미터화된 쿼리(Prepared Statement)를 사용하세요.\ncursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))",
        "call_path": ["Controller.main()", "handleRequest()", "getUserString(id)", "UserDAO.executeQuery()"],
    },
    {
        "type": "SQL Injection",
        "severity": "위험",
        "file": "api/database/query_builder.js",
        "line": 87,
        "code": "const query = `SELECT * FROM orders WHERE user_id = ${userId}`;\ndb.query(query);",
        "description": "템플릿 리터럴로 쿼리를 직접 구성하고 있어 SQL Injection에 취약합니다. 사용자가 제어하는 값이 쿼리 구조를 변경할 수 있습니다.",
        "fix": "Prepared Statement를 사용하세요.\ndb.query('SELECT * FROM orders WHERE user_id = ?', [userId]);",
        "call_path": ["Router.handle()", "OrderController.list()", "QueryBuilder.build()", "db.query()"],
    },
    {
        "type": "SQL Injection",
        "severity": "위험",
        "file": "src/controllers/user_controller.py",
        "line": 115,
        "code": 'search = request.form["keyword"]\nresult = db.execute("SELECT * FROM products WHERE name LIKE \'%" + search + "%\'")',
        "description": "검색 키워드가 LIKE 절에 직접 삽입되어 있습니다. 와일드카드 및 서브쿼리 삽입이 가능합니다.",
        "fix": "파라미터 바인딩을 사용하세요.\nresult = db.execute('SELECT * FROM products WHERE name LIKE ?', ('%' + search + '%',))",
        "call_path": ["app.route('/search')", "UserController.search()", "db.execute()"],
    },
    {
        "type": "XSS (Cross-Site Scripting)",
        "severity": "경고",
        "file": "public/js/client_logger.js",
        "line": 15,
        "code": 'const msg = location.search.split("msg=")[1];\ndocument.getElementById("notice").innerHTML = msg;',
        "description": "URL 파라미터 값이 innerHTML에 직접 삽입됩니다. 공격자가 악성 스크립트를 URL에 포함시켜 다른 사용자에게 전달할 수 있습니다.",
        "fix": "innerHTML 대신 textContent를 사용하거나 입력값을 이스케이프 처리하세요.\ndocument.getElementById('notice').textContent = msg;",
        "call_path": ["window.onload()", "Logger.init()", "Logger.showNotice()"],
    },
    {
        "type": "XSS (Cross-Site Scripting)",
        "severity": "경고",
        "file": "api/routes/admin.js",
        "line": 33,
        "code": 'res.send("<h1>Welcome, " + req.query.name + "</h1>");',
        "description": "사용자 입력이 HTML 응답에 직접 포함됩니다. 스크립트 태그 삽입을 통한 XSS 공격이 가능합니다.",
        "fix": "출력 전 HTML 이스케이프 처리를 적용하세요.\nconst safe = escapeHtml(req.query.name);\nres.send(`<h1>Welcome, ${safe}</h1>`);",
        "call_path": ["Express.Router()", "AdminRouter.get('/welcome')", "res.send()"],
    },
    {
        "type": "Hardcoded Password",
        "severity": "보통",
        "file": "src/config/db_config.py",
        "line": 8,
        "code": 'DB_HOST     = "localhost"\nDB_USER     = "root"\nDB_PASSWORD = "admin1234"',
        "description": "데이터베이스 비밀번호가 소스코드에 직접 작성되어 있습니다. 버전 관리 시스템(Git 등)에 노출될 위험이 있습니다.",
        "fix": "환경 변수나 시크릿 관리 도구를 사용하세요.\nDB_PASSWORD = os.environ.get('DB_PASSWORD')",
        "call_path": ["app.init()", "DBConnection.connect()", "db_config.py"],
    },
    {
        "type": "Hardcoded Password",
        "severity": "보통",
        "file": "src/middleware/session.py",
        "line": 5,
        "code": 'SECRET_KEY = "supersecret_key_12345"\napp.config["SECRET_KEY"] = SECRET_KEY',
        "description": "세션 서명에 사용되는 SECRET_KEY가 코드에 하드코딩되어 있습니다. 유출 시 세션 위조가 가능합니다.",
        "fix": "환경 변수에서 불러오세요.\napp.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')",
        "call_path": ["app.create()", "SessionMiddleware.setup()", "session.py"],
    },
]

logged_in = st.session_state.get("logged_in", False)
user_id   = st.session_state.get("user_id", "사용자")

render_header(logged_in, user_id, hamburger=True, extra_css="""
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
    .stButton > button {
        background-color: #00ADB5 !important; color: #EEEEEE !important;
        border: none !important; border-radius: 8px !important;
        padding: 12px 60px !important; font-size: 1rem !important;
        white-space: nowrap !important; width: 100% !important;
    }
    .stButton > button:hover { background-color: #009999 !important; }
""")

render_sidebar(repo_url, user_id, active="analysis")

components.html("""
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
""", height=0)

TYPE_ICONS = {
    "SQL Injection":              "🗄",
    "XSS (Cross-Site Scripting)": "🌐",
    "Hardcoded Password":         "🔑",
}


def make_cards(details):
    groups = {}
    for d in details:
        groups.setdefault(d["type"], []).append(d)

    def code_block_html(code, line_num):
        lines = code.split("\n")
        start = max(1, line_num - len(lines) // 2)
        parts = []
        for i, line in enumerate(lines):
            ln      = start + i
            is_vuln = (ln == line_num)
            bg      = "background:rgba(255,69,69,0.18);" if is_vuln else ""
            border  = "border-left:3px solid #FF4545;" if is_vuln else "border-left:3px solid transparent;"
            txt     = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            parts.append(
                f'<div class="vcode-line" style="{bg}{border}">'
                f'<span class="vcode-ln">{ln}</span>'
                f'<span class="vcode-text">{txt}</span>'
                f'</div>'
            )
        return "".join(parts)

    def callpath_html(call_path):
        last  = len(call_path) - 1
        parts = []
        for i, node in enumerate(call_path):
            cls = "callpath-node vuln" if i == last else "callpath-node"
            parts.append(f'<div class="{cls}">{node}</div>')
            if i < last:
                parts.append('<div class="callpath-arrow">↓</div>')
        return "".join(parts)

    def item_html(d):
        fix = d["fix"].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        return (
            f'<div class="vitem">'
            f'<div class="vitem-header">'
            f'<span style="color:#aaaaaa; font-size:0.85rem;">📄 {d["file"]}</span>'
            f'<div style="display:flex; align-items:center; gap:8px;">'
            f'<span style="background:#2a2f38; color:#aaaaaa; font-size:0.75rem; padding:2px 10px; border-radius:4px;">Line {d["line"]}</span>'
            f'<span class="level-badge level-{d["severity"]}">{d["severity"]}</span>'
            f'</div></div>'
            f'<div class="vitem-code">{code_block_html(d["code"], d["line"])}</div>'
            f'<div class="vitem-bottom">'
            f'<div class="vitem-callpath">'
            f'<div style="color:#00ADB5; font-size:0.78rem; font-weight:600; margin-bottom:12px;">호출 경로</div>'
            f'{callpath_html(d.get("call_path", []))}'
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
        sev   = items[0]["severity"]
        icon  = TYPE_ICONS.get(vtype, "⚠")
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

    return "".join(group_html(i, vtype, items) for i, (vtype, items) in enumerate(groups.items()))


st.markdown("<div style='height:80px;'></div>", unsafe_allow_html=True)

_, main_col, _ = st.columns([1, 6, 1])
with main_col:
    st.markdown(f"""
<div style="text-align:center; font-size:1.5rem; font-weight:bold; color:#EEEEEE; margin-bottom:20px;">
    <span style="color:#00ADB5;">{repo_url}</span>의<br>상세 보안취약점 분석 결과
</div>
""", unsafe_allow_html=True)

    stat_col, chart_col = st.columns([1, 1.4])

    with stat_col:
        r1a, r1b = st.columns(2)
        with r1a:
            st.markdown(f'<div class="stat-box"><div class="stat-label">검사 시간</div><div class="stat-value" style="font-size:1.3rem;">{scan_date}</div></div>', unsafe_allow_html=True)
        with r1b:
            st.markdown(f'<div class="stat-box"><div class="stat-label">분석된 파일</div><div class="stat-value">{total_files}</div></div>', unsafe_allow_html=True)
        st.markdown("<div style='height:12px;'></div>", unsafe_allow_html=True)
        r2a, r2b = st.columns(2)
        with r2a:
            st.markdown(f'<div class="stat-box"><div class="stat-label">발견된 취약점</div><div class="stat-value danger">{total_vuln}</div></div>', unsafe_allow_html=True)
        with r2b:
            st.markdown(f'<div class="stat-box"><div class="stat-label">영향 파일</div><div class="stat-value danger">{affected_files}</div></div>', unsafe_allow_html=True)

    with chart_col:
        max_count = max(d["count"] for d in vuln_distribution)
        bar_rows = "".join(
            f'<div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">'
            f'<div style="width:38px; text-align:right; font-size:0.8rem; color:#aaaaaa; flex-shrink:0;">{d["category"]}</div>'
            f'<div style="flex:1; background:#393E46; border-radius:4px; height:22px; overflow:hidden;">'
            f'<div style="width:{round(d["count"] / max_count * 100)}%; height:100%; background:#00ADB5; border-radius:4px;"></div></div>'
            f'<div style="width:24px; font-size:0.85rem; color:#EEEEEE; flex-shrink:0;">{d["count"]}</div>'
            f'</div>'
            for d in vuln_distribution
        )
        st.markdown(
            f'<div class="stat-box" style="height:100%; box-sizing:border-box;">'
            f'<div class="stat-label" style="margin-bottom:16px;">취약점 분포</div>'
            f'{bar_rows}'
            f'</div>',
            unsafe_allow_html=True
        )

    st.markdown("<div style='height:20px;'></div>", unsafe_allow_html=True)
    st.markdown(make_cards(vuln_details), unsafe_allow_html=True)

    st.markdown("<div style='height:20px;'></div>", unsafe_allow_html=True)
    _, btn_col, _ = st.columns([1, 2, 1])
    with btn_col:
        if st.button("리포트하기", use_container_width=True):
            st.info("리포트 기능은 준비 중입니다.")

render_footer()
