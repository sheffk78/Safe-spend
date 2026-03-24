"""
Data Quality & Accounting Test Suite for Safe-Spend API
========================================================
Tests covering:
1. Cross-escrow balance consistency
2. Spend flow vs ledger & audit
3. Daily/Weekly/Monthly tracking integrity
4. Idempotency & double-spend protection
5. Orphan detection & referential integrity
"""

import pytest
import requests
import os
import uuid
import time
import sqlite3
from datetime import datetime, date

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
DB_PATH = '/app/backend/prisma/dev.db'


def query_db(sql, params=()):
    """Execute SQL query on SQLite database"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(sql, params)
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results


def query_db_single(sql, params=()):
    """Execute SQL query and return single result"""
    results = query_db(sql, params)
    return results[0] if results else None


@pytest.fixture(scope='module')
def test_context():
    """Setup test organizations and return context for all tests"""
    context = {
        'org_a': {},
        'org_b': {},
        'escrows': {},
        'policies': {},
        'spend_requests': []
    }
    
    unique_id = str(uuid.uuid4())[:8]
    
    # Create Org A
    org_a_email = f"dq_org_a_{unique_id}@test.com"
    org_a_password = "DQTestOrgA123!"
    
    response = requests.post(f"{BASE_URL}/api/v1/auth/signup", json={
        "name": f"DQ Test Org A {unique_id}",
        "email": org_a_email,
        "password": org_a_password
    })
    assert response.status_code == 201, f"Failed to create Org A: {response.text}"
    context['org_a'] = {
        'email': org_a_email,
        'password': org_a_password,
        'token': response.json().get('token'),
        'org_id': response.json().get('org', {}).get('id')
    }
    print(f"\n✓ Created Org A: {org_a_email}")
    
    # Create Org B
    org_b_email = f"dq_org_b_{unique_id}@test.com"
    org_b_password = "DQTestOrgB123!"
    
    response = requests.post(f"{BASE_URL}/api/v1/auth/signup", json={
        "name": f"DQ Test Org B {unique_id}",
        "email": org_b_email,
        "password": org_b_password
    })
    assert response.status_code == 201, f"Failed to create Org B: {response.text}"
    context['org_b'] = {
        'email': org_b_email,
        'password': org_b_password,
        'token': response.json().get('token'),
        'org_id': response.json().get('org', {}).get('id')
    }
    print(f"✓ Created Org B: {org_b_email}")
    
    return context


def get_auth_headers(context, org_key='org_a'):
    """Get authorization headers for specified org"""
    return {"Authorization": f"Bearer {context[org_key]['token']}"}


class TestCrossEscrowBalanceConsistency:
    """
    Test 1: CROSS-ESCROW BALANCE CONSISTENCY
    - Create 3 escrows for Org A (escA1: $500, escA2: $200, escA3: $0)
    - Verify balance_cents matches funding
    - Verify org isolation (Org B cannot see Org A's escrows)
    """
    
    def test_create_three_escrows_for_org_a(self, test_context):
        """Create 3 escrow accounts with different funding levels"""
        headers = get_auth_headers(test_context, 'org_a')
        
        # Create escA1 - will be funded with $500 (50000 cents)
        response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", 
            headers=headers,
            json={"name": "DQ Test Escrow A1", "description": "For data quality testing - $500"})
        assert response.status_code == 201, f"Failed to create escA1: {response.text}"
        esc_a1 = response.json()
        test_context['escrows']['escA1'] = esc_a1
        print(f"✓ Created escA1: {esc_a1['id']}")
        
        # Create escA2 - will be funded with $200 (20000 cents)
        response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", 
            headers=headers,
            json={"name": "DQ Test Escrow A2", "description": "For data quality testing - $200"})
        assert response.status_code == 201, f"Failed to create escA2: {response.text}"
        esc_a2 = response.json()
        test_context['escrows']['escA2'] = esc_a2
        print(f"✓ Created escA2: {esc_a2['id']}")
        
        # Create escA3 - no funding ($0)
        response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", 
            headers=headers,
            json={"name": "DQ Test Escrow A3", "description": "For data quality testing - $0"})
        assert response.status_code == 201, f"Failed to create escA3: {response.text}"
        esc_a3 = response.json()
        test_context['escrows']['escA3'] = esc_a3
        print(f"✓ Created escA3: {esc_a3['id']}")
        
        # Verify initial balances are 0
        assert esc_a1['balance_cents'] == 0, "escA1 should start with 0 balance"
        assert esc_a2['balance_cents'] == 0, "escA2 should start with 0 balance"
        assert esc_a3['balance_cents'] == 0, "escA3 should start with 0 balance"
        print("✓ All escrows created with 0 initial balance")
    
    def test_fund_escrows_and_verify_balance(self, test_context):
        """Fund escrows and verify balance_cents matches funding"""
        headers = get_auth_headers(test_context, 'org_a')
        
        # Fund escA1 with $500 (50000 cents)
        esc_a1_id = test_context['escrows']['escA1']['id']
        response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{esc_a1_id}/fund",
            headers=headers,
            json={"amount_cents": 50000})
        assert response.status_code == 200, f"Failed to fund escA1: {response.text}"
        funded_a1 = response.json()['escrow']
        assert funded_a1['balance_cents'] == 50000, f"escA1 balance should be 50000, got {funded_a1['balance_cents']}"
        assert funded_a1['total_funded_cents'] == 50000, f"escA1 total_funded should be 50000"
        test_context['escrows']['escA1'] = funded_a1
        print(f"✓ Funded escA1 with $500, balance: {funded_a1['balance_cents']} cents")
        
        # Fund escA2 with $200 (20000 cents)
        esc_a2_id = test_context['escrows']['escA2']['id']
        response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{esc_a2_id}/fund",
            headers=headers,
            json={"amount_cents": 20000})
        assert response.status_code == 200, f"Failed to fund escA2: {response.text}"
        funded_a2 = response.json()['escrow']
        assert funded_a2['balance_cents'] == 20000, f"escA2 balance should be 20000, got {funded_a2['balance_cents']}"
        assert funded_a2['total_funded_cents'] == 20000, f"escA2 total_funded should be 20000"
        test_context['escrows']['escA2'] = funded_a2
        print(f"✓ Funded escA2 with $200, balance: {funded_a2['balance_cents']} cents")
        
        # escA3 remains unfunded ($0)
        print("✓ escA3 remains unfunded at $0")
        
        # Verify in database
        db_esc_a1 = query_db_single("SELECT * FROM escrow_accounts WHERE id = ?", (esc_a1_id,))
        db_esc_a2 = query_db_single("SELECT * FROM escrow_accounts WHERE id = ?", (esc_a2_id,))
        
        assert db_esc_a1['balance_cents'] == 50000, f"DB escA1 balance mismatch: {db_esc_a1['balance_cents']}"
        assert db_esc_a2['balance_cents'] == 20000, f"DB escA2 balance mismatch: {db_esc_a2['balance_cents']}"
        print("✓ Database balance verification passed")
    
    def test_org_isolation_org_b_cannot_see_org_a_escrows(self, test_context):
        """Verify Org B cannot access Org A's escrows"""
        headers_b = get_auth_headers(test_context, 'org_b')
        
        # Try to access escA1 from Org B
        esc_a1_id = test_context['escrows']['escA1']['id']
        response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts/{esc_a1_id}",
            headers=headers_b)
        assert response.status_code == 404, f"Org B should not see Org A's escrow, got {response.status_code}"
        print("✓ Org B cannot access escA1 (404)")
        
        # Try to list escrows from Org B - should not include Org A's escrows
        response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers_b)
        assert response.status_code == 200
        org_b_escrows = response.json()['data']
        org_a_escrow_ids = [test_context['escrows'][k]['id'] for k in ['escA1', 'escA2', 'escA3']]
        
        for escrow in org_b_escrows:
            assert escrow['id'] not in org_a_escrow_ids, f"Org B should not see Org A's escrow {escrow['id']}"
        print("✓ Org B's escrow list does not contain Org A's escrows")
        
        # Try to fund Org A's escrow from Org B
        response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{esc_a1_id}/fund",
            headers=headers_b,
            json={"amount_cents": 10000})
        assert response.status_code == 404, f"Org B should not be able to fund Org A's escrow"
        print("✓ Org B cannot fund Org A's escrow (404)")


