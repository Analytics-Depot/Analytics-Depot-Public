import pytest
from unittest.mock import Mock, patch, mock_open
from fastapi.testclient import TestClient
from fastapi import UploadFile
import json
import io
from backend.app.main import app


class TestFilesRouter:
    """Test suite for files router endpoints"""

    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)

    @pytest.fixture
    def sample_csv_content(self):
        """Sample CSV file content"""
        return b"name,age,salary\nJohn,25,50000\nJane,30,60000"

    @pytest.fixture
    def sample_json_content(self):
        """Sample JSON file content"""
        return json.dumps({
            "users": [
                {"id": 1, "name": "John"},
                {"id": 2, "name": "Jane"}
            ]
        }).encode()

    def test_upload_csv_file_success(self, client, auth_headers, sample_csv_content):
        """Test successful CSV file upload"""
        with patch('backend.app.routers.files.FileAnalyzer') as mock_analyzer:
            # Mock analyzer response
            mock_analyzer_instance = Mock()
            mock_analyzer.return_value = mock_analyzer_instance
            mock_analyzer_instance.analyze_file.return_value = {
                "status": "success",
                "preview": {"data": [{"name": "John", "age": "25"}]},
                "statistical": {"rows": 2, "columns": 3},
                "insights": ["2 records found"]
            }

            files = {"file": ("test.csv", sample_csv_content, "text/csv")}
            response = client.post(
                "/api/files/upload",
                files=files,
                headers=auth_headers
            )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["filename"] == "test.csv"
            assert "chat_id" in data

    def test_upload_json_file_success(self, client, auth_headers, sample_json_content):
        """Test successful JSON file upload"""
        with patch('backend.app.routers.files.FileAnalyzer') as mock_analyzer:
            # Mock analyzer response
            mock_analyzer_instance = Mock()
            mock_analyzer.return_value = mock_analyzer_instance
            mock_analyzer_instance.analyze_file.return_value = {
                "status": "success",
                "preview": {"users": [{"id": 1, "name": "John"}]},
                "statistical": {"type": "object", "keys": 1},
                "insights": ["JSON object with users array"]
            }

            files = {"file": ("test.json", sample_json_content, "application/json")}
            response = client.post(
                "/api/files/upload",
                files=files,
                headers=auth_headers
            )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["filename"] == "test.json"

    def test_upload_file_too_large(self, client, auth_headers):
        """Test file upload with file too large"""
        # Create large file content (> 10MB)
        large_content = b"x" * (11 * 1024 * 1024)
        files = {"file": ("large.csv", large_content, "text/csv")}

        response = client.post(
            "/api/files/upload",
            files=files,
            headers=auth_headers
        )

        assert response.status_code == 413
        assert "exceeds maximum allowed size" in response.json()["detail"]

    def test_upload_unsupported_file_type(self, client, auth_headers):
        """Test upload of unsupported file type"""
        files = {"file": ("test.txt", b"some text", "text/plain")}

        response = client.post(
            "/api/files/upload",
            files=files,
            headers=auth_headers
        )

        assert response.status_code == 415
        assert "Unsupported file type" in response.json()["detail"]

    def test_upload_file_unauthenticated(self, client, sample_csv_content):
        """Test file upload without authentication"""
        files = {"file": ("test.csv", sample_csv_content, "text/csv")}

        response = client.post("/api/files/upload", files=files)

        assert response.status_code == 401

    def test_upload_file_with_existing_chat(self, client, auth_headers, sample_csv_content):
        """Test file upload with existing chat ID"""
        with patch('backend.app.routers.files.FileAnalyzer') as mock_analyzer, \
             patch('backend.app.routers.files.ChatRepository') as mock_chat_repo:

            # Mock analyzer
            mock_analyzer_instance = Mock()
            mock_analyzer.return_value = mock_analyzer_instance
            mock_analyzer_instance.analyze_file.return_value = {
                "status": "success",
                "preview": {},
                "statistical": {},
                "insights": []
            }

            # Mock chat repository
            mock_repo_instance = Mock()
            mock_chat_repo.return_value = mock_repo_instance
            mock_chat = Mock()
            mock_chat.id = "existing-chat-id"
            mock_repo_instance.get_chat_by_id.return_value = mock_chat

            files = {"file": ("test.csv", sample_csv_content, "text/csv")}
            response = client.post(
                "/api/files/upload?chat_id=existing-chat-id",
                files=files,
                headers=auth_headers
            )

            assert response.status_code == 200
            data = response.json()
            assert data["chat_id"] == "existing-chat-id"

    def test_upload_file_analysis_error(self, client, auth_headers, sample_csv_content):
        """Test file upload with analysis error"""
        with patch('backend.app.routers.files.FileAnalyzer') as mock_analyzer:
            # Mock analyzer to return error
            mock_analyzer_instance = Mock()
            mock_analyzer.return_value = mock_analyzer_instance
            mock_analyzer_instance.analyze_file.return_value = {
                "status": "error",
                "error": "Analysis failed"
            }

            files = {"file": ("test.csv", sample_csv_content, "text/csv")}
            response = client.post(
                "/api/files/upload",
                files=files,
                headers=auth_headers
            )

            assert response.status_code == 422
            assert "Analysis failed" in response.json()["detail"]

    def test_upload_file_processing_exception(self, client, auth_headers, sample_csv_content):
        """Test file upload with processing exception"""
        with patch('backend.app.routers.files.FileAnalyzer', side_effect=Exception("Processing error")):
            files = {"file": ("test.csv", sample_csv_content, "text/csv")}
            response = client.post(
                "/api/files/upload",
                files=files,
                headers=auth_headers
            )

            assert response.status_code == 500
            assert "unexpected error occurred" in response.json()["detail"]

    def test_upload_empty_file(self, client, auth_headers):
        """Test upload of empty file"""
        files = {"file": ("empty.csv", b"", "text/csv")}

        response = client.post(
            "/api/files/upload",
            files=files,
            headers=auth_headers
        )

        # Should handle empty file gracefully
        assert response.status_code in [400, 422, 500]

    def test_upload_file_invalid_chat_id(self, client, auth_headers, sample_csv_content):
        """Test file upload with invalid chat ID format"""
        with patch('backend.app.routers.files.FileAnalyzer') as mock_analyzer:
            mock_analyzer_instance = Mock()
            mock_analyzer.return_value = mock_analyzer_instance
            mock_analyzer_instance.analyze_file.return_value = {
                "status": "success",
                "preview": {},
                "statistical": {},
                "insights": []
            }

            files = {"file": ("test.csv", sample_csv_content, "text/csv")}
            response = client.post(
                "/api/files/upload?chat_id=invalid-uuid",
                files=files,
                headers=auth_headers
            )

            # Should still succeed by creating new chat
            assert response.status_code == 200

    def test_upload_file_chat_not_owned(self, client, auth_headers, sample_csv_content):
        """Test file upload with chat not owned by user"""
        with patch('backend.app.routers.files.FileAnalyzer') as mock_analyzer, \
             patch('backend.app.routers.files.ChatRepository') as mock_chat_repo:

            # Mock analyzer
            mock_analyzer_instance = Mock()
            mock_analyzer.return_value = mock_analyzer_instance
            mock_analyzer_instance.analyze_file.return_value = {
                "status": "success",
                "preview": {},
                "statistical": {},
                "insights": []
            }

            # Mock chat repository to return None (chat not found/not owned)
            mock_repo_instance = Mock()
            mock_chat_repo.return_value = mock_repo_instance
            mock_repo_instance.get_chat_by_id.return_value = None

            files = {"file": ("test.csv", sample_csv_content, "text/csv")}
            response = client.post(
                "/api/files/upload?chat_id=not-owned-chat-id",
                files=files,
                headers=auth_headers
            )

            # Should create new chat instead
            assert response.status_code == 200

    @pytest.mark.parametrize("file_extension,content_type", [
        ("csv", "text/csv"),
        ("json", "application/json"),
        ("CSV", "text/csv"),  # Test case insensitive
        ("JSON", "application/json")
    ])
    def test_upload_file_supported_types(self, client, auth_headers, file_extension, content_type):
        """Test upload of different supported file types"""
        with patch('backend.app.routers.files.FileAnalyzer') as mock_analyzer:
            mock_analyzer_instance = Mock()
            mock_analyzer.return_value = mock_analyzer_instance
            mock_analyzer_instance.analyze_file.return_value = {
                "status": "success",
                "preview": {},
                "statistical": {},
                "insights": []
            }

            content = b"test content"
            files = {"file": (f"test.{file_extension}", content, content_type)}
            response = client.post(
                "/api/files/upload",
                files=files,
                headers=auth_headers
            )

            assert response.status_code == 200

    def test_upload_file_content_extraction_csv(self, client, auth_headers):
        """Test CSV content extraction during upload"""
        csv_content = b"name,value\ntest,123\ntest2,456"

        with patch('backend.app.routers.files.FileAnalyzer') as mock_analyzer, \
             patch('pandas.read_csv') as mock_read_csv:

            # Mock pandas to return specific DataFrame
            mock_df = Mock()
            mock_df.to_dict.return_value = [
                {"name": "test", "value": 123},
                {"name": "test2", "value": 456}
            ]
            mock_read_csv.return_value = mock_df

            mock_analyzer_instance = Mock()
            mock_analyzer.return_value = mock_analyzer_instance
            mock_analyzer_instance.analyze_file.return_value = {
                "status": "success",
                "preview": {},
                "statistical": {},
                "insights": []
            }

            files = {"file": ("test.csv", csv_content, "text/csv")}
            response = client.post(
                "/api/files/upload",
                files=files,
                headers=auth_headers
            )

            assert response.status_code == 200
            # Verify pandas was called
            mock_read_csv.assert_called_once()

    def test_upload_file_content_extraction_json(self, client, auth_headers):
        """Test JSON content extraction during upload"""
        json_data = {"test": "data", "numbers": [1, 2, 3]}
        json_content = json.dumps(json_data).encode()

        with patch('backend.app.routers.files.FileAnalyzer') as mock_analyzer:
            mock_analyzer_instance = Mock()
            mock_analyzer.return_value = mock_analyzer_instance
            mock_analyzer_instance.analyze_file.return_value = {
                "status": "success",
                "preview": {},
                "statistical": {},
                "insights": []
            }

            files = {"file": ("test.json", json_content, "application/json")}
            response = client.post(
                "/api/files/upload",
                files=files,
                headers=auth_headers
            )

            assert response.status_code == 200
            data = response.json()
            assert data["content"] == json_data