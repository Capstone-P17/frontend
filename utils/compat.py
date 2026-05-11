import streamlit as st
from urllib.parse import urlparse


def get_query_param(key):
    if hasattr(st, "query_params"):
        return st.query_params.get(key)
    return st.experimental_get_query_params().get(key, [None])[0]


def set_query_params(**kwargs):
    if hasattr(st, "query_params"):
        for k, v in kwargs.items():
            st.query_params[k] = v
    else:
        st.experimental_set_query_params(**kwargs)


def clear_query_params():
    if hasattr(st, "query_params"):
        st.query_params.clear()
    else:
        st.experimental_set_query_params()


def rerun():
    if hasattr(st, "rerun"):
        st.rerun()
    else:
        st.experimental_rerun()


def get_current_path(default: str = "/") -> str:
    """Return the browser path Streamlit is currently serving."""
    try:
        url = getattr(st.context, "url", "")
    except Exception:
        return default
    if not isinstance(url, str) or not url:
        return default
    return urlparse(url).path or default


def get_browser_cookie_header() -> str:
    """Serialize browser cookies for server-side backend requests.

    Streamlit exposes cookies from the browser request through `st.context`.
    This lets Python `urllib` calls behave like browser fetch calls with
    `credentials: "include"` while preserving HttpOnly token opacity.
    """
    try:
        cookies = getattr(st.context, "cookies", {})
    except Exception:
        return ""
    if not cookies:
        return ""
    items = []
    for key, value in dict(cookies).items():
        if value is None:
            continue
        items.append(f"{key}={value}")
    return "; ".join(items)
