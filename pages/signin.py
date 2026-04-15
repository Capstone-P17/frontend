import re
import streamlit as st
import streamlit.components.v1 as components
from utils.ui import render_auth_header, render_footer

st.set_page_config(page_title="P17 - 회원가입", layout="wide")

render_auth_header(extra_css="""
    [data-testid="stTextInput"] label { color: #aaaaaa !important; font-size: 0.85rem !important; padding-bottom: 4px !important; }
    .stTextInput > div > div > input { height: 44px !important; }
    .stButton > button { margin-top: 8px !important; }
    .signup-footer-text { text-align: center; margin-top: 18px; font-size: 0.88rem; color: #aaaaaa; }
    .signup-footer-text a { color: #00ADB5; text-decoration: none; }
    .signup-footer-text a:hover { text-decoration: underline; }
""")

if "email_err" not in st.session_state:
    st.session_state["email_err"] = False
if "pw_err" not in st.session_state:
    st.session_state["pw_err"] = False


def field_label(text, err_msg, show_err):
    err = f' <span style="color:#FF4545; font-size:0.78rem;">{err_msg}</span>' if show_err else ""
    return f'<div style="color:#aaaaaa; font-size:0.85rem; margin-bottom:4px;">{text}{err}</div>'


st.markdown("<div style='height:100px;'></div>", unsafe_allow_html=True)

_, card_col, _ = st.columns([1, 1, 1])
with card_col:
    st.markdown('<div style="text-align:center; font-size:2.2rem; font-weight:bold; color:#00ADB5; margin-bottom:28px;">P<span style="color:#EEEEEE;">17</span></div>', unsafe_allow_html=True)

    # TODO: 실제 회원가입 로직으로 교체
    st.markdown('<div style="color:#aaaaaa; font-size:0.85rem; margin-bottom:4px;">ID</div>', unsafe_allow_html=True)
    name = st.text_input("ID", label_visibility="collapsed")

    st.markdown(field_label("이메일", "이메일을 입력해 주세요", st.session_state["email_err"]), unsafe_allow_html=True)
    email = st.text_input("이메일", label_visibility="collapsed")

    st.markdown('<div style="color:#aaaaaa; font-size:0.85rem; margin-bottom:4px;">비밀번호</div>', unsafe_allow_html=True)
    password = st.text_input("비밀번호", type="password", label_visibility="collapsed")

    st.markdown(field_label("비밀번호 확인", "비밀번호가 일치하지 않습니다", st.session_state["pw_err"]), unsafe_allow_html=True)
    password_confirm = st.text_input("비밀번호 확인", type="password", label_visibility="collapsed")

    st.markdown('<div style="color:#aaaaaa; font-size:0.85rem; margin-bottom:4px;">전화번호</div>', unsafe_allow_html=True)
    phone = st.text_input("전화번호", label_visibility="collapsed")

    st.markdown("<div style='height:4px;'></div>", unsafe_allow_html=True)

    if st.button("회원가입", use_container_width=True):
        email_invalid = not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email)
        pw_mismatch   = password != password_confirm

        st.session_state["email_err"] = email_invalid
        st.session_state["pw_err"]    = pw_mismatch

        if not email_invalid and not pw_mismatch and all([name, email, password, phone]):
            st.success("회원가입이 완료되었습니다.")
            components.html("<script>window.parent.history.back();</script>", height=0)
        else:
            st.rerun()

    st.markdown("""
<div class="signup-footer-text">
    이미 계정이 있으신가요? <a href="/login" target="_self">로그인</a>
</div>
""", unsafe_allow_html=True)

render_footer()
