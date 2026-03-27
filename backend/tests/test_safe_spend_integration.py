"""
Safe-Spend Integration Tests
Tests for Agent ID support, AAV Authority Verification, ARL Outcome Reporting,
Cross-Tool Events, Organization Linking, and Control Plane API endpoints.
"""

import pytest
import requests
import os
import json
import hmac
import hashlib
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://agent-vault-demo.preview.emergentagent.com')
INTERNAL_EVENTS_SECRET = "safe-spend-internal-events-secret-change-in-production"

# Test agent_id in agt_ + 24 hex format
TEST_AGENT_ID = "agt_1a2b3c4d5e6f7890abcdef12"
TEST_CERTIFICATE_ID = "cert_test123abc"


# ============================================
# Fixtures
# ============================================

@pytest.fixture(scope="module")
def auth_token():
    """Create a test user and get auth token"""
    unique_id = str(uuid.uuid4())[:8]
    email = f"test_integration_{unique_id}@test.com"
    password = "TestPass123!"
    
    # Try signup first
    signup_response = requests.post(
        f"{BASE_URL}/api/v1/auth/signup",
        json={
            "email": email,
            "password": password,
            "name": f"Test Org {unique_id}"
        }
    )
    
    if signup_response.status_code == 201:
        return signup_response.json().get("token")
    
    # If signup fails (user exists), try login
    login_response = requests.post(
        f"{BASE_URL}/api/v1/auth/login",
        json={"email": email, "password": password}
    )
    
    if login_response.status_code == 200:
        return login_response.json().get("token")
    
    pytest.skip("Could not authenticate")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get auth headers"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module")
def escrow_account(auth_headers):
    """Create a test escrow account"""
    response = requests.post(
        f"{BASE_URL}/api/v1/escrow-accounts",
        headers=auth_headers,
        json={
            "name": f"Test Escrow {uuid.uuid4().hex[:8]}",
            "description": "Test escrow for integration tests"
        }
    )
    if response.status_code == 201:
        escrow = response.json()
        # Fund the escrow
        requests.post(
            f"{BASE_URL}/api/v1/escrow-accounts/{escrow['id']}/fund",
            headers=auth_headers,
            json={"amount_cents": 100000}
        )
        return escrow
    pytest.skip("Could not create escrow account")


@pytest.fixture(scope="module")
def org_id(auth_headers):
    """Get org_id from /me endpoint"""
    response = requests.get(
        f"{BASE_URL}/api/v1/auth/me",
        headers=auth_headers
    )
    if response.status_code == 200:
        data = response.json()
        # The /me endpoint returns org directly, not nested under "organization"
        return data.get("id") or data.get("organization", {}).get("id")
    pytest.skip("Could not get org_id")


# ============================================
# Health Check Tests
# ============================================

