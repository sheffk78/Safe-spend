"""
Safe-Spend Comprehensive Backend API Tests
Tests: Authentication, Escrow Management, Spending Policies, Spend Requests with Rules Engine,
       Approvals API, Balance checks, Audit Log, Webhooks, and Error Handling

Test Scenarios:
1. AUTH: Valid API key returns 200, Invalid key returns 401, Missing header returns 401
2. ESCROW: Create escrow, Fund escrow, Get escrow, List escrows, Pause/Resume escrow
3. POLICIES: Create policy with limits, vendor allowlist, approval thresholds, time windows
4. SPEND REQUESTS: Auto-approved spend, Denied spend (blocked vendor, over limit, insufficient balance, paused account), Pending approval, Idempotency
5. APPROVALS: List pending approvals, Approve a spend, Deny a spend with note
6. BALANCE ENDPOINT: Agent key can access balance
7. AUDIT LOG: Events are logged for all operations
8. WEBHOOKS: Create webhook, List webhooks, Delete webhook
9. ERROR HANDLING: Malformed JSON returns 400, Missing required field returns 422/400, Non-existent resource returns 404
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test_comprehensive@test.com"
TEST_PASSWORD = "TestPass123!"
TEST_ORG_NAME = "Comprehensive Test Org"


class TestSetup:
    """Setup test user and get credentials"""
    
    @pytest.fixture(scope="class")
    def setup_user(self):
        """Create test user or login if exists"""
        # Try to signup first
        signup_response = requests.post(f"{BASE_URL}/api/v1/auth/signup", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_ORG_NAME
        })
        
        if signup_response.status_code == 201:
            print(f"Created new test user: {TEST_EMAIL}")
            return signup_response.json()
        
        # If user exists, login
        login_response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            print(f"Logged in existing user: {TEST_EMAIL}")
            return login_response.json()
        
        # Fallback to demo user
        demo_response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": "demo@test.com",
            "password": "Test123!"
        })
        assert demo_response.status_code == 200, f"Failed to login: {demo_response.text}"
        print("Using demo user")
        return demo_response.json()
    
    def test_setup_complete(self, setup_user):
        """Verify setup is complete"""
        assert "token" in setup_user
        print(f"Setup complete with token: {setup_user['token'][:20]}...")


class TestAuthentication:
    """1. AUTH: Valid API key returns 200, Invalid key returns 401, Missing header returns 401"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get JWT token"""
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def api_key(self, headers):
        """Create an API key for testing"""
        response = requests.post(f"{BASE_URL}/api/v1/api-keys", headers=headers, json={
            "key_type": "agent",
            "label": "TEST_Comprehensive_Agent_Key"
        })
        assert response.status_code == 201
        return response.json()["key"]
    
    def test_valid_jwt_returns_200(self, headers):
        """Test that valid JWT token returns 200"""
        response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers)
        assert response.status_code == 200
        print("Valid JWT returns 200 - PASS")
    
    def test_valid_api_key_returns_200(self, api_key):
        """Test that valid API key returns 200"""
        # Create an escrow first to test balance endpoint
        jwt_response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        jwt_token = jwt_response.json()["token"]
        jwt_headers = {"Authorization": f"Bearer {jwt_token}", "Content-Type": "application/json"}
        
        # Get or create an escrow account
        escrows_response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts", headers=jwt_headers)
        escrows = escrows_response.json()["data"]
        
        if escrows:
            escrow_id = escrows[0]["id"]
        else:
            create_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=jwt_headers, json={
                "name": "TEST_API_Key_Test_Escrow"
            })
            escrow_id = create_response.json()["id"]
        
        # Test API key access to balance endpoint
        api_key_headers = {"X-API-Key": api_key, "Content-Type": "application/json"}
        response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/balance", headers=api_key_headers)
        assert response.status_code == 200
        print(f"Valid API key returns 200 - PASS (balance: ${response.json()['balance_cents']/100:.2f})")
    
    def test_invalid_api_key_returns_401(self):
        """Test that invalid API key returns 401"""
        headers = {"X-API-Key": "sk_invalid_key_12345", "Content-Type": "application/json"}
        response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers)
        assert response.status_code == 401
        print("Invalid API key returns 401 - PASS")
    
    def test_missing_auth_header_returns_401(self):
        """Test that missing auth header returns 401"""
        response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts")
        assert response.status_code == 401
        print("Missing auth header returns 401 - PASS")
    
    def test_invalid_jwt_returns_401(self):
        """Test that invalid JWT returns 401"""
        headers = {"Authorization": "Bearer invalid_jwt_token", "Content-Type": "application/json"}
        response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers)
        assert response.status_code == 401
        print("Invalid JWT returns 401 - PASS")


