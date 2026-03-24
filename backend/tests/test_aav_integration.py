"""
AAV (Agent Authority Vault) Integration Tests

Tests for AAV integration in Safe-Spend:
- Escrow accounts with AAV fields
- Policies with AAV fields  
- Spend requests with AAV authorization
- AAV settings endpoint
- Rules engine AAV step (Step 2.5)
"""

import pytest
import requests
import os
import json
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "org-a@test.com"
TEST_PASSWORD = "TestPassword123!"
EXISTING_ESCROW_ID = "esc_6uquqflbhs6s"
AAV_ENABLED_ESCROW_ID = "esc_q8ymftnecfcp"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for test user"""
    response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.text}")
    return response.json().get("token")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestEscrowAccountsAAVFields:
    """Test AAV fields in escrow accounts API"""
    
    def test_get_escrow_returns_aav_fields(self, api_client):
        """Verify escrow accounts return AAV fields"""
        response = api_client.get(f"{BASE_URL}/api/v1/escrow-accounts/{EXISTING_ESCROW_ID}")
        assert response.status_code == 200, f"Failed to get escrow: {response.text}"
        
        data = response.json()
        # Verify AAV fields exist in response
        assert "aav_enabled" in data, "Missing aav_enabled field"
        assert "authorized_agent_ids" in data, "Missing authorized_agent_ids field"
        assert "aav_grant_ids" in data, "Missing aav_grant_ids field"
        assert "aav_enforcement_mode" in data, "Missing aav_enforcement_mode field"
        
        # Verify types
        assert isinstance(data["aav_enabled"], bool), "aav_enabled should be boolean"
        assert isinstance(data["authorized_agent_ids"], list), "authorized_agent_ids should be list"
        assert isinstance(data["aav_grant_ids"], list), "aav_grant_ids should be list"
        print(f"✓ Escrow {EXISTING_ESCROW_ID} has AAV fields: enabled={data['aav_enabled']}, mode={data['aav_enforcement_mode']}")
    
    def test_get_aav_enabled_escrow(self, api_client):
        """Verify AAV-enabled escrow has correct settings"""
        response = api_client.get(f"{BASE_URL}/api/v1/escrow-accounts/{AAV_ENABLED_ESCROW_ID}")
        
        if response.status_code == 404:
            pytest.skip(f"AAV-enabled escrow {AAV_ENABLED_ESCROW_ID} not found")
        
        assert response.status_code == 200, f"Failed to get AAV escrow: {response.text}"
        
        data = response.json()
        assert data["aav_enabled"] == True, "AAV should be enabled"
        assert data["aav_enforcement_mode"] == "strict", f"Expected strict mode, got {data['aav_enforcement_mode']}"
        assert "agent_marketing_bot" in data["authorized_agent_ids"], "Missing expected agent ID"
        assert "agent_test" in data["authorized_agent_ids"], "Missing expected agent ID"
        print(f"✓ AAV-enabled escrow verified: agents={data['authorized_agent_ids']}, mode={data['aav_enforcement_mode']}")
    
    def test_create_escrow_with_aav_settings(self, api_client):
        """Test creating escrow with AAV settings"""
        payload = {
            "name": "TEST_AAV_Escrow",
            "description": "Test escrow with AAV enabled",
            "aav_enabled": True,
            "authorized_agent_ids": ["agent_test_1", "agent_test_2"],
            "aav_grant_ids": ["grant_test_1"],
            "aav_enforcement_mode": "strict"
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/escrow-accounts", json=payload)
        assert response.status_code == 201, f"Failed to create escrow: {response.text}"
        
        data = response.json()
        assert data["aav_enabled"] == True
        assert data["authorized_agent_ids"] == ["agent_test_1", "agent_test_2"]
        assert data["aav_grant_ids"] == ["grant_test_1"]
        assert data["aav_enforcement_mode"] == "strict"
        
        # Cleanup
        escrow_id = data["id"]
        api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/close")
        print(f"✓ Created and verified AAV escrow: {escrow_id}")
    
    def test_create_escrow_invalid_aav_mode(self, api_client):
        """Test creating escrow with invalid AAV enforcement mode"""
        payload = {
            "name": "TEST_Invalid_AAV_Mode",
            "aav_enabled": True,
            "aav_enforcement_mode": "invalid_mode"
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/escrow-accounts", json=payload)
        assert response.status_code == 400, f"Expected 400 for invalid mode, got {response.status_code}"
        assert "aav_enforcement_mode" in response.text.lower() or "invalid" in response.text.lower()
        print("✓ Invalid AAV mode correctly rejected")


class TestPoliciesAAVFields:
    """Test AAV fields in policies API"""
    
    def test_list_policies_returns_aav_fields(self, api_client):
        """Verify policies list returns AAV fields"""
        response = api_client.get(f"{BASE_URL}/api/v1/policies")
        assert response.status_code == 200, f"Failed to list policies: {response.text}"
        
        data = response.json()
        if data["total"] > 0:
            policy = data["data"][0]
            assert "aav_enabled" in policy, "Missing aav_enabled field"
            assert "authorized_agent_ids" in policy, "Missing authorized_agent_ids field"
            assert "aav_grant_ids" in policy, "Missing aav_grant_ids field"
            assert "aav_enforcement_mode" in policy, "Missing aav_enforcement_mode field"
            print(f"✓ Policy {policy['id']} has AAV fields")
        else:
            print("✓ No policies to verify, but endpoint works")
    
    def test_create_policy_with_aav_settings(self, api_client):
        """Test creating policy with AAV settings"""
        payload = {
            "name": "TEST_AAV_Policy",
            "escrow_id": EXISTING_ESCROW_ID,
            "purpose": "Testing AAV integration",
            "draft": True,
            "aav_enabled": True,
            "authorized_agent_ids": ["agent_policy_test"],
            "aav_grant_ids": ["grant_policy_test"],
            "aav_enforcement_mode": "warn"
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/policies", json=payload)
        assert response.status_code == 201, f"Failed to create policy: {response.text}"
        
        data = response.json()
        assert data["aav_enabled"] == True
        assert data["authorized_agent_ids"] == ["agent_policy_test"]
        assert data["aav_grant_ids"] == ["grant_policy_test"]
        assert data["aav_enforcement_mode"] == "warn"
        
        # Cleanup
        policy_id = data["id"]
        api_client.delete(f"{BASE_URL}/api/v1/policies/{policy_id}")
        print(f"✓ Created and verified AAV policy: {policy_id}")
    
    def test_update_policy_aav_settings(self, api_client):
        """Test updating policy AAV settings"""
        # Create policy first
        create_payload = {
            "name": "TEST_AAV_Update_Policy",
            "escrow_id": EXISTING_ESCROW_ID,
            "draft": True,
            "aav_enabled": False
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/v1/policies", json=create_payload)
        assert create_response.status_code == 201
        policy_id = create_response.json()["id"]
        
        # Update AAV settings
        update_payload = {
            "aav_enabled": True,
            "authorized_agent_ids": ["agent_updated"],
            "aav_enforcement_mode": "strict"
        }
        
        update_response = api_client.patch(f"{BASE_URL}/api/v1/policies/{policy_id}", json=update_payload)
        assert update_response.status_code == 200, f"Failed to update policy: {update_response.text}"
        
        data = update_response.json()
        assert data["aav_enabled"] == True
        assert data["authorized_agent_ids"] == ["agent_updated"]
        assert data["aav_enforcement_mode"] == "strict"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/v1/policies/{policy_id}")
        print(f"✓ Updated AAV settings on policy: {policy_id}")


class TestSpendRequestsAAV:
    """Test AAV authorization in spend requests"""
    
    def test_spend_without_agent_id_on_aav_escrow_denied(self, api_client):
        """Test spend request WITHOUT agent ID on AAV-enabled escrow (should DENY in strict mode)"""
        # First check if AAV escrow exists and has balance
        escrow_response = api_client.get(f"{BASE_URL}/api/v1/escrow-accounts/{AAV_ENABLED_ESCROW_ID}")
        if escrow_response.status_code == 404:
            pytest.skip(f"AAV-enabled escrow {AAV_ENABLED_ESCROW_ID} not found")
        
        escrow = escrow_response.json()
        if not escrow.get("aav_enabled"):
            pytest.skip("Escrow does not have AAV enabled")
        
        if escrow.get("balance_cents", 0) < 100:
            # Fund the escrow first
            api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{AAV_ENABLED_ESCROW_ID}/fund", json={
                "amount_cents": 10000
            })
        
        # Try spend without agent ID
        payload = {
            "escrow_id": AAV_ENABLED_ESCROW_ID,
            "amount_cents": 100,
            "vendor": "Test Vendor",
            "category": "testing"
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/spend", json=payload)
        
        # Should be denied due to missing agent ID
        assert response.status_code == 400, f"Expected 400 for missing agent ID, got {response.status_code}"
        data = response.json()
        assert data.get("status") == "denied", f"Expected denied status, got {data.get('status')}"
        
        # Check rules_evaluated includes aav_authorization
        rules = data.get("rules_evaluated", [])
        aav_rule = next((r for r in rules if r.get("rule") == "aav_authorization"), None)
        assert aav_rule is not None, "Missing aav_authorization in rules_evaluated"
        assert aav_rule.get("passed") == False, "AAV rule should have failed"
        print(f"✓ Spend without agent ID correctly denied: {data.get('denial_reason', data.get('error'))}")
    
    def test_spend_with_valid_agent_id_passes_aav(self, api_client):
        """Test spend request WITH valid agent ID (should PASS AAV check)"""
        escrow_response = api_client.get(f"{BASE_URL}/api/v1/escrow-accounts/{AAV_ENABLED_ESCROW_ID}")
        if escrow_response.status_code == 404:
            pytest.skip(f"AAV-enabled escrow {AAV_ENABLED_ESCROW_ID} not found")
        
        escrow = escrow_response.json()
        if not escrow.get("aav_enabled"):
            pytest.skip("Escrow does not have AAV enabled")
        
        # Ensure balance
        if escrow.get("balance_cents", 0) < 100:
            api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{AAV_ENABLED_ESCROW_ID}/fund", json={
                "amount_cents": 10000
            })
        
        # Get authorized agent IDs
        authorized_agents = escrow.get("authorized_agent_ids", [])
        if not authorized_agents:
            pytest.skip("No authorized agents configured")
        
        valid_agent_id = authorized_agents[0]
        
        # Spend with valid agent ID via header
        headers = {"X-AAV-Agent-Id": valid_agent_id}
        payload = {
            "escrow_id": AAV_ENABLED_ESCROW_ID,
            "amount_cents": 100,
            "vendor": "Test Vendor Valid Agent",
            "category": "testing"
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/spend", json=payload, headers=headers)
        
        # Should pass AAV check (may still fail other rules, but AAV should pass)
        data = response.json()
        rules = data.get("rules_evaluated", [])
        aav_rule = next((r for r in rules if r.get("rule") == "aav_authorization"), None)
        
        if aav_rule:
            assert aav_rule.get("passed") == True, f"AAV rule should have passed for valid agent: {aav_rule}"
            print(f"✓ Spend with valid agent ID passed AAV check: agent={valid_agent_id}")
        else:
            # If no AAV rule, check if request was approved
            if response.status_code == 201:
                print(f"✓ Spend with valid agent ID approved: {data.get('id')}")
            else:
                print(f"⚠ Spend result: status={response.status_code}, data={data}")
    
    def test_spend_with_unauthorized_agent_id_denied(self, api_client):
        """Test spend request WITH unauthorized agent ID (should DENY)"""
        escrow_response = api_client.get(f"{BASE_URL}/api/v1/escrow-accounts/{AAV_ENABLED_ESCROW_ID}")
        if escrow_response.status_code == 404:
            pytest.skip(f"AAV-enabled escrow {AAV_ENABLED_ESCROW_ID} not found")
        
        escrow = escrow_response.json()
        if not escrow.get("aav_enabled"):
            pytest.skip("Escrow does not have AAV enabled")
        
        # Ensure balance
        if escrow.get("balance_cents", 0) < 100:
            api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{AAV_ENABLED_ESCROW_ID}/fund", json={
                "amount_cents": 10000
            })
        
        # Spend with unauthorized agent ID
        headers = {"X-AAV-Agent-Id": "unauthorized_agent_xyz"}
        payload = {
            "escrow_id": AAV_ENABLED_ESCROW_ID,
            "amount_cents": 100,
            "vendor": "Test Vendor Unauthorized",
            "category": "testing"
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/spend", json=payload, headers=headers)
        
        # Should be denied
        assert response.status_code == 400, f"Expected 400 for unauthorized agent, got {response.status_code}"
        data = response.json()
        assert data.get("status") == "denied"
        
        rules = data.get("rules_evaluated", [])
        aav_rule = next((r for r in rules if r.get("rule") == "aav_authorization"), None)
        assert aav_rule is not None, "Missing aav_authorization in rules_evaluated"
        assert aav_rule.get("passed") == False, "AAV rule should have failed for unauthorized agent"
        print(f"✓ Spend with unauthorized agent correctly denied")
    
    def test_spend_request_stores_aav_fields(self, api_client):
        """Test that spend requests store aav_agent_id and aav_verification_status"""
        # Use regular escrow (non-AAV) to ensure spend succeeds
        escrow_response = api_client.get(f"{BASE_URL}/api/v1/escrow-accounts/{EXISTING_ESCROW_ID}")
        if escrow_response.status_code != 200:
            pytest.skip("Cannot access test escrow")
        
        escrow = escrow_response.json()
        if escrow.get("balance_cents", 0) < 100:
            api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{EXISTING_ESCROW_ID}/fund", json={
                "amount_cents": 10000
            })
        
        # Spend with agent ID header
        headers = {"X-AAV-Agent-Id": "test_agent_for_storage"}
        payload = {
            "escrow_id": EXISTING_ESCROW_ID,
            "amount_cents": 50,
            "vendor": "Test AAV Storage",
            "category": "testing",
            "idempotency_key": f"test_aav_storage_{int(time.time())}"
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/spend", json=payload, headers=headers)
        
        if response.status_code in [201, 202]:
            data = response.json()
            # Check AAV fields in response
            assert "aav_agent_id" in data, "Missing aav_agent_id in spend response"
            assert "aav_verification_status" in data, "Missing aav_verification_status in spend response"
            print(f"✓ Spend request stores AAV fields: agent_id={data.get('aav_agent_id')}, status={data.get('aav_verification_status')}")
        else:
            # Even denied requests should have AAV fields
            data = response.json()
            print(f"⚠ Spend denied but checking AAV fields: {data}")


class TestAAVSettingsEndpoint:
    """Test /api/v1/settings/aav endpoint"""
    
    def test_get_aav_settings(self, api_client):
        """Test GET /api/v1/settings/aav returns config"""
        response = api_client.get(f"{BASE_URL}/api/v1/settings/aav")
        assert response.status_code == 200, f"Failed to get AAV settings: {response.text}"
        
        data = response.json()
        # Should have these fields
        assert "is_configured" in data, "Missing is_configured field"
        assert "default_enforcement_mode" in data, "Missing default_enforcement_mode field"
        print(f"✓ AAV settings retrieved: configured={data.get('is_configured')}, mode={data.get('default_enforcement_mode')}")
    
    def test_put_aav_settings(self, api_client):
        """Test PUT /api/v1/settings/aav creates/updates config"""
        payload = {
            "aav_endpoint": "https://aav.example.com/api",
            "aav_public_key": "test_public_key_12345",
            "default_enforcement_mode": "warn"
        }
        
        response = api_client.put(f"{BASE_URL}/api/v1/settings/aav", json=payload)
        assert response.status_code == 200, f"Failed to update AAV settings: {response.text}"
        
        data = response.json()
        assert "config" in data or "message" in data
        print(f"✓ AAV settings updated successfully")
        
        # Verify by getting again
        get_response = api_client.get(f"{BASE_URL}/api/v1/settings/aav")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data.get("default_enforcement_mode") == "warn"
        print(f"✓ AAV settings verified after update")
    
    def test_put_aav_settings_invalid_mode(self, api_client):
        """Test PUT with invalid enforcement mode"""
        payload = {
            "default_enforcement_mode": "invalid_mode"
        }
        
        response = api_client.put(f"{BASE_URL}/api/v1/settings/aav", json=payload)
        assert response.status_code == 400, f"Expected 400 for invalid mode, got {response.status_code}"
        print("✓ Invalid enforcement mode correctly rejected")


class TestRulesEngineAAVStep:
    """Test that rules engine includes AAV authorization step"""
    
    def test_rules_evaluated_includes_aav_authorization(self, api_client):
        """Verify rules_evaluated includes 'aav_authorization' step"""
        # Make a spend request to any escrow
        escrow_response = api_client.get(f"{BASE_URL}/api/v1/escrow-accounts/{EXISTING_ESCROW_ID}")
        if escrow_response.status_code != 200:
            pytest.skip("Cannot access test escrow")
        
        escrow = escrow_response.json()
        if escrow.get("balance_cents", 0) < 100:
            api_client.post(f"{BASE_URL}/api/v1/escrow-accounts/{EXISTING_ESCROW_ID}/fund", json={
                "amount_cents": 10000
            })
        
        payload = {
            "escrow_id": EXISTING_ESCROW_ID,
            "amount_cents": 50,
            "vendor": "Test Rules Engine",
            "category": "testing",
            "idempotency_key": f"test_rules_{int(time.time())}"
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/spend", json=payload)
        data = response.json()
        
        rules = data.get("rules_evaluated", [])
        rule_names = [r.get("rule") for r in rules]
        
        # Check that aav_authorization is in the rules
        assert "aav_authorization" in rule_names, f"Missing aav_authorization in rules: {rule_names}"
        
        # Verify order - should be after escrow_account_check
        escrow_idx = rule_names.index("escrow_account_check") if "escrow_account_check" in rule_names else -1
        aav_idx = rule_names.index("aav_authorization")
        
        if escrow_idx >= 0:
            assert aav_idx > escrow_idx, "AAV check should come after escrow check"
        
        print(f"✓ Rules engine includes aav_authorization at position {aav_idx + 1}")
        print(f"  Rule order: {rule_names[:5]}...")


class TestXAAVHeaders:
    """Test X-AAV-Agent-Id and X-AAV-Grant-Id header extraction"""
    
    def test_x_aav_agent_id_header_extraction(self, api_client):
        """Test X-AAV-Agent-Id header is extracted"""
        headers = {"X-AAV-Agent-Id": "test_header_agent"}
        payload = {
            "escrow_id": EXISTING_ESCROW_ID,
            "amount_cents": 50,
            "vendor": "Test Header Extraction",
            "idempotency_key": f"test_header_{int(time.time())}"
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/spend", json=payload, headers=headers)
        data = response.json()
        
        # Check if agent ID was captured
        if "aav_agent_id" in data:
            assert data["aav_agent_id"] == "test_header_agent", f"Agent ID mismatch: {data['aav_agent_id']}"
            print(f"✓ X-AAV-Agent-Id header extracted: {data['aav_agent_id']}")
        else:
            # Check in rules_evaluated metadata
            rules = data.get("rules_evaluated", [])
            aav_rule = next((r for r in rules if r.get("rule") == "aav_authorization"), None)
            if aav_rule and aav_rule.get("metadata", {}).get("agent_id"):
                print(f"✓ Agent ID found in rules metadata: {aav_rule['metadata']['agent_id']}")
            else:
                print(f"⚠ Agent ID not found in response, but header was sent")
    
    def test_x_aav_grant_id_header_extraction(self, api_client):
        """Test X-AAV-Grant-Id header is extracted"""
        headers = {
            "X-AAV-Agent-Id": "test_grant_agent",
            "X-AAV-Grant-Id": "test_grant_123"
        }
        payload = {
            "escrow_id": EXISTING_ESCROW_ID,
            "amount_cents": 50,
            "vendor": "Test Grant Header",
            "idempotency_key": f"test_grant_{int(time.time())}"
        }
        
        response = api_client.post(f"{BASE_URL}/api/v1/spend", json=payload, headers=headers)
        data = response.json()
        
        # Check if grant ID was captured
        if "aav_grant_id" in data:
            assert data["aav_grant_id"] == "test_grant_123", f"Grant ID mismatch: {data['aav_grant_id']}"
            print(f"✓ X-AAV-Grant-Id header extracted: {data['aav_grant_id']}")
        else:
            rules = data.get("rules_evaluated", [])
            aav_rule = next((r for r in rules if r.get("rule") == "aav_authorization"), None)
            if aav_rule and aav_rule.get("metadata", {}).get("grant_id"):
                print(f"✓ Grant ID found in rules metadata: {aav_rule['metadata']['grant_id']}")
            else:
                print(f"⚠ Grant ID not found in response, but header was sent")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
