from __future__ import annotations

from utils.compat import clear_query_params, get_query_param, set_query_params, rerun

HOME_PAGE = "home"
LOGIN_PAGE = "login"
LOADING_PAGE = "loading"
DASHBOARD_PAGE = "dashboard"
ANALYSIS_PAGE = "analysis"
AUTH_CALLBACK_PAGE = "auth-callback"


def _replace_query_params(**kwargs: str | None) -> None:
    clear_query_params()
    clean = {key: value for key, value in kwargs.items() if value is not None and value != ""}
    if clean:
        set_query_params(**clean)


def get_page_key() -> str | None:
    return get_query_param("page")


def get_query_repo_url() -> str | None:
    return get_query_param("repo")


def get_query_analysis_id() -> str | None:
    return get_query_param("analysis_id")


def get_query_access_token() -> str | None:
    return get_query_param("access_token")


def get_query_auth_error() -> str | None:
    return get_query_param("auth_error")


def go_home() -> None:
    _replace_query_params()
    rerun()


def go_loading(repo_url: str) -> None:
    _replace_query_params(page=LOADING_PAGE, repo=repo_url)
    rerun()


def go_dashboard(repo_url: str, analysis_id: str | None = None) -> None:
    _replace_query_params(page=DASHBOARD_PAGE, repo=repo_url, analysis_id=analysis_id)
    rerun()


def go_analysis(repo_url: str, analysis_id: str | None = None) -> None:
    _replace_query_params(page=ANALYSIS_PAGE, repo=repo_url, analysis_id=analysis_id)
    rerun()


def go_login() -> None:
    _replace_query_params(page=LOGIN_PAGE)
    rerun()


def go_auth_callback(access_token: str | None = None) -> None:
    _replace_query_params(page=AUTH_CALLBACK_PAGE, access_token=access_token)
    rerun()


def go_auth_error(message: str) -> None:
    _replace_query_params(page=LOGIN_PAGE, auth_error=message)
    rerun()