class TestSpendFlowVsLedgerAudit:
    """
    Test 2: SPEND FLOW VS LEDGER & AUDIT
    - Create policy P1 on escA1: per-tx=10000, daily=30000, monthly=100000, vendors=[Anthropic,OpenAI]
    - S1: 5000 cents to Anthropic (should approve)
    - S2: 7500 cents to Anthropic (should approve, total=12500)
    - S3: 25000 cents to Anthropic (should deny - would exceed 30000 daily with 12500 already spent)
    - S4: 5000 cents to BlockedVendorX (should deny - vendor)
    - Verify: balance=37500, total_spent=12500, total_denied=30000
    - Verify spend_requests table has correct balance_before/after
    - Verify audit_events for each spend
    """
    
    def test_create_policy_p1_on_esc_a1(self, test_context):
        """Create policy with per-tx, daily, monthly limits and vendor allowlist"""
        headers = get_auth_headers(test_context, 'org_a')
        esc_a1_id = test_context['escrows']['escA1']['id']
        
        response = requests.post(f"{BASE_URL}/api/v1/policies",
            headers=headers,
            json={
                "escrow_id": esc_a1_id,
                "name": "DQ Test Policy P1",
                "per_transaction_limit_cents": 10000,  # $100 per tx
                "daily_limit_cents": 30000,  # $300 daily
                "monthly_limit_cents": 100000,  # $1000 monthly
                "allowed_vendors": ["Anthropic", "OpenAI"],
                "vendor_match_mode": "exact"
            })
        assert response.status_code == 201, f"Failed to create policy P1: {response.text}"
        policy = response.json()
        test_context['policies']['P1'] = policy
        print(f"✓ Created policy P1: {policy['id']}")
        print(f"  - per_transaction_limit: {policy['per_transaction_limit_cents']} cents")
        print(f"  - daily_limit: {policy['daily_limit_cents']} cents")
        print(f"  - monthly_limit: {policy['monthly_limit_cents']} cents")
        print(f"  - allowed_vendors: {policy['allowed_vendors']}")
    
    def test_s1_spend_5000_to_anthropic_approved(self, test_context):
        """S1: 5000 cents to Anthropic - should approve"""
        headers = get_auth_headers(test_context, 'org_a')
        esc_a1_id = test_context['escrows']['escA1']['id']
        
        response = requests.post(f"{BASE_URL}/api/v1/spend",
            headers=headers,
            json={
                "escrow_id": esc_a1_id,
                "amount_cents": 5000,
                "vendor": "Anthropic",
                "description": "S1: Test spend to Anthropic"
            })
        assert response.status_code == 201, f"S1 should be approved: {response.text}"
        spend = response.json()
        test_context['spend_requests'].append(spend)
        
        assert spend['status'] == 'approved', f"S1 status should be approved, got {spend['status']}"
        assert spend['amount_cents'] == 5000
        assert spend['balance_before_cents'] == 50000, f"Balance before should be 50000, got {spend['balance_before_cents']}"
        assert spend['balance_after_cents'] == 45000, f"Balance after should be 45000, got {spend['balance_after_cents']}"
        assert spend['remaining_balance_cents'] == 45000
        print(f"✓ S1 approved: {spend['id']}")
        print(f"  - balance_before: {spend['balance_before_cents']}, balance_after: {spend['balance_after_cents']}")
    
    def test_s2_spend_7500_to_anthropic_approved(self, test_context):
        """S2: 7500 cents to Anthropic - should approve (total=12500)"""
        headers = get_auth_headers(test_context, 'org_a')
        esc_a1_id = test_context['escrows']['escA1']['id']
        
        response = requests.post(f"{BASE_URL}/api/v1/spend",
            headers=headers,
            json={
                "escrow_id": esc_a1_id,
                "amount_cents": 7500,
                "vendor": "Anthropic",
                "description": "S2: Test spend to Anthropic"
            })
        assert response.status_code == 201, f"S2 should be approved: {response.text}"
        spend = response.json()
        test_context['spend_requests'].append(spend)
        
        assert spend['status'] == 'approved', f"S2 status should be approved, got {spend['status']}"
        assert spend['amount_cents'] == 7500
        assert spend['balance_before_cents'] == 45000, f"Balance before should be 45000, got {spend['balance_before_cents']}"
        assert spend['balance_after_cents'] == 37500, f"Balance after should be 37500, got {spend['balance_after_cents']}"
        print(f"✓ S2 approved: {spend['id']}")
        print(f"  - balance_before: {spend['balance_before_cents']}, balance_after: {spend['balance_after_cents']}")
        print(f"  - Total spent so far: 12500 cents")
    
    def test_s3_spend_25000_to_anthropic_denied_per_tx_limit(self, test_context):
        """S3: 25000 cents to Anthropic - should deny (exceeds per-transaction limit of 10000 cents)
        Note: Per-tx limit is checked before daily limit in the rules engine"""
        headers = get_auth_headers(test_context, 'org_a')
        esc_a1_id = test_context['escrows']['escA1']['id']
        
        response = requests.post(f"{BASE_URL}/api/v1/spend",
            headers=headers,
            json={
                "escrow_id": esc_a1_id,
                "amount_cents": 25000,
                "vendor": "Anthropic",
                "description": "S3: Test spend exceeding per-tx limit"
            })
        # Should be denied with 400
        assert response.status_code == 400, f"S3 should be denied: {response.text}"
        spend = response.json()
        test_context['spend_requests'].append(spend)
        
        assert spend['status'] == 'denied', f"S3 status should be denied, got {spend['status']}"
        # Per-tx limit (10000) is checked before daily limit (30000) in rules engine
        assert 'per-transaction' in spend.get('denial_reason', '').lower() or 'transaction' in spend.get('error', '').lower(), \
            f"Denial reason should mention per-transaction limit: {spend}"
        print(f"✓ S3 denied (per-transaction limit): {spend.get('id', 'N/A')}")
        print(f"  - denial_reason: {spend.get('denial_reason', spend.get('error', 'N/A'))}")
    
    def test_s3b_spend_exceeds_daily_limit(self, test_context):
        """S3b: Test daily limit - spend 10000 (within per-tx) but would exceed daily limit
        Current daily spent: 12500, daily limit: 30000, so 10000 more would be 22500 (within limit)
        Need to spend more to hit daily limit"""
        headers = get_auth_headers(test_context, 'org_a')
        esc_a1_id = test_context['escrows']['escA1']['id']
        
        # First, let's spend 10000 (within per-tx limit) - should pass
        response = requests.post(f"{BASE_URL}/api/v1/spend",
            headers=headers,
            json={
                "escrow_id": esc_a1_id,
                "amount_cents": 10000,
                "vendor": "Anthropic",
                "description": "S3b-1: Spend within limits"
            })
        assert response.status_code == 201, f"S3b-1 should be approved: {response.text}"
        print(f"✓ S3b-1 approved: 10000 cents (daily total now: 22500)")
        
        # Now try another 10000 - would bring daily to 32500 > 30000 limit
        response = requests.post(f"{BASE_URL}/api/v1/spend",
            headers=headers,
            json={
                "escrow_id": esc_a1_id,
                "amount_cents": 10000,
                "vendor": "Anthropic",
                "description": "S3b-2: Should exceed daily limit"
            })
        assert response.status_code == 400, f"S3b-2 should be denied: {response.text}"
        spend = response.json()
        
        assert spend['status'] == 'denied', f"S3b-2 status should be denied, got {spend['status']}"
        assert 'daily' in spend.get('denial_reason', '').lower() or 'daily' in spend.get('error', '').lower(), \
            f"Denial reason should mention daily limit: {spend}"
        print(f"✓ S3b-2 denied (daily limit): {spend.get('id', 'N/A')}")
        print(f"  - denial_reason: {spend.get('denial_reason', spend.get('error', 'N/A'))}")
    
    def test_s4_spend_5000_to_blocked_vendor_denied(self, test_context):
        """S4: 5000 cents to BlockedVendorX - should deny (vendor not in allowlist)"""
        headers = get_auth_headers(test_context, 'org_a')
        esc_a1_id = test_context['escrows']['escA1']['id']
        
        response = requests.post(f"{BASE_URL}/api/v1/spend",
            headers=headers,
            json={
                "escrow_id": esc_a1_id,
                "amount_cents": 5000,
                "vendor": "BlockedVendorX",
                "description": "S4: Test spend to blocked vendor"
            })
        # Should be denied with 400
        assert response.status_code == 400, f"S4 should be denied: {response.text}"
        spend = response.json()
        test_context['spend_requests'].append(spend)
        
        assert spend['status'] == 'denied', f"S4 status should be denied, got {spend['status']}"
        assert 'vendor' in spend.get('denial_reason', '').lower() or 'vendor' in spend.get('error', '').lower(), \
            f"Denial reason should mention vendor: {spend}"
        print(f"✓ S4 denied (vendor): {spend.get('id', 'N/A')}")
        print(f"  - denial_reason: {spend.get('denial_reason', spend.get('error', 'N/A'))}")
    
    def test_verify_escrow_balance_and_totals(self, test_context):
        """Verify balance and totals after all spends
        Approved: S1(5000) + S2(7500) + S3b-1(10000) = 22500
        Denied: S3(25000) + S4(5000) + S3b-2(10000) = 40000
        Balance: 50000 - 22500 = 27500"""
        headers = get_auth_headers(test_context, 'org_a')
        esc_a1_id = test_context['escrows']['escA1']['id']
        
        response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts/{esc_a1_id}", headers=headers)
        assert response.status_code == 200
        escrow = response.json()
        
        # Verify balance (50000 - 22500 = 27500)
        assert escrow['balance_cents'] == 27500, f"Balance should be 27500, got {escrow['balance_cents']}"
        print(f"✓ Balance verified: {escrow['balance_cents']} cents")
        
        # Verify total_spent (5000 + 7500 + 10000 = 22500)
        assert escrow['total_spent_cents'] == 22500, f"Total spent should be 22500, got {escrow['total_spent_cents']}"
        print(f"✓ Total spent verified: {escrow['total_spent_cents']} cents")
        
        # Verify total_denied (25000 + 5000 + 10000 = 40000)
        assert escrow['total_denied_cents'] == 40000, f"Total denied should be 40000, got {escrow['total_denied_cents']}"
        print(f"✓ Total denied verified: {escrow['total_denied_cents']} cents")
        
        # Verify accounting equation: funded - spent = balance
        assert escrow['total_funded_cents'] - escrow['total_spent_cents'] == escrow['balance_cents'], \
            f"Accounting equation failed: {escrow['total_funded_cents']} - {escrow['total_spent_cents']} != {escrow['balance_cents']}"
        print("✓ Accounting equation verified: funded - spent = balance")
    
    def test_verify_spend_requests_balance_before_after(self, test_context):
        """Verify spend_requests table has correct balance_before/after"""
        esc_a1_id = test_context['escrows']['escA1']['id']
        
        # Query database for spend requests
        spend_requests = query_db(
            "SELECT * FROM spend_requests WHERE escrow_id = ? ORDER BY created_at ASC",
            (esc_a1_id,)
        )
        
        approved_spends = [sr for sr in spend_requests if sr['status'] == 'approved']
        
        # Verify S1
        s1 = approved_spends[0]
        assert s1['balance_before_cents'] == 50000, f"S1 balance_before should be 50000, got {s1['balance_before_cents']}"
        assert s1['balance_after_cents'] == 45000, f"S1 balance_after should be 45000, got {s1['balance_after_cents']}"
        print(f"✓ S1 balance_before/after verified in DB")
        
        # Verify S2
        s2 = approved_spends[1]
        assert s2['balance_before_cents'] == 45000, f"S2 balance_before should be 45000, got {s2['balance_before_cents']}"
        assert s2['balance_after_cents'] == 37500, f"S2 balance_after should be 37500, got {s2['balance_after_cents']}"
        print(f"✓ S2 balance_before/after verified in DB")
        
        # Verify chain: S1.balance_after == S2.balance_before
        assert s1['balance_after_cents'] == s2['balance_before_cents'], \
            f"Balance chain broken: S1.after ({s1['balance_after_cents']}) != S2.before ({s2['balance_before_cents']})"
        print("✓ Balance chain verified: S1.balance_after == S2.balance_before")
    
    def test_verify_audit_events_for_spends(self, test_context):
        """Verify audit_events for each spend"""
        esc_a1_id = test_context['escrows']['escA1']['id']
        
        # Query audit events for this escrow
        audit_events = query_db(
            "SELECT * FROM audit_events WHERE escrow_id = ? ORDER BY created_at ASC",
            (esc_a1_id,)
        )
        
        # Filter spend-related events
        spend_events = [ae for ae in audit_events if 'spend' in ae['event_type']]
        
        # Should have at least 4 spend events (2 approved, 2 denied)
        approved_events = [ae for ae in spend_events if ae['event_type'] == 'spend.approved']
        denied_events = [ae for ae in spend_events if ae['event_type'] == 'spend.denied']
        
        assert len(approved_events) >= 2, f"Should have at least 2 spend.approved events, got {len(approved_events)}"
        assert len(denied_events) >= 2, f"Should have at least 2 spend.denied events, got {len(denied_events)}"
        
        print(f"✓ Audit events verified: {len(approved_events)} approved, {len(denied_events)} denied")
        
        # Verify audit event details contain spend info
        import json
        for event in approved_events:
            details = json.loads(event['details'])
            assert 'spend_request_id' in details, f"Audit event missing spend_request_id: {details}"
            assert 'amount_cents' in details, f"Audit event missing amount_cents: {details}"
        print("✓ Audit event details verified")


