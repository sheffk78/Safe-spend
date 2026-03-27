#!/usr/bin/env python3
"""
Test Multi-Policy / Multi-Agent Evaluation
============================================
This test verifies that when multiple policies are applied to a single escrow account,
the rules engine correctly evaluates spend requests against ONLY the policies
applicable to the specific agent making the request.

Test Scenario:
- One escrow account with two policies:
  - Policy A: For "marketing-agent" - allows only "marketing" category, blocks "infrastructure"
  - Policy B: For "devops-agent" - allows only "infrastructure" category, blocks "marketing"
- Test that each agent can only spend in their allowed category

Expected Results:
- marketing-agent spending on marketing: APPROVED
- marketing-agent spending on infrastructure: DENIED
- devops-agent spending on infrastructure: APPROVED
- devops-agent spending on marketing: DENIED
"""

import requests
import json
import sys
import time
from datetime import datetime

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

def create_test_user():
    """Create a test user and return auth token"""
    timestamp = int(time.time())
    email = f"multipolicy_test_{timestamp}@test.com"
    password = "TestPass123!"
    name = f"MultiPolicy Test Org {timestamp}"
    
    log(f"Creating test user: {email}")
    resp = requests.post(f"{API_URL}/auth/signup", json={
        "email": email,
        "password": password,
        "name": name
    })
    
    if resp.status_code != 201:
        log(f"Failed to register: {resp.text}", "FAIL")
        return None, None
    
    data = resp.json()
    return data.get("token"), data.get("organization", {}).get("id")

def create_escrow(token, name, initial_balance=100000):
    """Create an escrow account with initial balance (in cents)"""
    log(f"Creating escrow account: {name}")
    resp = requests.post(
        f"{API_URL}/escrow-accounts",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": name}
    )
    
    if resp.status_code not in [200, 201]:
        log(f"Failed to create escrow: {resp.text}", "FAIL")
        return None
    
    escrow = resp.json()
    escrow_id = escrow.get("id")
    
    # Simulate adding balance (in production this would be via Stripe)
    # For testing, we need to fund the escrow
    log(f"Funding escrow with ${initial_balance/100:.2f}")
    fund_resp = requests.post(
        f"{API_URL}/escrow-accounts/{escrow_id}/fund",
        headers={"Authorization": f"Bearer {token}"},
        json={"amount_cents": initial_balance}
    )
    
    if fund_resp.status_code not in [200, 201]:
        log(f"Funding response: {fund_resp.status_code} - {fund_resp.text}", "WARN")
    
    return escrow

def create_policy(token, escrow_id, policy_data):
    """Create a spending policy"""
    log(f"Creating policy: {policy_data.get('name')}")
    
    # Convert camelCase to snake_case for API
    api_data = {
        "escrow_id": escrow_id,
        "name": policy_data.get("name"),
        "purpose": policy_data.get("purpose"),
        "draft": False,  # Create as active
        "per_transaction_limit_cents": policy_data.get("perTransactionLimitCents"),
        "daily_limit_cents": policy_data.get("dailyLimitCents"),
        "allowed_categories": policy_data.get("allowedCategories", []),
        "blocked_categories": policy_data.get("blockedCategories", []),
        "aav_enabled": policy_data.get("aavEnabled", False),
        "authorized_agent_ids": policy_data.get("authorizedAgentIds", [])
    }
    
    resp = requests.post(
        f"{API_URL}/policies",
        headers={"Authorization": f"Bearer {token}"},
        json=api_data
    )
    
    if resp.status_code not in [200, 201]:
        log(f"Failed to create policy: {resp.text}", "FAIL")
        return None
    
    return resp.json()

def activate_policy(token, policy_id):
    """Activate a policy"""
    log(f"Activating policy: {policy_id}")
    resp = requests.patch(
        f"{API_URL}/policies/{policy_id}/activate",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if resp.status_code not in [200, 201]:
        log(f"Failed to activate policy: {resp.text}", "FAIL")
        return None
    
    return resp.json()

def create_agent_key(token, name, escrow_id):
    """Create an agent API key"""
    log(f"Creating agent key: {name}")
    resp = requests.post(
        f"{API_URL}/api-keys",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "label": name,
            "key_type": "agent"
        }
    )
    
    if resp.status_code not in [200, 201]:
        log(f"Failed to create API key: {resp.text}", "FAIL")
        return None
    
    return resp.json()

def submit_spend_request(api_key, escrow_id, amount_cents, vendor, category, agent_id=None, description="Test spend"):
    """Submit a spend request using an agent key"""
    headers = {"X-API-Key": api_key}
    payload = {
        "escrow_id": escrow_id,
        "amount_cents": amount_cents,
        "vendor": vendor,
        "category": category,
        "description": description
    }
    
    # Include AAV claims if agent_id is provided
    if agent_id:
        payload["aav_agent_id"] = agent_id
    
    log(f"Submitting spend: ${amount_cents/100:.2f} to {vendor} ({category}) as agent={agent_id}")
    resp = requests.post(
        f"{API_URL}/spend",
        headers=headers,
        json=payload
    )
    
    return resp.status_code, resp.json()

