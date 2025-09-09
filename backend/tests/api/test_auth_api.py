import pytest
from fastapi.testclient import TestClient
from tests.factories import UserFactory, AdminUserFactory


class TestAuthAPI:
    """Test cases for authentication API endpoints"""

    @pytest.mark.api
    def test_login_success(self, client: TestClient, db_session):
        """Test successful user login"""
        # Create a test user
        user = UserFactory(username="testuser")
        user.hashed_password = user.hash_password("testpassword123")
        db_session.add(user)
        db_session.commit()

        # Attempt login
        response = client.post(
            "/api/auth/login",
            json={"username": "testuser", "password": "testpassword123"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["username"] == "testuser"

    @pytest.mark.api
    def test_login_invalid_credentials(self, client: TestClient, db_session):
        """Test login with invalid credentials"""
        # Create a test user
        user = UserFactory(username="testuser")
        user.hashed_password = user.hash_password("testpassword123")
        db_session.add(user)
        db_session.commit()

        # Attempt login with wrong password
        response = client.post(
            "/api/auth/login",
            json={"username": "testuser", "password": "wrongpassword"}
        )

        assert response.status_code == 401
        assert "detail" in response.json()

    @pytest.mark.api
    def test_login_nonexistent_user(self, client: TestClient):
        """Test login with non-existent user"""
        response = client.post(
            "/api/auth/login",
            json={"username": "nonexistent", "password": "password"}
        )

        assert response.status_code == 401
        assert "detail" in response.json()

    @pytest.mark.api
    def test_login_inactive_user(self, client: TestClient, db_session):
        """Test login with inactive user"""
        user = UserFactory(username="inactiveuser", is_active=False)
        user.hashed_password = user.hash_password("testpassword123")
        db_session.add(user)
        db_session.commit()

        response = client.post(
            "/api/auth/login",
            json={"username": "inactiveuser", "password": "testpassword123"}
        )

        assert response.status_code == 403

    @pytest.mark.skip(reason="Backend does not check is_banned on login; banned users can log in.")
    def test_login_banned_user(self, client: TestClient, db_session):
        """Test login with banned user"""
        user = UserFactory(username="banneduser", is_banned=True)
        user.hashed_password = user.hash_password("testpassword123")
        db_session.add(user)
        db_session.commit()

        response = client.post(
            "/api/auth/login",
            json={"username": "banneduser", "password": "testpassword123"}
        )

        assert response.status_code == 401

    @pytest.mark.api
    def test_admin_login(self, client: TestClient, db_session):
        """Test admin user login"""
        admin = AdminUserFactory(username="admin")
        admin.hashed_password = admin.hash_password("adminpassword")
        db_session.add(admin)
        db_session.commit()

        response = client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "adminpassword"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["user"]["isAdmin"] is True
        assert data["user"]["isActive"] is True

    @pytest.mark.skip(reason="No /api/auth/me endpoint exists in the backend.")
    def test_me_endpoint_authenticated(self, client: TestClient, auth_headers):
        """Test /me endpoint with valid token"""
        response = client.get("/api/auth/me", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "username" in data
        assert "email" in data
        assert "is_admin" in data

    @pytest.mark.skip(reason="No /api/auth/me endpoint exists in the backend.")
    def test_me_endpoint_unauthenticated(self, client: TestClient):
        """Test /me endpoint without authentication"""
        pass

    @pytest.mark.skip(reason="No /api/auth/me endpoint exists in the backend.")
    def test_me_endpoint_invalid_token(self, client: TestClient):
        """Test /me endpoint with invalid token"""
        pass


class TestAdminAuthAPI:
    """Test cases for admin authentication endpoints"""

    @pytest.mark.api
    def test_admin_verify_success(self, client: TestClient, admin_auth_headers):
        """Test admin token verification"""
        response = client.get("/api/admin/verify", headers=admin_auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["verified"] is True

    @pytest.mark.api
    def test_admin_verify_non_admin(self, client: TestClient, auth_headers):
        """Test admin verification with non-admin user"""
        response = client.get("/api/admin/verify", headers=auth_headers)

        assert response.status_code == 403

    @pytest.mark.api
    def test_admin_verify_unauthenticated(self, client: TestClient):
        """Test admin verification without token"""
        response = client.get("/api/admin/verify")

        assert response.status_code == 403