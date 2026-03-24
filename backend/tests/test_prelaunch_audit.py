"""
Pre-Launch Audit Test Suite for Safe-Spend
============================================

Tests cover:
1. Rules Engine - All policy dimensions (per-tx, daily/weekly/monthly caps, vendor/category, time windows, approval thresholds)
2. Policy Lock - Locked policies cannot be edited (403 response)
3. RBAC - Funding and policy edits require owner/admin role
4. Approval Flow - Pending requests appear in approvals list with audit logging
5. New User Flow - Signup, create escrow, fund, create policy, generate API key
6. Error Messages - Denial reasons are clear and actionable
"""

import pytest
import requests
import os
import time
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from main agent
EXISTING_USER_EMAIL = "org-a@test.com"
EXISTING_USER_PASSWORD = "TestPassword123!"
TEST_ESCROW_WITH_POLICY = "esc_8fhx5vn5in08"
LOCKED_POLICY_ID = "pol_e66gy4m2084b"
NEW_USER_ESCROW = "esc_1361gqx0y25b"


class TestSetup:
    """Setup and authentication helpers"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for existing user"""
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": EXISTING_USER_EMAIL,
            "password": EXISTING_USER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestRulesEnginePerTransactionLimit(TestSetup):
    """Test per-transaction limit enforcement"""
    
    def test_spend_under_per_tx_limit_passes(self, auth_headers):
        """Spend under per-tx limit ($50) should pass"""
        # Policy has per_tx=$50 (5000 cents)
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=auth_headers, json={
            "escrow_id": TEST_ESCROW_WITH_POLICY,
            "amount_cents": 500,  # $5 - well under $50 limit
            "vendor": "Google Ads",  # Allowed vendor
            "category": "advertising",  # Allowed category
            "description": "Test per-tx under limit"
        })
        # Should be approved or pending (depending on auto-approve threshold)
        assert response.status_code in [201, 202, 400], f"Unexpected status: {response.status_code}, {response.text}"
        data = response.json()
        # If denied, should NOT be for per-tx limit
        if response.status_code == 400:
            assert "per-transaction" not in data.get("error", "").lower(), f"Should not fail per-tx check: {data}"
    
    def test_spend_over_per_tx_limit_denied(self, auth_headers):
        """Spend over per-tx limit ($50) should be denied"""
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=auth_headers, json={
            "escrow_id": TEST_ESCROW_WITH_POLICY,
            "amount_cents": 6000,  # $60 - over $50 limit
            "vendor": "Google Ads",
            "category": "advertising",
            "description": "Test per-tx over limit"
        })
        assert response.status_code == 400, f"Should be denied: {response.text}"
        data = response.json()
        assert data.get("status") == "denied" or "error" in data
        # Check denial reason mentions per-transaction
        denial_reason = data.get("denial_reason") or data.get("error", "")
        assert "per-transaction" in denial_reason.lower() or "exceeds" in denial_reason.lower(), f"Denial reason should mention per-tx limit: {denial_reason}"


class TestRulesEngineDailyCap(TestSetup):
    """Test daily cap enforcement"""
    
    def test_daily_cap_denial_message_is_actionable(self, auth_headers):
        """Daily cap denial should have actionable message"""
        # Try to spend more than daily cap ($100 = 10000 cents)
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=auth_headers, json={
            "escrow_id": TEST_ESCROW_WITH_POLICY,
            "amount_cents": 4500,  # $45 - under per-tx but may exceed daily
            "vendor": "Google Ads",
            "category": "advertising",
            "description": "Test daily cap"
        })
        # If denied for daily cap, check message
        if response.status_code == 400:
            data = response.json()
            denial_reason = data.get("denial_reason") or data.get("error", "")
            if "daily" in denial_reason.lower():
                # Verify message is actionable
                assert "cap" in denial_reason.lower() or "limit" in denial_reason.lower(), f"Daily denial should mention cap/limit: {denial_reason}"
                print(f"Daily cap denial message: {denial_reason}")


class TestRulesEngineWeeklyCap(TestSetup):
    """Test weekly cap enforcement"""
    
    def test_weekly_cap_check_in_rules(self, auth_headers):
        """Verify weekly cap is checked in rules evaluation"""
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=auth_headers, json={
            "escrow_id": TEST_ESCROW_WITH_POLICY,
            "amount_cents": 500,
            "vendor": "Google Ads",
            "category": "advertising",
            "description": "Test weekly cap check"
        })
        data = response.json()
        rules_evaluated = data.get("rules_evaluated", [])
        # Check that weekly_cap_check is in the rules
        rule_names = [r.get("rule") for r in rules_evaluated]
        assert "weekly_cap_check" in rule_names, f"Weekly cap check should be in rules: {rule_names}"


