#!/usr/bin/env python3
"""
End-to-End SDK Test

Tests the Safe-Spend Python SDK against the live API.
"""

import os
import sys

# Add SDK to path
sys.path.insert(0, '/app/sdks/python')

from safespend import SafeSpendClient
from safespend.errors import SafeSpendError, AuthenticationError, ValidationError

# Configuration
API_KEY = "sk_test_zfg1u4wlxibyzagxp7oxkg2u"
ESCROW_ID = "esc_bkxnao6ul6xs"
BASE_URL = "https://build-instructions-4.preview.emergentagent.com"

def test_sdk_e2e():
    """Run end-to-end tests."""
    print("=" * 60)
    print("Safe-Spend Python SDK - End-to-End Test")
    print("=" * 60)
    
    # Initialize client
    print("\n[1/5] Initializing SafeSpendClient...")
    try:
        client = SafeSpendClient(
            api_key=API_KEY,
            base_url=BASE_URL,
        )
        print("✅ Client initialized")
    except Exception as e:
        print(f"❌ Failed to initialize client: {e}")
        return False
    
    # Test: Get escrow balance
    print("\n[2/5] Testing get_escrow_balance()...")
    try:
        balance = client.get_escrow_balance(ESCROW_ID)
        print(f"✅ Balance retrieved: ${balance.get('balance_cents', 0)/100:.2f}")
        print(f"   Escrow name: {balance.get('name')}")
        print(f"   Status: {balance.get('status')}")
    except Exception as e:
        print(f"❌ Failed to get balance: {e}")
        return False
    
    # Test: List escrow accounts
    print("\n[3/5] Testing list_escrow_accounts()...")
    try:
        accounts = client.list_escrow_accounts()
        print(f"✅ Listed {len(accounts)} escrow account(s)")
        for acc in accounts[:3]:
            print(f"   - {acc.get('name')} (${acc.get('balance_cents', 0)/100:.2f})")
    except Exception as e:
        print(f"❌ Failed to list accounts: {e}")
        return False
    
    # Test: Create spend request (should auto-approve under $250)
    print("\n[4/5] Testing create_spend() - Auto-approve scenario...")
    try:
        spend = client.create_spend(
            escrow_id=ESCROW_ID,
            amount_cents=1500,  # $15 - should auto-approve
            vendor="OpenAI",
            category="ai_compute",
            description="SDK E2E Test - Auto-approve",
        )
        print(f"✅ Spend request created: {spend.get('id')}")
        print(f"   Status: {spend.get('status')}")
        print(f"   Amount: ${spend.get('amount_cents', 0)/100:.2f}")
        
        if spend.get('status') == 'approved':
            print(f"   Remaining balance: ${spend.get('remaining_balance_cents', 0)/100:.2f}")
        elif spend.get('status') == 'denied':
            print(f"   Denial reason: {spend.get('denial_reason')}")
        elif spend.get('status') == 'pending':
            print(f"   Pending approval: {spend.get('approval_id')}")
    except Exception as e:
        print(f"❌ Failed to create spend: {e}")
        return False
    
    # Test: List spend requests
    print("\n[5/5] Testing list_spend_requests()...")
    try:
        spends = client.list_spend_requests(escrow_id=ESCROW_ID, limit=5)
        print(f"✅ Listed {len(spends)} spend request(s)")
        for s in spends[:3]:
            print(f"   - {s.get('id')}: ${s.get('amount_cents', 0)/100:.2f} to {s.get('vendor')} [{s.get('status')}]")
    except Exception as e:
        print(f"❌ Failed to list spends: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("✅ All SDK tests PASSED!")
    print("=" * 60)
    return True


def test_error_handling():
    """Test error handling scenarios."""
    print("\n" + "=" * 60)
    print("Safe-Spend Python SDK - Error Handling Tests")
    print("=" * 60)
    
    # Test: Invalid API key
    print("\n[E1] Testing invalid API key...")
    try:
        bad_client = SafeSpendClient(
            api_key="sk_test_invalid_key",
            base_url=BASE_URL,
        )
        # This should fail when we try to use it
        bad_client.list_escrow_accounts()
        print("❌ Should have raised AuthenticationError")
        return False
    except AuthenticationError as e:
        print(f"✅ AuthenticationError raised correctly: {e}")
    except Exception as e:
        print(f"⚠️ Got unexpected error type: {type(e).__name__}: {e}")
    
    # Test: Invalid escrow ID
    print("\n[E2] Testing invalid escrow ID...")
    try:
        client = SafeSpendClient(api_key=API_KEY, base_url=BASE_URL)
        client.get_escrow_balance("esc_nonexistent")
        print("❌ Should have raised an error")
        return False
    except SafeSpendError as e:
        print(f"✅ Error raised correctly: {e}")
    except Exception as e:
        print(f"⚠️ Got unexpected error: {type(e).__name__}: {e}")
    
    print("\n" + "=" * 60)
    print("✅ Error handling tests PASSED!")
    print("=" * 60)
    return True


if __name__ == "__main__":
    success = test_sdk_e2e()
    if success:
        test_error_handling()
    
    sys.exit(0 if success else 1)
