import streamlit as st
import streamlit.components.v1 as components
from urllib.parse import quote_plus

_BASE_CSS = """
    header[data-testid="stHeader"] { display: none !important; }
    #MainMenu { display: none !important; }
    .stDeployButton { display: none !important; }
    footer { display: none !important; }
    .block-container {
        padding-top: 0 !important; padding-left: 0 !important;
        padding-right: 0 !important; padding-bottom: 0 !important;
        max-width: 100% !important;
    }
    .navbar {
        position: fixed; top: 0; left: 0; width: 100%;
        background-color: #222831; padding: 15px 40px;
        z-index: 9999; display: flex; align-items: center;
        gap: 40px; box-sizing: border-box;
    }
    .navbar-right { margin-left: auto; display: flex; align-items: center; gap: 24px; }
    .navbar-login {
        color: #00ADB5 !important; background-color: transparent;
        border: 2.5px solid #00ADB5; border-radius: 8px;
        padding: 6px 18px; text-decoration: none !important; font-size: 0.95rem;
    }
    .navbar-login:hover { background-color: rgba(0,173,181,0.1); border-bottom: 2.5px solid #00ADB5 !important; }
    .navbar-logo {
        color: #00ADB5 !important; font-size: 2rem !important;
        font-weight: bold; text-decoration: none !important; cursor: pointer;
    }
    .navbar-logo:hover { border-bottom: none !important; color: #00ADB5 !important; }
    .navbar a { color: #EEEEEE; text-decoration: none; font-size: 0.95rem; }
    .navbar a:hover { border-bottom: 2px solid #EEEEEE; }
    .navbar-hamburger {
        background: transparent; border: none; color: #EEEEEE;
        font-size: 1.3rem; cursor: pointer; padding: 0; line-height: 1; flex-shrink: 0;
    }
    .footer {
        width: 100vw; position: relative; left: 50%; transform: translateX(-50%);
        background-color: #393E46; padding: 30px 40px; display: flex;
        align-items: center; gap: 40px; box-sizing: border-box; margin-top: 80px;
    }
    .footer-logo { color: #00ADB5; font-size: 1.3rem; font-weight: bold; }
    .footer p { color: #EEEEEE; font-size: 0.85rem; margin: 3px 0; }
    .level-badge { padding: 3px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: bold; color: #EEEEEE; }
    .level-위험 { background-color: #FF4545; }
    .level-경고 { background-color: #FFD415; }
    .level-보통 { background-color: #4BD33F; }
    .stat-box { background-color: rgba(57,62,70,0.7); border-radius: 10px; padding: 20px; }
    .stat-label { font-size: 0.8rem; color: #aaaaaa; margin-bottom: 8px; }
    .stat-value { font-size: 1.8rem; font-weight: bold; color: #EEEEEE; }
    .stat-value.danger { color: #FF4545; }
    .stat-value.accent { color: #00ADB5; }
"""

_SIDEBAR_CSS = """
.p17-sidebar {
    position: fixed; top: 0; left: 0; width: 260px; height: 100vh;
    background-color: #222831; border-right: 1px solid rgba(238,238,238,0.25);
    z-index: 99999; display: flex; flex-direction: column;
    padding: 24px 16px 20px 16px; box-sizing: border-box;
    transition: transform 0.25s ease, opacity 0.25s ease;
}
#p17-sidebar-toggle { display: none; }
#p17-sidebar-toggle:checked + .p17-sidebar {
    transform: translateX(-280px);
    opacity: 0;
    pointer-events: none;
}
.p17-sidebar-header {
    display: flex; justify-content: space-between; align-items: center;
    padding-bottom: 14px; border-bottom: 1px solid rgba(238,238,238,0.2);
    margin-bottom: 14px;
}
.p17-sidebar-logo { color: #00ADB5; font-size: 1.8rem; font-weight: bold; }
.p17-close-btn {
    background: transparent; border: none; color: #EEEEEE;
    font-size: 1.1rem; cursor: pointer; padding: 4px 8px; border-radius: 4px;
}
.p17-close-btn:hover { background: rgba(238,238,238,0.1); }
.p17-sidebar-url {
    font-size: 0.78rem; color: #EEEEEE; word-break: break-all;
    padding: 8px 10px; background: rgba(238,238,238,0.06);
    border-radius: 6px; margin-bottom: 20px;
}
.p17-nav-btn {
    display: block; width: 100%; text-align: left;
    background: transparent; border: none; color: #EEEEEE !important;
    font-size: 0.95rem; padding: 10px 12px; border-radius: 6px;
    cursor: pointer; margin-bottom: 4px; text-decoration: none !important;
}
.p17-nav-btn:hover { background: rgba(238,238,238,0.1); }
.p17-nav-btn.active { background: rgba(238,238,238,0.1); font-weight: 600; }
.p17-user-box {
    margin-top: auto; border: 1px solid #EEEEEE;
    border-radius: 8px; padding: 12px 16px; color: #EEEEEE; font-size: 0.9rem;
}
"""

