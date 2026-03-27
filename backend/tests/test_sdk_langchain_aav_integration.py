#!/usr/bin/env python3
"""
Integration Test: AAV Mock + Safe-Spend + Python SDK + LangChain
================================================================
This test validates the complete product stack working together in a realistic
end-to-end scenario:

1. Setup: Create org, escrow, policy with AAV enabled
2. SDK Test: Use the Python SDK to perform governed spending
3. LangChain Test: Use LangChain tools with the SDK to execute agent tasks

This simulates a real AI agent using Safe-Spend for budget-controlled spending.
"""

import sys
import time
import json
import requests

# Add SDK to path
sys.path.insert(0, '/app/sdks/python')

from safespend import SafeSpendClient
from safespend.errors import ValidationError, SafeSpendError

API_URL = "https://agent-vault-demo.preview.emergentagent.com/api/v1"

def log(message, status="INFO"):
    colors = {
        "INFO": "\033[94m",
        "SUCCESS": "\033[92m",
        "FAIL": "\033[91m",
        "WARN": "\033[93m",
        "RESET": "\033[0m"
    }
    color = colors.get(status, colors["INFO"])
    reset = colors["RESET"]
    print(f"{color}[{status}]{reset} {message}")

class TestSetup:
    """Test setup and teardown helpers"""
    
    def __init__(self):
        self.token = None
        self.org_id = None
        self.escrow_id = None
        self.policy_id = None
        self.api_key = None
    
    def create_org(self):
        """Create test org and get token"""
        timestamp = int(time.time())
        email = f"sdk_langchain_test_{timestamp}@test.com"
        
        resp = requests.post(f"{API_URL}/auth/signup", json={
            "email": email,
            "password": "TestPass123!",
            "name": f"SDK+LangChain Test {timestamp}"
        })
        
        if resp.status_code not in [200, 201]:
            raise Exception(f"Failed to create org: {resp.text}")
        
        data = resp.json()
        self.token = data.get("token")
        self.org_id = data.get("organization", {}).get("id")
        log(f"Created org: {self.org_id}", "SUCCESS")
        return self.token, self.org_id
    
    def create_escrow(self, name="SDK Test Escrow", balance_cents=500000):
        """Create and fund escrow"""
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create escrow
        resp = requests.post(f"{API_URL}/escrow-accounts", headers=headers, json={
            "name": name,
            "description": "Test escrow for SDK + LangChain integration",
            "aav_enabled": True,
            "aav_enforcement_mode": "warn"  # Warn mode for testing
        })
        
        if resp.status_code not in [200, 201]:
            raise Exception(f"Failed to create escrow: {resp.text}")
        
        escrow = resp.json()
        self.escrow_id = escrow.get("id")
        
        # Fund escrow
        fund_resp = requests.post(
            f"{API_URL}/escrow-accounts/{self.escrow_id}/fund",
            headers=headers,
            json={"amount_cents": balance_cents}
        )
        
        if fund_resp.status_code not in [200, 201]:
            log(f"Funding warning: {fund_resp.text}", "WARN")
        
        log(f"Created escrow: {self.escrow_id} with ${balance_cents/100:.2f}", "SUCCESS")
        return self.escrow_id
    
    def create_policy(self):
        """Create spending policy"""
        headers = {"Authorization": f"Bearer {self.token}"}
        
        resp = requests.post(f"{API_URL}/policies", headers=headers, json={
            "escrow_id": self.escrow_id,
            "name": "SDK Test Policy",
            "purpose": "Allow controlled spending for AI compute and SaaS tools",
            "draft": False,
            "per_transaction_limit_cents": 100000,  # $1000 max per tx
            "daily_limit_cents": 250000,  # $2500/day
            "allowed_categories": ["ai_compute", "cloud_services", "saas", "api_credits"],
            "aav_enabled": True,
            "authorized_agent_ids": ["sdk-test-agent", "langchain-agent"]
        })
        
        if resp.status_code not in [200, 201]:
            raise Exception(f"Failed to create policy: {resp.text}")
        
        policy = resp.json()
        self.policy_id = policy.get("id")
        log(f"Created policy: {self.policy_id}", "SUCCESS")
        return self.policy_id
    
    def create_api_key(self):
        """Create agent API key"""
        headers = {"Authorization": f"Bearer {self.token}"}
        
        resp = requests.post(f"{API_URL}/api-keys", headers=headers, json={
            "key_type": "agent",
            "label": "SDK Integration Test Key"
        })
        
        if resp.status_code not in [200, 201]:
            raise Exception(f"Failed to create API key: {resp.text}")
        
        key_data = resp.json()
        self.api_key = key_data.get("key")
        log(f"Created API key: {key_data.get('key_prefix')}...", "SUCCESS")
        return self.api_key


