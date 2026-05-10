import time

import streamlit as st

from services import api_client, auth_service
from services.api_client import ApiError
from state import navigation, session
from utils.ui import render_footer, render_header

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



def _show_loading(repo_url: str, status: str = "queued") -> None:
    title = "보안 취약점 분석 준비 중..." if status == "queued" else "보안 취약점 분석 중..."
    st.markdown(
        f'<div class="load-wrap">'
        f'  <div class="load-ring"></div>'
        f'  <div class="load-title">{title}</div>'
        f'  <div class="load-repo">🔗 {repo_url}</div>'
        f'  <div class="load-sub">'
        f'    GitHub 레포지토리를 다운로드하고 Java 소스코드를 rule-based로 분석하는 중입니다.<br>'
        f'    상태: {status} · 레포지토리 크기에 따라 수 분이 소요될 수 있습니다.'
        f'  </div>'
        f'</div>',
        unsafe_allow_html=True,
    )


def _show_error(reason: str, detail: str | None = None) -> None:
    icon, title, sub = _ERROR_MESSAGES.get(reason, _ERROR_MESSAGES["failed"])
    if detail:
        sub = detail
    st.markdown(
        f'<div class="err-wrap">'
        f'  <div class="err-icon">{icon}</div>'
        f'  <div class="err-title">{title}</div>'
        f'  <div class="err-sub">{sub}</div>'
        f'</div>',
        unsafe_allow_html=True,
    )
    st.markdown("<div style='height:8px;'></div>", unsafe_allow_html=True)
    left, retry_col, home_col, right = st.columns([1.5, 1, 1, 1.5])
    with retry_col:
        if st.button("다시 시도"):
            repo_url = session.get_repo_url("")
            session.clear_analysis_state()
            if repo_url:
                session.set_repo_url(repo_url)
                session.set_analysis_status("pending")
                navigation.go_loading(repo_url)
            else:
                navigation.go_home()
    with home_col:
        if st.button("처음으로"):
            session.clear_analysis_state()
            navigation.go_home()


def _create_or_poll_job(repo_url: str) -> None:
    stored_repo = session.get_repo_url("")
    if stored_repo and stored_repo != repo_url:
        session.clear_analysis_state()
    session.set_repo_url(repo_url)

    job_id = session.get_analysis_job_id()
    if not job_id:
        try:
            job = api_client.create_repository_analysis_job(repo_url)
        except ApiError as exc:
            if exc.status_code == 404:
                result = api_client.analyze_repository_sync(repo_url)
                analysis_id = str(result.get("analysis_id") or "")
                session.set_analysis_id(analysis_id or None)
                session.set_analysis_status("success")
                navigation.go_dashboard(repo_url, analysis_id or None)
                return
            raise
        job_id = str(job.get("job_id") or "")
        if not job_id:
            raise ApiError(0, "분석 작업 ID를 받지 못했습니다.", job)
        session.set_analysis_job_id(job_id)
        session.set_analysis_status(str(job.get("status") or "queued"))
        _show_loading(repo_url, str(job.get("status") or "queued"))
        time.sleep(1)
        navigation.go_loading(repo_url)
        return

    job = api_client.get_analysis_job(job_id)
    status = str(job.get("status") or "queued")
    session.set_analysis_status(status)
    if status in ('queued', 'running'):
        _show_loading(repo_url, status)
        time.sleep(1.5)
        navigation.go_loading(repo_url)
    elif status == "succeeded":
        analysis_id = job.get("analysis_id")
        if not analysis_id:
            raise ApiError(0, "분석은 완료되었지만 analysis_id가 없습니다.", job)
        session.set_analysis_id(str(analysis_id))
        session.set_analysis_job_id(None)
        session.set_analysis_status("success")
        navigation.go_dashboard(repo_url, str(analysis_id))
    elif status == "failed":
        session.set_analysis_status("error:failed")
        _show_error("failed", str(job.get("error") or "분석에 실패했습니다."))
    else:
        _show_error("failed", f"알 수 없는 작업 상태입니다: {status}")


def render_loading(repo_url: str):
    if not auth_service.require_auth():
        st.stop()

    repo_url = repo_url or navigation.get_query_repo_url() or session.get_repo_url("")
    render_header(session.is_logged_in(), session.get_user_id(), extra_css=_CSS)
    st.markdown("<div style='height:80px;'></div>", unsafe_allow_html=True)

    if not repo_url:
        _show_error("failed", "분석할 GitHub 저장소 URL이 없습니다.")
        render_footer()
        return

    status = session.get_analysis_status("pending")
    if status.startswith("error:"):
        _show_error(status.split(":", 1)[1] or "failed")
        render_footer()
        return

    try:
        _create_or_poll_job(repo_url)
    except ApiError as exc:
        if exc.status_code == 401:
            session.set_return_to(navigation.LOADING_PAGE, repo_url=repo_url)
            navigation.go_auth_error(exc.message)
        reason = "timeout" if "timed out" in exc.message.lower() or "timeout" in exc.message.lower() else "failed"
        session.set_analysis_status(f"error:{reason}")
        _show_error(reason, exc.message)

    render_footer()
