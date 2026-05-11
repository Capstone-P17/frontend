from __future__ import annotations

import json
import os
import socket
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from state import session
from utils.compat import get_browser_cookie_header

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8000").rstrip("/")
SHORT_TIMEOUT = 30
SYNC_ANALYSIS_TIMEOUT = 180
SUCCESS_STATUSES = {200, 201, 202, 204}


@dataclass
class ApiError(Exception):
    status_code: int
    message: str
    body: object | None = None

    def __str__(self) -> str:
        return f"API {self.status_code}: {self.message}"


def build_headers(include_auth: bool = True) -> dict[str, str]:
    """Build backend headers.

    Authentication is cookie-based. The backend stores the JWT in an
    HttpOnly cookie, so frontend code must never read or forward a bearer
    token from JS/session state. For Streamlit server-side requests, the
    equivalent of browser `credentials: "include"` is forwarding the browser
    Cookie header that Streamlit received for this request.
    """
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if include_auth:
        cookie_header = get_browser_cookie_header()
        if cookie_header:
            headers["Cookie"] = cookie_header
    return headers


def _extract_error_message(body: object | None, fallback: str) -> str:
    if isinstance(body, dict):
        detail = body.get("detail") or body.get("error") or body.get("message")
        if isinstance(detail, str):
            return detail
        if isinstance(detail, list):
            return "; ".join(str(item) for item in detail) or fallback
    if isinstance(body, str) and body:
        return body
    return fallback


def _parse_body(raw: bytes, content_type: str = "") -> object | None:
    if not raw:
        return None
    text = raw.decode("utf-8", errors="replace")
    if "json" in content_type.lower() or text[:1] in ("{", "["):
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return text
    return text




def handle_response(response: Any) -> dict[str, Any]:
    """Test-friendly response handler for response-like objects."""
    status_code = int(getattr(response, "status_code", getattr(response, "status", 0)) or 0)
    try:
        body = response.json()
    except Exception:
        body = getattr(response, "text", None)
    if status_code in SUCCESS_STATUSES:
        return body if isinstance(body, dict) else {"data": body}
    if status_code == 401:
        session.clear_auth()
        raise ApiError(status_code, "인증이 만료되었거나 유효하지 않습니다. 다시 로그인해 주세요.", body)
    raise ApiError(status_code, _extract_error_message(body, "백엔드 요청에 실패했습니다."), body)

def _request(
    method: str,
    path: str,
    *,
    json_body: dict[str, Any] | None = None,
    query: dict[str, Any] | None = None,
    timeout: int = SHORT_TIMEOUT,
    include_auth: bool = True,
) -> dict[str, Any]:
    query_string = f"?{urlencode(query)}" if query else ""
    url = f"{BACKEND_BASE_URL}{path}{query_string}"
    data = json.dumps(json_body).encode("utf-8") if json_body is not None else None
    req = Request(url, data=data, method=method.upper(), headers=build_headers(include_auth=include_auth))
    try:
        with urlopen(req, timeout=timeout) as response:
            if getattr(response, "status", 200) not in SUCCESS_STATUSES:
                body = _parse_body(response.read(), response.headers.get("Content-Type", ""))
                raise ApiError(getattr(response, "status", 0), _extract_error_message(body, "백엔드 요청에 실패했습니다."), body)
            body = _parse_body(response.read(), response.headers.get("Content-Type", ""))
            if body is None:
                return {}
            if isinstance(body, dict):
                return body
            return {"data": body}
    except HTTPError as exc:
        body = _parse_body(exc.read(), exc.headers.get("Content-Type", ""))
        if exc.code == 401:
            session.clear_auth()
            raise ApiError(exc.code, "인증이 만료되었거나 유효하지 않습니다. 다시 로그인해 주세요.", body) from exc
        raise ApiError(exc.code, _extract_error_message(body, "백엔드 요청에 실패했습니다."), body) from exc
    except (URLError, socket.timeout, TimeoutError) as exc:
        raise ApiError(0, f"백엔드에 연결할 수 없습니다: {exc}", None) from exc


def get_capabilities() -> dict[str, Any]:
    return _request("GET", "/capabilities", include_auth=False)


def get_current_user() -> dict[str, Any]:
    return _request("GET", "/auth/me")


def create_repository_analysis_job(repo_url: str) -> dict[str, Any]:
    return _request("POST", "/analyze/repository/jobs", json_body={"url": repo_url})


def get_analysis_job(job_id: str) -> dict[str, Any]:
    return _request("GET", f"/analyze/jobs/{job_id}")


def get_result(analysis_id: str) -> dict[str, Any]:
    return _request("GET", f"/result/{analysis_id}")


def get_latest_result() -> dict[str, Any]:
    return _request("GET", "/result")


def list_results(limit: int = 5) -> dict[str, Any]:
    return _request("GET", "/results", query={"limit": limit})


def analyze_repository_sync(repo_url: str) -> dict[str, Any]:
    return _request("POST", "/analyze/repository", json_body={"url": repo_url}, timeout=SYNC_ANALYSIS_TIMEOUT)