_AUTH_INPUT_CSS = """
    [data-testid="stTextInput"] > div,
    [data-testid="stTextInput"] > div > div {
        border: none !important; box-shadow: none !important;
        background-color: #2e333d !important; border-radius: 8px !important;
    }
    .stTextInput > div > div > input {
        background-color: transparent !important; color: #EEEEEE !important;
        border: none !important; outline: none !important;
        box-shadow: none !important; height: 50px !important;
        padding: 0 14px !important; font-size: 0.95rem !important;
    }
    .stTextInput > div > div > input::placeholder { color: #888 !important; }
    .stTextInput > div > div > input:focus { border: none !important; outline: none !important; box-shadow: none !important; }
    [data-testid="stTextInput"] > div > div > div {
        background-color: #2e333d !important; border: none !important;
        box-shadow: none !important; border-radius: 0 8px 8px 0 !important;
    }
    [data-testid="stTextInput"] button {
        display: flex !important; background-color: transparent !important;
        border: none !important; box-shadow: none !important;
        color: #888888 !important; padding: 0 10px !important; cursor: pointer !important;
    }
    [data-testid="stTextInput"] button:hover { background-color: transparent !important; color: #EEEEEE !important; }
    [data-testid="stTextInput"] button svg { width: 16px !important; height: 16px !important; }
    .stButton > button {
        background-color: #00ADB5 !important; color: #EEEEEE !important;
        border: none !important; border-radius: 8px !important;
        height: 50px !important; font-size: 1rem !important;
        font-weight: 600 !important; width: 100% !important;
    }
    .stButton > button:hover { background-color: #009999 !important; }
"""

_FOOTER_HTML = """
<div class="footer">
    <span class="footer-logo">P17</span>
    <div>
        <p>담당자 P17</p>
        <p>이메일 AAA@AAA.COM</p>
        <p>전화번호 010-0000-0000</p>
    </div>
</div>
"""


def _navbar_right_html(logged_in: bool, user_id: str) -> str:
    if logged_in:
        return f'<span style="color:#EEEEEE; font-size:0.95rem;">{user_id}</span>'
    return '<a class="navbar-login" href="/?page=login" target="_self">로그인</a>'


def render_header(logged_in: bool, user_id: str, extra_css: str = "", hamburger: bool = False):
    """CSS와 navbar를 하나의 markdown 블록으로 렌더링 (분리 시 Streamlit 컨테이너 문제 발생)."""
    ham   = '<button class="navbar-hamburger" id="p17-ham">☰</button>' if hamburger else ""
    right = _navbar_right_html(logged_in, user_id)
    st.markdown(
        f"<style>{_BASE_CSS}{extra_css}</style>"
        f'<div class="navbar">'
        f'  {ham}'
        f'  <a class="navbar-logo" href="/" target="_self">P17</a>'
        f'  <a href="#">팀 소개</a>'
        f'  <div class="navbar-right">{right}</div>'
        f'</div>',
        unsafe_allow_html=True,
    )


def render_auth_header(extra_css: str = ""):
    """로그인/회원가입 페이지용 헤더 (항상 비로그인 navbar)."""
    auth_css = (
        ".stApp { background: linear-gradient(180deg, #222831 50%, #00ADB5 100%); color: #EEEEEE; }"
        "[data-testid='stHorizontalBlock'] > [data-testid='stColumn']:nth-child(2) > div {"
        "  background-color: #393E46 !important; border-radius: 16px !important;"
        "  padding: 48px 36px 36px !important;"
        "}"
    )
    render_header(logged_in=False, user_id="", extra_css=auth_css + _AUTH_INPUT_CSS + extra_css)


def render_footer():
    st.markdown(_FOOTER_HTML, unsafe_allow_html=True)


def render_sidebar(repo_url: str, user_id: str, active: str):
    nav_items = [
        ("메인페이지", "/", "main"),
        ("대시보드", "dashboard", "dashboard"),
        ("상세 분석", "analysis", "analysis"),
    ]
    repo_param = f"repo={quote_plus(repo_url)}" if repo_url else ""

    nav_links = ""
    for label, path, key in nav_items:
        active_class = "active" if active == key else ""
        if key == "main":
            href = f"/?{repo_param}" if repo_param else "/"
        else:
            href = f"/?page={path}&{repo_param}" if repo_param else f"/?page={path}"
        nav_links += (
            f'<a class="p17-nav-btn {active_class}" '
            f'href="{href}" target="_self">{label}</a>'
        )

    st.markdown(
        f"<style>{_SIDEBAR_CSS}</style>"
        f'<div class="p17-sidebar" id="p17-sidebar">'
        f'  <div class="p17-sidebar-header">'
        f'    <span class="p17-sidebar-logo">P17</span>'
        f'    <button id="p17-sidebar-close" class="p17-close-btn">✕</button>'
        f'  </div>'
        f'  <div class="p17-sidebar-url">🔗 {repo_url}</div>'
        f'  <hr style="border:none;border-top:1px solid rgba(238,238,238,0.2);margin-bottom:12px;">'
        f'{nav_links}'
        f'  <div class="p17-user-box">👤 {user_id}</div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    components.html(
        """<script>
        (function() {
            function init() {
                var closeBtn = window.parent.document.getElementById("p17-sidebar-close");
                var sidebar = window.parent.document.getElementById("p17-sidebar");
                if (!closeBtn || !sidebar) { setTimeout(init, 100); return; }
                closeBtn.onclick = function() {
                    sidebar.style.transform = "translateX(-280px)";
                    sidebar.style.opacity = "0";
                    sidebar.style.pointerEvents = "none";
                };
            }
            init();
        })();
        </script>""",
        height=0,
    )