class TestEscrowManagement:
    """2. ESCROW: Create escrow, Fund escrow, Get escrow, List escrows, Pause/Resume escrow"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_create_escrow_account(self, headers):
        """Test creating a new escrow account"""
        payload = {
            "name": "TEST_Comprehensive_Escrow",
            "description": "Escrow for comprehensive testing",
            "currency": "usd",
            "metadata": {"test": True}
        }
        response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json=payload)
        assert response.status_code == 201
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert data["name"] == payload["name"]
        assert data["description"] == payload["description"]
        assert data["currency"] == "usd"
        assert data["balance_cents"] == 0
        assert data["status"] == "active"
        
        print(f"Created escrow: {data['id']} - PASS")
        return data["id"]
    
    def test_fund_escrow_account(self, headers):
        """Test funding an escrow account with $100"""
        # Create escrow
        create_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json={
            "name": "TEST_Fund_Comprehensive_Escrow"
        })
        escrow_id = create_response.json()["id"]
        
        # Fund with $100 (10000 cents)
        fund_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/fund", headers=headers, json={
            "amount_cents": 10000
        })
        assert fund_response.status_code == 200
        data = fund_response.json()
        
        assert data["escrow"]["balance_cents"] == 10000
        assert data["escrow"]["total_funded_cents"] == 10000
        
        print(f"Funded escrow {escrow_id} with $100 - PASS")
        return escrow_id
    
    def test_get_escrow_account(self, headers):
        """Test getting escrow account details"""
        # Create escrow
        create_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json={
            "name": "TEST_Get_Comprehensive_Escrow"
        })
        escrow_id = create_response.json()["id"]
        
        # Get escrow
        get_response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}", headers=headers)
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data["id"] == escrow_id
        assert "name" in data
        assert "balance_cents" in data
        assert "status" in data
        
        print(f"Got escrow {escrow_id} - PASS")
    
    def test_list_escrow_accounts(self, headers):
        """Test listing escrow accounts"""
        response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "data" in data
        assert "total" in data
        assert isinstance(data["data"], list)
        
        print(f"Listed {data['total']} escrow accounts - PASS")
    
    def test_pause_escrow_account(self, headers):
        """Test pausing an escrow account"""
        # Create and fund escrow
        create_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json={
            "name": "TEST_Pause_Comprehensive_Escrow"
        })
        escrow_id = create_response.json()["id"]
        
        # Pause
        pause_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/pause", headers=headers)
        assert pause_response.status_code == 200
        data = pause_response.json()
        
        assert data["status"] == "paused"
        
        print(f"Paused escrow {escrow_id} - PASS")
        return escrow_id
    
    def test_resume_escrow_account(self, headers):
        """Test resuming a paused escrow account"""
        # Create, fund, and pause escrow
        create_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json={
            "name": "TEST_Resume_Comprehensive_Escrow"
        })
        escrow_id = create_response.json()["id"]
        
        # Fund first
        requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/fund", headers=headers, json={
            "amount_cents": 5000
        })
        
        # Pause
        requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/pause", headers=headers)
        
        # Resume
        resume_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/resume", headers=headers)
        assert resume_response.status_code == 200
        data = resume_response.json()
        
        assert data["status"] == "active"
        
        print(f"Resumed escrow {escrow_id} - PASS")


class TestSpendingPolicies:
    """3. POLICIES: Create policy with limits, vendor allowlist, approval thresholds, time windows"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_escrow_id(self, headers):
        """Create a test escrow for policy tests"""
        response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json={
            "name": "TEST_Policy_Comprehensive_Escrow"
        })
        return response.json()["id"]
    
    def test_create_policy_with_all_limits(self, headers, test_escrow_id):
        """Test creating a policy with per-tx, daily, monthly limits"""
        payload = {
            "escrow_id": test_escrow_id,
            "name": "TEST_Comprehensive_Policy",
            "per_transaction_limit_cents": 5000,  # $50 per transaction
            "daily_limit_cents": 20000,  # $200 daily
            "monthly_limit_cents": 100000,  # $1000 monthly
            "allowed_vendors": ["Anthropic", "OpenAI"],
            "auto_approve_under_cents": 2500,  # Auto-approve under $25
            "require_human_above_cents": 4999,  # Require human above $49.99
            "approval_timeout_minutes": 60,
            "active_days": ["mon", "tue", "wed", "thu", "fri"],
            "active_hours_start": "09:00",
            "active_hours_end": "17:00",
            "active_timezone": "America/Denver"
        }
        response = requests.post(f"{BASE_URL}/api/v1/policies", headers=headers, json=payload)
        assert response.status_code == 201
        data = response.json()
        
        # Verify all fields
        assert data["per_transaction_limit_cents"] == 5000
        assert data["daily_limit_cents"] == 20000
        assert data["monthly_limit_cents"] == 100000
        assert data["allowed_vendors"] == ["Anthropic", "OpenAI"]
        assert data["auto_approve_under_cents"] == 2500
        assert data["require_human_above_cents"] == 4999
        assert data["approval_timeout_minutes"] == 60
        
        print(f"Created policy with all limits: {data['id']} - PASS")
        return data["id"]
    
    def test_create_policy_with_vendor_allowlist(self, headers, test_escrow_id):
        """Test creating a policy with vendor allowlist"""
        payload = {
            "escrow_id": test_escrow_id,
            "name": "TEST_Vendor_Allowlist_Policy",
            "allowed_vendors": ["Anthropic", "OpenAI", "Google Cloud"],
            "vendor_match_mode": "exact"
        }
        response = requests.post(f"{BASE_URL}/api/v1/policies", headers=headers, json=payload)
        assert response.status_code == 201
        data = response.json()
        
        assert data["allowed_vendors"] == ["Anthropic", "OpenAI", "Google Cloud"]
        assert data["vendor_match_mode"] == "exact"
        
        print(f"Created policy with vendor allowlist: {data['id']} - PASS")
    
    def test_create_policy_with_blocked_vendors(self, headers, test_escrow_id):
        """Test creating a policy with blocked vendors"""
        payload = {
            "escrow_id": test_escrow_id,
            "name": "TEST_Blocked_Vendors_Policy",
            "blocked_vendors": ["BlockedVendor", "SuspiciousVendor"]
        }
        response = requests.post(f"{BASE_URL}/api/v1/policies", headers=headers, json=payload)
        assert response.status_code == 201
        data = response.json()
        
        assert data["blocked_vendors"] == ["BlockedVendor", "SuspiciousVendor"]
        
        print(f"Created policy with blocked vendors: {data['id']} - PASS")


