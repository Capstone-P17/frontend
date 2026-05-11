from __future__ import annotations

from urllib.parse import quote_plus

from utils.compat import clear_query_params, get_current_path, get_query_param, set_query_params, rerun

HOME_PAGE = "home"
LOGIN_PAGE = "login"
LOADING_PAGE = "loading"
DASHBOARD_PAGE = "dashboard"
ANALYSIS_PAGE = "analysis"
AUTH_CALLBACK_PAGE = "auth-callback"
AUTH_CALLBACK_PATH = "/auth/callback"
LOGIN_PATH = "/login"


def _page_key_from_path() -> str | None:
    path = get_current_path()
    if path == LOGIN_PATH:
        return LOGIN_PAGE
    if path == AUTH_CALLBACK_PATH:
        return AUTH_CALLBACK_PAGE
    return None


def _replace_query_params(**kwargs: str | None) -> None:
    clear_query_params()
    clean = {key: value for key, value in kwargs.items() if value is not None and value != ""}
    if clean:
        set_query_params(**clean)


def get_page_key() -> str | None:
    return get_query_param("page") or _page_key_from_path()


def is_auth_callback_route() -> bool:
    return get_current_path() == AUTH_CALLBACK_PATH or get_page_key() == AUTH_CALLBACK_PAGE


def get_query_repo_url() -> str | None:
    return get_query_param("repo")


def get_query_analysis_id() -> str | None:
    return get_query_param("analysis_id")


def get_query_auth_error() -> str | None:
    return get_query_param("auth_error") or get_query_param("error")


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


def go_auth_callback() -> None:
    _replace_query_params(page=AUTH_CALLBACK_PAGE)
    rerun()


def go_auth_error(message: str) -> None:
    _replace_query_params(page=LOGIN_PAGE, auth_error=message)
    rerun()


def build_href(page: str | None = None, repo_url: str | None = None, analysis_id: str | None = None, auth_error: str | None = None) -> str:
    params: list[str] = []
    if page and page != HOME_PAGE:
        params.append(f"page={quote_plus(page)}")
    if repo_url:
        params.append(f"repo={quote_plus(repo_url)}")
    if analysis_id:
        params.append(f"analysis_id={quote_plus(analysis_id)}")
    if auth_error:
        params.append(f"auth_error={quote_plus(auth_error)}")
    return f"/?{'&'.join(params)}" if params else "/"
