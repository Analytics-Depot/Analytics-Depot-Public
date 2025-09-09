import pytest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
import json
from app.main import app
from app.models.chat import Chat, ChatMessage, ChatFileData
from app.models.user import User


@pytest.mark.integration
class TestCompleteWorkflows:
    """Integration tests for complete user workflows"""

    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)

    def test_complete_file_upload_and_chat_workflow(self, client, auth_headers, db_session):
        """Test complete workflow: file upload -> chat creation -> messaging -> analysis"""
        # Step 1: Upload a CSV file
        csv_content = b"product,sales,region\nWidget A,1000,North\nWidget B,1500,South\nGadget C,800,East"
        
        with patch('app.services.file_analyzer.FileAnalyzer') as mock_analyzer, \
             patch('app.services.openai_service.OpenAIService') as mock_openai:
            
            # Mock file analyzer
            mock_analyzer_instance = Mock()
            mock_analyzer.return_value = mock_analyzer_instance
            mock_analyzer_instance.analyze_file.return_value = {
                "status": "success",
                "preview": {"data": [{"product": "Widget A", "sales": "1000"}]},
                "statistical": {"rows": 3, "columns": 3},
                "insights": ["3 products found", "Total sales data available"]
            }
            
            # Mock OpenAI service
            mock_openai_instance = Mock()
            mock_openai.return_value = mock_openai_instance
            mock_openai_instance.chat_with_context.return_value = "I've analyzed your sales data. The data shows 3 products with varying sales performance across different regions."
            
            # Upload file
            files = {"file": ("sales_data.csv", csv_content, "text/csv")}
            upload_response = client.post(
                "/api/files/upload",
                files=files,
                headers=auth_headers
            )
            
            assert upload_response.status_code == 200
            upload_data = upload_response.json()
            chat_id = upload_data["chat_id"]
            
            # Step 2: Send a follow-up message to the chat
            message_response = client.post(
                f"/api/chats/{chat_id}/messages",
                json={
                    "content": "What is the total sales across all products?",
                    "message_type": "text"
                },
                headers=auth_headers
            )
            
            assert message_response.status_code == 200
            
            # Step 3: Get chat history to verify the workflow
            history_response = client.get(
                f"/api/chats/{chat_id}",
                headers=auth_headers
            )
            
            assert history_response.status_code == 200
            chat_data = history_response.json()
            
            # Verify the complete workflow
            assert len(chat_data["messages"]) >= 2  # Initial system message + user message + AI response
            assert chat_data["name"] == "File Upload Analysis"
            assert any("sales_data.csv" in msg["content"] for msg in chat_data["messages"])

    def test_multi_file_upload_workflow(self, client, auth_headers):
        """Test uploading multiple files to the same chat"""
        with patch('app.services.file_analyzer.FileAnalyzer') as mock_analyzer:
            mock_analyzer_instance = Mock()
            mock_analyzer.return_value = mock_analyzer_instance
            mock_analyzer_instance.analyze_file.return_value = {
                "status": "success",
                "preview": {},
                "statistical": {},
                "insights": []
            }
            
            # Upload first file
            csv_content = b"name,value\nA,100\nB,200"
            files1 = {"file": ("data1.csv", csv_content, "text/csv")}
            response1 = client.post(
                "/api/files/upload",
                files=files1,
                headers=auth_headers
            )
            
            assert response1.status_code == 200
            chat_id = response1.json()["chat_id"]
            
            # Upload second file to same chat
            json_content = json.dumps({"users": [{"id": 1, "name": "John"}]}).encode()
            files2 = {"file": ("data2.json", json_content, "application/json")}
            response2 = client.post(
                f"/api/files/upload?chat_id={chat_id}",
                files=files2,
                headers=auth_headers
            )
            
            assert response2.status_code == 200
            assert response2.json()["chat_id"] == chat_id
            
            # Verify both files are in the chat
            chat_response = client.get(f"/api/chats/{chat_id}", headers=auth_headers)
            assert chat_response.status_code == 200
            
            chat_data = chat_response.json()
            messages = [msg["content"] for msg in chat_data["messages"]]
            assert any("data1.csv" in msg for msg in messages)
            assert any("data2.json" in msg for msg in messages)

    def test_user_registration_to_first_chat_workflow(self, client, db_session):
        """Test complete new user workflow: registration -> login -> first chat"""
        # Step 1: Register new user
        registration_data = {
            "email": "newuser@example.com",
            "password": "SecurePass123!",
            "full_name": "New User"
        }
        
        register_response = client.post("/api/auth/register", json=registration_data)
        assert register_response.status_code == 200
        
        # Step 2: Login
        login_data = {
            "email": "newuser@example.com",
            "password": "SecurePass123!"
        }
        
        login_response = client.post("/api/auth/login", json=login_data)
        assert login_response.status_code == 200
        
        token = login_response.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}
        
        # Step 3: Create first chat
        chat_data = {
            "name": "My First Chat",
            "industry": "finance"
        }
        
        chat_response = client.post("/api/chats/", json=chat_data, headers=auth_headers)
        assert chat_response.status_code == 200
        
        chat_id = chat_response.json()["id"]
        
        # Step 4: Send first message
        with patch('app.services.openai_service.OpenAIService') as mock_openai:
            mock_openai_instance = Mock()
            mock_openai.return_value = mock_openai_instance
            mock_openai_instance.chat_with_context.return_value = "Hello! I'm here to help with your financial data analysis."
            
            message_response = client.post(
                f"/api/chats/{chat_id}/messages",
                json={"content": "Hello, I need help with financial analysis"},
                headers=auth_headers
            )
            
            assert message_response.status_code == 200
            
            # Verify the complete workflow
            final_chat_response = client.get(f"/api/chats/{chat_id}", headers=auth_headers)
            assert final_chat_response.status_code == 200
            
            final_data = final_chat_response.json()
            assert final_data["name"] == "My First Chat"
            assert final_data["industry"] == "finance"
            assert len(final_data["messages"]) >= 2

    def test_admin_user_management_workflow(self, client, admin_auth_headers, test_user):
        """Test admin workflow: view users -> update permissions -> monitor system"""
        # Step 1: Get user list
        users_response = client.get("/api/admin/users", headers=admin_auth_headers)
        assert users_response.status_code == 200
        
        users = users_response.json()
        target_user = next((u for u in users if u["id"] == test_user.id), None)
        assert target_user is not None
        
        # Step 2: Update user permissions
        permission_response = client.put(
            f"/api/admin/users/{test_user.id}/permissions",
            json={"is_admin": True, "is_active": True},
            headers=admin_auth_headers
        )
        assert permission_response.status_code == 200
        
        # Step 3: Check system metrics
        with patch('psutil.cpu_percent', return_value=45.0), \
             patch('psutil.virtual_memory') as mock_memory:
            
            mock_memory_obj = Mock()
            mock_memory_obj.percent = 65.0
            mock_memory.return_value = mock_memory_obj
            
            metrics_response = client.get("/api/admin/system-metrics", headers=admin_auth_headers)
            assert metrics_response.status_code == 200
            
            metrics = metrics_response.json()
            assert metrics["cpu_usage"] == 45.0
            assert metrics["memory_usage"]["percent"] == 65.0
        
        # Step 4: Execute admin command
        with patch('subprocess.run') as mock_subprocess:
            mock_result = Mock()
            mock_result.stdout = "System status: OK"
            mock_result.stderr = ""
            mock_result.returncode = 0
            mock_subprocess.return_value = mock_result
            
            command_response = client.post(
                "/api/admin/terminal/execute",
                json={"command": "ps aux"},
                headers=admin_auth_headers
            )
            
            assert command_response.status_code == 200
            assert "System status: OK" in command_response.json()["output"]

    def test_chat_with_context_switching_workflow(self, client, auth_headers):
        """Test workflow with multiple chats and context switching"""
        with patch('app.services.openai_service.OpenAIService') as mock_openai:
            mock_openai_instance = Mock()
            mock_openai.return_value = mock_openai_instance
            
            # Create first chat for finance
            finance_chat_response = client.post(
                "/api/chats/",
                json={"name": "Finance Analysis", "industry": "finance"},
                headers=auth_headers
            )
            assert finance_chat_response.status_code == 200
            finance_chat_id = finance_chat_response.json()["id"]
            
            # Create second chat for real estate
            real_estate_chat_response = client.post(
                "/api/chats/",
                json={"name": "Real Estate Analysis", "industry": "real_estate"},
                headers=auth_headers
            )
            assert real_estate_chat_response.status_code == 200
            real_estate_chat_id = real_estate_chat_response.json()["id"]
            
            # Send message to finance chat
            mock_openai_instance.chat_with_context.return_value = "I'll help you analyze financial metrics and ratios."
            
            finance_message_response = client.post(
                f"/api/chats/{finance_chat_id}/messages",
                json={"content": "Analyze my revenue data"},
                headers=auth_headers
            )
            assert finance_message_response.status_code == 200
            
            # Send message to real estate chat
            mock_openai_instance.chat_with_context.return_value = "I'll help you with property valuations and market analysis."
            
            real_estate_message_response = client.post(
                f"/api/chats/{real_estate_chat_id}/messages",
                json={"content": "Help me value this property"},
                headers=auth_headers
            )
            assert real_estate_message_response.status_code == 200
            
            # Get list of user chats
            chats_response = client.get("/api/chats/", headers=auth_headers)
            assert chats_response.status_code == 200
            
            chats = chats_response.json()
            assert len(chats) >= 2
            
            chat_names = [chat["name"] for chat in chats]
            assert "Finance Analysis" in chat_names
            assert "Real Estate Analysis" in chat_names

    def test_error_recovery_workflow(self, client, auth_headers):
        """Test error handling and recovery in workflows"""
        # Step 1: Try to upload invalid file
        invalid_file = {"file": ("test.txt", b"invalid content", "text/plain")}
        invalid_response = client.post(
            "/api/files/upload",
            files=invalid_file,
            headers=auth_headers
        )
        assert invalid_response.status_code == 415  # Unsupported file type
        
        # Step 2: Upload valid file after error
        with patch('app.services.file_analyzer.FileAnalyzer') as mock_analyzer:
            mock_analyzer_instance = Mock()
            mock_analyzer.return_value = mock_analyzer_instance
            mock_analyzer_instance.analyze_file.return_value = {
                "status": "success",
                "preview": {},
                "statistical": {},
                "insights": []
            }
            
            valid_file = {"file": ("data.csv", b"a,b\n1,2", "text/csv")}
            valid_response = client.post(
                "/api/files/upload",
                files=valid_file,
                headers=auth_headers
            )
            assert valid_response.status_code == 200
        
        # Step 3: Try to access non-existent chat
        fake_chat_id = "00000000-0000-0000-0000-000000000000"
        non_existent_response = client.get(
            f"/api/chats/{fake_chat_id}",
            headers=auth_headers
        )
        assert non_existent_response.status_code == 404
        
        # Step 4: Successfully access valid chat
        valid_chat_id = valid_response.json()["chat_id"]
        valid_chat_response = client.get(
            f"/api/chats/{valid_chat_id}",
            headers=auth_headers
        )
        assert valid_chat_response.status_code == 200

    def test_concurrent_user_workflow(self, client, db_session):
        """Test workflow with multiple users working concurrently"""
        # Create two users
        user1_data = {
            "email": "user1@example.com",
            "password": "Pass123!",
            "full_name": "User One"
        }
        user2_data = {
            "email": "user2@example.com",
            "password": "Pass123!",
            "full_name": "User Two"
        }
        
        # Register both users
        client.post("/api/auth/register", json=user1_data)
        client.post("/api/auth/register", json=user2_data)
        
        # Login both users
        login1 = client.post("/api/auth/login", json={
            "email": "user1@example.com",
            "password": "Pass123!"
        })
        login2 = client.post("/api/auth/login", json={
            "email": "user2@example.com",
            "password": "Pass123!"
        })
        
        token1 = login1.json()["access_token"]
        token2 = login2.json()["access_token"]
        
        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}
        
        # Both users create chats
        chat1_response = client.post(
            "/api/chats/",
            json={"name": "User 1 Chat", "industry": "finance"},
            headers=headers1
        )
        chat2_response = client.post(
            "/api/chats/",
            json={"name": "User 2 Chat", "industry": "legal"},
            headers=headers2
        )
        
        assert chat1_response.status_code == 200
        assert chat2_response.status_code == 200
        
        chat1_id = chat1_response.json()["id"]
        chat2_id = chat2_response.json()["id"]
        
        # User 1 cannot access User 2's chat
        unauthorized_response = client.get(f"/api/chats/{chat2_id}", headers=headers1)
        assert unauthorized_response.status_code == 404
        
        # User 2 cannot access User 1's chat
        unauthorized_response = client.get(f"/api/chats/{chat1_id}", headers=headers2)
        assert unauthorized_response.status_code == 404
        
        # Each user can access their own chat
        user1_chat_response = client.get(f"/api/chats/{chat1_id}", headers=headers1)
        user2_chat_response = client.get(f"/api/chats/{chat2_id}", headers=headers2)
        
        assert user1_chat_response.status_code == 200
        assert user2_chat_response.status_code == 200
        
        assert user1_chat_response.json()["name"] == "User 1 Chat"
        assert user2_chat_response.json()["name"] == "User 2 Chat"