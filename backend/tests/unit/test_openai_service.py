import pytest
from unittest.mock import Mock, patch, MagicMock
from app.services.openai_service import OpenAIService


class TestOpenAIService:
    """Test suite for OpenAI service"""

    @pytest.fixture
    def openai_service(self):
        """Create OpenAI service instance"""
        with patch('app.services.openai_service.settings') as mock_settings:
            mock_client = Mock()
            mock_settings.get_openai_client.return_value = mock_client
            service = OpenAIService()
            service.client = mock_client
            return service

    @pytest.fixture
    def mock_response(self):
        """Mock OpenAI response"""
        mock_response = Mock()
        mock_choice = Mock()
        mock_message = Mock()
        mock_message.content = "Test response from OpenAI"
        mock_choice.message = mock_message
        mock_response.choices = [mock_choice]
        return mock_response

    def test_chat_completion_success(self, openai_service, mock_response):
        """Test successful chat completion"""
        openai_service.client.chat.completions.create.return_value = mock_response
        
        messages = [{"role": "user", "content": "Hello"}]
        result = openai_service.chat_completion(messages)
        
        assert result == "Test response from OpenAI"
        openai_service.client.chat.completions.create.assert_called_once_with(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=1000,
            temperature=0.7
        )

    def test_chat_completion_custom_params(self, openai_service, mock_response):
        """Test chat completion with custom parameters"""
        openai_service.client.chat.completions.create.return_value = mock_response
        
        messages = [{"role": "user", "content": "Hello"}]
        result = openai_service.chat_completion(
            messages, 
            model="gpt-4", 
            max_tokens=2000
        )
        
        assert result == "Test response from OpenAI"
        openai_service.client.chat.completions.create.assert_called_once_with(
            model="gpt-4",
            messages=messages,
            max_tokens=2000,
            temperature=0.7
        )

    def test_chat_completion_no_choices(self, openai_service):
        """Test chat completion with no choices in response"""
        mock_response = Mock()
        mock_response.choices = []
        openai_service.client.chat.completions.create.return_value = mock_response
        
        messages = [{"role": "user", "content": "Hello"}]
        result = openai_service.chat_completion(messages)
        
        assert "having trouble generating a response" in result

    def test_chat_completion_exception(self, openai_service):
        """Test chat completion with API exception"""
        openai_service.client.chat.completions.create.side_effect = Exception("API Error")
        
        messages = [{"role": "user", "content": "Hello"}]
        result = openai_service.chat_completion(messages)
        
        assert "technical difficulties" in result

    @pytest.mark.asyncio
    async def test_generate_response_async(self, openai_service, mock_response):
        """Test async generate response"""
        openai_service.client.chat.completions.create.return_value = mock_response
        
        messages = [{"role": "user", "content": "Hello"}]
        result = await openai_service.generate_response(messages)
        
        assert result == "Test response from OpenAI"

    def test_analyze_data_success(self, openai_service, mock_response):
        """Test successful data analysis"""
        openai_service.client.chat.completions.create.return_value = mock_response
        
        data = {"revenue": 100000, "costs": 80000}
        prompt = "Analyze this financial data"
        result = openai_service.analyze_data(data, prompt)
        
        assert result == "Test response from OpenAI"
        
        # Verify the call was made with proper system message
        call_args = openai_service.client.chat.completions.create.call_args
        messages = call_args[1]["messages"]
        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert "data analysis expert" in messages[0]["content"]
        assert messages[1]["role"] == "user"
        assert prompt in messages[1]["content"]
        assert str(data) in messages[1]["content"]

    def test_analyze_data_exception(self, openai_service):
        """Test data analysis with exception"""
        openai_service.client.chat.completions.create.side_effect = Exception("API Error")
        
        data = {"test": "data"}
        prompt = "Analyze this"
        result = openai_service.analyze_data(data, prompt)
        
        assert "encountered an error while analyzing" in result

    def test_set_profile(self, openai_service):
        """Test setting profile"""
        openai_service.set_profile("finance")
        assert openai_service.current_profile == "finance"

    @pytest.mark.parametrize("profile,expected_content", [
        ("real_estate", "real estate expert"),
        ("legal", "legal expert"),
        ("finance", "finance expert"),
        ("medical", "medical data expert"),
        ("insurance", "insurance expert"),
        ("management", "business management expert"),
        ("unknown", "helpful AI assistant")
    ])
    def test_get_system_message_for_profile(self, openai_service, profile, expected_content):
        """Test system message generation for different profiles"""
        message = openai_service.get_system_message_for_profile(profile)
        assert expected_content in message.lower()

    def test_chat_with_context_success(self, openai_service, mock_response):
        """Test chat with context and profile"""
        openai_service.client.chat.completions.create.return_value = mock_response
        
        messages = [{"role": "user", "content": "What's the revenue?"}]
        context_data = {"revenue": 100000}
        profile = "finance"
        
        result = openai_service.chat_with_context(
            messages, 
            context_data=context_data, 
            profile=profile
        )
        
        assert result == "Test response from OpenAI"
        
        # Verify system message was added with profile and context
        call_args = openai_service.client.chat.completions.create.call_args
        actual_messages = call_args[1]["messages"]
        assert len(actual_messages) == 2
        assert actual_messages[0]["role"] == "system"
        assert "finance expert" in actual_messages[0]["content"]
        assert "data context" in actual_messages[0]["content"]

    def test_chat_with_context_no_profile(self, openai_service, mock_response):
        """Test chat with context but no profile"""
        openai_service.client.chat.completions.create.return_value = mock_response
        
        messages = [{"role": "user", "content": "Hello"}]
        context_data = {"test": "data"}
        
        result = openai_service.chat_with_context(
            messages, 
            context_data=context_data
        )
        
        assert result == "Test response from OpenAI"
        
        # Should only have original messages, no system message added
        call_args = openai_service.client.chat.completions.create.call_args
        actual_messages = call_args[1]["messages"]
        assert len(actual_messages) == 1
        assert actual_messages[0]["role"] == "user"

    def test_chat_with_context_exception(self, openai_service):
        """Test chat with context with exception"""
        openai_service.client.chat.completions.create.side_effect = Exception("API Error")
        
        messages = [{"role": "user", "content": "Hello"}]
        result = openai_service.chat_with_context(messages)
        
        assert "technical difficulties" in result

    def test_chat_with_context_custom_params(self, openai_service, mock_response):
        """Test chat with context using custom model and tokens"""
        openai_service.client.chat.completions.create.return_value = mock_response
        
        messages = [{"role": "user", "content": "Hello"}]
        result = openai_service.chat_with_context(
            messages, 
            model="gpt-4", 
            max_tokens=2000
        )
        
        assert result == "Test response from OpenAI"
        openai_service.client.chat.completions.create.assert_called_once_with(
            model="gpt-4",
            messages=messages,
            max_tokens=2000,
            temperature=0.7
        )

    def test_initialization(self):
        """Test service initialization"""
        with patch('app.services.openai_service.settings') as mock_settings:
            mock_client = Mock()
            mock_settings.get_openai_client.return_value = mock_client
            
            service = OpenAIService()
            
            assert service.client == mock_client
            assert service.current_profile is None
            mock_settings.get_openai_client.assert_called_once()