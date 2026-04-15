import streamlit as st

# 파일명 오타 (dashborad → dashboard) 수정됨. 기존 URL(/dashborad) 호환용 리다이렉트.
st.switch_page("pages/dashboard.py")
