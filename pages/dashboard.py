import streamlit as st
from datetime import datetime
from utils.ui import render_header, render_footer, render_sidebar

st.set_page_config(page_title="P17 - 대시보드", layout="wide")

repo_url = st.query_params.get("repo") or st.session_state.get("repo_url", "github.com/example/web-app")

# TODO: 백엔드 분석 결과로 교체
scan_date      = datetime.now().strftime("%y/%m/%d %H:%M")
total_vuln     = 46
total_files    = 126
affected_files = 15
danger         = 24
warning        = 16
normal         = 6
security_score = 51

vuln_types = [
    {"name": "SQL Injection",              "count": 28},
    {"name": "XSS (Cross-Site Scripting)", "count": 13},
    {"name": "Hardcoded Password",         "count": 5},
]

file_list = [
    {"file": "src/auth/login_service.py",         "vuln": 97, "lines": 142,  "level": "위험"},
    {"file": "api/database/query_builder.js",      "vuln": 88, "lines": 2614, "level": "위험"},
    {"file": "src/controllers/user_controller.py", "vuln": 74, "lines": 310,  "level": "위험"},
    {"file": "api/routes/admin.js",                "vuln": 61, "lines": 198,  "level": "위험"},
    {"file": "src/auth/token_validator.py",        "vuln": 55, "lines": 167,  "level": "위험"},
    {"file": "app/utils/crypto_helper.py",         "vuln": 45, "lines": 88,   "level": "경고"},
    {"file": "src/middleware/session.py",           "vuln": 38, "lines": 156,  "level": "경고"},
    {"file": "api/services/email_sender.js",       "vuln": 32, "lines": 204,  "level": "경고"},
    {"file": "app/models/user_model.py",           "vuln": 27, "lines": 273,  "level": "경고"},
    {"file": "src/config/db_config.py",            "vuln": 21, "lines": 63,   "level": "경고"},
    {"file": "public/js/client_logger.js",         "vuln": 15, "lines": 320,  "level": "보통"},
    {"file": "src/utils/formatter.py",             "vuln": 9,  "lines": 95,   "level": "보통"},
    {"file": "public/js/ui_helper.js",             "vuln": 6,  "lines": 412,  "level": "보통"},
    {"file": "app/views/dashboard_view.py",        "vuln": 4,  "lines": 231,  "level": "보통"},
    {"file": "src/utils/logger.py",                "vuln": 2,  "lines": 78,   "level": "보통"},
]

logged_in = st.session_state.get("logged_in", False)
user_id   = st.session_state.get("user_id", "사용자")

render_header(logged_in, user_id, hamburger=True, extra_css="""
    .stApp { background: #222831; color: #EEEEEE; }
    .footer { margin-top: 60px; }
    .score-box {
        background-color: rgba(57,62,70,0.7); border-radius: 10px;
        padding: 30px; text-align: center; box-sizing: border-box;
    }
    .vuln-summary {
        background-color: rgba(57,62,70,0.7); border-radius: 10px;
        padding: 20px; box-sizing: border-box;
    }
    .file-table {
        background-color: rgba(57,62,70,0.7); border-radius: 10px;
        padding: 20px; margin-top: 12px; box-sizing: border-box;
    }
    .file-row {
        display: flex; justify-content: space-between; align-items: center;
        padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 0.9rem;
    }
    .stButton > button {
        background-color: #393E46 !important; color: #EEEEEE !important;
        border: none !important; border-radius: 8px !important;
        padding: 12px 60px !important; font-size: 1rem !important;
        white-space: nowrap !important; width: 100% !important;
    }
""")

render_sidebar(repo_url, user_id, active="dashboard")


def score_color(score):
    if score < 40:    return "#FF4545"
    elif score < 70:  return "#FFD415"
    else:             return "#4BD33F"


def vuln_count_color(count):
    if count >= 70:   return "#FF4545"
    elif count >= 30: return "#FFD415"
    else:             return "#4BD33F"


vuln_types_html = "".join(
    f'<span style="color:#EEEEEE; font-size:1rem; font-weight:600;">'
    f'{v["name"]} <span style="color:#FF4545;">{v["count"]}</span></span>'
    for v in vuln_types
)

