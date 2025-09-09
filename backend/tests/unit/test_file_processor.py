import pytest
from unittest.mock import Mock, patch, AsyncMock
import json
import pandas as pd
from app.services.file_processor import FileProcessor, process_file_content
from app.repositories.chat import ChatRepository


class TestFileProcessor:
    """Test suite for file processor service"""

    @pytest.fixture
    def file_processor(self):
        """Create file processor instance"""
        return FileProcessor()

    @pytest.fixture
    def sample_csv_data(self):
        """Sample CSV data for testing"""
        return "name,age,city\nJohn,25,NYC\nJane,30,LA\nBob,35,Chicago"

    @pytest.fixture
    def sample_json_data(self):
        """Sample JSON data for testing"""
        return {
            "users": [
                {"name": "John", "age": 25, "city": "NYC"},
                {"name": "Jane", "age": 30, "city": "LA"}
            ],
            "total": 2
        }

    def test_process_csv_success(self, file_processor, sample_csv_data):
        """Test successful CSV processing"""
        result = file_processor.process_csv(sample_csv_data.encode())
        
        assert result["status"] == "success"
        assert "data" in result
        assert len(result["data"]) == 3
        assert result["data"][0]["name"] == "John"
        assert result["data"][0]["age"] == "25"
        assert result["summary"]["total_rows"] == 3
        assert result["summary"]["columns"] == ["name", "age", "city"]

    def test_process_csv_empty_data(self, file_processor):
        """Test CSV processing with empty data"""
        result = file_processor.process_csv(b"")
        
        assert result["status"] == "error"
        assert "empty" in result["error"].lower()

    def test_process_csv_invalid_format(self, file_processor):
        """Test CSV processing with invalid format"""
        invalid_csv = b"invalid,csv,data\nwith,mismatched\ncolumns"
        result = file_processor.process_csv(invalid_csv)
        
        assert result["status"] == "error"
        assert "error" in result

    def test_process_json_success(self, file_processor, sample_json_data):
        """Test successful JSON processing"""
        json_bytes = json.dumps(sample_json_data).encode()
        result = file_processor.process_json(json_bytes)
        
        assert result["status"] == "success"
        assert result["data"] == sample_json_data
        assert "summary" in result
        assert result["summary"]["type"] == "object"

    def test_process_json_array(self, file_processor):
        """Test JSON processing with array data"""
        json_array = [{"id": 1, "name": "Test"}, {"id": 2, "name": "Test2"}]
        json_bytes = json.dumps(json_array).encode()
        result = file_processor.process_json(json_bytes)
        
        assert result["status"] == "success"
        assert result["data"] == json_array
        assert result["summary"]["type"] == "array"
        assert result["summary"]["length"] == 2

    def test_process_json_invalid_format(self, file_processor):
        """Test JSON processing with invalid format"""
        invalid_json = b'{"invalid": json, format}'
        result = file_processor.process_json(invalid_json)
        
        assert result["status"] == "error"
        assert "json" in result["error"].lower()

    def test_process_json_empty_data(self, file_processor):
        """Test JSON processing with empty data"""
        result = file_processor.process_json(b"")
        
        assert result["status"] == "error"
        assert "empty" in result["error"].lower()

    def test_analyze_data_structure_dict(self, file_processor):
        """Test data structure analysis for dictionary"""
        data = {"users": [1, 2, 3], "total": 3, "active": True}
        result = file_processor.analyze_data_structure(data)
        
        assert result["type"] == "object"
        assert result["keys"] == ["users", "total", "active"]
        assert result["size"] == 3

    def test_analyze_data_structure_list(self, file_processor):
        """Test data structure analysis for list"""
        data = [{"id": 1}, {"id": 2}, {"id": 3}]
        result = file_processor.analyze_data_structure(data)
        
        assert result["type"] == "array"
        assert result["length"] == 3
        assert result["sample_item"] == {"id": 1}

    def test_analyze_data_structure_primitive(self, file_processor):
        """Test data structure analysis for primitive types"""
        # Test string
        result = file_processor.analyze_data_structure("test string")
        assert result["type"] == "string"
        assert result["value"] == "test string"
        
        # Test number
        result = file_processor.analyze_data_structure(42)
        assert result["type"] == "number"
        assert result["value"] == 42
        
        # Test boolean
        result = file_processor.analyze_data_structure(True)
        assert result["type"] == "boolean"
        assert result["value"] is True

    def test_generate_insights_csv_data(self, file_processor):
        """Test insight generation for CSV data"""
        data = [
            {"name": "John", "age": "25", "salary": "50000"},
            {"name": "Jane", "age": "30", "salary": "60000"},
            {"name": "Bob", "age": "35", "salary": "70000"}
        ]
        insights = file_processor.generate_insights(data)
        
        assert len(insights) > 0
        assert any("3 records" in insight for insight in insights)
        assert any("columns" in insight for insight in insights)

    def test_generate_insights_numerical_data(self, file_processor):
        """Test insight generation for numerical data"""
        data = [
            {"revenue": 100000, "costs": 80000},
            {"revenue": 120000, "costs": 90000},
            {"revenue": 110000, "costs": 85000}
        ]
        insights = file_processor.generate_insights(data)
        
        assert len(insights) > 0
        assert any("numerical" in insight.lower() for insight in insights)

    def test_extract_numerical_columns(self, file_processor):
        """Test extraction of numerical columns"""
        data = [
            {"name": "John", "age": "25", "salary": "50000", "active": "true"},
            {"name": "Jane", "age": "30", "salary": "60000", "active": "false"}
        ]
        numerical_cols = file_processor.extract_numerical_columns(data)
        
        assert "age" in numerical_cols
        assert "salary" in numerical_cols
        assert "name" not in numerical_cols
        assert "active" not in numerical_cols

    def test_extract_numerical_columns_empty_data(self, file_processor):
        """Test numerical column extraction with empty data"""
        numerical_cols = file_processor.extract_numerical_columns([])
        assert numerical_cols == []

    def test_is_numerical_string(self, file_processor):
        """Test numerical string detection"""
        assert file_processor.is_numerical_string("123") is True
        assert file_processor.is_numerical_string("123.45") is True
        assert file_processor.is_numerical_string("-123.45") is True
        assert file_processor.is_numerical_string("123,456") is True
        assert file_processor.is_numerical_string("abc") is False
        assert file_processor.is_numerical_string("123abc") is False
        assert file_processor.is_numerical_string("") is False