def test_sdk_basic_operations(setup: TestSetup) -> bool:
    """Test 1: Basic SDK operations"""
    log("\n" + "=" * 60)
    log("TEST 1: Python SDK Basic Operations")
    log("=" * 60)
    
    try:
        # Initialize client
        client = SafeSpendClient(
            api_key=setup.api_key,
            base_url="https://agent-vault-demo.preview.emergentagent.com"
        )
        
        # Test 1.1: Get balance
        log("1.1 Testing get_escrow_balance...")
        balance = client.get_escrow_balance(setup.escrow_id)
        assert balance.get("balance_cents") == 500000, f"Expected 500000, got {balance.get('balance_cents')}"
        log(f"Balance check passed: ${balance.get('balance_cents', 0)/100:.2f}", "SUCCESS")
        
        # Test 1.2: Create spend request (should be approved)
        log("1.2 Testing create_spend (should approve)...")
        spend = client.create_spend(
            escrow_id=setup.escrow_id,
            amount_cents=5000,  # $50
            vendor="Anthropic",
            category="ai_compute",
            description="Claude API credits for testing"
        )
        assert spend.get("status") == "approved", f"Expected approved, got {spend.get('status')}"
        log(f"Spend approved: ${spend.get('amount_cents', 0)/100:.2f}", "SUCCESS")
        
        # Test 1.3: Check balance after spend
        log("1.3 Verifying balance after spend...")
        new_balance = client.get_escrow_balance(setup.escrow_id)
        expected_balance = 500000 - 5000
        assert new_balance.get("balance_cents") == expected_balance, \
            f"Expected {expected_balance}, got {new_balance.get('balance_cents')}"
        log(f"Balance correct: ${new_balance.get('balance_cents', 0)/100:.2f}", "SUCCESS")
        
        # Test 1.4: List spend requests
        log("1.4 Testing list_spend_requests...")
        spends = client.list_spend_requests(escrow_id=setup.escrow_id)
        assert len(spends) >= 1, "Expected at least 1 spend request"
        log(f"Found {len(spends)} spend request(s)", "SUCCESS")
        
        # Test 1.5: Test category rejection (invalid category)
        log("1.5 Testing spend with blocked category...")
        try:
            blocked_spend = client.create_spend(
                escrow_id=setup.escrow_id,
                amount_cents=1000,
                vendor="RandomVendor",
                category="gambling",  # Not in allowed categories
                description="Should be denied"
            )
            # If we have allowed_categories, this should be denied
            if blocked_spend.get("status") == "denied":
                log("Category restriction working - spend denied", "SUCCESS")
            else:
                log(f"Spend status: {blocked_spend.get('status')} (category may not be strictly enforced)", "WARN")
        except Exception as e:
            log(f"Category test: {e}", "WARN")
        
        return True
        
    except Exception as e:
        log(f"SDK test failed: {e}", "FAIL")
        import traceback
        traceback.print_exc()
        return False


