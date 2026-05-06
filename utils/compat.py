import streamlit as st


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
