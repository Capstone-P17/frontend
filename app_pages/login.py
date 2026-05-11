import streamlit as st

from services import auth_service
from state import navigation, session
from utils.ui import render_auth_header, render_footer


def render_login():
    render_auth_header(
        logged_in=session.is_logged_in(),
        user_id=session.get_user_id(),
        extra_css="""
        [data-testid="stTextInput"] label {
            display: none !important; height: 0 !important; margin: 0 !important; padding: 0 !important;
        }
        .login-footer-text { text-align: center; margin-top: 18px; font-size: 0.88rem; color: #aaaaaa; }
        .login-footer-text a { color: #00ADB5; text-decoration: none; }
        .login-footer-text a:hover { text-decoration: underline; }
    """,
    )

    st.markdown("<div style='height:100px;'></div>", unsafe_allow_html=True)

    _, card_col, _ = st.columns([1, 1, 1])
    with card_col:
        st.markdown(
            '<div style="text-align:center; font-size:2.2rem; font-weight:bold; color:#00ADB5; margin-bottom:28px;">'
            'P<span style="color:#EEEEEE;">17</span></div>',
            unsafe_allow_html=True,
        )

        auth_error = navigation.get_query_auth_error()
        if auth_error:
            if auth_error == "auth_failed":
                auth_error = "인증 확인에 실패했습니다. 다시 로그인해 주세요."
            st.error(auth_error)

        if session.is_logged_in():
            st.markdown(
                f'<div style="color:#EEEEEE; font-size:1rem; margin-bottom:20px; text-align:center;">'
                f'현재 <b>{session.get_user_id()}</b> 계정으로 로그인되어 있습니다.</div>',
                unsafe_allow_html=True,
            )
            if st.button("로그아웃"):
                auth_service.logout()
            if st.button("메인으로 돌아가기"):
                navigation.go_home()
        else:
            st.markdown(
                '<div style="color:#aaaaaa; font-size:1rem; margin-bottom:24px; text-align:center;">'
                'GitHub 계정으로 로그인하여 취약점 분석을 시작하세요.</div>',
                unsafe_allow_html=True,
            )
            if st.button("GitHub 로그인"):
                auth_service.start_github_login()

        st.markdown(
            '<div class="login-footer-text">'
            'GitHub 로그인을 통해 JWT 인증 기반 소스코드 분석 기능을 이용할 수 있습니다.</div>',
            unsafe_allow_html=True,
        )
        st.caption(auth_service.AUTH_FLOW_NOTE)

    render_footer()