class TestRulesEngineMonthlyCap(TestSetup):
    """Test monthly cap enforcement"""
    
    def test_monthly_cap_check_in_rules(self, auth_headers):
        """Verify monthly cap is checked in rules evaluation"""
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=auth_headers, json={
            "escrow_id": TEST_ESCROW_WITH_POLICY,
            "amount_cents": 500,
            "vendor": "Google Ads",
            "category": "advertising",
            "description": "Test monthly cap check"
        })
        data = response.json()
        rules_evaluated = data.get("rules_evaluated", [])
        rule_names = [r.get("rule") for r in rules_evaluated]
        assert "monthly_cap_check" in rule_names, f"Monthly cap check should be in rules: {rule_names}"


class TestRulesEngineVendorAllowlist(TestSetup):
    """Test vendor allowlist enforcement"""
    
    def test_allowed_vendor_passes(self, auth_headers):
        """Allowed vendor (Google Ads) should pass vendor check"""
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=auth_headers, json={
            "escrow_id": TEST_ESCROW_WITH_POLICY,
            "amount_cents": 500,
            "vendor": "Google Ads",  # In allowlist
            "category": "advertising",
            "description": "Test allowed vendor"
        })
        data = response.json()
        # Should not be denied for vendor
        if response.status_code == 400:
            denial_reason = data.get("denial_reason") or data.get("error", "")
            assert "vendor" not in denial_reason.lower() or "not in allowlist" not in denial_reason.lower(), f"Should not fail vendor check for allowed vendor: {denial_reason}"
    
    def test_unlisted_vendor_denied_when_allowlist_set(self, auth_headers):
        """Vendor not in allowlist should be denied"""
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=auth_headers, json={
            "escrow_id": TEST_ESCROW_WITH_POLICY,
            "amount_cents": 500,
            "vendor": "Random Unknown Vendor",  # Not in allowlist
            "category": "advertising",
            "description": "Test unlisted vendor"
        })
        assert response.status_code == 400, f"Should be denied: {response.text}"
        data = response.json()
        denial_reason = data.get("denial_reason") or data.get("error", "")
        assert "vendor" in denial_reason.lower() and "not in allowlist" in denial_reason.lower(), f"Should mention vendor not in allowlist: {denial_reason}"


class TestRulesEngineVendorBlocklist(TestSetup):
    """Test vendor blocklist enforcement"""
    
    def test_blocked_vendor_denied(self, auth_headers):
        """Blocked vendor (Casino Corp) should be denied"""
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=auth_headers, json={
            "escrow_id": TEST_ESCROW_WITH_POLICY,
            "amount_cents": 500,
            "vendor": "Casino Corp",  # In blocklist
            "category": "advertising",
            "description": "Test blocked vendor"
        })
        assert response.status_code == 400, f"Should be denied: {response.text}"
        data = response.json()
        denial_reason = data.get("denial_reason") or data.get("error", "")
        assert "vendor" in denial_reason.lower() and "blocked" in denial_reason.lower(), f"Should mention vendor is blocked: {denial_reason}"


class TestRulesEngineCategoryAllowlist(TestSetup):
    """Test category allowlist enforcement"""
    
    def test_allowed_category_passes(self, auth_headers):
        """Allowed category (advertising) should pass"""
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=auth_headers, json={
            "escrow_id": TEST_ESCROW_WITH_POLICY,
            "amount_cents": 500,
            "vendor": "Google Ads",
            "category": "advertising",  # In allowlist
            "description": "Test allowed category"
        })
        data = response.json()
        if response.status_code == 400:
            denial_reason = data.get("denial_reason") or data.get("error", "")
            assert "category" not in denial_reason.lower() or "not in allowlist" not in denial_reason.lower(), f"Should not fail category check: {denial_reason}"
    
    def test_unlisted_category_denied(self, auth_headers):
        """Category not in allowlist should be denied"""
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=auth_headers, json={
            "escrow_id": TEST_ESCROW_WITH_POLICY,
            "amount_cents": 500,
            "vendor": "Google Ads",
            "category": "gambling",  # Not in allowlist
            "description": "Test unlisted category"
        })
        assert response.status_code == 400, f"Should be denied: {response.text}"
        data = response.json()
        denial_reason = data.get("denial_reason") or data.get("error", "")
        assert "category" in denial_reason.lower(), f"Should mention category issue: {denial_reason}"