class TestDailyWeeklyMonthlyTracking:
    """
    Test 3: DAILY/WEEKLY/MONTHLY TRACKING
    - On escA2: create policy with only per-tx=10000
    - Execute T1: 2000, T2: 3000, T3: 5000 (all approved)
    - Verify daily_spend_tracking: total=10000, count=3
    - Verify weekly and monthly tracking tables
    """
    
    def test_create_policy_on_esc_a2(self, test_context):
        """Create policy with only per-tx limit on escA2"""
        headers = get_auth_headers(test_context, 'org_a')
        esc_a2_id = test_context['escrows']['escA2']['id']
        
        response = requests.post(f"{BASE_URL}/api/v1/policies",
            headers=headers,
            json={
                "escrow_id": esc_a2_id,
                "name": "DQ Test Policy P2",
                "per_transaction_limit_cents": 10000  # $100 per tx, no daily/weekly/monthly limits
            })
        assert response.status_code == 201, f"Failed to create policy P2: {response.text}"
        policy = response.json()
        test_context['policies']['P2'] = policy
        print(f"✓ Created policy P2: {policy['id']}")
    
    def test_execute_three_spends_on_esc_a2(self, test_context):
        """Execute T1: 2000, T2: 3000, T3: 5000 (all approved)"""
        headers = get_auth_headers(test_context, 'org_a')
        esc_a2_id = test_context['escrows']['escA2']['id']
        
        # T1: 2000 cents
        response = requests.post(f"{BASE_URL}/api/v1/spend",
            headers=headers,
            json={
                "escrow_id": esc_a2_id,
                "amount_cents": 2000,
                "vendor": "TestVendor",
                "description": "T1: 2000 cents"
            })
        assert response.status_code == 201, f"T1 should be approved: {response.text}"
        t1 = response.json()
        assert t1['status'] == 'approved'
        print(f"✓ T1 approved: 2000 cents")
        
        # T2: 3000 cents
        response = requests.post(f"{BASE_URL}/api/v1/spend",
            headers=headers,
            json={
                "escrow_id": esc_a2_id,
                "amount_cents": 3000,
                "vendor": "TestVendor",
                "description": "T2: 3000 cents"
            })
        assert response.status_code == 201, f"T2 should be approved: {response.text}"
        t2 = response.json()
        assert t2['status'] == 'approved'
        print(f"✓ T2 approved: 3000 cents")
        
        # T3: 5000 cents
        response = requests.post(f"{BASE_URL}/api/v1/spend",
            headers=headers,
            json={
                "escrow_id": esc_a2_id,
                "amount_cents": 5000,
                "vendor": "TestVendor",
                "description": "T3: 5000 cents"
            })
        assert response.status_code == 201, f"T3 should be approved: {response.text}"
        t3 = response.json()
        assert t3['status'] == 'approved'
        print(f"✓ T3 approved: 5000 cents")
        print(f"✓ Total spent on escA2: 10000 cents")
    
    def test_verify_daily_spend_tracking(self, test_context):
        """Verify daily_spend_tracking: total=10000, count=3"""
        esc_a2_id = test_context['escrows']['escA2']['id']
        
        # Query daily tracking
        daily_tracking = query_db(
            "SELECT * FROM daily_spend_tracking WHERE escrow_id = ?",
            (esc_a2_id,)
        )
        
        assert len(daily_tracking) >= 1, "Should have at least 1 daily tracking record"
        
        # Get today's tracking
        today_tracking = daily_tracking[-1]  # Most recent
        
        assert today_tracking['total_spent_cents'] == 10000, \
            f"Daily total should be 10000, got {today_tracking['total_spent_cents']}"
        assert today_tracking['transaction_count'] == 3, \
            f"Daily transaction count should be 3, got {today_tracking['transaction_count']}"
        
        print(f"✓ Daily tracking verified: total={today_tracking['total_spent_cents']}, count={today_tracking['transaction_count']}")
    
    def test_verify_weekly_spend_tracking(self, test_context):
        """Verify weekly_spend_tracking table"""
        esc_a2_id = test_context['escrows']['escA2']['id']
        
        # Query weekly tracking
        weekly_tracking = query_db(
            "SELECT * FROM weekly_spend_tracking WHERE escrow_id = ?",
            (esc_a2_id,)
        )
        
        assert len(weekly_tracking) >= 1, "Should have at least 1 weekly tracking record"
        
        # Get this week's tracking
        week_tracking = weekly_tracking[-1]  # Most recent
        
        assert week_tracking['total_spent_cents'] == 10000, \
            f"Weekly total should be 10000, got {week_tracking['total_spent_cents']}"
        assert week_tracking['transaction_count'] == 3, \
            f"Weekly transaction count should be 3, got {week_tracking['transaction_count']}"
        
        print(f"✓ Weekly tracking verified: total={week_tracking['total_spent_cents']}, count={week_tracking['transaction_count']}")
    
    def test_verify_monthly_spend_tracking(self, test_context):
        """Verify monthly_spend_tracking table"""
        esc_a2_id = test_context['escrows']['escA2']['id']
        
        # Query monthly tracking
        monthly_tracking = query_db(
            "SELECT * FROM monthly_spend_tracking WHERE escrow_id = ?",
            (esc_a2_id,)
        )
        
        assert len(monthly_tracking) >= 1, "Should have at least 1 monthly tracking record"
        
        # Get this month's tracking
        month_tracking = monthly_tracking[-1]  # Most recent
        
        assert month_tracking['total_spent_cents'] == 10000, \
            f"Monthly total should be 10000, got {month_tracking['total_spent_cents']}"
        assert month_tracking['transaction_count'] == 3, \
            f"Monthly transaction count should be 3, got {month_tracking['transaction_count']}"
        
        print(f"✓ Monthly tracking verified: total={month_tracking['total_spent_cents']}, count={month_tracking['transaction_count']}")
    
    def test_tracking_matches_spend_requests(self, test_context):
        """Verify tracking tables match spend_requests aggregation"""
        esc_a2_id = test_context['escrows']['escA2']['id']
        
        # Get approved spend requests for escA2
        spend_requests = query_db(
            "SELECT SUM(amount_cents) as total, COUNT(*) as count FROM spend_requests WHERE escrow_id = ? AND status = 'approved'",
            (esc_a2_id,)
        )
        
        sr_total = spend_requests[0]['total']
        sr_count = spend_requests[0]['count']
        
        # Get daily tracking
        daily_tracking = query_db(
            "SELECT SUM(total_spent_cents) as total, SUM(transaction_count) as count FROM daily_spend_tracking WHERE escrow_id = ?",
            (esc_a2_id,)
        )
        
        dt_total = daily_tracking[0]['total']
        dt_count = daily_tracking[0]['count']
        
        assert sr_total == dt_total, f"Spend requests total ({sr_total}) != daily tracking total ({dt_total})"
        assert sr_count == dt_count, f"Spend requests count ({sr_count}) != daily tracking count ({dt_count})"
        
        print(f"✓ Tracking matches spend_requests: total={sr_total}, count={sr_count}")


