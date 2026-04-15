import streamlit as st
from utils.ui import render_auth_header, render_footer

st.set_page_config(page_title="P17 - 로그인", layout="wide")

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
    st.markdown('<div style="text-align:center; font-size:2.2rem; font-weight:bold; color:#00ADB5; margin-bottom:28px;">P<span style="color:#EEEEEE;">17</span></div>', unsafe_allow_html=True)

    # TODO: 실제 인증 로직으로 교체
    user_id  = st.text_input("ID", placeholder="ID", label_visibility="collapsed")
    password = st.text_input("비밀번호", placeholder="비밀번호", type="password", label_visibility="collapsed")

    st.markdown("<div style='height:6px;'></div>", unsafe_allow_html=True)

    if st.button("로그인", use_container_width=True):
        if user_id and password:
            st.session_state["logged_in"] = True
            st.session_state["user_id"]   = user_id
            st.switch_page("main.py")
        else:
            st.error("아이디와 비밀번호를 입력해주세요.")

    st.markdown("""
<div class="login-footer-text">
    계정이 없으신가요? <a href="/signin" target="_self">가입하기</a>
</div>
""", unsafe_allow_html=True)

render_footer()