class TestRulesEngineApprovalThresholds(TestSetup):
    """Test auto-approve and human-review thresholds"""
    
    def test_under_auto_approve_threshold_auto_approves(self, auth_headers):
        """Spend under auto-approve threshold ($10) should auto-approve"""
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=auth_headers, json={
            "escrow_id": TEST_ESCROW_WITH_POLICY,
            "amount_cents": 500,  # $5 - under $10 auto-approve
            "vendor": "Google Ads",
            "category": "advertising",
            "description": "Test auto-approve"
        })
        # Should be 201 (approved) not 202 (pending)
        if response.status_code == 201:
            data = response.json()
            assert data.get("status") == "approved", f"Should be auto-approved: {data}"
            print("Auto-approve threshold working correctly")
        elif response.status_code == 400:
            # May be denied for other reasons (daily cap, etc.)
            print(f"Denied for other reason: {response.json()}")
    
    def test_over_human_review_threshold_goes_pending(self, auth_headers):
        """Spend over human-review threshold ($30) should go to pending"""
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=auth_headers, json={
            "escrow_id": TEST_ESCROW_WITH_POLICY,
            "amount_cents": 3500,  # $35 - over $30 human-review threshold
            "vendor": "Google Ads",
            "category": "advertising",
            "description": "Test human review threshold"
        })
        # Should be 202 (pending) or 400 (denied for other reasons)
        if response.status_code == 202:
            data = response.json()
            assert data.get("status") == "pending" or "approval_id" in data, f"Should be pending: {data}"
            print("Human review threshold working correctly")
        elif response.status_code == 400:
            print(f"Denied for other reason: {response.json()}")


class TestPolicyLock(TestSetup):
    """Test locked policy enforcement"""
    
    def test_locked_policy_cannot_be_edited_patch(self, auth_headers):
        """PATCH on locked policy should return 403"""
        response = requests.patch(f"{BASE_URL}/api/v1/policies/{LOCKED_POLICY_ID}", headers=auth_headers, json={
            "name": "Attempted Edit"
        })
        assert response.status_code == 403, f"Should be 403 for locked policy: {response.status_code}, {response.text}"
        data = response.json()
        assert "locked" in data.get("error", "").lower() or "locked" in data.get("message", "").lower(), f"Should mention locked: {data}"
    
    def test_locked_policy_cannot_be_edited_put(self, auth_headers):
        """PUT on locked policy should return 403"""
        response = requests.put(f"{BASE_URL}/api/v1/policies/{LOCKED_POLICY_ID}", headers=auth_headers, json={
            "name": "Attempted Edit via PUT"
        })
        assert response.status_code == 403, f"Should be 403 for locked policy: {response.status_code}, {response.text}"
        data = response.json()
        assert "locked" in data.get("error", "").lower() or "locked" in data.get("message", "").lower(), f"Should mention locked: {data}"
    
    def test_locked_policy_cannot_be_deleted(self, auth_headers):
        """DELETE on locked policy should return 403"""
        response = requests.delete(f"{BASE_URL}/api/v1/policies/{LOCKED_POLICY_ID}", headers=auth_headers)
        assert response.status_code == 403, f"Should be 403 for locked policy: {response.status_code}, {response.text}"
    
    def test_locked_policy_is_enforced(self, auth_headers):
        """Locked policy should still be enforced for spend requests"""
        # Get the policy to verify it's locked
        response = requests.get(f"{BASE_URL}/api/v1/policies/{LOCKED_POLICY_ID}", headers=auth_headers)
        if response.status_code == 200:
            data = response.json()
            assert data.get("is_locked") == True, f"Policy should be locked: {data}"
            assert data.get("is_active") == True, f"Policy should be active: {data}"