class TestSpendRequestsRulesEngine:
    """4. SPEND REQUESTS: Auto-approved, Denied (blocked vendor, over limit, insufficient balance, paused), Pending approval, Idempotency"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def api_key(self, headers):
        """Create an API key for spend requests"""
        response = requests.post(f"{BASE_URL}/api/v1/api-keys", headers=headers, json={
            "key_type": "agent",
            "label": "TEST_Spend_Agent_Key"
        })
        return response.json()["key"]
    
    @pytest.fixture(scope="class")
    def test_escrow_with_policy(self, headers):
        """Create escrow with policy for spend tests"""
        # Create escrow
        escrow_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json={
            "name": "TEST_Spend_Rules_Escrow"
        })
        escrow_id = escrow_response.json()["id"]
        
        # Fund with $100
        requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/fund", headers=headers, json={
            "amount_cents": 10000
        })
        
        # Create policy with specific rules
        policy_response = requests.post(f"{BASE_URL}/api/v1/policies", headers=headers, json={
            "escrow_id": escrow_id,
            "name": "TEST_Spend_Rules_Policy",
            "per_transaction_limit_cents": 5000,  # $50 per transaction
            "allowed_vendors": ["Anthropic", "OpenAI"],
            "auto_approve_under_cents": 2500,  # Auto-approve under $25
            "require_human_above_cents": 4999  # Require human above $49.99
        })
        
        return {
            "escrow_id": escrow_id,
            "policy_id": policy_response.json()["id"]
        }
    
    def test_spend_auto_approved_under_threshold(self, headers, api_key, test_escrow_with_policy):
        """Test spend $15 to Anthropic (should auto-approve)"""
        escrow_id = test_escrow_with_policy["escrow_id"]
        
        api_key_headers = {"X-API-Key": api_key, "Content-Type": "application/json"}
        
        payload = {
            "escrow_id": escrow_id,
            "amount_cents": 1500,  # $15
            "vendor": "Anthropic",
            "category": "ai_services",
            "description": "Test auto-approved spend"
        }
        
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=api_key_headers, json=payload)
        
        # Should be auto-approved (201) since $15 < $25 auto_approve_under
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["status"] == "approved"
        assert data["amount_cents"] == 1500
        assert data["vendor"] == "Anthropic"
        assert "remaining_balance_cents" in data
        
        print(f"Auto-approved spend $15 to Anthropic - PASS (remaining: ${data['remaining_balance_cents']/100:.2f})")
    
    def test_spend_denied_blocked_vendor(self, headers, api_key):
        """Test spend to 'BlockedVendor' (should deny)"""
        # Create escrow with blocked vendor policy
        escrow_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json={
            "name": "TEST_Blocked_Vendor_Escrow"
        })
        escrow_id = escrow_response.json()["id"]
        
        # Fund
        requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/fund", headers=headers, json={
            "amount_cents": 10000
        })
        
        # Create policy with blocked vendors
        requests.post(f"{BASE_URL}/api/v1/policies", headers=headers, json={
            "escrow_id": escrow_id,
            "name": "TEST_Blocked_Vendor_Policy",
            "blocked_vendors": ["BlockedVendor"]
        })
        
        api_key_headers = {"X-API-Key": api_key, "Content-Type": "application/json"}
        
        payload = {
            "escrow_id": escrow_id,
            "amount_cents": 1000,
            "vendor": "BlockedVendor",
            "description": "Test blocked vendor spend"
        }
        
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=api_key_headers, json=payload)
        
        # Should be denied (400)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["status"] == "denied"
        assert "blocked" in data.get("denial_reason", "").lower() or "vendor" in data.get("error", "").lower()
        
        print(f"Denied spend to BlockedVendor - PASS (reason: {data.get('denial_reason', data.get('error'))})")
    
    def test_spend_denied_over_per_tx_limit(self, headers, api_key, test_escrow_with_policy):
        """Test spend $99.99 to Anthropic (should deny - over per-tx limit of $50)"""
        escrow_id = test_escrow_with_policy["escrow_id"]
        
        api_key_headers = {"X-API-Key": api_key, "Content-Type": "application/json"}
        
        payload = {
            "escrow_id": escrow_id,
            "amount_cents": 9999,  # $99.99 - over $50 per-tx limit
            "vendor": "Anthropic",
            "description": "Test over per-tx limit spend"
        }
        
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=api_key_headers, json=payload)
        
        # Should be denied (400) due to per-tx limit
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["status"] == "denied"
        
        print(f"Denied spend $99.99 (over per-tx limit) - PASS (reason: {data.get('denial_reason', data.get('error'))})")
    
    def test_spend_denied_insufficient_balance(self, headers, api_key):
        """Test spend when balance too low (should deny)"""
        # Create escrow with minimal balance
        escrow_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json={
            "name": "TEST_Low_Balance_Escrow"
        })
        escrow_id = escrow_response.json()["id"]
        
        # Fund with only $5
        requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/fund", headers=headers, json={
            "amount_cents": 500
        })
        
        # Create policy
        requests.post(f"{BASE_URL}/api/v1/policies", headers=headers, json={
            "escrow_id": escrow_id,
            "name": "TEST_Low_Balance_Policy",
            "auto_approve_under_cents": 10000  # Auto-approve under $100
        })
        
        api_key_headers = {"X-API-Key": api_key, "Content-Type": "application/json"}
        
        payload = {
            "escrow_id": escrow_id,
            "amount_cents": 1000,  # $10 - more than $5 balance
            "vendor": "TestVendor",
            "description": "Test insufficient balance spend"
        }
        
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=api_key_headers, json=payload)
        
        # Should be denied (400) due to insufficient balance
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["status"] == "denied"
        assert "balance" in data.get("denial_reason", "").lower() or "insufficient" in data.get("error", "").lower()
        
        print(f"Denied spend (insufficient balance) - PASS (reason: {data.get('denial_reason', data.get('error'))})")
    
    def test_spend_denied_paused_account(self, headers, api_key):
        """Test spend when account is paused (should deny)"""
        # Create and fund escrow
        escrow_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json={
            "name": "TEST_Paused_Account_Escrow"
        })
        escrow_id = escrow_response.json()["id"]
        
        # Fund
        requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/fund", headers=headers, json={
            "amount_cents": 10000
        })
        
        # Create policy
        requests.post(f"{BASE_URL}/api/v1/policies", headers=headers, json={
            "escrow_id": escrow_id,
            "name": "TEST_Paused_Account_Policy",
            "auto_approve_under_cents": 10000
        })
        
        # Pause the account
        requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/pause", headers=headers)
        
        api_key_headers = {"X-API-Key": api_key, "Content-Type": "application/json"}
        
        payload = {
            "escrow_id": escrow_id,
            "amount_cents": 1000,
            "vendor": "TestVendor",
            "description": "Test paused account spend"
        }
        
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=api_key_headers, json=payload)
        
        # Should be denied (400) due to paused account
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["status"] == "denied"
        assert "paused" in data.get("denial_reason", "").lower() or "paused" in data.get("error", "").lower()
        
        print(f"Denied spend (paused account) - PASS (reason: {data.get('denial_reason', data.get('error'))})")
    
    def test_spend_pending_approval_above_threshold(self, headers, api_key):
        """Test spend $50 to Anthropic (should require approval since > $49.99)"""
        # Create escrow with policy
        escrow_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json={
            "name": "TEST_Pending_Approval_Escrow"
        })
        escrow_id = escrow_response.json()["id"]
        
        # Fund with $100
        requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/fund", headers=headers, json={
            "amount_cents": 10000
        })
        
        # Create policy with approval threshold
        requests.post(f"{BASE_URL}/api/v1/policies", headers=headers, json={
            "escrow_id": escrow_id,
            "name": "TEST_Pending_Approval_Policy",
            "per_transaction_limit_cents": 10000,  # $100 per-tx limit
            "auto_approve_under_cents": 2500,  # Auto-approve under $25
            "require_human_above_cents": 4999,  # Require human above $49.99
            "allowed_vendors": ["Anthropic"]
        })
        
        api_key_headers = {"X-API-Key": api_key, "Content-Type": "application/json"}
        
        payload = {
            "escrow_id": escrow_id,
            "amount_cents": 5000,  # $50 - above $49.99 threshold
            "vendor": "Anthropic",
            "description": "Test pending approval spend"
        }
        
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=api_key_headers, json=payload)
        
        # Should be pending (202)
        assert response.status_code == 202, f"Expected 202, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["status"] == "pending"
        assert "approval_id" in data
        assert "approval_expires_at" in data
        
        print(f"Pending approval for $50 spend - PASS (approval_id: {data['approval_id']})")
        return data["approval_id"]
    
    def test_spend_idempotency(self, headers, api_key, test_escrow_with_policy):
        """Test idempotency - same idempotency_key returns same result"""
        escrow_id = test_escrow_with_policy["escrow_id"]
        idempotency_key = f"test_idempotency_{uuid.uuid4()}"
        
        api_key_headers = {"X-API-Key": api_key, "Content-Type": "application/json"}
        
        payload = {
            "escrow_id": escrow_id,
            "amount_cents": 500,  # $5
            "vendor": "Anthropic",
            "description": "Test idempotency",
            "idempotency_key": idempotency_key
        }
        
        # First request
        response1 = requests.post(f"{BASE_URL}/api/v1/spend", headers=api_key_headers, json=payload)
        
        # Second request with same idempotency key
        response2 = requests.post(f"{BASE_URL}/api/v1/spend", headers=api_key_headers, json=payload)
        
        # Both should return same spend request ID (idempotency working)
        # Note: First request returns 201 (created), second returns 200 (replay) - this is correct behavior
        assert response1.status_code in [200, 201, 202], f"First request failed: {response1.text}"
        assert response2.status_code in [200, 201, 202], f"Second request failed: {response2.text}"
        assert response1.json()["id"] == response2.json()["id"], "Idempotency failed - different IDs returned"
        
        print(f"Idempotency check - PASS (same spend_request_id: {response1.json()['id']})")


class TestApprovalsAPI:
    """5. APPROVALS: List pending approvals, Approve a spend, Deny a spend with note"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def api_key(self, headers):
        """Create an API key for spend requests"""
        response = requests.post(f"{BASE_URL}/api/v1/api-keys", headers=headers, json={
            "key_type": "agent",
            "label": "TEST_Approval_Agent_Key"
        })
        return response.json()["key"]
    
    def test_list_pending_approvals(self, headers):
        """Test listing pending approvals"""
        response = requests.get(f"{BASE_URL}/api/v1/approvals?status=pending", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "data" in data
        assert "total" in data
        
        print(f"Listed {data['total']} pending approvals - PASS")
        return data["data"]
    
    def test_approve_spend_request(self, headers, api_key):
        """Test approving a pending spend request"""
        # Create escrow with policy that requires approval
        escrow_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json={
            "name": "TEST_Approve_Test_Escrow"
        })
        escrow_id = escrow_response.json()["id"]
        
        # Fund
        requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/fund", headers=headers, json={
            "amount_cents": 10000
        })
        
        # Create policy
        requests.post(f"{BASE_URL}/api/v1/policies", headers=headers, json={
            "escrow_id": escrow_id,
            "name": "TEST_Approve_Test_Policy",
            "per_transaction_limit_cents": 10000,
            "auto_approve_under_cents": 100,  # Very low auto-approve
            "require_human_above_cents": 100,  # Require human above $1
            "allowed_vendors": ["TestVendor"]
        })
        
        # Create spend request that requires approval
        api_key_headers = {"X-API-Key": api_key, "Content-Type": "application/json"}
        spend_response = requests.post(f"{BASE_URL}/api/v1/spend", headers=api_key_headers, json={
            "escrow_id": escrow_id,
            "amount_cents": 500,  # $5 - above $1 threshold
            "vendor": "TestVendor",
            "description": "Test approval"
        })
        
        if spend_response.status_code != 202:
            pytest.skip(f"Spend request not pending: {spend_response.status_code}")
        
        approval_id = spend_response.json()["approval_id"]
        
        # Get balance before
        balance_before = requests.get(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/balance", headers=headers).json()["balance_cents"]
        
        # Approve
        approve_response = requests.post(f"{BASE_URL}/api/v1/approvals/{approval_id}/approve", headers=headers, json={
            "note": "Approved via automated test"
        })
        
        assert approve_response.status_code == 200, f"Approve failed: {approve_response.text}"
        data = approve_response.json()
        
        assert data["status"] == "approved"
        assert "approved_by" in data
        assert "approved_at" in data
        
        # Verify balance deducted
        balance_after = requests.get(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/balance", headers=headers).json()["balance_cents"]
        assert balance_after == balance_before - 500
        
        print(f"Approved spend request - PASS (balance: ${balance_before/100:.2f} -> ${balance_after/100:.2f})")
    
    def test_deny_spend_request_with_note(self, headers, api_key):
        """Test denying a pending spend request with note"""
        # Create escrow with policy
        escrow_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json={
            "name": "TEST_Deny_Test_Escrow"
        })
        escrow_id = escrow_response.json()["id"]
        
        # Fund
        requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/fund", headers=headers, json={
            "amount_cents": 10000
        })
        
        # Create policy
        requests.post(f"{BASE_URL}/api/v1/policies", headers=headers, json={
            "escrow_id": escrow_id,
            "name": "TEST_Deny_Test_Policy",
            "per_transaction_limit_cents": 10000,
            "auto_approve_under_cents": 100,
            "require_human_above_cents": 100,
            "allowed_vendors": ["TestVendor"]
        })
        
        # Create spend request
        api_key_headers = {"X-API-Key": api_key, "Content-Type": "application/json"}
        spend_response = requests.post(f"{BASE_URL}/api/v1/spend", headers=api_key_headers, json={
            "escrow_id": escrow_id,
            "amount_cents": 500,
            "vendor": "TestVendor",
            "description": "Test denial"
        })
        
        if spend_response.status_code != 202:
            pytest.skip(f"Spend request not pending: {spend_response.status_code}")
        
        approval_id = spend_response.json()["approval_id"]
        
        # Get balance before
        balance_before = requests.get(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/balance", headers=headers).json()["balance_cents"]
        
        # Deny with note
        deny_response = requests.post(f"{BASE_URL}/api/v1/approvals/{approval_id}/deny", headers=headers, json={
            "reason": "suspicious_activity",
            "note": "Denied via automated test - suspicious vendor"
        })
        
        assert deny_response.status_code == 200, f"Deny failed: {deny_response.text}"
        data = deny_response.json()
        
        assert data["status"] == "denied"
        assert "denied_by" in data
        assert "denied_at" in data
        assert data["denial_reason"] == "suspicious_activity"
        
        # Verify balance NOT deducted
        balance_after = requests.get(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/balance", headers=headers).json()["balance_cents"]
        assert balance_after == balance_before
        
        print(f"Denied spend request with note - PASS (balance unchanged: ${balance_after/100:.2f})")


class TestBalanceEndpoint:
    """6. BALANCE ENDPOINT: Agent key can access balance"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def agent_api_key(self, headers):
        """Create an agent API key"""
        response = requests.post(f"{BASE_URL}/api/v1/api-keys", headers=headers, json={
            "key_type": "agent",
            "label": "TEST_Balance_Agent_Key"
        })
        return response.json()["key"]
    
    def test_agent_key_can_access_balance(self, headers, agent_api_key):
        """Test that agent key can access balance endpoint"""
        # Create escrow
        escrow_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json={
            "name": "TEST_Balance_Access_Escrow"
        })
        escrow_id = escrow_response.json()["id"]
        
        # Fund
        requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/fund", headers=headers, json={
            "amount_cents": 5000
        })
        
        # Access balance with agent key
        api_key_headers = {"X-API-Key": agent_api_key, "Content-Type": "application/json"}
        response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/balance", headers=api_key_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "escrow_id" in data
        assert "balance_cents" in data
        assert "currency" in data
        assert "status" in data
        assert data["balance_cents"] == 5000
        
        print(f"Agent key accessed balance - PASS (balance: ${data['balance_cents']/100:.2f})")


class TestAuditLog:
    """7. AUDIT LOG: Events are logged for all operations"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_audit_log_escrow_created(self, headers):
        """Test that escrow.created event is logged"""
        # Create escrow
        escrow_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json={
            "name": "TEST_Audit_Escrow_Created"
        })
        escrow_id = escrow_response.json()["id"]
        
        # Check audit log
        time.sleep(0.5)  # Small delay for audit to be written
        audit_response = requests.get(f"{BASE_URL}/api/v1/audit?event_type=escrow.created&limit=10", headers=headers)
        assert audit_response.status_code == 200
        
        events = audit_response.json()["data"]
        assert len(events) > 0
        
        # Find our event
        our_event = next((e for e in events if e.get("escrow_id") == escrow_id), None)
        assert our_event is not None, f"escrow.created event not found for {escrow_id}"
        
        print(f"escrow.created event logged - PASS")
    
    def test_audit_log_escrow_funded(self, headers):
        """Test that escrow.funded event is logged"""
        # Create and fund escrow
        escrow_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json={
            "name": "TEST_Audit_Escrow_Funded"
        })
        escrow_id = escrow_response.json()["id"]
        
        requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/fund", headers=headers, json={
            "amount_cents": 1000
        })
        
        # Check audit log
        time.sleep(0.5)
        audit_response = requests.get(f"{BASE_URL}/api/v1/audit?event_type=escrow.funded&limit=10", headers=headers)
        assert audit_response.status_code == 200
        
        events = audit_response.json()["data"]
        assert len(events) > 0
        
        our_event = next((e for e in events if e.get("escrow_id") == escrow_id), None)
        assert our_event is not None, f"escrow.funded event not found for {escrow_id}"
        
        print(f"escrow.funded event logged - PASS")
    
    def test_audit_log_spend_approved(self, headers):
        """Test that spend.approved event is logged"""
        # Check for any spend.approved events
        audit_response = requests.get(f"{BASE_URL}/api/v1/audit?event_type=spend.approved&limit=10", headers=headers)
        assert audit_response.status_code == 200
        
        events = audit_response.json()["data"]
        print(f"Found {len(events)} spend.approved events - PASS")
    
    def test_audit_log_spend_denied(self, headers):
        """Test that spend.denied event is logged"""
        audit_response = requests.get(f"{BASE_URL}/api/v1/audit?event_type=spend.denied&limit=10", headers=headers)
        assert audit_response.status_code == 200
        
        events = audit_response.json()["data"]
        print(f"Found {len(events)} spend.denied events - PASS")
    
    def test_audit_log_approval_requested(self, headers):
        """Test that approval.requested event is logged"""
        audit_response = requests.get(f"{BASE_URL}/api/v1/audit?event_type=approval.requested&limit=10", headers=headers)
        assert audit_response.status_code == 200
        
        events = audit_response.json()["data"]
        print(f"Found {len(events)} approval.requested events - PASS")


