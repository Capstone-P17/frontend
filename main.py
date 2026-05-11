import streamlit as st
from html import escape
from urllib.parse import quote_plus

from app_pages.analysis import render_analysis
from app_pages.dashboard import render_dashboard
from app_pages.loading import render_loading
from app_pages.login import render_login
from services import api_client, auth_service, analysis_service
from services.api_client import ApiError
from state import navigation, session
from utils.ui import render_footer, render_header

st.set_page_config(page_title="P17 - 보안 취약점 검사", layout="wide")

page_key = navigation.get_page_key()
repo_url = navigation.get_query_repo_url() or session.get_repo_url("")

if navigation.is_auth_callback_route():
    auth_service.handle_auth_callback()
    st.stop()

auth_service.refresh_auth_state()

if page_key == navigation.DASHBOARD_PAGE:
    render_dashboard(repo_url)
elif page_key == navigation.ANALYSIS_PAGE:
    render_analysis(repo_url)
elif page_key == navigation.LOADING_PAGE:
    render_loading(repo_url)
elif page_key == navigation.LOGIN_PAGE:
    render_login()
else:
    render_header(session.is_logged_in(), session.get_user_id(), extra_css="""
        .stApp { background: linear-gradient(180deg, #222831 50%, #00ADB5 100%); color: #EEEEEE; }
        .main-content { margin-top: 100px; text-align: center; padding: 40px 0; }
        .main-title { font-size: 2.5rem; font-weight: bold; color: #EEEEEE; margin-bottom: 15px; }
        .sub-title { color: #EEEEEE; margin-bottom: 40px; }
        [data-testid="stTextInput"] label {
            display: none !important; height: 0 !important; margin: 0 !important; padding: 0 !important;
        }
        .stTextInput > div > div > input {
            background-color: #6D7480 !important; color: #222831 !important;
            font-weight: 600 !important; border-radius: 8px !important;
            border: none !important; outline: none !important;
            box-shadow: none !important; height: 46px !important; padding: 0 12px !important;
        }
        .stTextInput > div > div,
        [data-testid="stTextInput"] > div { border: none !important; box-shadow: none !important; }
        .stTextInput > div > div > input:focus { border: none !important; outline: none !important; box-shadow: none !important; }
        .stButton { margin: 0 !important; padding: 0 !important; line-height: 1 !important; }
        [data-testid="stFormSubmitButton"] > button {
            background-color: #00ADB5 !important; color: white !important;
            border: none !important; border-radius: 8px !important;
            width: 40px !important; height: 40px !important;
            min-width: 40px !important; padding: 0 !important;
            font-size: 1.2rem !important; display: flex !important;
            align-items: center !important; justify-content: center !important;
        }
        [data-testid="stFormSubmitButton"] > button:hover { background-color: #009999 !important; }
        .feature-section { margin-top: 80px; display: flex; gap: 30px; justify-content: center; padding: 0 40px; }
        .feature-box { flex: 1; padding: 30px; max-width: 300px; }
        .feature-title { color: #00ADB5; font-size: 1.2rem; font-weight: bold; margin-bottom: 15px; }
        .feature-box p { color: #EEEEEE; line-height: 1.6; }
        .capability-box { max-width: 760px; margin: 24px auto 0; background: rgba(34,40,49,0.38); border-radius: 12px; padding: 18px 24px; }
        .capability-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .capability-item { background: rgba(238,238,238,0.08); border-radius: 8px; padding: 12px; color: #EEEEEE; font-size: 0.9rem; }
        .capability-label { color: #00ADB5; font-weight: 700; margin-bottom: 4px; }
    """)

    st.markdown("""
    <div class="main-content">
        <div class="main-title">소스코드 보안 취약점 검사 시작하기</div>
        <div class="sub-title">입력하신 소스코드의 보안취약점을 분석하고 해결 방안을 제시해 드립니다</div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div style="max-width:700px; margin: 0 auto; text-align:center;">
        <p style="color:#EEEEEE; margin-bottom:24px; font-size:1.05rem; line-height:1.6; opacity:0.95;">
            GitHub 저장소 주소를 입력하면 소스코드 보안 취약점 분석을 시작합니다.
            예: https://github.com/owner/repo
        </p>
    </div>
    """, unsafe_allow_html=True)

    _, form_col, _ = st.columns([1, 4, 1])
    with form_col:
        with st.form(key="repo_form"):
            col_input, col_btn = st.columns([8, 1])
            with col_input:
                url = st.text_input(
                    "url",
                    placeholder="https://github.com/owner/repo",
                    key="repo_input",
                )
            with col_btn:
                submitted = st.form_submit_button("✓")

            if submitted:
                if not url:
                    st.warning("URL을 입력해주세요")
                elif not session.is_logged_in():
                    session.clear_analysis_state()
                    session.set_repo_url(url)
                    session.set_return_to(navigation.LOADING_PAGE, repo_url=url)
                    navigation.go_login()
                else:
                    session.clear_analysis_state()
                    session.set_repo_url(url)
                    session.set_analysis_status("pending")
                    navigation.go_loading(url)

    try:
        capabilities = analysis_service.build_capabilities_view_model(api_client.get_capabilities())
        languages = ", ".join(capabilities["supported_languages"])
        extensions = ", ".join(capabilities["supported_file_extensions"])
        sources = ", ".join(capabilities["supported_repository_sources"])
        llm_report = "가능" if capabilities["llm_report_available"] else "불가"
        st.markdown(f"""
        <div class="capability-box">
            <div style="color:#EEEEEE; font-weight:700; margin-bottom:12px;">지원 범위</div>
            <div class="capability-grid">
                <div class="capability-item"><div class="capability-label">지원 언어</div>{languages}</div>
                <div class="capability-item"><div class="capability-label">분석 방식</div>Rule-based 정적 분석</div>
                <div class="capability-item"><div class="capability-label">지원 파일</div>{extensions}</div>
                <div class="capability-item"><div class="capability-label">저장소</div>{sources}</div>
                <div class="capability-item"><div class="capability-label">LLM 탐지</div>비활성화</div>
                <div class="capability-item"><div class="capability-label">LLM 리포트</div>{llm_report}</div>
            </div>
        </div>
        """, unsafe_allow_html=True)
    except ApiError:
        pass

    if session.is_logged_in():
        try:
            recent = analysis_service.build_recent_results_view_model(api_client.list_results(limit=5))
        except ApiError:
            recent = []
        if recent:
            links = "".join(
                f'<a href="/?page=dashboard&repo={quote_plus(item["repository"])}&analysis_id={quote_plus(item["analysis_id"])}" '
                f'target="_self" style="color:#EEEEEE; text-decoration:none; display:block; margin:4px 0;">'
                f'• {escape(item["repository"])} ({item["total_vulnerabilities"]}건)</a>'
                for item in recent
            )
            st.markdown(
                f'<div style="max-width:760px;margin:16px auto 0;color:#EEEEEE;">'
                f'<div style="font-weight:700;color:#00ADB5;margin-bottom:6px;">최근 분석</div>{links}</div>',
                unsafe_allow_html=True,
            )

    st.markdown("""
    <div class="feature-section">
        <div class="feature-box">
            <div class="feature-title">취약점 탐지</div>
            <p>Java AST 기반 정적 분석으로 코드를 실행하지 않고도 SQL Injection, XSS, 하드코딩된 비밀번호 등을 탐지합니다.</p>
        </div>
        <div class="feature-box">
            <div class="feature-title">시각화된 결과</div>
            <p>취약점이 발견된 파일과 라인, 위험도를 한눈에 파악할 수 있는 대시보드로 제공합니다.</p>
        </div>
        <div class="feature-box">
            <div class="feature-title">AI 수정 제안</div>
            <p>탐지는 rule-based로 수행하고, 리포트/설명 보조에 한해 AI 사용 가능성을 제공합니다.</p>
        </div>
    </div>
    """, unsafe_allow_html=True)

    render_footer()