@pytest.mark.asyncio
class TestProcessFileContent:
    """Test suite for process_file_content function"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock()

    @pytest.fixture
    def mock_chat_repo(self):
        """Mock chat repository"""
        with patch('app.services.file_processor.ChatRepository') as mock_repo_class:
            mock_repo = Mock()
            mock_repo_class.return_value = mock_repo
            yield mock_repo

    async def test_process_file_content_list_data(self, mock_db, mock_chat_repo):
        """Test processing file content with list data"""
        data = [{"id": 1, "name": "Test"}, {"id": 2, "name": "Test2"}]
        user_id = 1
        
        # Mock chat creation
        mock_chat = Mock()
        mock_chat.id = "test-chat-id"
        mock_chat_repo.create_chat.return_value = mock_chat
        
        result = await process_file_content(data, user_id, mock_db)
        
        assert result == "test-chat-id"
        mock_chat_repo.create_chat.assert_called_once()
        assert mock_chat_repo.add_message.call_count == 2  # System + user message

    async def test_process_file_content_dict_data(self, mock_db, mock_chat_repo):
        """Test processing file content with dictionary data"""
        data = {"users": [{"id": 1}], "total": 1}
        user_id = 1
        
        # Mock chat creation
        mock_chat = Mock()
        mock_chat.id = "test-chat-id"
        mock_chat_repo.create_chat.return_value = mock_chat
        
        result = await process_file_content(data, user_id, mock_db)
        
        assert result == "test-chat-id"
        mock_chat_repo.create_chat.assert_called_once_with(
            user_id=user_id,
            name="File Upload Analysis",
            industry="Data Analysis"
        )

    async def test_process_file_content_chat_creation_failure(self, mock_db, mock_chat_repo):
        """Test handling of chat creation failure"""
        data = [{"test": "data"}]
        user_id = 1
        
        # Mock chat creation failure
        mock_chat_repo.create_chat.return_value = None
        
        with pytest.raises(Exception, match="Failed to create chat"):
            await process_file_content(data, user_id, mock_db)

    async def test_process_file_content_exception_handling(self, mock_db):
        """Test exception handling in process_file_content"""
        data = [{"test": "data"}]
        user_id = 1
        
        # Mock ChatRepository to raise exception
        with patch('app.services.file_processor.ChatRepository', side_effect=Exception("Database error")):
            with pytest.raises(Exception):
                await process_file_content(data, user_id, mock_db)

    async def test_process_file_content_message_creation(self, mock_db, mock_chat_repo):
        """Test that appropriate messages are created"""
        data = [{"id": 1}, {"id": 2}, {"id": 3}]
        user_id = 1
        
        # Mock chat creation
        mock_chat = Mock()
        mock_chat.id = "test-chat-id"
        mock_chat_repo.create_chat.return_value = mock_chat
        
        await process_file_content(data, user_id, mock_db)
        
        # Verify messages were added
        assert mock_chat_repo.add_message.call_count == 2
        
        # Check system message
        system_call = mock_chat_repo.add_message.call_args_list[0]
        assert system_call[1]["role"] == "system"
        assert "File upload processed" in system_call[1]["content"]
        
        # Check user message
        user_call = mock_chat_repo.add_message.call_args_list[1]
        assert user_call[1]["role"] == "user"
        assert "uploaded a file" in user_call[1]["content"]

    async def test_process_file_content_large_dataset_preview(self, mock_db, mock_chat_repo):
        """Test that large datasets are properly previewed"""
        # Create data with more than 5 items
        data = [{"id": i} for i in range(10)]
        user_id = 1
        
        # Mock chat creation
        mock_chat = Mock()
        mock_chat.id = "test-chat-id"
        mock_chat_repo.create_chat.return_value = mock_chat
        
        await process_file_content(data, user_id, mock_db)
        
        # Check that only first 5 items are in the preview
        user_call = mock_chat_repo.add_message.call_args_list[1]
        user_message_content = user_call[1]["content"]
        
        # Should contain first 5 items but not all 10
        assert '{"id": 0}' in user_message_content
        assert '{"id": 4}' in user_message_content
        assert '{"id": 9}' not in user_message_content