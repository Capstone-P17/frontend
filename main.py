import streamlit as st
from utils.ui import render_header, render_footer
from utils.compat import get_query_param, set_query_params, rerun
from app_pages.dashboard import render_dashboard
from app_pages.analysis import render_analysis
from app_pages.loading import render_loading
from app_pages.login import render_login

st.set_page_config(page_title="P17 - 보안 취약점 검사", layout="wide")

page_key = get_query_param("page")
repo_url = get_query_param("repo")

logged_in = st.session_state.get("logged_in", False)
user_id = st.session_state.get("user_id", "사용자")

if page_key == "dashboard":
    render_dashboard(repo_url)
elif page_key == "analysis":
    render_analysis(repo_url)
elif page_key == "loading":
    render_loading(repo_url)
elif page_key == "login":
    render_login()
else:
    render_header(logged_in, user_id, extra_css="""
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
                else:
                    st.session_state["repo_url"] = url
                    st.session_state["analysis_status"] = "pending"
                    set_query_params(page="loading", repo=url)
                    rerun()

    st.markdown("""
    <div class="feature-section">
        <div class="feature-box">
            <div class="feature-title">취약점 탐지</div>
            <p>AST 기반 정적 분석으로 코드를 실행하지 않고도 SQL Injection, XSS, 하드코딩된 비밀번호를 오탐 없이 탐지합니다.</p>
        </div>
        <div class="feature-box">
            <div class="feature-title">시각화된 결과</div>
            <p>취약점이 발견된 파일과 라인, 위험도를 한눈에 파악할 수 있는 대시보드로 제공합니다.</p>
        </div>
        <div class="feature-box">
            <div class="feature-title">AI 수정 제안</div>
            <p>탐지된 취약점을 AI가 분석하여 왜 위험한지, 어떻게 고쳐야 하는지 즉시 적용 가능한 수정 코드를 생성해드립니다.</p>
        </div>
    </div>
    """, unsafe_allow_html=True)

    render_footer()