def run_test():
    """Run the multi-policy / multi-agent test"""
    results = []
    
    log("=" * 60)
    log("MULTI-POLICY / MULTI-AGENT TEST")
    log("=" * 60)
    
    # Step 1: Create test user
    token, org_id = create_test_user()
    if not token:
        log("Failed to create test user", "FAIL")
        return False
    log(f"Created org: {org_id}", "SUCCESS")
    
    # Step 2: Create escrow account
    escrow = create_escrow(token, "Multi-Agent Trust Account", 100000)
    if not escrow:
        log("Failed to create escrow", "FAIL")
        return False
    escrow_id = escrow.get("id")
    log(f"Created escrow: {escrow_id}", "SUCCESS")
    
    # Step 3: Create two policies with different agent restrictions
    # Policy A: Marketing agent - can only spend on "marketing" category
    policy_a = create_policy(token, escrow_id, {
        "name": "Marketing Agent Policy",
        "purpose": "Allows marketing spend only",
        "perTransactionLimitCents": 50000,
        "dailyLimitCents": 100000,
        "allowedCategories": ["marketing", "advertising"],
        "blockedCategories": ["infrastructure", "devops"],
        "aavEnabled": True,
        "authorizedAgentIds": ["marketing-agent-001"]
    })
    
    if not policy_a:
        log("Failed to create marketing policy", "FAIL")
        return False
    
    # Policy B: DevOps agent - can only spend on "infrastructure" category
    policy_b = create_policy(token, escrow_id, {
        "name": "DevOps Agent Policy",
        "purpose": "Allows infrastructure spend only",
        "perTransactionLimitCents": 75000,
        "dailyLimitCents": 150000,
        "allowedCategories": ["infrastructure", "devops", "cloud"],
        "blockedCategories": ["marketing", "advertising"],
        "aavEnabled": True,
        "authorizedAgentIds": ["devops-agent-001"]
    })
    
    if not policy_b:
        log("Failed to create devops policy", "FAIL")
        return False
    
    # Activate both policies
    activate_policy(token, policy_a.get("id"))
    activate_policy(token, policy_b.get("id"))
    
    # Step 4: Create agent API keys
    marketing_key_data = create_agent_key(token, "Marketing Agent Key", escrow_id)
    devops_key_data = create_agent_key(token, "DevOps Agent Key", escrow_id)
    
    if not marketing_key_data or not devops_key_data:
        log("Failed to create agent keys", "FAIL")
        return False
    
    marketing_key = marketing_key_data.get("key")
    devops_key = devops_key_data.get("key")
    
    log("\n" + "=" * 60)
    log("RUNNING TEST SCENARIOS")
    log("=" * 60)
    
    # Test 1.1: Marketing agent spending on marketing (SHOULD PASS)
    log("\n[Test 1.1] Marketing agent -> Marketing category")
    status, response = submit_spend_request(
        marketing_key, escrow_id, 1000, "AdPlatform Inc", "marketing",
        agent_id="marketing-agent-001"
    )
    test_1_1_passed = response.get("status") == "approved"
    results.append(("1.1 Marketing agent -> Marketing", test_1_1_passed))
    if test_1_1_passed:
        log("PASS: Marketing agent approved for marketing spend", "SUCCESS")
    else:
        log(f"FAIL: Expected approved, got: {response.get('status')} - {response.get('denialReason')}", "FAIL")
    
    # Test 1.2: Marketing agent spending on infrastructure (SHOULD FAIL)
    log("\n[Test 1.2] Marketing agent -> Infrastructure category")
    status, response = submit_spend_request(
        marketing_key, escrow_id, 1000, "AWS", "infrastructure",
        agent_id="marketing-agent-001"
    )
    test_1_2_passed = response.get("status") == "denied"
    results.append(("1.2 Marketing agent -> Infrastructure", test_1_2_passed))
    if test_1_2_passed:
        log("PASS: Marketing agent correctly denied for infrastructure spend", "SUCCESS")
    else:
        log(f"FAIL: Expected denied, got: {response.get('status')}", "FAIL")
    
    # Test 1.3: DevOps agent spending on infrastructure (SHOULD PASS)
    log("\n[Test 1.3] DevOps agent -> Infrastructure category")
    status, response = submit_spend_request(
        devops_key, escrow_id, 1500, "AWS", "infrastructure",
        agent_id="devops-agent-001"
    )
    test_1_3_passed = response.get("status") == "approved"
    results.append(("1.3 DevOps agent -> Infrastructure", test_1_3_passed))
    if test_1_3_passed:
        log("PASS: DevOps agent approved for infrastructure spend", "SUCCESS")
    else:
        log(f"FAIL: Expected approved, got: {response.get('status')} - {response.get('denialReason')}", "FAIL")
    
    # Test 1.4: DevOps agent spending on marketing (SHOULD FAIL)
    log("\n[Test 1.4] DevOps agent -> Marketing category")
    status, response = submit_spend_request(
        devops_key, escrow_id, 1500, "Facebook Ads", "marketing",
        agent_id="devops-agent-001"
    )
    test_1_4_passed = response.get("status") == "denied"
    results.append(("1.4 DevOps agent -> Marketing", test_1_4_passed))
    if test_1_4_passed:
        log("PASS: DevOps agent correctly denied for marketing spend", "SUCCESS")
    else:
        log(f"FAIL: Expected denied, got: {response.get('status')}", "FAIL")
    
    # Summary
    log("\n" + "=" * 60)
    log("TEST SUMMARY")
    log("=" * 60)
    
    passed = sum(1 for _, p in results if p)
    total = len(results)
    
    for test_name, passed_flag in results:
        status = "SUCCESS" if passed_flag else "FAIL"
        log(f"  {test_name}: {'PASS' if passed_flag else 'FAIL'}", status)
    
    log(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        log("\nALL TESTS PASSED!", "SUCCESS")
        return True
    else:
        log(f"\n{total - passed} TESTS FAILED!", "FAIL")
        return False

if __name__ == "__main__":
    success = run_test()
    sys.exit(0 if success else 1)
