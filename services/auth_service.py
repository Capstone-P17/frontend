from __future__ import annotations

import json
from html import escape

import streamlit as st
import streamlit.components.v1 as components

from services import api_client
from services.api_client import ApiError
from state import navigation, session


AUTH_FLOW_NOTE = (
    "GitHub OAuth URL 생성과 JWT 발급은 백엔드가 담당하며, JWT는 HttpOnly 쿠키로만 전달됩니다."
)


def get_login_url() -> str:
    return f"{api_client.BACKEND_BASE_URL}/auth/github"


def get_logout_url() -> str:
    return f"{api_client.BACKEND_BASE_URL}/auth/logout"


def _browser_redirect_script(url: str) -> str:
    return f"window.parent.location.href={json.dumps(url)};"


def _logout_script(logout_url: str, redirect_url: str = "/") -> str:
    return f"""
<script>
(async function() {{
    try {{
        await window.parent.fetch({json.dumps(logout_url)}, {{
            method: "POST",
            credentials: "include"
        }});
    }} finally {{
        {_browser_redirect_script(redirect_url)}
    }}
}})();
</script>
"""


def start_github_login() -> None:
    url = get_login_url()
    safe_url = escape(url, quote=True)
    st.markdown(f'<meta http-equiv="refresh" content="0; url={safe_url}">', unsafe_allow_html=True)
    components.html(
        f"<script>{_browser_redirect_script(url)}</script>",
        height=0,
    )
    st.info("GitHub 로그인 페이지로 이동합니다...")


def _redirect_browser(url: str) -> None:
    safe_url = escape(url, quote=True)
    st.markdown(f'<meta http-equiv="refresh" content="0; url={safe_url}">', unsafe_allow_html=True)
    components.html(
        f"<script>{_browser_redirect_script(url)}</script>",
        height=0,
    )


def _return_target_url() -> str:
    target = session.get_return_to()
    session.clear_return_to()
    if not target:
        return navigation.build_href()
    return navigation.build_href(
        page=target.get("page"),
        repo_url=target.get("repo"),
        analysis_id=target.get("analysis_id"),
    )


def _auth_failed_url() -> str:
    return "/login?error=auth_failed"


def handle_auth_callback() -> bool:
    st.markdown(
        "<div style='padding:48px;text-align:center;color:#EEEEEE;'>로그인 처리 중...</div>",
        unsafe_allow_html=True,
    )
    try:
        user = fetch_current_user()
        if not user:
            session.clear_auth()
            _redirect_browser(_auth_failed_url())
            return True
    except ApiError:
        session.clear_auth()
        _redirect_browser(_auth_failed_url())
        return True

    _redirect_browser(_return_target_url())
    return True


def fetch_current_user() -> dict | None:
    user = api_client.get_current_user()
    session.set_authenticated_user(user)
    return user


def refresh_auth_state() -> None:
    if session.is_logged_in():
        return
    try:
        fetch_current_user()
    except ApiError:
        session.clear_auth()


def logout() -> None:
    session.clear_auth()
    session.clear_analysis_state()
    components.html(_logout_script(get_logout_url()), height=0)
    st.info("로그아웃 중입니다...")


def require_auth() -> bool:
    if session.is_logged_in():
        return True
    try:
        fetch_current_user()
        return True
    except ApiError:
        session.clear_auth()
    repo = navigation.get_query_repo_url() or session.get_repo_url("")
    analysis_id = navigation.get_query_analysis_id() or session.get_analysis_id()
    page = navigation.get_page_key() or navigation.HOME_PAGE
    session.set_return_to(page, repo, analysis_id)
    navigation.go_login()
    return False