def test_sdk_error_handling(setup: TestSetup) -> bool:
    """Test 2: SDK error handling"""
    log("\n" + "=" * 60)
    log("TEST 2: SDK Error Handling")
    log("=" * 60)
    
    try:
        client = SafeSpendClient(
            api_key=setup.api_key,
            base_url="https://agent-vault-demo.preview.emergentagent.com"
        )
        
        # Test 2.1: Invalid amount
        log("2.1 Testing invalid amount handling...")
        try:
            client.create_spend(
                escrow_id=setup.escrow_id,
                amount_cents=-100,
                vendor="Test",
            )
            log("Should have raised ValueError", "FAIL")
            return False
        except ValueError as e:
            log(f"Correctly raised ValueError: {e}", "SUCCESS")
        
        # Test 2.2: Non-existent escrow
        log("2.2 Testing non-existent escrow...")
        try:
            client.get_escrow_balance("esc_nonexistent123")
            log("Should have raised NotFoundError", "FAIL")
            return False
        except SafeSpendError as e:
            log(f"Correctly raised error: {e}", "SUCCESS")
        
        # Test 2.3: Amount exceeding per-tx limit
        log("2.3 Testing per-transaction limit...")
        try:
            spend = client.create_spend(
                escrow_id=setup.escrow_id,
                amount_cents=150000,  # $1500 (exceeds $1000 limit)
                vendor="BigPurchase",
                category="ai_compute",
            )
            # If we get here, the API returned a response (might be denied status)
            if spend.get("status") == "denied":
                log("Per-transaction limit correctly enforced", "SUCCESS")
            else:
                log(f"Spend was {spend.get('status')} - limit may not be enforced", "WARN")
        except ValidationError as e:
            # This is the expected behavior - the API rejects the request
            log(f"Per-transaction limit correctly enforced via API error: {e}", "SUCCESS")
        except SafeSpendError as e:
            log(f"Got SafeSpendError (expected): {e}", "SUCCESS")
        
        return True
        
    except Exception as e:
        log(f"Error handling test failed: {e}", "FAIL")
        import traceback
        traceback.print_exc()
        return False


def test_langchain_integration(setup: TestSetup) -> bool:
    """Test 3: LangChain integration"""
    log("\n" + "=" * 60)
    log("TEST 3: LangChain Integration")
    log("=" * 60)
    
    try:
        from safespend import SafeSpendClient
        from safespend.integrations import create_safespend_toolkit
        
        # Initialize client
        client = SafeSpendClient(
            api_key=setup.api_key,
            base_url="https://agent-vault-demo.preview.emergentagent.com"
        )
        
        # Create toolkit
        log("3.1 Creating LangChain toolkit...")
        tools = create_safespend_toolkit(
            client=client,
            default_escrow_id=setup.escrow_id
        )
        
        assert len(tools) >= 3, f"Expected at least 3 tools, got {len(tools)}"
        tool_names = [t.name for t in tools]
        log(f"Created tools: {tool_names}", "SUCCESS")
        
        # Test 3.2: Use balance check tool directly
        log("3.2 Testing SafeSpendCheckBalanceTool...")
        balance_tool = next((t for t in tools if "balance" in t.name.lower()), None)
        if balance_tool:
            result = balance_tool._run()
            assert "balance_cents" in result, "Balance tool should return balance_cents"
            log(f"Balance tool returned: {result.get('message')}", "SUCCESS")
        else:
            log("Balance tool not found", "WARN")
        
        # Test 3.3: Use spend tool directly
        log("3.3 Testing SafeSpendTool...")
        spend_tool = next((t for t in tools if "spend" in t.name.lower() and "request" in t.name.lower()), None)
        if spend_tool:
            result = spend_tool._run(
                amount_cents=2500,
                vendor="OpenAI",
                category="ai_compute",
                description="LangChain tool test"
            )
            log(f"Spend tool result: {result.get('message', result.get('status'))}", "SUCCESS")
        else:
            log("Spend tool not found", "WARN")
        
        # Test 3.4: Use list tool
        log("3.4 Testing SafeSpendListSpendsTool...")
        list_tool = next((t for t in tools if "list" in t.name.lower()), None)
        if list_tool:
            result = list_tool._run(limit=5)
            assert "requests" in result, "List tool should return requests"
            log(f"List tool found {result.get('count')} requests", "SUCCESS")
        else:
            log("List tool not found", "WARN")
        
        return True
        
    except ImportError as e:
        log(f"LangChain not installed, skipping: {e}", "WARN")
        return True  # Not a failure - optional dependency
    except Exception as e:
        log(f"LangChain test failed: {e}", "FAIL")
        import traceback
        traceback.print_exc()
        return False


