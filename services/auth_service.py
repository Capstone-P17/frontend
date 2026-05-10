from __future__ import annotations

from html import escape
from urllib.parse import quote

import streamlit as st
import streamlit.components.v1 as components

from services import api_client
from services.api_client import ApiError
from state import navigation, session
from utils.compat import get_query_param


AUTH_REDIRECT_CAVEAT = (
    "백엔드 /auth/github/callback 이 Streamlit으로 access_token을 redirect/token-handoff 해야 "
    "프론트엔드 OAuth E2E가 완료됩니다. 현재 기본 백엔드 callback은 JSON TokenResponse를 반환할 수 있습니다."
)


def get_login_url() -> str:
    try:
        payload = api_client.get_github_login_url()
        url = payload.get("authorization_url")
        if isinstance(url, str) and url:
            return url
    except ApiError:
        pass
    return f"{api_client.BACKEND_BASE_URL}/auth/github"


def start_github_login() -> None:
    url = get_login_url()
    safe_url = escape(url, quote=True)
    quoted_url = quote(url, safe="/:?&=%#.+-_~")
    st.markdown(f'<meta http-equiv="refresh" content="0; url={safe_url}">', unsafe_allow_html=True)
    components.html(
        f"<script>window.parent.location.href='{quoted_url}';</script>",
        height=0,
    )
    st.info("GitHub 로그인 페이지로 이동합니다...")


def handle_auth_callback() -> bool:
    token = navigation.get_query_access_token()
    if not token:
        return False

    token_type = get_query_param("token_type")
    try:
        session.set_access_token(token)
        session.set_token_type(token_type or "bearer")
        user = fetch_current_user()
        if not user:
            session.clear_auth()
            navigation.go_auth_error("로그인 토큰 검증에 실패했습니다. 다시 로그인해 주세요.")
            return True
        session.set_auth(token, token_type or "bearer", user)
    except ApiError as exc:
        session.clear_auth()
        navigation.go_auth_error(exc.message)
        return True

    target = session.get_return_to()
    session.clear_return_to()
    if target:
        repo = target.get("repo") or session.get_repo_url("")
        analysis_id = target.get("analysis_id")
        page = target.get("page")
        if page == navigation.LOADING_PAGE and repo:
            navigation.go_loading(repo)
        elif page == navigation.DASHBOARD_PAGE and repo:
            navigation.go_dashboard(repo, analysis_id)
        elif page == navigation.ANALYSIS_PAGE and repo:
            navigation.go_analysis(repo, analysis_id)
        else:
            navigation.go_home()
    else:
        navigation.go_home()
    return True


def fetch_current_user() -> dict | None:
    user = api_client.get_current_user()
    session.set_user(user)
    session.set_auth(session.get_access_token() or "", session.get_token_type(), user)
    return user


def logout() -> None:
    session.clear_auth()
    session.clear_analysis_state()
    navigation.go_home()


def require_auth() -> bool:
    if session.get_access_token():
        return True
    repo = navigation.get_query_repo_url() or session.get_repo_url("")
    analysis_id = navigation.get_query_analysis_id() or session.get_analysis_id()
    page = navigation.get_page_key() or navigation.HOME_PAGE
    session.set_return_to(page, repo, analysis_id)
    navigation.go_login()
    return False