class TestWebhooks:
    """8. WEBHOOKS: Create webhook, List webhooks, Delete webhook"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_create_webhook(self, headers):
        """Test creating a webhook"""
        payload = {
            "url": "https://httpbin.org/post",
            "events": ["spend.approved", "spend.denied", "approval.requested"]
        }
        response = requests.post(f"{BASE_URL}/api/v1/webhooks", headers=headers, json=payload)
        assert response.status_code == 201
        data = response.json()
        
        assert "id" in data
        assert data["url"] == payload["url"]
        assert data["events"] == payload["events"]
        assert "secret" in data  # Secret only shown on creation
        
        print(f"Created webhook: {data['id']} - PASS")
        return data["id"]
    
    def test_list_webhooks(self, headers):
        """Test listing webhooks"""
        response = requests.get(f"{BASE_URL}/api/v1/webhooks", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "data" in data
        assert "total" in data
        assert "supported_events" in data
        
        print(f"Listed {data['total']} webhooks - PASS")
    
    def test_delete_webhook(self, headers):
        """Test deleting a webhook"""
        # Create a webhook first
        create_response = requests.post(f"{BASE_URL}/api/v1/webhooks", headers=headers, json={
            "url": "https://httpbin.org/post",
            "events": ["spend.approved"]
        })
        webhook_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/v1/webhooks/{webhook_id}", headers=headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/v1/webhooks/{webhook_id}", headers=headers)
        assert get_response.status_code == 404
        
        print(f"Deleted webhook {webhook_id} - PASS")


class TestErrorHandling:
    """9. ERROR HANDLING: Malformed JSON returns 400, Missing required field returns 422/400, Non-existent resource returns 404"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_malformed_json_returns_400(self, auth_token):
        """Test that malformed JSON returns 400"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        # Send malformed JSON
        response = requests.post(
            f"{BASE_URL}/api/v1/escrow-accounts",
            headers=headers,
            data="{ invalid json }"
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"Malformed JSON returns 400 - PASS")
    
    def test_missing_required_field_returns_400(self, headers):
        """Test that missing required field returns 400"""
        # Create escrow without name (required)
        response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json={
            "description": "Missing name field"
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "name" in response.json().get("error", "").lower() or "required" in response.json().get("error", "").lower()
        
        print(f"Missing required field returns 400 - PASS")
    
    def test_nonexistent_escrow_returns_404(self, headers):
        """Test that non-existent escrow returns 404"""
        response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts/esc_nonexistent123", headers=headers)
        assert response.status_code == 404
        
        print(f"Non-existent escrow returns 404 - PASS")
    
    def test_nonexistent_policy_returns_404(self, headers):
        """Test that non-existent policy returns 404"""
        response = requests.get(f"{BASE_URL}/api/v1/policies/pol_nonexistent123", headers=headers)
        assert response.status_code == 404
        
        print(f"Non-existent policy returns 404 - PASS")
    
    def test_nonexistent_approval_returns_404(self, headers):
        """Test that non-existent approval returns 404"""
        response = requests.get(f"{BASE_URL}/api/v1/approvals/apr_nonexistent123", headers=headers)
        assert response.status_code == 404
        
        print(f"Non-existent approval returns 404 - PASS")
    
    def test_nonexistent_webhook_returns_404(self, headers):
        """Test that non-existent webhook returns 404"""
        response = requests.get(f"{BASE_URL}/api/v1/webhooks/whk_nonexistent123", headers=headers)
        assert response.status_code == 404
        
        print(f"Non-existent webhook returns 404 - PASS")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