class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_returns_ok(self):
        """T0.1: Health check returns ok status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print("PASS: Health check returns ok")


# ============================================
# Agent ID Validation Tests
# ============================================

class TestAgentIdValidation:
    """Agent ID format validation tests"""
    
    def test_valid_agent_id_format(self, auth_headers, escrow_account):
        """T1.1: Valid agent_id format (agt_ + 24 hex) is accepted"""
        response = requests.post(
            f"{BASE_URL}/api/v1/spend",
            headers=auth_headers,
            json={
                "escrow_id": escrow_account["id"],
                "amount_cents": 100,
                "vendor": "Test Vendor",
                "agent_id": TEST_AGENT_ID
            }
        )
        # Should not fail due to agent_id format
        assert response.status_code in [201, 400]  # 400 only if other policy issues
        if response.status_code == 400:
            data = response.json()
            assert data.get("error") != "invalid_agent_id", "Valid agent_id was rejected"
        print("PASS: Valid agent_id format accepted")
    
    def test_invalid_agent_id_format_rejected(self, auth_headers, escrow_account):
        """T1.2: Invalid agent_id format returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/v1/spend",
            headers=auth_headers,
            json={
                "escrow_id": escrow_account["id"],
                "amount_cents": 100,
                "vendor": "Test Vendor",
                "agent_id": "invalid_agent_id"  # Wrong format
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert data.get("error") == "invalid_agent_id"
        print("PASS: Invalid agent_id format rejected with 400")
    
    def test_agent_id_without_prefix_rejected(self, auth_headers, escrow_account):
        """T1.3: agent_id without agt_ prefix is rejected"""
        response = requests.post(
            f"{BASE_URL}/api/v1/spend",
            headers=auth_headers,
            json={
                "escrow_id": escrow_account["id"],
                "amount_cents": 100,
                "vendor": "Test Vendor",
                "agent_id": "1a2b3c4d5e6f7890abcdef12"  # Missing agt_ prefix
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert data.get("error") == "invalid_agent_id"
        print("PASS: agent_id without prefix rejected")
    
    def test_agent_id_with_uppercase_rejected(self, auth_headers, escrow_account):
        """T1.4: agent_id with uppercase hex is rejected"""
        response = requests.post(
            f"{BASE_URL}/api/v1/spend",
            headers=auth_headers,
            json={
                "escrow_id": escrow_account["id"],
                "amount_cents": 100,
                "vendor": "Test Vendor",
                "agent_id": "agt_1A2B3C4D5E6F7890ABCDEF12"  # Uppercase
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert data.get("error") == "invalid_agent_id"
        print("PASS: agent_id with uppercase rejected")


# ============================================
# Escrow with Agent ID Tests
# ============================================

class TestEscrowWithAgentId:
    """Escrow account with agent_id tests"""
    
    def test_create_escrow_with_agent_id(self, auth_headers):
        """T2.1: Create escrow with agent_id field"""
        response = requests.post(
            f"{BASE_URL}/api/v1/escrow-accounts",
            headers=auth_headers,
            json={
                "name": f"Agent Escrow {uuid.uuid4().hex[:8]}",
                "agent_id": TEST_AGENT_ID
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data.get("agent_id") == TEST_AGENT_ID
        print("PASS: Escrow created with agent_id")
    
    def test_create_escrow_with_invalid_agent_id_rejected(self, auth_headers):
        """T2.2: Create escrow with invalid agent_id is rejected"""
        response = requests.post(
            f"{BASE_URL}/api/v1/escrow-accounts",
            headers=auth_headers,
            json={
                "name": f"Agent Escrow {uuid.uuid4().hex[:8]}",
                "agent_id": "invalid_format"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert data.get("error") == "invalid_agent_id"
        print("PASS: Escrow with invalid agent_id rejected")


# ============================================
# Spend with Agent ID Tests
# ============================================

class TestSpendWithAgentId:
    """Spend request with agent_id tests"""
    
    def test_spend_with_agent_id_returns_agent_id_in_response(self, auth_headers, escrow_account):
        """T3.1: Spend with agent_id returns agent_id in response"""
        response = requests.post(
            f"{BASE_URL}/api/v1/spend",
            headers=auth_headers,
            json={
                "escrow_id": escrow_account["id"],
                "amount_cents": 100,
                "vendor": "Test Vendor",
                "agent_id": TEST_AGENT_ID
            }
        )
        assert response.status_code in [201, 400]  # 400 if policy denial
        data = response.json()
        assert data.get("agent_id") == TEST_AGENT_ID
        print("PASS: Spend response includes agent_id")


# ============================================
# Agent-Scoped Endpoint Tests
# ============================================

class TestAgentScopedEndpoints:
    """Agent-scoped endpoint tests"""
    
    def test_get_agent_escrow_accounts(self, auth_headers):
        """T4.1: GET /v1/agents/{agent_id}/escrow-accounts returns escrows for agent"""
        response = requests.get(
            f"{BASE_URL}/api/v1/agents/{TEST_AGENT_ID}/escrow-accounts",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert data.get("agent_id") == TEST_AGENT_ID
        print("PASS: Agent escrow accounts endpoint works")
    
    def test_get_agent_escrow_accounts_invalid_agent_id(self, auth_headers):
        """T4.2: GET /v1/agents/{invalid}/escrow-accounts returns 400"""
        response = requests.get(
            f"{BASE_URL}/api/v1/agents/invalid_agent/escrow-accounts",
            headers=auth_headers
        )
        assert response.status_code == 400
        data = response.json()
        assert data.get("error") == "invalid_agent_id"
        print("PASS: Invalid agent_id rejected for escrow accounts")
    
    def test_get_agent_spend_history(self, auth_headers):
        """T4.3: GET /v1/agents/{agent_id}/spend-history returns paginated history"""
        response = requests.get(
            f"{BASE_URL}/api/v1/agents/{TEST_AGENT_ID}/spend-history",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert "limit" in data
        assert "offset" in data
        assert data.get("agent_id") == TEST_AGENT_ID
        print("PASS: Agent spend history endpoint works")
    
    def test_get_agent_spend_history_with_pagination(self, auth_headers):
        """T4.4: Agent spend history supports pagination params"""
        response = requests.get(
            f"{BASE_URL}/api/v1/agents/{TEST_AGENT_ID}/spend-history",
            headers=auth_headers,
            params={"limit": 10, "offset": 0, "status": "approved"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("limit") == 10
        assert data.get("offset") == 0
        print("PASS: Agent spend history pagination works")


# ============================================
# Agent Certificate Tests
# ============================================

class TestAgentCertificates:
    """Agent certificate mapping tests"""
    
    def test_create_certificate_mapping(self, auth_headers):
        """T5.1: POST /v1/agent-certificates creates mapping"""
        response = requests.post(
            f"{BASE_URL}/api/v1/agent-certificates",
            headers=auth_headers,
            json={
                "agent_id": TEST_AGENT_ID,
                "certificate_id": TEST_CERTIFICATE_ID
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data.get("agent_id") == TEST_AGENT_ID
        assert data.get("certificate_id") == TEST_CERTIFICATE_ID
        assert "mapped_at" in data
        print("PASS: Certificate mapping created")
    
    def test_get_certificate_mapping(self, auth_headers):
        """T5.2: GET /v1/agent-certificates/{agent_id} returns mapping"""
        # First create
        requests.post(
            f"{BASE_URL}/api/v1/agent-certificates",
            headers=auth_headers,
            json={
                "agent_id": TEST_AGENT_ID,
                "certificate_id": TEST_CERTIFICATE_ID
            }
        )
        
        response = requests.get(
            f"{BASE_URL}/api/v1/agent-certificates/{TEST_AGENT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("agent_id") == TEST_AGENT_ID
        assert data.get("certificate_id") == TEST_CERTIFICATE_ID
        print("PASS: Certificate mapping retrieved")
    
    def test_delete_certificate_mapping(self, auth_headers):
        """T5.3: DELETE /v1/agent-certificates/{agent_id} removes mapping"""
        # First create
        requests.post(
            f"{BASE_URL}/api/v1/agent-certificates",
            headers=auth_headers,
            json={
                "agent_id": TEST_AGENT_ID,
                "certificate_id": TEST_CERTIFICATE_ID
            }
        )
        
        response = requests.delete(
            f"{BASE_URL}/api/v1/agent-certificates/{TEST_AGENT_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("deleted") == True
        print("PASS: Certificate mapping deleted")
    
    def test_create_certificate_invalid_agent_id(self, auth_headers):
        """T5.4: Certificate with invalid agent_id rejected"""
        response = requests.post(
            f"{BASE_URL}/api/v1/agent-certificates",
            headers=auth_headers,
            json={
                "agent_id": "invalid",
                "certificate_id": TEST_CERTIFICATE_ID
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert data.get("error") == "invalid_agent_id"
        print("PASS: Invalid agent_id rejected for certificate")
    
    def test_create_certificate_invalid_certificate_id(self, auth_headers):
        """T5.5: Certificate with invalid certificate_id rejected"""
        response = requests.post(
            f"{BASE_URL}/api/v1/agent-certificates",
            headers=auth_headers,
            json={
                "agent_id": TEST_AGENT_ID,
                "certificate_id": "invalid"  # Missing cert_ prefix
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert data.get("error") == "invalid_certificate_id"
        print("PASS: Invalid certificate_id rejected")


# ============================================
# Internal Events Tests (HMAC Auth)
# ============================================

class TestInternalEvents:
    """Internal events endpoint tests (HMAC auth)"""
    
    def generate_hmac_signature(self, payload_str):
        """Generate HMAC-SHA256 signature from raw payload string"""
        return hmac.new(
            INTERNAL_EVENTS_SECRET.encode(),
            payload_str.encode(),
            hashlib.sha256
        ).hexdigest()
    
    def test_internal_event_with_valid_signature(self):
        """T6.1: POST /v1/internal/events with valid HMAC accepts arl.score.changed"""
        payload = {
            "event_type": "arl.score.changed",
            "org_id": "org_test123",
            "uaid": TEST_AGENT_ID,
            "data": {"score": 85}
        }
        payload_str = json.dumps(payload)
        signature = self.generate_hmac_signature(payload_str)
        
        response = requests.post(
            f"{BASE_URL}/api/v1/internal/events",
            headers={
                "Content-Type": "application/json",
                "X-AgenticTrust-Signature": signature
            },
            data=payload_str  # Use data to preserve exact string
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("received") == True
        assert data.get("event_type") == "arl.score.changed"
        print("PASS: Internal event with valid signature accepted")
    
    def test_internal_event_with_bad_signature(self):
        """T6.2: POST /v1/internal/events with bad signature returns 401"""
        payload = {
            "event_type": "arl.score.changed",
            "org_id": "org_test123",
            "uaid": TEST_AGENT_ID,
            "data": {"score": 85}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v1/internal/events",
            headers={
                "Content-Type": "application/json",
                "X-AgenticTrust-Signature": "invalid_signature"
            },
            json=payload
        )
        assert response.status_code == 401
        data = response.json()
        assert data.get("error") == "invalid_signature"
        print("PASS: Bad signature returns 401")
    
    def test_internal_event_unsupported_type(self):
        """T6.3: POST /v1/internal/events with unsupported event type returns 400"""
        payload = {
            "event_type": "unsupported.event.type",
            "org_id": "org_test123",
            "data": {}
        }
        payload_str = json.dumps(payload)
        signature = self.generate_hmac_signature(payload_str)
        
        response = requests.post(
            f"{BASE_URL}/api/v1/internal/events",
            headers={
                "Content-Type": "application/json",
                "X-AgenticTrust-Signature": signature
            },
            data=payload_str
        )
        assert response.status_code == 400
        data = response.json()
        assert data.get("error") == "unsupported_event_type"
        print("PASS: Unsupported event type returns 400")
    
    def test_internal_event_aav_grant_revoked(self):
        """T6.4: aav.grant.revoked event is accepted"""
        payload = {
            "event_type": "aav.grant.revoked",
            "org_id": "org_test123",
            "uaid": TEST_AGENT_ID,
            "data": {"grant_id": "grant_test123"}
        }
        payload_str = json.dumps(payload)
        signature = self.generate_hmac_signature(payload_str)
        
        response = requests.post(
            f"{BASE_URL}/api/v1/internal/events",
            headers={
                "Content-Type": "application/json",
                "X-AgenticTrust-Signature": signature
            },
            data=payload_str
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("received") == True
        print("PASS: aav.grant.revoked event accepted")
    
    def test_internal_event_aav_grant_created(self):
        """T6.5: aav.grant.created event is accepted"""
        payload = {
            "event_type": "aav.grant.created",
            "org_id": "org_test123",
            "uaid": TEST_AGENT_ID,
            "data": {"grant_id": "grant_test123"}
        }
        payload_str = json.dumps(payload)
        signature = self.generate_hmac_signature(payload_str)
        
        response = requests.post(
            f"{BASE_URL}/api/v1/internal/events",
            headers={
                "Content-Type": "application/json",
                "X-AgenticTrust-Signature": signature
            },
            data=payload_str
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("received") == True
        print("PASS: aav.grant.created event accepted")


# ============================================
# Organization Linking Tests
# ============================================

class TestOrgLinking:
    """Organization linking tests"""
    
    def test_get_org_link_status(self, auth_headers):
        """T7.1: GET /v1/org/link returns link status"""
        response = requests.get(
            f"{BASE_URL}/api/v1/org/link",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "linked" in data
        print("PASS: Org link status retrieved")
    
    def test_link_org_with_valid_token(self, auth_headers):
        """T7.2: POST /v1/org/link with valid link_token links org"""
        response = requests.post(
            f"{BASE_URL}/api/v1/org/link",
            headers=auth_headers,
            json={"link_token": "lnk_test123456789012345678"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("linked") == True
        assert "organization_id" in data
        print("PASS: Org linked with valid token")
    
    def test_link_org_missing_token(self, auth_headers):
        """T7.3: POST /v1/org/link without link_token returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/v1/org/link",
            headers=auth_headers,
            json={}
        )
        assert response.status_code == 400
        print("PASS: Missing link_token returns 400")
    
    def test_link_org_invalid_token_format(self, auth_headers):
        """T7.4: POST /v1/org/link with invalid token format returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/v1/org/link",
            headers=auth_headers,
            json={"link_token": "invalid_token"}  # Missing lnk_ prefix
        )
        assert response.status_code == 400
        data = response.json()
        assert data.get("error") == "invalid_link_token"
        print("PASS: Invalid link_token format returns 400")


# ============================================
# Control Plane API Tests
# ============================================

class TestControlPlane:
    """Control Plane API tests"""
    
    def test_get_org_summary(self, auth_headers, org_id):
        """T8.1: GET /v1/control-plane/org/{org_id}/summary returns stats"""
        response = requests.get(
            f"{BASE_URL}/api/v1/control-plane/org/{org_id}/summary",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("tool") == "safe_spend"
        assert data.get("org_id") == org_id
        assert "total_balance_cents" in data
        assert "active_escrows" in data
        assert "spends_today" in data
        assert "spends_this_week" in data
        assert "denial_rate_7d" in data
        print("PASS: Org summary endpoint works")
    
    def test_get_agent_card_data(self, auth_headers):
        """T8.2: GET /v1/control-plane/agents/{agent_id}/card-data returns card data"""
        response = requests.get(
            f"{BASE_URL}/api/v1/control-plane/agents/{TEST_AGENT_ID}/card-data",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("tool") == "safe_spend"
        assert data.get("agent_id") == TEST_AGENT_ID
        assert "financial" in data
        financial = data["financial"]
        assert "has_funded_escrow" in financial
        assert "escrow_status" in financial
        assert "escrow_count" in financial
        assert "remaining_balance_available" in financial
        print("PASS: Agent card-data endpoint works")
    
    def test_get_agent_card_data_invalid_agent_id(self, auth_headers):
        """T8.3: GET /v1/control-plane/agents/{invalid}/card-data returns 400"""
        response = requests.get(
            f"{BASE_URL}/api/v1/control-plane/agents/invalid_agent/card-data",
            headers=auth_headers
        )
        assert response.status_code == 400
        data = response.json()
        assert data.get("error") == "invalid_agent_id"
        print("PASS: Invalid agent_id rejected for card-data")


# ============================================
# Policy with Reputation Fields Tests
# ============================================

class TestPoliciesWithReputationFields:
    """Policy with reputation fields tests"""
    
    def test_create_policy_with_min_reputation_score(self, auth_headers, escrow_account):
        """T9.1: Create policy with min_reputation_score field"""
        response = requests.post(
            f"{BASE_URL}/api/v1/policies",
            headers=auth_headers,
            json={
                "escrow_id": escrow_account["id"],
                "name": f"Reputation Policy {uuid.uuid4().hex[:8]}",
                "min_reputation_score": 50,
                "draft": False
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data.get("min_reputation_score") == 50
        print("PASS: Policy created with min_reputation_score")
    
    def test_create_policy_with_reputation_spending_boost(self, auth_headers, escrow_account):
        """T9.2: Create policy with reputation_spending_boost field"""
        response = requests.post(
            f"{BASE_URL}/api/v1/policies",
            headers=auth_headers,
            json={
                "escrow_id": escrow_account["id"],
                "name": f"Boost Policy {uuid.uuid4().hex[:8]}",
                "reputation_spending_boost": True,
                "auto_approve_under_cents": 10000,
                "draft": False
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data.get("reputation_spending_boost") == True
        print("PASS: Policy created with reputation_spending_boost")
    
    def test_create_policy_with_both_reputation_fields(self, auth_headers, escrow_account):
        """T9.3: Create policy with both reputation fields"""
        response = requests.post(
            f"{BASE_URL}/api/v1/policies",
            headers=auth_headers,
            json={
                "escrow_id": escrow_account["id"],
                "name": f"Full Reputation Policy {uuid.uuid4().hex[:8]}",
                "min_reputation_score": 75,
                "reputation_spending_boost": True,
                "auto_approve_under_cents": 5000,
                "draft": False
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data.get("min_reputation_score") == 75
        assert data.get("reputation_spending_boost") == True
        print("PASS: Policy created with both reputation fields")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
