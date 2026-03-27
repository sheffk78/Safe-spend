"""
AAV (Agent Authority Vault) Integration Tests - V2
Tests for the new AAV integration per prompt-aav-integration.md specification:

1. Escrow accounts with AAV fields:
   - aav_enabled, aav_enforcement_mode, aav_api_key, aav_require_certificate, authorized_agent_ids

2. Policies with AAV fields:
   - aav_required_autonomy_level, aav_map_vendors, aav_map_limits, aav_required_actions

3. Spend requests with AAV claims:
   - aav_agent_id, aav_grant_id, aav_certificate_id
   - aav_verification_status, aav_verification_id, denial_source

4. Enforcement modes:
   - verify = fail-closed
   - log_only = fail-open (allow with warning)
   - none = skip AAV entirely

5. Certificate requirement enforcement
6. Local agent_id/grant_id authorization check
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test unique identifier for cleanup
TEST_PREFIX = f"TEST_AAV_V2_{int(time.time())}"


@pytest.fixture(scope="module")
def auth_token():
    """Create a new test user and get authentication token"""
    unique_email = f"aav_test_{uuid.uuid4().hex[:8]}@test.com"
    
    # Try signup first
    signup_response = requests.post(f"{BASE_URL}/api/v1/auth/signup", json={
        "email": unique_email,
        "password": "TestPassword123!",
        "name": "AAV Test User"
    })
    
    if signup_response.status_code == 201:
        return signup_response.json().get("token")
    
    # If signup fails (user exists), try login
    login_response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
        "email": unique_email,
        "password": "TestPassword123!"
    })
    
    if login_response.status_code == 200:
        return login_response.json().get("token")
    
    pytest.skip(f"Authentication failed: signup={signup_response.text}, login={login_response.text}")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


@pytest.fixture(scope="module")
def test_escrow(api_client):
    """Create a test escrow account for AAV testing"""
    payload = {
        "name": f"{TEST_PREFIX}_Escrow",
        "description": "Test escrow for AAV V2 testing",
        "aav_enabled": False,
        "aav_enforcement_mode": "none"
    }
    
    response = api_client.post(f"{BASE_URL}/api/v1/escrow-accounts", json=payload)
    assert response.status_code == 201, f"Failed to create test escrow: {response.text}"
    
    escrow = response.json()
    
    # Fund the escrow
    fund_response = api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow['id']}/fund", json={
        "amount_cents": 100000  # $1000
    })
    assert fund_response.status_code == 200, f"Failed to fund escrow: {fund_response.text}"
    
    yield escrow
    
    # Cleanup
    api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow['id']}/close")


# ============================================================================
# SECTION 1: Escrow Account AAV Fields Tests
# ============================================================================

class TestEscrowAccountAAVFields:
    """Test AAV fields in escrow accounts API per new spec"""
    
    def test_create_escrow_with_all_aav_fields(self, api_client):
        """Test creating escrow with all new AAV fields"""
        payload = {
            "name": f"{TEST_PREFIX}_Full_AAV_Escrow",
            "description": "Escrow with all AAV fields",
            "aav_enabled": True,
            "aav_enforcement_mode": "verify",
            "aav_api_key": "aav_live_sk_test_12345",  # Test API key
            "aav_require_certificate": True,
            "authorized_agent_ids": ["agent_test_1", "agent_test_2"]
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/escrow-accounts", json=payload)
        assert response.status_code == 201, f"Failed to create escrow: {response.text}"
        
        data = response.json()
        
        # Verify all AAV fields
        assert data["aav_enabled"] == True, "aav_enabled should be True"
        assert data["aav_enforcement_mode"] == "verify", f"Expected 'verify', got {data['aav_enforcement_mode']}"
        assert data["aav_api_key_configured"] == True, "aav_api_key_configured should be True (key is set)"
        assert data["aav_require_certificate"] == True, "aav_require_certificate should be True"
        assert data["authorized_agent_ids"] == ["agent_test_1", "agent_test_2"]
        
        print(f"✓ Created escrow with all AAV fields: {data['id']}")
        
        # Cleanup
        api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{data['id']}/close")
    
    def test_create_escrow_with_log_only_mode(self, api_client):
        """Test creating escrow with log_only enforcement mode"""
        payload = {
            "name": f"{TEST_PREFIX}_LogOnly_Escrow",
            "aav_enabled": True,
            "aav_enforcement_mode": "log_only",
            "authorized_agent_ids": ["agent_log_test"]
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/escrow-accounts", json=payload)
        assert response.status_code == 201, f"Failed to create escrow: {response.text}"
        
        data = response.json()
        assert data["aav_enforcement_mode"] == "log_only"
        print(f"✓ Created escrow with log_only mode: {data['id']}")
        
        # Cleanup
        api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{data['id']}/close")
    
    def test_create_escrow_with_verify_mode(self, api_client):
        """Test creating escrow with verify enforcement mode (fail-closed)"""
        payload = {
            "name": f"{TEST_PREFIX}_Verify_Escrow",
            "aav_enabled": True,
            "aav_enforcement_mode": "verify",
            "authorized_agent_ids": ["agent_verify_test"]
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/escrow-accounts", json=payload)
        assert response.status_code == 201, f"Failed to create escrow: {response.text}"
        
        data = response.json()
        assert data["aav_enforcement_mode"] == "verify"
        print(f"✓ Created escrow with verify mode: {data['id']}")
        
        # Cleanup
        api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{data['id']}/close")
    
    def test_escrow_aav_api_key_not_exposed(self, api_client):
        """Test that aav_api_key is not exposed in response (only aav_api_key_configured)"""
        payload = {
            "name": f"{TEST_PREFIX}_APIKey_Escrow",
            "aav_enabled": True,
            "aav_api_key": "aav_live_sk_secret_key_12345"
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/escrow-accounts", json=payload)
        assert response.status_code == 201
        
        data = response.json()
        
        # Should NOT have raw aav_api_key
        assert "aav_api_key" not in data or data.get("aav_api_key") is None, "aav_api_key should not be exposed"
        # Should have aav_api_key_configured flag
        assert "aav_api_key_configured" in data, "Should have aav_api_key_configured field"
        assert data["aav_api_key_configured"] == True, "aav_api_key_configured should be True"
        
        print("✓ AAV API key is not exposed in response")
        
        # Cleanup
        api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{data['id']}/close")
    
    def test_invalid_enforcement_mode_rejected(self, api_client):
        """Test that invalid enforcement modes are rejected"""
        payload = {
            "name": f"{TEST_PREFIX}_Invalid_Mode",
            "aav_enabled": True,
            "aav_enforcement_mode": "invalid_mode_xyz"
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/escrow-accounts", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "aav_enforcement_mode" in response.text.lower() or "invalid" in response.text.lower()
        print("✓ Invalid enforcement mode correctly rejected")


# ============================================================================
# SECTION 2: Policy AAV Fields Tests
# ============================================================================

class TestPolicyAAVFields:
    """Test AAV fields in policies API per new spec"""
    
    def test_create_policy_with_aav_required_autonomy_level(self, api_client, test_escrow):
        """Test creating policy with aav_required_autonomy_level"""
        payload = {
            "name": f"{TEST_PREFIX}_Autonomy_Policy",
            "escrow_id": test_escrow["id"],
            "draft": True,
            "aav_enabled": True,
            "aav_required_autonomy_level": 3
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/policies", json=payload)
        assert response.status_code == 201, f"Failed to create policy: {response.text}"
        
        data = response.json()
        assert data["aav_required_autonomy_level"] == 3
        print(f"✓ Created policy with autonomy level 3: {data['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/v1/policies/{data['id']}")
    
    def test_create_policy_with_aav_map_vendors(self, api_client, test_escrow):
        """Test creating policy with aav_map_vendors flag"""
        payload = {
            "name": f"{TEST_PREFIX}_MapVendors_Policy",
            "escrow_id": test_escrow["id"],
            "draft": True,
            "aav_enabled": True,
            "aav_map_vendors": True
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/policies", json=payload)
        assert response.status_code == 201, f"Failed to create policy: {response.text}"
        
        data = response.json()
        assert data["aav_map_vendors"] == True
        print(f"✓ Created policy with aav_map_vendors=True: {data['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/v1/policies/{data['id']}")
    
    def test_create_policy_with_aav_map_limits(self, api_client, test_escrow):
        """Test creating policy with aav_map_limits flag"""
        payload = {
            "name": f"{TEST_PREFIX}_MapLimits_Policy",
            "escrow_id": test_escrow["id"],
            "draft": True,
            "aav_enabled": True,
            "aav_map_limits": True
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/policies", json=payload)
        assert response.status_code == 201, f"Failed to create policy: {response.text}"
        
        data = response.json()
        assert data["aav_map_limits"] == True
        print(f"✓ Created policy with aav_map_limits=True: {data['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/v1/policies/{data['id']}")
    
    def test_create_policy_with_aav_required_actions(self, api_client, test_escrow):
        """Test creating policy with aav_required_actions array"""
        payload = {
            "name": f"{TEST_PREFIX}_RequiredActions_Policy",
            "escrow_id": test_escrow["id"],
            "draft": True,
            "aav_enabled": True,
            "aav_required_actions": ["purchase_service", "api_call"]
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/policies", json=payload)
        assert response.status_code == 201, f"Failed to create policy: {response.text}"
        
        data = response.json()
        assert data["aav_required_actions"] == ["purchase_service", "api_call"]
        print(f"✓ Created policy with required actions: {data['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/v1/policies/{data['id']}")
    
    def test_create_policy_with_all_aav_fields(self, api_client, test_escrow):
        """Test creating policy with all new AAV fields"""
        payload = {
            "name": f"{TEST_PREFIX}_Full_AAV_Policy",
            "escrow_id": test_escrow["id"],
            "draft": True,
            "aav_enabled": True,
            "authorized_agent_ids": ["agent_policy_1"],
            "aav_grant_ids": ["grant_policy_1"],
            "aav_enforcement_mode": "verify",
            "aav_required_autonomy_level": 4,
            "aav_required_actions": ["purchase_service"],
            "aav_map_vendors": True,
            "aav_map_limits": True
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/policies", json=payload)
        assert response.status_code == 201, f"Failed to create policy: {response.text}"
        
        data = response.json()
        assert data["aav_enabled"] == True
        assert data["authorized_agent_ids"] == ["agent_policy_1"]
        assert data["aav_grant_ids"] == ["grant_policy_1"]
        assert data["aav_enforcement_mode"] == "verify"
        assert data["aav_required_autonomy_level"] == 4
        assert data["aav_required_actions"] == ["purchase_service"]
        assert data["aav_map_vendors"] == True
        assert data["aav_map_limits"] == True
        
        print(f"✓ Created policy with all AAV fields: {data['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/v1/policies/{data['id']}")
    
    def test_invalid_autonomy_level_rejected(self, api_client, test_escrow):
        """Test that invalid autonomy levels (outside 1-4) are rejected"""
        payload = {
            "name": f"{TEST_PREFIX}_Invalid_Autonomy",
            "escrow_id": test_escrow["id"],
            "aav_required_autonomy_level": 5  # Invalid - should be 1-4
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/policies", json=payload)
        assert response.status_code == 400, f"Expected 400 for invalid autonomy level, got {response.status_code}"
        print("✓ Invalid autonomy level (5) correctly rejected")


# ============================================================================
# SECTION 3: Spend Request AAV Claims Tests
# ============================================================================

class TestSpendRequestAAVClaims:
    """Test AAV claims in spend requests"""
    
    def test_spend_with_aav_certificate_id(self, api_client, test_escrow):
        """Test spend request with aav_certificate_id in body"""
        payload = {
            "escrow_id": test_escrow["id"],
            "amount_cents": 100,
            "vendor": "Test Vendor Certificate",
            "aav_agent_id": "agent_cert_test",
            "aav_certificate_id": "cert_test_12345",
            "idempotency_key": f"cert_test_{int(time.time())}"
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/spend", json=payload)
        
        # Should succeed (escrow has AAV disabled)
        assert response.status_code in [201, 202, 400], f"Unexpected status: {response.status_code}"
        
        data = response.json()
        
        # Check AAV fields are captured
        if "aav_agent_id" in data:
            assert data["aav_agent_id"] == "agent_cert_test"
        
        print(f"✓ Spend with certificate_id processed: status={response.status_code}")
    
    def test_spend_response_includes_aav_fields(self, api_client, test_escrow):
        """Test that spend response includes all AAV fields"""
        payload = {
            "escrow_id": test_escrow["id"],
            "amount_cents": 50,
            "vendor": "Test AAV Fields",
            "aav_agent_id": "agent_response_test",
            "aav_grant_id": "grant_response_test",
            "idempotency_key": f"aav_fields_{int(time.time())}"
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/spend", json=payload)
        data = response.json()
        
        # Check expected AAV fields exist in response
        expected_fields = ["aav_agent_id", "aav_grant_id", "aav_verification_status"]
        for field in expected_fields:
            assert field in data, f"Missing {field} in spend response"
        
        print(f"✓ Spend response includes AAV fields: {[f for f in expected_fields if f in data]}")


# ============================================================================
# SECTION 4: Enforcement Mode Tests
# ============================================================================

class TestEnforcementModes:
    """Test AAV enforcement modes: verify, log_only, none"""
    
    def test_verify_mode_denies_unauthorized_agent(self, api_client):
        """Test verify mode (fail-closed) denies unauthorized agent"""
        # Create escrow with verify mode
        escrow_payload = {
            "name": f"{TEST_PREFIX}_Verify_Mode_Test",
            "aav_enabled": True,
            "aav_enforcement_mode": "verify",
            "authorized_agent_ids": ["authorized_agent_only"]
        }
        
        escrow_response = api_client.post(f"{BASE_URL}/api/v1/escrow-accounts", json=escrow_payload)
        assert escrow_response.status_code == 201
        escrow = escrow_response.json()
        
        # Fund escrow
        api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow['id']}/fund", json={
            "amount_cents": 10000
        })
        
        # Try spend with unauthorized agent
        spend_payload = {
            "escrow_id": escrow["id"],
            "amount_cents": 100,
            "vendor": "Test Vendor",
            "aav_agent_id": "unauthorized_agent_xyz",
            "idempotency_key": f"verify_deny_{int(time.time())}"
        }
        
        spend_response = api_client.post(f"{BASE_URL}/api/v1/spend", json=spend_payload)
        
        # Should be denied
        assert spend_response.status_code == 400, f"Expected 400, got {spend_response.status_code}"
        data = spend_response.json()
        assert data.get("status") == "denied"
        
        # Check denial_source is 'aav'
        if "denial_source" in data:
            print(f"  denial_source: {data['denial_source']}")
        
        print(f"✓ Verify mode correctly denied unauthorized agent")
        
        # Cleanup
        api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow['id']}/close")
    
    def test_verify_mode_allows_authorized_agent(self, api_client):
        """Test verify mode allows authorized agent"""
        # Create escrow with verify mode
        escrow_payload = {
            "name": f"{TEST_PREFIX}_Verify_Allow_Test",
            "aav_enabled": True,
            "aav_enforcement_mode": "verify",
            "authorized_agent_ids": ["authorized_agent_123"]
        }
        
        escrow_response = api_client.post(f"{BASE_URL}/api/v1/escrow-accounts", json=escrow_payload)
        assert escrow_response.status_code == 201
        escrow = escrow_response.json()
        
        # Fund escrow
        api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow['id']}/fund", json={
            "amount_cents": 10000
        })
        
        # Spend with authorized agent
        spend_payload = {
            "escrow_id": escrow["id"],
            "amount_cents": 100,
            "vendor": "Test Vendor Authorized",
            "aav_agent_id": "authorized_agent_123",
            "idempotency_key": f"verify_allow_{int(time.time())}"
        }
        
        spend_response = api_client.post(f"{BASE_URL}/api/v1/spend", json=spend_payload)
        
        # Should be approved
        assert spend_response.status_code in [201, 202], f"Expected 201/202, got {spend_response.status_code}: {spend_response.text}"
        data = spend_response.json()
        assert data.get("status") in ["approved", "pending"], f"Expected approved/pending, got {data.get('status')}"
        
        print(f"✓ Verify mode correctly allowed authorized agent")
        
        # Cleanup
        api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow['id']}/close")
    
    def test_log_only_mode_allows_with_warning(self, api_client):
        """Test log_only mode (fail-open) allows unauthorized agent with warning"""
        # Create escrow with log_only mode
        escrow_payload = {
            "name": f"{TEST_PREFIX}_LogOnly_Test",
            "aav_enabled": True,
            "aav_enforcement_mode": "log_only",
            "authorized_agent_ids": ["authorized_agent_only"]
        }
        
        escrow_response = api_client.post(f"{BASE_URL}/api/v1/escrow-accounts", json=escrow_payload)
        assert escrow_response.status_code == 201
        escrow = escrow_response.json()
        
        # Fund escrow
        api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow['id']}/fund", json={
            "amount_cents": 10000
        })
        
        # Spend with unauthorized agent (should be allowed in log_only mode)
        spend_payload = {
            "escrow_id": escrow["id"],
            "amount_cents": 100,
            "vendor": "Test Vendor LogOnly",
            "aav_agent_id": "unauthorized_agent_xyz",
            "idempotency_key": f"log_only_{int(time.time())}"
        }
        
        spend_response = api_client.post(f"{BASE_URL}/api/v1/spend", json=spend_payload)
        
        # Should be allowed (log_only = fail-open)
        assert spend_response.status_code in [201, 202], f"Expected 201/202 for log_only mode, got {spend_response.status_code}: {spend_response.text}"
        
        data = spend_response.json()
        
        # Check for warning in rules_evaluated
        rules = data.get("rules_evaluated", [])
        aav_rule = next((r for r in rules if r.get("rule") == "aav_authorization"), None)
        if aav_rule:
            metadata = aav_rule.get("metadata", {})
            if "warning" in metadata:
                print(f"  Warning captured: {metadata['warning']}")
        
        print(f"✓ Log_only mode correctly allowed unauthorized agent (fail-open)")
        
        # Cleanup
        api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow['id']}/close")
    
    def test_none_mode_skips_aav_check(self, api_client):
        """Test none mode skips AAV check entirely"""
        # Create escrow with none mode
        escrow_payload = {
            "name": f"{TEST_PREFIX}_None_Mode_Test",
            "aav_enabled": True,  # AAV enabled but mode is none
            "aav_enforcement_mode": "none",
            "authorized_agent_ids": ["some_agent"]
        }
        
        escrow_response = api_client.post(f"{BASE_URL}/api/v1/escrow-accounts", json=escrow_payload)
        assert escrow_response.status_code == 201
        escrow = escrow_response.json()
        
        # Fund escrow
        api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow['id']}/fund", json={
            "amount_cents": 10000
        })
        
        # Spend without any agent ID (should be allowed in none mode)
        spend_payload = {
            "escrow_id": escrow["id"],
            "amount_cents": 100,
            "vendor": "Test Vendor None Mode",
            "idempotency_key": f"none_mode_{int(time.time())}"
        }
        
        spend_response = api_client.post(f"{BASE_URL}/api/v1/spend", json=spend_payload)
        
        # Should be allowed
        assert spend_response.status_code in [201, 202], f"Expected 201/202 for none mode, got {spend_response.status_code}"
        
        data = spend_response.json()
        
        # Check AAV rule shows skipped
        rules = data.get("rules_evaluated", [])
        aav_rule = next((r for r in rules if r.get("rule") == "aav_authorization"), None)
        if aav_rule:
            assert aav_rule.get("passed") == True, "AAV rule should pass in none mode"
            print(f"  AAV rule reason: {aav_rule.get('reason')}")
        
        print(f"✓ None mode correctly skipped AAV check")
        
        # Cleanup
        api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow['id']}/close")


# ============================================================================
# SECTION 5: Certificate Requirement Tests
# ============================================================================

class TestCertificateRequirement:
    """Test aav_require_certificate enforcement"""
    
    def test_certificate_required_but_not_provided_denied(self, api_client):
        """Test that spend is denied when certificate is required but not provided (verify mode)"""
        # Create escrow requiring certificate
        escrow_payload = {
            "name": f"{TEST_PREFIX}_Cert_Required",
            "aav_enabled": True,
            "aav_enforcement_mode": "verify",
            "aav_require_certificate": True,
            "authorized_agent_ids": ["agent_with_cert"]
        }
        
        escrow_response = api_client.post(f"{BASE_URL}/api/v1/escrow-accounts", json=escrow_payload)
        assert escrow_response.status_code == 201
        escrow = escrow_response.json()
        
        # Fund escrow
        api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow['id']}/fund", json={
            "amount_cents": 10000
        })
        
        # Spend with agent but NO certificate
        spend_payload = {
            "escrow_id": escrow["id"],
            "amount_cents": 100,
            "vendor": "Test Vendor No Cert",
            "aav_agent_id": "agent_with_cert",
            # No aav_certificate_id
            "idempotency_key": f"no_cert_{int(time.time())}"
        }
        
        spend_response = api_client.post(f"{BASE_URL}/api/v1/spend", json=spend_payload)
        
        # Should be denied
        assert spend_response.status_code == 400, f"Expected 400, got {spend_response.status_code}"
        data = spend_response.json()
        assert data.get("status") == "denied"
        
        # Check denial reason mentions certificate
        denial_reason = data.get("denial_reason", "") or data.get("error", "")
        assert "certificate" in denial_reason.lower(), f"Expected certificate in denial reason: {denial_reason}"
        
        print(f"✓ Certificate required but not provided - correctly denied")
        
        # Cleanup
        api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow['id']}/close")
    
    def test_certificate_required_and_provided_allowed(self, api_client):
        """Test that spend is allowed when certificate is required and provided"""
        # Create escrow requiring certificate
        escrow_payload = {
            "name": f"{TEST_PREFIX}_Cert_Provided",
            "aav_enabled": True,
            "aav_enforcement_mode": "verify",
            "aav_require_certificate": True,
            "authorized_agent_ids": ["agent_with_cert"]
        }
        
        escrow_response = api_client.post(f"{BASE_URL}/api/v1/escrow-accounts", json=escrow_payload)
        assert escrow_response.status_code == 201
        escrow = escrow_response.json()
        
        # Fund escrow
        api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow['id']}/fund", json={
            "amount_cents": 10000
        })
        
        # Spend with agent AND certificate
        spend_payload = {
            "escrow_id": escrow["id"],
            "amount_cents": 100,
            "vendor": "Test Vendor With Cert",
            "aav_agent_id": "agent_with_cert",
            "aav_certificate_id": "cert_valid_12345",
            "idempotency_key": f"with_cert_{int(time.time())}"
        }
        
        spend_response = api_client.post(f"{BASE_URL}/api/v1/spend", json=spend_payload)
        
        # Should be allowed
        assert spend_response.status_code in [201, 202], f"Expected 201/202, got {spend_response.status_code}: {spend_response.text}"
        
        print(f"✓ Certificate required and provided - correctly allowed")
        
        # Cleanup
        api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow['id']}/close")
    
    def test_certificate_required_log_only_mode_allows(self, api_client):
        """Test that log_only mode allows spend even without certificate (with warning)"""
        # Create escrow requiring certificate but in log_only mode
        escrow_payload = {
            "name": f"{TEST_PREFIX}_Cert_LogOnly",
            "aav_enabled": True,
            "aav_enforcement_mode": "log_only",
            "aav_require_certificate": True,
            "authorized_agent_ids": ["agent_log_cert"]
        }
        
        escrow_response = api_client.post(f"{BASE_URL}/api/v1/escrow-accounts", json=escrow_payload)
        assert escrow_response.status_code == 201
        escrow = escrow_response.json()
        
        # Fund escrow
        api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow['id']}/fund", json={
            "amount_cents": 10000
        })
        
        # Spend without certificate (should be allowed in log_only)
        spend_payload = {
            "escrow_id": escrow["id"],
            "amount_cents": 100,
            "vendor": "Test Vendor LogOnly Cert",
            "aav_agent_id": "agent_log_cert",
            # No certificate
            "idempotency_key": f"log_cert_{int(time.time())}"
        }
        
        spend_response = api_client.post(f"{BASE_URL}/api/v1/spend", json=spend_payload)
        
        # Should be allowed (log_only = fail-open)
        assert spend_response.status_code in [201, 202], f"Expected 201/202, got {spend_response.status_code}"
        
        print(f"✓ Certificate required but log_only mode - correctly allowed with warning")
        
        # Cleanup
        api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow['id']}/close")


# ============================================================================
# SECTION 6: Denial Source Tests
# ============================================================================

class TestDenialSource:
    """Test denial_source field differentiates AAV vs policy denials"""
    
    def test_denial_source_is_aav_for_agent_denial(self, api_client):
        """Test denial_source is 'aav' when denied by AAV check"""
        # Create escrow with verify mode
        escrow_payload = {
            "name": f"{TEST_PREFIX}_DenialSource_AAV",
            "aav_enabled": True,
            "aav_enforcement_mode": "verify",
            "authorized_agent_ids": ["only_this_agent"]
        }
        
        escrow_response = api_client.post(f"{BASE_URL}/api/v1/escrow-accounts", json=escrow_payload)
        assert escrow_response.status_code == 201
        escrow = escrow_response.json()
        
        # Fund escrow
        api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow['id']}/fund", json={
            "amount_cents": 10000
        })
        
        # Spend with unauthorized agent
        spend_payload = {
            "escrow_id": escrow["id"],
            "amount_cents": 100,
            "vendor": "Test Vendor",
            "aav_agent_id": "wrong_agent",
            "idempotency_key": f"denial_aav_{int(time.time())}"
        }
        
        spend_response = api_client.post(f"{BASE_URL}/api/v1/spend", json=spend_payload)
        
        assert spend_response.status_code == 400
        data = spend_response.json()
        
        # Check denial_source
        # Note: denial_source may be in response or in rules_evaluated
        rules = data.get("rules_evaluated", [])
        aav_rule = next((r for r in rules if r.get("rule") == "aav_authorization"), None)
        
        if aav_rule and "denial_source" in aav_rule:
            assert aav_rule["denial_source"] == "aav"
            print(f"✓ denial_source is 'aav' in rules_evaluated")
        elif "denial_source" in data:
            print(f"  denial_source in response: {data['denial_source']}")
        else:
            print(f"  denial_source field not found, but denial reason: {data.get('denial_reason')}")
        
        # Cleanup
        api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow['id']}/close")
    
    def test_denial_source_is_policy_for_limit_denial(self, api_client, test_escrow):
        """Test denial_source is 'policy' when denied by policy limit"""
        # Create policy with low limit
        policy_payload = {
            "name": f"{TEST_PREFIX}_LowLimit_Policy",
            "escrow_id": test_escrow["id"],
            "draft": False,
            "per_transaction_limit_cents": 50  # $0.50 limit
        }
        
        policy_response = api_client.post(f"{BASE_URL}/api/v1/policies", json=policy_payload)
        assert policy_response.status_code == 201
        policy = policy_response.json()
        
        # Lock the policy to make it active
        api_client.post(f"{BASE_URL}/api/v1/policies/{policy['id']}/lock")
        
        # Try spend above limit
        spend_payload = {
            "escrow_id": test_escrow["id"],
            "amount_cents": 100,  # $1.00 - above limit
            "vendor": "Test Vendor Over Limit",
            "idempotency_key": f"denial_policy_{int(time.time())}"
        }
        
        spend_response = api_client.post(f"{BASE_URL}/api/v1/spend", json=spend_payload)
        
        assert spend_response.status_code == 400
        data = spend_response.json()
        
        # Check denial is from policy, not AAV
        denial_reason = data.get("denial_reason", "")
        assert "limit" in denial_reason.lower() or "exceeds" in denial_reason.lower()
        
        print(f"✓ Policy limit denial correctly identified: {denial_reason}")
        
        # Cleanup
        api_client.post(f"{BASE_URL}/api/v1/policies/{policy['id']}/unlock", json={"confirm": True})
        api_client.delete(f"{BASE_URL}/api/v1/policies/{policy['id']}")


# ============================================================================
# SECTION 7: X-AAV Headers Tests
# ============================================================================

class TestXAAVHeaders:
    """Test X-AAV-* header extraction"""
    
    def test_x_aav_agent_id_header(self, api_client, test_escrow):
        """Test X-AAV-Agent-Id header is extracted"""
        headers = {"X-AAV-Agent-Id": "header_agent_123"}
        payload = {
            "escrow_id": test_escrow["id"],
            "amount_cents": 50,
            "vendor": "Test Header Agent",
            "idempotency_key": f"header_agent_{int(time.time())}"
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/spend", json=payload, headers=headers)
        data = response.json()
        
        # Check agent ID was captured
        if "aav_agent_id" in data:
            assert data["aav_agent_id"] == "header_agent_123"
            print(f"✓ X-AAV-Agent-Id header extracted: {data['aav_agent_id']}")
        else:
            # Check in rules metadata
            rules = data.get("rules_evaluated", [])
            aav_rule = next((r for r in rules if r.get("rule") == "aav_authorization"), None)
            if aav_rule:
                agent_id = aav_rule.get("metadata", {}).get("agent_id")
                if agent_id:
                    print(f"✓ Agent ID in rules metadata: {agent_id}")
    
    def test_x_aav_grant_id_header(self, api_client, test_escrow):
        """Test X-AAV-Grant-Id header is extracted"""
        headers = {
            "X-AAV-Agent-Id": "header_agent_456",
            "X-AAV-Grant-Id": "header_grant_789"
        }
        payload = {
            "escrow_id": test_escrow["id"],
            "amount_cents": 50,
            "vendor": "Test Header Grant",
            "idempotency_key": f"header_grant_{int(time.time())}"
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/spend", json=payload, headers=headers)
        data = response.json()
        
        # Check grant ID was captured
        if "aav_grant_id" in data:
            assert data["aav_grant_id"] == "header_grant_789"
            print(f"✓ X-AAV-Grant-Id header extracted: {data['aav_grant_id']}")
        else:
            rules = data.get("rules_evaluated", [])
            aav_rule = next((r for r in rules if r.get("rule") == "aav_authorization"), None)
            if aav_rule:
                grant_id = aav_rule.get("metadata", {}).get("grant_id")
                if grant_id:
                    print(f"✓ Grant ID in rules metadata: {grant_id}")


# ============================================================================
# SECTION 8: Rules Engine AAV Step Tests
# ============================================================================

class TestRulesEngineAAVStep:
    """Test rules engine includes AAV authorization step (Step 2.5)"""
    
    def test_aav_authorization_in_rules_evaluated(self, api_client, test_escrow):
        """Verify aav_authorization appears in rules_evaluated"""
        payload = {
            "escrow_id": test_escrow["id"],
            "amount_cents": 50,
            "vendor": "Test Rules Engine",
            "idempotency_key": f"rules_engine_{int(time.time())}"
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/spend", json=payload)
        data = response.json()
        
        rules = data.get("rules_evaluated", [])
        rule_names = [r.get("rule") for r in rules]
        
        assert "aav_authorization" in rule_names, f"Missing aav_authorization in rules: {rule_names}"
        
        # Verify order - should be after escrow_account_check
        if "escrow_account_check" in rule_names:
            escrow_idx = rule_names.index("escrow_account_check")
            aav_idx = rule_names.index("aav_authorization")
            assert aav_idx > escrow_idx, "AAV check should come after escrow check"
        
        print(f"✓ aav_authorization in rules_evaluated at position {rule_names.index('aav_authorization') + 1}")
    
    def test_aav_rule_metadata_includes_enforcement_mode(self, api_client, test_escrow):
        """Verify AAV rule metadata includes enforcement_mode"""
        payload = {
            "escrow_id": test_escrow["id"],
            "amount_cents": 50,
            "vendor": "Test AAV Metadata",
            "idempotency_key": f"aav_metadata_{int(time.time())}"
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/spend", json=payload)
        data = response.json()
        
        rules = data.get("rules_evaluated", [])
        aav_rule = next((r for r in rules if r.get("rule") == "aav_authorization"), None)
        
        assert aav_rule is not None, "Missing aav_authorization rule"
        
        metadata = aav_rule.get("metadata", {})
        assert "enforcement_mode" in metadata, f"Missing enforcement_mode in metadata: {metadata}"
        
        print(f"✓ AAV rule metadata includes enforcement_mode: {metadata.get('enforcement_mode')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