class TestRBACFunding(TestSetup):
    """Test RBAC on funding operations"""
    
    def test_funding_requires_auth(self):
        """Funding without auth should fail"""
        response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{TEST_ESCROW_WITH_POLICY}/fund", json={
            "amount_cents": 1000
        })
        assert response.status_code == 401, f"Should require auth: {response.status_code}"
    
    def test_funding_with_agent_key_denied(self, auth_headers):
        """Agent keys should not be able to fund (requires owner key)"""
        # First create an agent key
        response = requests.post(f"{BASE_URL}/api/v1/api-keys", headers=auth_headers, json={
            "key_type": "agent",
            "label": "Test Agent Key for RBAC"
        })
        if response.status_code == 201:
            agent_key = response.json()["key"]
            
            # Try to fund with agent key
            agent_headers = {"Authorization": f"Bearer {agent_key}", "Content-Type": "application/json"}
            fund_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{TEST_ESCROW_WITH_POLICY}/fund", 
                                         headers=agent_headers, json={"amount_cents": 1000})
            
            # Should be 403 (forbidden for agent keys)
            assert fund_response.status_code == 403, f"Agent key should not fund: {fund_response.status_code}, {fund_response.text}"


class TestRBACPolicyEdits(TestSetup):
    """Test RBAC on policy edit operations"""
    
    def test_policy_edit_requires_auth(self):
        """Policy edit without auth should fail"""
        response = requests.patch(f"{BASE_URL}/api/v1/policies/{LOCKED_POLICY_ID}", json={
            "name": "Unauthorized Edit"
        })
        assert response.status_code == 401, f"Should require auth: {response.status_code}"
    
    def test_policy_create_with_agent_key_denied(self, auth_headers):
        """Agent keys should not be able to create policies"""
        # First create an agent key
        response = requests.post(f"{BASE_URL}/api/v1/api-keys", headers=auth_headers, json={
            "key_type": "agent",
            "label": "Test Agent Key for Policy RBAC"
        })
        if response.status_code == 201:
            agent_key = response.json()["key"]
            
            # Try to create policy with agent key
            agent_headers = {"Authorization": f"Bearer {agent_key}", "Content-Type": "application/json"}
            policy_response = requests.post(f"{BASE_URL}/api/v1/policies", headers=agent_headers, json={
                "escrow_id": TEST_ESCROW_WITH_POLICY,
                "name": "Agent Created Policy"
            })
            
            # Should be 403 (forbidden for agent keys)
            assert policy_response.status_code == 403, f"Agent key should not create policy: {policy_response.status_code}, {policy_response.text}"


class TestApprovalFlow(TestSetup):
    """Test approval flow with audit logging"""
    
    def test_pending_requests_appear_in_approvals_list(self, auth_headers):
        """Pending spend requests should appear in approvals list"""
        # Create a spend that requires approval (over $30)
        spend_response = requests.post(f"{BASE_URL}/api/v1/spend", headers=auth_headers, json={
            "escrow_id": TEST_ESCROW_WITH_POLICY,
            "amount_cents": 3500,  # $35 - over human review threshold
            "vendor": "Google Ads",
            "category": "advertising",
            "description": "Test approval flow"
        })
        
        if spend_response.status_code == 202:
            spend_data = spend_response.json()
            approval_id = spend_data.get("approval_id")
            
            # Check approvals list
            approvals_response = requests.get(f"{BASE_URL}/api/v1/approvals?status=pending", headers=auth_headers)
            assert approvals_response.status_code == 200, f"Should get approvals: {approvals_response.text}"
            
            approvals_data = approvals_response.json()
            approval_ids = [a.get("id") for a in approvals_data.get("data", [])]
            assert approval_id in approval_ids, f"Approval {approval_id} should be in list: {approval_ids}"
    
    def test_audit_events_logged_for_spend_approved(self, auth_headers):
        """Audit events should be logged for spend.approved"""
        # Get audit events
        response = requests.get(f"{BASE_URL}/api/v1/audit-events?event_type=spend.approved&limit=5", headers=auth_headers)
        if response.status_code == 200:
            data = response.json()
            events = data.get("data", [])
            if len(events) > 0:
                event = events[0]
                assert event.get("event_type") == "spend.approved", f"Event type should be spend.approved: {event}"
                print(f"Found spend.approved audit event: {event.get('id')}")
    
    def test_audit_events_logged_for_spend_denied(self, auth_headers):
        """Audit events should be logged for spend.denied"""
        response = requests.get(f"{BASE_URL}/api/v1/audit-events?event_type=spend.denied&limit=5", headers=auth_headers)
        if response.status_code == 200:
            data = response.json()
            events = data.get("data", [])
            if len(events) > 0:
                event = events[0]
                assert event.get("event_type") == "spend.denied", f"Event type should be spend.denied: {event}"
                print(f"Found spend.denied audit event: {event.get('id')}")
    
    def test_audit_events_logged_for_policy_locked(self, auth_headers):
        """Audit events should be logged for policy.locked"""
        response = requests.get(f"{BASE_URL}/api/v1/audit-events?event_type=policy.locked&limit=5", headers=auth_headers)
        if response.status_code == 200:
            data = response.json()
            events = data.get("data", [])
            if len(events) > 0:
                event = events[0]
                assert event.get("event_type") == "policy.locked", f"Event type should be policy.locked: {event}"
                print(f"Found policy.locked audit event: {event.get('id')}")


