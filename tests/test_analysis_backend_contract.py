import unittest
from unittest.mock import patch

from services import analysis_service, api_client


class AnalysisBackendContractTests(unittest.TestCase):
    def test_repository_analysis_uses_async_job_endpoint(self):
        with patch.object(api_client, "_request", return_value={"job_id": "job-1", "status": "queued"}) as request:
            result = api_client.create_repository_analysis_job("https://github.com/owner/repo")

        self.assertEqual(result, {"job_id": "job-1", "status": "queued"})
        request.assert_called_once_with(
            "POST",
            "/analyze/repository/jobs",
            json_body={"url": "https://github.com/owner/repo"},
        )

    def test_repository_job_polling_endpoint_matches_backend(self):
        with patch.object(api_client, "_request", return_value={"status": "running"}) as request:
            api_client.get_analysis_job("job-1")

        request.assert_called_once_with("GET", "/analyze/jobs/job-1")

    def test_analysis_result_endpoint_matches_backend(self):
        with patch.object(api_client, "_request", return_value={"analysis_id": "analysis-1"}) as request:
            api_client.get_result("analysis-1")

        request.assert_called_once_with("GET", "/result/analysis-1")

    def test_file_result_endpoint_is_available_for_file_detail_pages(self):
        with patch.object(api_client, "_request", return_value={"file_id": "file-1"}) as request:
            api_client.get_file_result("analysis-1", "file-1")

        request.assert_called_once_with("GET", "/result/analysis-1/files/file-1")

    def test_detail_view_model_exposes_backend_result_fields(self):
        vm = analysis_service.build_analysis_detail_view_model(
            {
                "analysis_id": "analysis-1",
                "analysis_result": {
                    "repository": "https://github.com/owner/repo",
                    "files_analyzed": 7,
                    "summary": {"total_vulnerabilities": 1, "by_type": {"SQL_INJECTION": 1}},
                    "vulnerabilities": [
                        {
                            "id": "v-1",
                            "type": "SQL_INJECTION",
                            "severity": "HIGH",
                            "file": "src/App.java",
                            "line": 42,
                            "description": "desc",
                            "recommendation": "fix",
                            "code_snippet": "query",
                        }
                    ],
                    "call_graph": {
                        "nodes": [{"id": "controller"}, {"id": "service"}],
                        "edges": [{"source": "controller", "target": "service"}],
                    },
                },
            }
        )

        self.assertEqual(vm["analysis_id"], "analysis-1")
        self.assertEqual(vm["files_analyzed"], 7)
        self.assertEqual(vm["total_vulnerabilities"], 1)
        self.assertEqual(vm["vuln_details"][0]["file"], "src/App.java")
        self.assertEqual(vm["call_graph"]["node_count"], 2)
        self.assertEqual(vm["call_graph"]["edge_count"], 1)
        self.assertEqual(vm["call_graph"]["preview"], ["controller → service"])


if __name__ == "__main__":
    unittest.main()
