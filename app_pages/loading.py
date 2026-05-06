import streamlit as st
import requests
from utils.ui import render_header, render_footer
from utils.compat import set_query_params, clear_query_params, rerun

BACKEND_HOSTS = ["http://localhost:8000", "http://127.0.0.1:8000"]
ANALYZE_PATH = "/analyze/repository"
ANALYSIS_TIMEOUT = 180

_CSS = """
.stApp { background: #222831; color: #EEEEEE; }
.load-wrap {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; min-height: 65vh; text-align: center; padding: 40px 20px;
}
.load-ring {
    width: 72px; height: 72px;
    border: 5px solid rgba(0,173,181,0.2);
    border-top-color: #00ADB5;
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
    margin-bottom: 36px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.load-title { font-size: 1.5rem; font-weight: bold; color: #EEEEEE; margin-bottom: 16px; }
.load-repo {
    color: #00ADB5; font-size: 0.95rem; margin-bottom: 14px;
    word-break: break-all; max-width: 520px;
    background: rgba(0,173,181,0.08); border-radius: 8px; padding: 8px 16px;
}
.load-sub { color: #aaaaaa; font-size: 0.88rem; line-height: 1.8; }
.err-wrap {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; min-height: 65vh; text-align: center; padding: 40px 20px;
}
.err-icon { font-size: 3.5rem; margin-bottom: 20px; }
.err-title { font-size: 1.6rem; font-weight: bold; color: #FF4545; margin-bottom: 14px; }
.err-sub { color: #aaaaaa; font-size: 0.95rem; line-height: 1.8; max-width: 480px; }
.stButton > button {
    background-color: #00ADB5 !important; color: white !important;
    border: none !important; border-radius: 8px !important;
    height: 46px !important; padding: 0 40px !important; font-size: 1rem !important;
}
.stButton > button:hover { background-color: #009999 !important; }
"""

_ERROR_MESSAGES = {
    "timeout": (
        "⏱",
        "분석 시간이 초과되었습니다",
        "레포지토리가 너무 크거나 네트워크 상태가 좋지 않습니다.<br>잠시 후 다시 시도해 주세요.",
    ),
    "java": (
        "☕",
        "Java 파일을 찾을 수 없습니다",
        "현재 Java 레포지토리만 분석이 가능합니다.<br>Java 소스코드가 포함된 레포지토리 URL을 입력해 주세요.",
    ),
    "failed": (
        "⚠️",
        "분석에 실패했습니다",
        "레포지토리 URL이 올바른지 확인하거나<br>잠시 후 다시 시도해 주세요.",
    ),
}


def render_loading(repo_url: str):
    repo_url = repo_url or st.session_state.get("repo_url", "")
    logged_in = st.session_state.get("logged_in", False)
    user_id = st.session_state.get("user_id", "사용자")

    render_header(logged_in, user_id, extra_css=_CSS)
    st.markdown("<div style='height:80px;'></div>", unsafe_allow_html=True)

    status = st.session_state.get("analysis_status", "pending")

    if status == "pending":
        if not repo_url:
            st.session_state["analysis_status"] = "error:failed"
            rerun()
            return

        st.markdown(
            f'<div class="load-wrap">'
            f'  <div class="load-ring"></div>'
            f'  <div class="load-title">보안 취약점 분석 중...</div>'
            f'  <div class="load-repo">🔗 {repo_url}</div>'
            f'  <div class="load-sub">'
            f'    GitHub 레포지토리를 다운로드하고 분석하는 중입니다.<br>'
            f'    레포지토리 크기에 따라 수 분이 소요될 수 있습니다.'
            f'  </div>'
            f'</div>',
            unsafe_allow_html=True,
        )

        success = False
        error_reason = "failed"

        for host in BACKEND_HOSTS:
            try:
                response = requests.post(
                    f"{host}{ANALYZE_PATH}",
                    json={"url": repo_url},
                    headers={"Content-Type": "application/json"},
                    timeout=ANALYSIS_TIMEOUT,
                )
                if response.status_code == 200:
                    result = response.json()
                    analysis = result.get("analysis_result", result)
                    files_analyzed = analysis.get("files_analyzed", 0)
                    if files_analyzed == 0:
                        error_reason = "java"
                    else:
                        success = True
                else:
                    error_reason = "failed"
                break
            except requests.exceptions.Timeout:
                error_reason = "timeout"
                break
            except Exception:
                continue

        if success:
            st.session_state["analysis_status"] = "success"
            set_query_params(page="dashboard", repo=repo_url)
            rerun()
        else:
            st.session_state["analysis_status"] = f"error:{error_reason}"
            rerun()

    else:
        error_reason = status.split(":", 1)[1] if ":" in status else "failed"
        icon, title, sub = _ERROR_MESSAGES.get(error_reason, _ERROR_MESSAGES["failed"])

        st.markdown(
            f'<div class="err-wrap">'
            f'  <div class="err-icon">{icon}</div>'
            f'  <div class="err-title">{title}</div>'
            f'  <div class="err-sub">{sub}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

        st.markdown("<div style='height:8px;'></div>", unsafe_allow_html=True)
        _, btn_col, _ = st.columns([2, 1, 2])
        with btn_col:
            if st.button("처음으로 돌아가기"):
                st.session_state["analysis_status"] = "pending"
                clear_query_params()
                rerun()

    render_footer()
