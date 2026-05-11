# Legacy Streamlit pages

Active routing for this frontend is handled by `main.py` using query parameters and the modules under `app_pages/`:

- `app_pages/login.py`
- `app_pages/loading.py`
- `app_pages/dashboard.py`
- `app_pages/analysis.py`

This `pages/` directory contains legacy Streamlit multipage prototypes only, including the typo file `pages/dashborad.py`. Do not add new frontend work here unless you are intentionally preserving or comparing old prototypes.

New application behavior should be implemented in `main.py`, `app_pages/`, `services/`, `state/`, or shared helpers under `utils/`.