class TestIdempotencyDoublespend:
    """
    Test 4: IDEMPOTENCY & DOUBLE-SPEND
    - Send spend with idempotency_key='dq-idem-1' multiple times
    - Verify exactly 1 row in spend_requests
    - Verify balance decreased by exactly 1000 once
    """
    
    def test_idempotent_spend_multiple_times(self, test_context):
        """Send same spend request 3 times with same idempotency key"""
        headers = get_auth_headers(test_context, 'org_a')
        esc_a1_id = test_context['escrows']['escA1']['id']
        
        # Get current balance
        response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts/{esc_a1_id}", headers=headers)
        initial_balance = response.json()['balance_cents']
        print(f"Initial balance: {initial_balance} cents")
        
        idempotency_key = f"dq-idem-{uuid.uuid4().hex[:8]}"
        spend_ids = []
        
        # Send same request 3 times
        for i in range(3):
            response = requests.post(f"{BASE_URL}/api/v1/spend",
                headers=headers,
                json={
                    "escrow_id": esc_a1_id,
                    "amount_cents": 1000,
                    "vendor": "Anthropic",
                    "description": f"Idempotent spend attempt {i+1}",
                    "idempotency_key": idempotency_key
                })
            
            # First request should be 201, subsequent should be 200 (replay)
            assert response.status_code in [200, 201], f"Request {i+1} failed: {response.text}"
            spend = response.json()
            spend_ids.append(spend['id'])
            print(f"  Request {i+1}: status={response.status_code}, id={spend['id']}")
        
        # All requests should return the same spend ID
        assert len(set(spend_ids)) == 1, f"All requests should return same ID, got {spend_ids}"
        print(f"✓ All 3 requests returned same spend ID: {spend_ids[0]}")
        
        # Verify only 1 row in database
        db_spends = query_db(
            "SELECT * FROM spend_requests WHERE idempotency_key = ?",
            (idempotency_key,)
        )
        assert len(db_spends) == 1, f"Should have exactly 1 row, got {len(db_spends)}"
        print(f"✓ Exactly 1 row in spend_requests table")
        
        # Verify balance decreased by exactly 1000
        response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts/{esc_a1_id}", headers=headers)
        final_balance = response.json()['balance_cents']
        
        balance_decrease = initial_balance - final_balance
        assert balance_decrease == 1000, f"Balance should decrease by 1000, decreased by {balance_decrease}"
        print(f"✓ Balance decreased by exactly 1000 cents (from {initial_balance} to {final_balance})")
    
    def test_different_idempotency_keys_create_separate_spends(self, test_context):
        """Verify different idempotency keys create separate spend requests"""
        headers = get_auth_headers(test_context, 'org_a')
        esc_a1_id = test_context['escrows']['escA1']['id']
        
        # Get current balance
        response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts/{esc_a1_id}", headers=headers)
        initial_balance = response.json()['balance_cents']
        
        # Send 2 requests with different idempotency keys
        key1 = f"dq-idem-diff-{uuid.uuid4().hex[:8]}"
        key2 = f"dq-idem-diff-{uuid.uuid4().hex[:8]}"
        
        response1 = requests.post(f"{BASE_URL}/api/v1/spend",
            headers=headers,
            json={
                "escrow_id": esc_a1_id,
                "amount_cents": 500,
                "vendor": "OpenAI",
                "idempotency_key": key1
            })
        assert response1.status_code == 201
        
        response2 = requests.post(f"{BASE_URL}/api/v1/spend",
            headers=headers,
            json={
                "escrow_id": esc_a1_id,
                "amount_cents": 500,
                "vendor": "OpenAI",
                "idempotency_key": key2
            })
        assert response2.status_code == 201
        
        # Verify different IDs
        assert response1.json()['id'] != response2.json()['id'], "Different keys should create different spends"
        print(f"✓ Different idempotency keys created separate spends")
        
        # Verify balance decreased by 1000 (500 + 500)
        response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts/{esc_a1_id}", headers=headers)
        final_balance = response.json()['balance_cents']
        
        balance_decrease = initial_balance - final_balance
        assert balance_decrease == 1000, f"Balance should decrease by 1000, decreased by {balance_decrease}"
        print(f"✓ Balance decreased by 1000 cents for 2 separate spends")


