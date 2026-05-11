import unittest
from unittest.mock import patch

from services import api_client, auth_service
from state import navigation


class CookieAuthFlowTests(unittest.TestCase):
    def test_github_login_starts_at_backend_endpoint(self):
        with patch.object(api_client, "BACKEND_BASE_URL", "http://localhost:8000"):
            self.assertEqual(auth_service.get_login_url(), "http://localhost:8000/auth/github")

    def test_logout_posts_to_backend_with_credentials(self):
        with patch.object(api_client, "BACKEND_BASE_URL", "http://localhost:8000"):
            self.assertEqual(auth_service.get_logout_url(), "http://localhost:8000/auth/logout")

        script = auth_service._logout_script("http://localhost:8000/auth/logout")

        self.assertIn("http://localhost:8000/auth/logout", script)
        self.assertIn("window.parent.fetch", script)
        self.assertIn('method: "POST"', script)
        self.assertIn('credentials: "include"', script)

    def test_authenticated_headers_forward_browser_cookie_without_bearer_token(self):
        with patch("services.api_client.get_browser_cookie_header", return_value="access_token=jwt; other=value"):
            headers = api_client.build_headers(include_auth=True)

        self.assertEqual(headers["Cookie"], "access_token=jwt; other=value")
        self.assertNotIn("Authorization", headers)

    def test_public_headers_do_not_forward_cookie(self):
        with patch("services.api_client.get_browser_cookie_header", return_value="access_token=jwt"):
            headers = api_client.build_headers(include_auth=False)

        self.assertNotIn("Cookie", headers)
        self.assertNotIn("Authorization", headers)

    def test_auth_callback_route_accepts_path_callback(self):
        with patch("state.navigation.get_current_path", return_value="/auth/callback"), patch(
            "state.navigation.get_page_key", return_value=None
        ):
            self.assertTrue(navigation.is_auth_callback_route())

    def test_login_path_maps_to_login_page(self):
        with patch("state.navigation.get_query_param", return_value=None), patch(
            "state.navigation.get_current_path", return_value="/login"
        ):
            self.assertEqual(navigation.get_page_key(), navigation.LOGIN_PAGE)


if __name__ == "__main__":
    unittest.main()
