import streamlit as st
import streamlit.components.v1 as components
from utils.ui import render_auth_header, render_footer


def render_login():
    render_auth_header(extra_css="""
        [data-testid="stTextInput"] label {
            display: none !important; height: 0 !important; margin: 0 !important; padding: 0 !important;
        }
        .login-footer-text { text-align: center; margin-top: 18px; font-size: 0.88rem; color: #aaaaaa; }
        .login-footer-text a { color: #00ADB5; text-decoration: none; }
        .login-footer-text a:hover { text-decoration: underline; }
    """)

    st.markdown("<div style='height:100px;'></div>", unsafe_allow_html=True)

    _, card_col, _ = st.columns([1, 1, 1])
    with card_col:
        st.markdown(
            '<div style="text-align:center; font-size:2.2rem; font-weight:bold; color:#00ADB5; margin-bottom:28px;">'
            'P<span style="color:#EEEEEE;">17</span></div>',
            unsafe_allow_html=True,
        )
        st.markdown(
            '<div style="color:#aaaaaa; font-size:1rem; margin-bottom:24px; text-align:center;">'
            'GitHub 계정으로 로그인하여 취약점 분석을 시작하세요.</div>',
            unsafe_allow_html=True,
        )

        if st.button("GitHub 로그인"):
            st.session_state["logged_in"] = True
            st.session_state["user_id"] = "GitHub 사용자"
            st.success("GitHub 로그인이 완료되었습니다.")
            components.html(
                "<script>window.parent.location.href='/';</script>",
                height=0,
            )

        st.markdown(
            '<div class="login-footer-text">'
            'GitHub 로그인을 통해 소스코드 분석 기능을 이용할 수 있습니다.</div>',
            unsafe_allow_html=True,
        )

    render_footer()