file_rows_html = "".join(
    f'<div class="file-row">'
    f'<span style="flex:3; color:#EEEEEE;">📄 {f["file"]}</span>'
    f'<span style="flex:1; text-align:center; color:{vuln_count_color(f["vuln"])};">{f["vuln"]}</span>'
    f'<span style="flex:1; text-align:center;">{f["lines"]:,}</span>'
    f'<span style="flex:1; text-align:center;"><span class="level-badge level-{f["level"]}">{f["level"]}</span></span>'
    f'</div>'
    for f in file_list
)

st.markdown("<div style='height:80px;'></div>", unsafe_allow_html=True)

_, main_col, _ = st.columns([1, 6, 1])
with main_col:
    st.markdown(f"""
<div style="text-align:center; font-size:1.5rem; font-weight:bold; color:#EEEEEE; margin-bottom:20px;">
    <span style="color:#00ADB5;">{repo_url}</span>의<br>보안 취약점 분석이 완료되었습니다!
</div>
""", unsafe_allow_html=True)

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(f'<div class="stat-box"><div class="stat-label">검사 시간</div><div class="stat-value" style="font-size:1.3rem;">{scan_date}</div></div>', unsafe_allow_html=True)
    with c2:
        st.markdown(f'<div class="stat-box"><div class="stat-label">발견된 취약점</div><div class="stat-value danger">{total_vuln}</div></div>', unsafe_allow_html=True)
    with c3:
        st.markdown(f'<div class="stat-box"><div class="stat-label">분석된 파일</div><div class="stat-value">{total_files}</div></div>', unsafe_allow_html=True)
    with c4:
        st.markdown(f'<div class="stat-box"><div class="stat-label">영향 파일</div><div class="stat-value accent">{affected_files}</div></div>', unsafe_allow_html=True)

    st.markdown("<div style='height:12px;'></div>", unsafe_allow_html=True)

    st.markdown(f"""
<div style="display:flex; gap:16px; align-items:stretch;">
    <div class="score-box" style="flex:1;">
        <div style="font-size:2rem; margin-bottom:10px;">😐</div>
        <div style="font-size:3rem; font-weight:bold; color:{score_color(security_score)};">
            {security_score}<span style="font-size:1rem; color:#aaa;">/100</span>
        </div>
        <div style="color:#aaaaaa; margin-top:5px;">보안점수</div>
    </div>
    <div class="vuln-summary" style="flex:2;">
        <div style="margin-bottom:20px; font-size:1rem; font-weight:600; color:#EEEEEE;">총 취약점 {total_vuln}건</div>
        <div style="display:flex; gap:30px; margin-bottom:28px;">
            <span style="color:#FF4545; font-size:1rem; font-weight:600;">위험 {danger}</span>
            <span style="color:#FFD415; font-size:1rem; font-weight:600;">경고 {warning}</span>
            <span style="color:#4BD33F; font-size:1rem; font-weight:600;">보통 {normal}</span>
        </div>
        <div style="margin-bottom:16px; color:#EEEEEE; font-size:1rem; font-weight:600;">취약점 유형별 건수</div>
        <div style="display:flex; flex-wrap:wrap; gap:24px;">{vuln_types_html}</div>
    </div>
</div>
""", unsafe_allow_html=True)

    st.markdown(f"""
<div class="file-table">
    <div style="margin-bottom:15px; font-weight:bold;">상세 취약점 리스트</div>
    <div class="file-row" style="color:#aaaaaa; font-size:0.8rem;">
        <span style="flex:3">파일명</span>
        <span style="flex:1; text-align:center;">취약점 건수</span>
        <span style="flex:1; text-align:center;">라인 수</span>
        <span style="flex:1; text-align:center;">위험도</span>
    </div>
    <div style="max-height:180px; overflow-y:scroll; scrollbar-width:thin; scrollbar-color:#00ADB5 #393E46;">
        {file_rows_html}
    </div>
</div>
""", unsafe_allow_html=True)

    st.markdown("<div style='height:20px;'></div>", unsafe_allow_html=True)
    _, btn_col, _ = st.columns([1, 2, 1])
    with btn_col:
        if st.button("상세 분석결과 확인하기", use_container_width=True):
            st.switch_page("pages/analysis.py")

render_footer()