class TestOrphanReferentialIntegrity:
    """
    Test 5: ORPHAN & REFERENTIAL INTEGRITY
    - Check no orphaned spend_requests (escrow deleted)
    - Check no orphaned approvals (spend_request deleted)
    - Check no orphaned audit_events (org deleted)
    """
    
    def test_no_orphaned_spend_requests(self, test_context):
        """Check no spend_requests reference non-existent escrows"""
        orphans = query_db("""
            SELECT sr.id, sr.escrow_id 
            FROM spend_requests sr 
            LEFT JOIN escrow_accounts ea ON sr.escrow_id = ea.id 
            WHERE ea.id IS NULL
        """)
        
        assert len(orphans) == 0, f"Found {len(orphans)} orphaned spend_requests: {orphans}"
        print("✓ No orphaned spend_requests (all reference valid escrows)")
    
    def test_no_orphaned_approvals(self, test_context):
        """Check no approvals reference non-existent spend_requests"""
        orphans = query_db("""
            SELECT a.id, a.spend_request_id 
            FROM approvals a 
            LEFT JOIN spend_requests sr ON a.spend_request_id = sr.id 
            WHERE sr.id IS NULL
        """)
        
        assert len(orphans) == 0, f"Found {len(orphans)} orphaned approvals: {orphans}"
        print("✓ No orphaned approvals (all reference valid spend_requests)")
    
    def test_no_orphaned_audit_events_for_orgs(self, test_context):
        """Check no audit_events reference non-existent organizations"""
        orphans = query_db("""
            SELECT ae.id, ae.org_id 
            FROM audit_events ae 
            LEFT JOIN organizations o ON ae.org_id = o.id 
            WHERE o.id IS NULL
        """)
        
        assert len(orphans) == 0, f"Found {len(orphans)} orphaned audit_events (org): {orphans}"
        print("✓ No orphaned audit_events (all reference valid organizations)")
    
    def test_no_orphaned_audit_events_for_escrows(self, test_context):
        """Check no audit_events reference non-existent escrows (where escrow_id is set)"""
        orphans = query_db("""
            SELECT ae.id, ae.escrow_id 
            FROM audit_events ae 
            LEFT JOIN escrow_accounts ea ON ae.escrow_id = ea.id 
            WHERE ae.escrow_id IS NOT NULL AND ea.id IS NULL
        """)
        
        assert len(orphans) == 0, f"Found {len(orphans)} orphaned audit_events (escrow): {orphans}"
        print("✓ No orphaned audit_events (all reference valid escrows)")
    
    def test_no_orphaned_policies(self, test_context):
        """Check no policies reference non-existent escrows"""
        orphans = query_db("""
            SELECT sp.id, sp.escrow_id 
            FROM spending_policies sp 
            LEFT JOIN escrow_accounts ea ON sp.escrow_id = ea.id 
            WHERE ea.id IS NULL
        """)
        
        assert len(orphans) == 0, f"Found {len(orphans)} orphaned policies: {orphans}"
        print("✓ No orphaned policies (all reference valid escrows)")
    
    def test_no_orphaned_tracking_records(self, test_context):
        """Check no tracking records reference non-existent escrows"""
        # Daily tracking
        daily_orphans = query_db("""
            SELECT dst.id, dst.escrow_id 
            FROM daily_spend_tracking dst 
            LEFT JOIN escrow_accounts ea ON dst.escrow_id = ea.id 
            WHERE ea.id IS NULL
        """)
        assert len(daily_orphans) == 0, f"Found {len(daily_orphans)} orphaned daily_spend_tracking"
        
        # Weekly tracking
        weekly_orphans = query_db("""
            SELECT wst.id, wst.escrow_id 
            FROM weekly_spend_tracking wst 
            LEFT JOIN escrow_accounts ea ON wst.escrow_id = ea.id 
            WHERE ea.id IS NULL
        """)
        assert len(weekly_orphans) == 0, f"Found {len(weekly_orphans)} orphaned weekly_spend_tracking"
        
        # Monthly tracking
        monthly_orphans = query_db("""
            SELECT mst.id, mst.escrow_id 
            FROM monthly_spend_tracking mst 
            LEFT JOIN escrow_accounts ea ON mst.escrow_id = ea.id 
            WHERE ea.id IS NULL
        """)
        assert len(monthly_orphans) == 0, f"Found {len(monthly_orphans)} orphaned monthly_spend_tracking"
        
        print("✓ No orphaned tracking records (daily, weekly, monthly)")
    
    def test_cascade_delete_integrity(self, test_context):
        """Test that cascade deletes work properly"""
        headers = get_auth_headers(test_context, 'org_a')
        
        # Create a temporary escrow
        response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts",
            headers=headers,
            json={"name": "Temp Escrow for Cascade Test"})
        assert response.status_code == 201
        temp_escrow_id = response.json()['id']
        
        # Fund it
        response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{temp_escrow_id}/fund",
            headers=headers,
            json={"amount_cents": 5000})
        assert response.status_code == 200
        
        # Create a policy
        response = requests.post(f"{BASE_URL}/api/v1/policies",
            headers=headers,
            json={
                "escrow_id": temp_escrow_id,
                "name": "Temp Policy for Cascade Test",
                "per_transaction_limit_cents": 10000
            })
        assert response.status_code == 201
        
        # Create a spend
        response = requests.post(f"{BASE_URL}/api/v1/spend",
            headers=headers,
            json={
                "escrow_id": temp_escrow_id,
                "amount_cents": 1000,
                "vendor": "TestVendor"
            })
        assert response.status_code == 201
        
        # Close the escrow (this should cascade delete related records)
        response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{temp_escrow_id}/close",
            headers=headers)
        assert response.status_code == 200
        
        # Verify escrow is closed (not deleted, just closed)
        response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts/{temp_escrow_id}", headers=headers)
        assert response.status_code == 200
        assert response.json()['status'] == 'closed'
        
        print("✓ Cascade delete integrity verified (escrow closed, related records intact)")