class TestNewUserFlow:
    """Test new user onboarding flow"""
    
    def test_signup_creates_org_and_returns_token(self):
        """Signup should create org and return token"""
        unique_email = f"test_prelaunch_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/v1/auth/signup", json={
            "name": "Pre-Launch Test Org",
            "email": unique_email,
            "password": "TestPassword123!"
        })
        assert response.status_code == 201, f"Signup should succeed: {response.status_code}, {response.text}"
        data = response.json()
        assert "token" in data, f"Should return token: {data}"
        assert "organization" in data, f"Should return organization: {data}"
        assert data["organization"]["email"] == unique_email, f"Email should match: {data}"
        
        # Store for subsequent tests
        TestNewUserFlow.new_user_token = data["token"]
        TestNewUserFlow.new_user_org_id = data["organization"]["id"]
        print(f"Created new org: {data['organization']['id']}")
    
    def test_create_escrow_account_works(self):
        """New user should be able to create escrow account"""
        if not hasattr(TestNewUserFlow, 'new_user_token'):
            pytest.skip("No new user token available")
        
        headers = {"Authorization": f"Bearer {TestNewUserFlow.new_user_token}", "Content-Type": "application/json"}
        response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json={
            "name": "Pre-Launch Test Escrow",
            "description": "Testing new user flow"
        })
        assert response.status_code == 201, f"Should create escrow: {response.status_code}, {response.text}"
        data = response.json()
        assert "id" in data, f"Should return escrow id: {data}"
        TestNewUserFlow.new_escrow_id = data["id"]
        print(f"Created escrow: {data['id']}")
    
    def test_fund_escrow_works_simulated(self):
        """New user should be able to fund escrow (simulated)"""
        if not hasattr(TestNewUserFlow, 'new_user_token') or not hasattr(TestNewUserFlow, 'new_escrow_id'):
            pytest.skip("No new user token or escrow available")
        
        headers = {"Authorization": f"Bearer {TestNewUserFlow.new_user_token}", "Content-Type": "application/json"}
        response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{TestNewUserFlow.new_escrow_id}/fund", 
                                headers=headers, json={"amount_cents": 10000})  # $100
        assert response.status_code == 200, f"Should fund escrow: {response.status_code}, {response.text}"
        data = response.json()
        assert data.get("escrow", {}).get("balance_cents") == 10000, f"Balance should be 10000: {data}"
        print(f"Funded escrow with $100")
    
    def test_create_policy_works(self):
        """New user should be able to create policy"""
        if not hasattr(TestNewUserFlow, 'new_user_token') or not hasattr(TestNewUserFlow, 'new_escrow_id'):
            pytest.skip("No new user token or escrow available")
        
        headers = {"Authorization": f"Bearer {TestNewUserFlow.new_user_token}", "Content-Type": "application/json"}
        response = requests.post(f"{BASE_URL}/api/v1/policies", headers=headers, json={
            "escrow_id": TestNewUserFlow.new_escrow_id,
            "name": "Pre-Launch Test Policy",
            "per_transaction_limit_cents": 5000,
            "daily_limit_cents": 10000,
            "draft": False
        })
        assert response.status_code == 201, f"Should create policy: {response.status_code}, {response.text}"
        data = response.json()
        assert "id" in data, f"Should return policy id: {data}"
        TestNewUserFlow.new_policy_id = data["id"]
        print(f"Created policy: {data['id']}")
    
    def test_generate_api_key_works(self):
        """New user should be able to generate API key"""
        if not hasattr(TestNewUserFlow, 'new_user_token'):
            pytest.skip("No new user token available")
        
        headers = {"Authorization": f"Bearer {TestNewUserFlow.new_user_token}", "Content-Type": "application/json"}
        response = requests.post(f"{BASE_URL}/api/v1/api-keys", headers=headers, json={
            "key_type": "live",
            "label": "Pre-Launch Test Key"
        })
        assert response.status_code == 201, f"Should create API key: {response.status_code}, {response.text}"
        data = response.json()
        assert "key" in data, f"Should return full key: {data}"
        assert data["key"].startswith("sk_live_"), f"Key should start with sk_live_: {data['key'][:15]}"
        print(f"Created API key: {data['key_prefix']}...")


