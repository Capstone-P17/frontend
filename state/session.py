from __future__ import annotations

from typing import Any

import streamlit as st

KEY_REPO_URL = "repo_url"
KEY_ANALYSIS_ID = "analysis_id"
KEY_ANALYSIS_JOB_ID = "analysis_job_id"
KEY_ANALYSIS_STATUS = "analysis_status"
KEY_USER = "user"
KEY_USER_ID = "user_id"
KEY_LOGGED_IN = "logged_in"
KEY_RETURN_TO = "return_to"

_ALLOWED_RETURN_PAGES = {"home", "loading", "dashboard", "analysis", "login"}


def _state() -> Any:
    return st.session_state


def get_repo_url(default: str = "") -> str:
    value = _state().get(KEY_REPO_URL, default)
    return value if isinstance(value, str) else default


def set_repo_url(repo_url: str) -> None:
    _state()[KEY_REPO_URL] = repo_url


def get_analysis_id() -> str | None:
    value = _state().get(KEY_ANALYSIS_ID)
    return value if isinstance(value, str) and value else None


def set_analysis_id(analysis_id: str | None) -> None:
    if analysis_id:
        _state()[KEY_ANALYSIS_ID] = analysis_id
    else:
        _state().pop(KEY_ANALYSIS_ID, None)


def get_analysis_job_id() -> str | None:
    value = _state().get(KEY_ANALYSIS_JOB_ID)
    return value if isinstance(value, str) and value else None


def set_analysis_job_id(job_id: str | None) -> None:
    if job_id:
        _state()[KEY_ANALYSIS_JOB_ID] = job_id
    else:
        _state().pop(KEY_ANALYSIS_JOB_ID, None)


def get_analysis_status(default: str = "pending") -> str:
    value = _state().get(KEY_ANALYSIS_STATUS, default)
    return value if isinstance(value, str) else default


def set_analysis_status(status: str) -> None:
    _state()[KEY_ANALYSIS_STATUS] = status


def get_user() -> dict | None:
    value = _state().get(KEY_USER)
    return value if isinstance(value, dict) else None


def set_user(user: dict | None) -> None:
    if user:
        _state()[KEY_USER] = user
        _state()[KEY_USER_ID] = _derive_user_id(user)
    else:
        _state().pop(KEY_USER, None)
        _state().pop(KEY_USER_ID, None)


def is_logged_in() -> bool:
    return bool(_state().get(KEY_LOGGED_IN, False) and get_user())


def get_user_id(default: str = "사용자") -> str:
    user = get_user()
    if user:
        for key in ("github_login", "display_name", "email"):
            value = user.get(key)
            if isinstance(value, str) and value:
                return value
    value = _state().get(KEY_USER_ID)
    return value if isinstance(value, str) and value else default


def set_authenticated_user(user: dict | None) -> None:
    set_user(user)
    _state()[KEY_LOGGED_IN] = bool(user)


def clear_auth() -> None:
    for key in (KEY_USER, KEY_USER_ID):
        _state().pop(key, None)
    _state()[KEY_LOGGED_IN] = False
    clear_return_to()


def clear_analysis_state() -> None:
    for key in (KEY_REPO_URL, KEY_ANALYSIS_ID, KEY_ANALYSIS_JOB_ID, KEY_ANALYSIS_STATUS):
        _state().pop(key, None)


def set_return_to(page: str, repo_url: str | None = None, analysis_id: str | None = None) -> None:
    safe_page = page if page in _ALLOWED_RETURN_PAGES else "home"
    payload: dict[str, str] = {"page": safe_page}
    if repo_url:
        payload["repo"] = repo_url
    if analysis_id:
        payload["analysis_id"] = analysis_id
    _state()[KEY_RETURN_TO] = payload


def get_return_to() -> dict[str, str] | None:
    value = _state().get(KEY_RETURN_TO)
    if not isinstance(value, dict):
        return None
    page = value.get("page")
    if page not in _ALLOWED_RETURN_PAGES:
        return None
    result = {"page": page}
    for key in ("repo", "analysis_id"):
        item = value.get(key)
        if isinstance(item, str) and item:
            result[key] = item
    return result


def clear_return_to() -> None:
    _state().pop(KEY_RETURN_TO, None)


def _derive_user_id(user: dict) -> str:
    for key in ("github_login", "display_name", "email"):
        value = user.get(key)
        if isinstance(value, str) and value:
            return value
    return "사용자"