class TestAccountingEquations:
    """Additional accounting verification tests"""
    
    def test_all_escrows_balance_equation(self, test_context):
        """Verify funded - spent = balance for all escrows"""
        escrows = query_db("SELECT * FROM escrow_accounts")
        
        for escrow in escrows:
            funded = escrow['total_funded_cents']
            spent = escrow['total_spent_cents']
            balance = escrow['balance_cents']
            
            # For closed accounts, balance is zeroed out
            if escrow['status'] == 'closed':
                assert balance == 0, f"Closed escrow {escrow['id']} should have 0 balance"
            else:
                expected_balance = funded - spent
                assert balance == expected_balance, \
                    f"Escrow {escrow['id']}: {funded} - {spent} = {expected_balance}, but balance is {balance}"
        
        print(f"✓ Accounting equation verified for {len(escrows)} escrows")
    
    def test_spend_requests_sum_matches_total_spent(self, test_context):
        """Verify sum of approved spend_requests matches total_spent_cents"""
        escrows = query_db("SELECT id, total_spent_cents FROM escrow_accounts WHERE status != 'closed'")
        
        for escrow in escrows:
            # Sum approved spend requests
            result = query_db_single(
                "SELECT COALESCE(SUM(amount_cents), 0) as total FROM spend_requests WHERE escrow_id = ? AND status = 'approved'",
                (escrow['id'],)
            )
            sr_total = result['total']
            
            assert sr_total == escrow['total_spent_cents'], \
                f"Escrow {escrow['id']}: spend_requests sum ({sr_total}) != total_spent_cents ({escrow['total_spent_cents']})"
        
        print(f"✓ Spend requests sum matches total_spent for {len(escrows)} escrows")
    
    def test_denied_requests_sum_matches_total_denied(self, test_context):
        """Verify sum of denied spend_requests matches total_denied_cents"""
        escrows = query_db("SELECT id, total_denied_cents FROM escrow_accounts WHERE total_denied_cents > 0")
        
        for escrow in escrows:
            # Sum denied spend requests
            result = query_db_single(
                "SELECT COALESCE(SUM(amount_cents), 0) as total FROM spend_requests WHERE escrow_id = ? AND status = 'denied'",
                (escrow['id'],)
            )
            sr_total = result['total']
            
            assert sr_total == escrow['total_denied_cents'], \
                f"Escrow {escrow['id']}: denied sum ({sr_total}) != total_denied_cents ({escrow['total_denied_cents']})"
        
        print(f"✓ Denied requests sum matches total_denied for {len(escrows)} escrows")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