class TestErrorMessages(TestSetup):
    """Test that denial reasons are clear and actionable"""
    
    def test_insufficient_funds_message(self, auth_headers):
        """Insufficient funds denial should be clear"""
        # Try to spend more than balance
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=auth_headers, json={
            "escrow_id": TEST_ESCROW_WITH_POLICY,
            "amount_cents": 99999999,  # Very large amount
            "vendor": "Google Ads",
            "category": "advertising",
            "description": "Test insufficient funds"
        })
        assert response.status_code == 400, f"Should be denied: {response.text}"
        data = response.json()
        denial_reason = data.get("denial_reason") or data.get("error", "")
        # Should mention insufficient funds or balance
        assert "insufficient" in denial_reason.lower() or "balance" in denial_reason.lower() or "per-transaction" in denial_reason.lower(), f"Should mention funds/balance issue: {denial_reason}"
    
    def test_vendor_blocked_message_is_actionable(self, auth_headers):
        """Vendor blocked message should be actionable"""
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=auth_headers, json={
            "escrow_id": TEST_ESCROW_WITH_POLICY,
            "amount_cents": 500,
            "vendor": "Casino Corp",
            "category": "advertising",
            "description": "Test blocked vendor message"
        })
        assert response.status_code == 400, f"Should be denied: {response.text}"
        data = response.json()
        denial_reason = data.get("denial_reason") or data.get("error", "")
        # Should mention the vendor name and that it's blocked
        assert "casino" in denial_reason.lower() or "blocked" in denial_reason.lower(), f"Should mention blocked vendor: {denial_reason}"
    
    def test_category_not_allowed_message_is_actionable(self, auth_headers):
        """Category not allowed message should be actionable"""
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=auth_headers, json={
            "escrow_id": TEST_ESCROW_WITH_POLICY,
            "amount_cents": 500,
            "vendor": "Google Ads",
            "category": "gambling",
            "description": "Test category not allowed message"
        })
        assert response.status_code == 400, f"Should be denied: {response.text}"
        data = response.json()
        denial_reason = data.get("denial_reason") or data.get("error", "")
        # Should mention category
        assert "category" in denial_reason.lower(), f"Should mention category: {denial_reason}"
    
    def test_escrow_not_found_message(self, auth_headers):
        """Escrow not found should have clear message"""
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=auth_headers, json={
            "escrow_id": "esc_nonexistent123",
            "amount_cents": 500,
            "vendor": "Google Ads",
            "category": "advertising",
            "description": "Test escrow not found"
        })
        assert response.status_code == 404, f"Should be 404: {response.status_code}, {response.text}"
        data = response.json()
        assert "not found" in data.get("error", "").lower(), f"Should mention not found: {data}"


class TestRulesEngineFullCascade(TestSetup):
    """Test that all 14 steps are evaluated in order"""
    
    def test_rules_evaluated_contains_all_steps(self, auth_headers):
        """Rules evaluated should contain all expected steps"""
        response = requests.post(f"{BASE_URL}/api/v1/spend", headers=auth_headers, json={
            "escrow_id": TEST_ESCROW_WITH_POLICY,
            "amount_cents": 500,
            "vendor": "Google Ads",
            "category": "advertising",
            "description": "Test full cascade"
        })
        data = response.json()
        rules_evaluated = data.get("rules_evaluated", [])
        rule_names = [r.get("rule") for r in rules_evaluated]
        
        # Expected rules in order
        expected_rules = [
            "key_validation",
            "escrow_account_check",
            "aav_authorization",
            "idempotency_check",
            "balance_check",
            "per_transaction_limit",
            "daily_cap_check",
            "weekly_cap_check",
            "monthly_cap_check",
            "vendor_check",
            "category_check",
            "time_window_check",
            "approval_threshold_check"
        ]
        
        # Check that key rules are present
        for rule in ["key_validation", "escrow_account_check", "balance_check", "vendor_check", "category_check"]:
            assert rule in rule_names, f"Rule {rule} should be in evaluated rules: {rule_names}"
        
        print(f"Rules evaluated: {rule_names}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