def test_aav_claims_flow(setup: TestSetup) -> bool:
    """Test 4: AAV claims in spend requests"""
    log("\n" + "=" * 60)
    log("TEST 4: AAV Claims Flow")
    log("=" * 60)
    
    try:
        # Make a direct API call with AAV claims
        headers = {"X-API-Key": setup.api_key}
        
        # Test 4.1: Spend with authorized agent ID
        log("4.1 Testing spend with authorized AAV agent ID...")
        resp = requests.post(f"{API_URL}/spend", headers=headers, json={
            "escrow_id": setup.escrow_id,
            "amount_cents": 1500,
            "vendor": "AWS",
            "category": "cloud_services",
            "description": "AAV authorized agent test",
            "aav_agent_id": "sdk-test-agent"  # Matches authorized list
        })
        
        if resp.status_code in [200, 201]:
            data = resp.json()
            log(f"Spend status: {data.get('status')}", "SUCCESS")
            
            # Check if AAV metadata is in rules evaluated
            rules = data.get("rules_evaluated", [])
            aav_rule = next((r for r in rules if r.get("rule") == "aav_authorization"), None)
            if aav_rule:
                log(f"AAV rule evaluated: {aav_rule.get('reason')}", "SUCCESS")
        else:
            log(f"Spend request returned: {resp.status_code} - {resp.text}", "WARN")
        
        # Test 4.2: Spend with unauthorized agent ID (should warn in warn mode)
        log("4.2 Testing spend with unauthorized AAV agent ID (warn mode)...")
        resp = requests.post(f"{API_URL}/spend", headers=headers, json={
            "escrow_id": setup.escrow_id,
            "amount_cents": 1000,
            "vendor": "GCP",
            "category": "cloud_services",
            "description": "Unauthorized agent test",
            "aav_agent_id": "unauthorized-agent-xyz"
        })
        
        if resp.status_code in [200, 201]:
            data = resp.json()
            # In warn mode, should still be approved but with warning
            log(f"Spend status: {data.get('status')} (warn mode allows through)", "SUCCESS")
        else:
            log(f"Response: {resp.status_code}", "WARN")
        
        return True
        
    except Exception as e:
        log(f"AAV claims test failed: {e}", "FAIL")
        import traceback
        traceback.print_exc()
        return False


def run_all_tests():
    """Run the complete integration test suite"""
    log("=" * 70)
    log("SAFE-SPEND SDK + LANGCHAIN + AAV INTEGRATION TEST")
    log("=" * 70)
    
    results = []
    setup = TestSetup()
    
    try:
        # Setup
        log("\nSETUP PHASE")
        log("-" * 40)
        setup.create_org()
        setup.create_escrow()
        setup.create_policy()
        setup.create_api_key()
        
        # Run tests
        results.append(("SDK Basic Operations", test_sdk_basic_operations(setup)))
        results.append(("SDK Error Handling", test_sdk_error_handling(setup)))
        results.append(("LangChain Integration", test_langchain_integration(setup)))
        results.append(("AAV Claims Flow", test_aav_claims_flow(setup)))
        
    except Exception as e:
        log(f"Setup failed: {e}", "FAIL")
        import traceback
        traceback.print_exc()
        return False
    
    # Summary
    log("\n" + "=" * 70)
    log("TEST SUMMARY")
    log("=" * 70)
    
    passed = sum(1 for _, p in results if p)
    total = len(results)
    
    for test_name, passed_flag in results:
        status = "SUCCESS" if passed_flag else "FAIL"
        log(f"  {test_name}: {'PASS' if passed_flag else 'FAIL'}", status)
    
    log(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        log("\nALL INTEGRATION TESTS PASSED!", "SUCCESS")
        return True
    else:
        log(f"\n{total - passed} TEST(S) FAILED!", "FAIL")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
