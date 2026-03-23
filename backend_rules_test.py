#!/usr/bin/env python3
"""
Safe-Spend Rules Engine Testing Suite
Tests the 13-step spending rules engine with various scenarios
"""

import requests
import json
import sys
import time
from datetime import datetime
from typing import Dict, Any, Optional

class RulesEngineAPITester:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.jwt_token = None
        self.escrow_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details
        })

    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    auth_token: str = None, expected_status: int = 200) -> tuple:
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}/api/v1/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_token:
            headers['Authorization'] = f'Bearer {auth_token}'
        elif self.jwt_token:
            headers['Authorization'] = f'Bearer {self.jwt_token}'

        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PATCH':
                response = self.session.patch(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")

            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}

            success = response.status_code == expected_status
            return success, response.status_code, response_data

        except Exception as e:
            return False, 0, {"error": str(e)}

    def setup_test_environment(self):
        """Setup test environment with test user and escrow account"""
        print("🔧 Setting up test environment...")
        
        # Login as test user
        login_data = {
            "email": "rules-test@example.com",
            "password": "password123"
        }
        
        success, status, data = self.make_request('POST', 'auth/login', login_data, expected_status=200)
        
        if success and 'token' in data:
            self.jwt_token = data['token']
            print("✅ Logged in as test user")
        else:
            print(f"❌ Failed to login as test user: {status}, {data}")
            return False

        # Get escrow accounts
        success, status, data = self.make_request('GET', 'escrow-accounts', expected_status=200)
        
        if success and 'data' in data and len(data['data']) > 0:
            self.escrow_id = data['data'][0]['id']
            print(f"✅ Found escrow account: {self.escrow_id}")
            return True
        else:
            print(f"❌ No escrow accounts found: {status}, {data}")
            return False

    def test_spend_auto_approved(self):
        """Test spend request auto-approved when all rules pass and under auto-approve threshold"""
        if not self.escrow_id:
            self.log_test("Auto-approved spend", False, "No escrow account available")
            return

        spend_data = {
            "escrow_id": self.escrow_id,
            "amount_cents": 5000,  # $50.00 - under $100 per-tx limit
            "vendor": "Google Ads",  # In allowlist
            "category": "advertising",  # In allowed categories
            "description": "Test auto-approved spend",
            "idempotency_key": f"test-auto-{int(time.time())}"
        }
        
        success, status, data = self.make_request('POST', 'spend', spend_data, expected_status=201)
        
        if success and data.get('status') == 'approved':
            # Check that all 13 rules were evaluated
            rules_evaluated = data.get('rules_evaluated', [])
            if len(rules_evaluated) == 13:
                self.log_test("Auto-approved spend (all rules pass)", True)
            else:
                self.log_test("Auto-approved spend (all rules pass)", False, 
                            f"Expected 13 rules evaluated, got {len(rules_evaluated)}")
        else:
            self.log_test("Auto-approved spend (all rules pass)", False, 
                        f"Status: {status}, Response: {data}")

    def test_spend_denied_vendor_not_in_allowlist(self):
        """Test spend request denied when vendor not in allowlist"""
        if not self.escrow_id:
            self.log_test("Denied - vendor not in allowlist", False, "No escrow account available")
            return

        spend_data = {
            "escrow_id": self.escrow_id,
            "amount_cents": 3000,  # $30.00 - under limits
            "vendor": "Unauthorized Vendor",  # NOT in allowlist
            "category": "advertising",  # In allowed categories
            "description": "Test vendor denial",
            "idempotency_key": f"test-vendor-{int(time.time())}"
        }
        
        success, status, data = self.make_request('POST', 'spend', spend_data, expected_status=400)
        
        if success and data.get('status') == 'denied':
            denial_reason = data.get('denial_reason', '')
            if 'not in allowlist' in denial_reason.lower():
                self.log_test("Denied - vendor not in allowlist", True)
            else:
                self.log_test("Denied - vendor not in allowlist", False, 
                            f"Wrong denial reason: {denial_reason}")
        else:
            self.log_test("Denied - vendor not in allowlist", False, 
                        f"Status: {status}, Response: {data}")

    def test_spend_denied_category_blocked(self):
        """Test spend request denied when category blocked"""
        if not self.escrow_id:
            self.log_test("Denied - category blocked", False, "No escrow account available")
            return

        spend_data = {
            "escrow_id": self.escrow_id,
            "amount_cents": 3000,  # $30.00 - under limits
            "vendor": "Google Ads",  # In allowlist
            "category": "transfers",  # In blocked categories
            "description": "Test category denial",
            "idempotency_key": f"test-category-{int(time.time())}"
        }
        
        success, status, data = self.make_request('POST', 'spend', spend_data, expected_status=400)
        
        if success and data.get('status') == 'denied':
            denial_reason = data.get('denial_reason', '')
            if 'blocked' in denial_reason.lower():
                self.log_test("Denied - category blocked", True)
            else:
                self.log_test("Denied - category blocked", False, 
                            f"Wrong denial reason: {denial_reason}")
        else:
            self.log_test("Denied - category blocked", False, 
                        f"Status: {status}, Response: {data}")

    def test_spend_denied_per_transaction_limit(self):
        """Test spend request denied when per-transaction limit exceeded"""
        if not self.escrow_id:
            self.log_test("Denied - per-transaction limit exceeded", False, "No escrow account available")
            return

        spend_data = {
            "escrow_id": self.escrow_id,
            "amount_cents": 15000,  # $150.00 - exceeds $100 per-tx limit
            "vendor": "Google Ads",  # In allowlist
            "category": "advertising",  # In allowed categories
            "description": "Test per-tx limit denial",
            "idempotency_key": f"test-pertx-{int(time.time())}"
        }
        
        success, status, data = self.make_request('POST', 'spend', spend_data, expected_status=400)
        
        if success and data.get('status') == 'denied':
            denial_reason = data.get('denial_reason', '')
            if 'per-transaction limit' in denial_reason.lower():
                self.log_test("Denied - per-transaction limit exceeded", True)
            else:
                self.log_test("Denied - per-transaction limit exceeded", False, 
                            f"Wrong denial reason: {denial_reason}")
        else:
            self.log_test("Denied - per-transaction limit exceeded", False, 
                        f"Status: {status}, Response: {data}")

    def test_spend_denied_daily_cap(self):
        """Test spend request denied when daily cap would be exceeded"""
        if not self.escrow_id:
            self.log_test("Denied - daily cap exceeded", False, "No escrow account available")
            return

        # First, make several smaller spends to approach daily cap (use amounts under auto-approve threshold)
        for i in range(4):
            spend_data = {
                "escrow_id": self.escrow_id,
                "amount_cents": 5000,  # $50.00 each - should be auto-approved
                "vendor": "Google Ads",
                "category": "advertising",
                "description": f"Daily cap test spend {i+1}",
                "idempotency_key": f"test-daily-setup-{i}-{int(time.time())}"
            }
            success, status, data = self.make_request('POST', 'spend', spend_data, expected_status=201)
            if not success or data.get('status') != 'approved':
                print(f"Warning: Setup spend {i+1} not approved: {data.get('status')}")
            time.sleep(0.1)  # Small delay

        # Now try one more that should exceed daily cap ($250)
        spend_data = {
            "escrow_id": self.escrow_id,
            "amount_cents": 6000,  # $60.00 - would make total $260, exceeding $250 daily cap
            "vendor": "Google Ads",
            "category": "advertising", 
            "description": "Test daily cap denial",
            "idempotency_key": f"test-daily-{int(time.time())}"
        }
        
        success, status, data = self.make_request('POST', 'spend', spend_data, expected_status=400)
        
        if success and data.get('status') == 'denied':
            denial_reason = data.get('denial_reason', '')
            if 'daily cap' in denial_reason.lower():
                self.log_test("Denied - daily cap exceeded", True)
            else:
                self.log_test("Denied - daily cap exceeded", False, 
                            f"Wrong denial reason: {denial_reason}")
        else:
            self.log_test("Denied - daily cap exceeded", False, 
                        f"Status: {status}, Response: {data}")

    def test_spend_pending_approval(self):
        """Test spend request returns pending status when amount > auto_approve but <= per_tx limit"""
        if not self.escrow_id:
            self.log_test("Pending approval", False, "No escrow account available")
            return

        spend_data = {
            "escrow_id": self.escrow_id,
            "amount_cents": 9000,  # $90.00 - above auto-approve threshold but under per-tx limit
            "vendor": "Google Ads",
            "category": "advertising",
            "description": "Test pending approval",
            "idempotency_key": f"test-pending-{int(time.time())}"
        }
        
        success, status, data = self.make_request('POST', 'spend', spend_data, expected_status=202)
        
        if success and data.get('status') == 'pending':
            if 'approval_id' in data:
                self.log_test("Pending approval", True)
            else:
                self.log_test("Pending approval", False, "Missing approval_id in response")
        else:
            self.log_test("Pending approval", False, 
                        f"Status: {status}, Response: {data}")

    def test_idempotent_request(self):
        """Test idempotent request returns same result (same ID)"""
        if not self.escrow_id:
            self.log_test("Idempotent request", False, "No escrow account available")
            return

        idempotency_key = f"test-idempotent-{int(time.time())}"
        spend_data = {
            "escrow_id": self.escrow_id,
            "amount_cents": 4000,  # $40.00
            "vendor": "Google Ads",
            "category": "advertising",
            "description": "Test idempotency",
            "idempotency_key": idempotency_key
        }
        
        # First request
        success1, status1, data1 = self.make_request('POST', 'spend', spend_data, expected_status=201)
        
        if not success1:
            self.log_test("Idempotent request", False, f"First request failed: {status1}, {data1}")
            return

        # Second request with same idempotency key
        success2, status2, data2 = self.make_request('POST', 'spend', spend_data, expected_status=200)
        
        if success2 and data1.get('id') == data2.get('id'):
            self.log_test("Idempotent request", True)
        else:
            self.log_test("Idempotent request", False, 
                        f"IDs don't match: {data1.get('id')} vs {data2.get('id')}")

    def test_rules_evaluation_recorded(self):
        """Test all 13 rule evaluations are recorded in rules_evaluated array"""
        if not self.escrow_id:
            self.log_test("Rules evaluation recorded", False, "No escrow account available")
            return

        spend_data = {
            "escrow_id": self.escrow_id,
            "amount_cents": 3000,  # $30.00
            "vendor": "Google Ads",
            "category": "advertising",
            "description": "Test rules evaluation",
            "idempotency_key": f"test-rules-{int(time.time())}"
        }
        
        success, status, data = self.make_request('POST', 'spend', spend_data, expected_status=201)
        
        if success:
            rules_evaluated = data.get('rules_evaluated', [])
            expected_rules = [
                'key_validation', 'escrow_account_check', 'idempotency_check', 
                'balance_check', 'per_transaction_limit', 'daily_cap_check',
                'weekly_cap_check', 'monthly_cap_check', 'vendor_check',
                'category_check', 'time_window_check', 'approval_threshold_check',
                'execute'
            ]
            
            if len(rules_evaluated) == 13:
                rule_names = [rule.get('rule') for rule in rules_evaluated]
                if all(rule in rule_names for rule in expected_rules):
                    self.log_test("Rules evaluation recorded (13 steps)", True)
                else:
                    missing = [rule for rule in expected_rules if rule not in rule_names]
                    self.log_test("Rules evaluation recorded (13 steps)", False, 
                                f"Missing rules: {missing}")
            else:
                self.log_test("Rules evaluation recorded (13 steps)", False, 
                            f"Expected 13 rules, got {len(rules_evaluated)}")
        else:
            self.log_test("Rules evaluation recorded (13 steps)", False, 
                        f"Status: {status}, Response: {data}")

    def run_all_tests(self):
        """Run all rules engine tests"""
        print("🚀 Starting Safe-Spend Rules Engine Tests")
        print(f"Testing against: {self.base_url}")
        print("-" * 50)

        # Setup test environment
        if not self.setup_test_environment():
            print("❌ Failed to setup test environment")
            return 1

        # Run rules engine tests
        self.test_spend_auto_approved()
        self.test_spend_denied_vendor_not_in_allowlist()
        self.test_spend_denied_category_blocked()
        self.test_spend_denied_per_transaction_limit()
        self.test_spend_denied_daily_cap()
        self.test_spend_pending_approval()
        self.test_idempotent_request()
        self.test_rules_evaluation_recorded()

        # Print summary
        print("-" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All rules engine tests passed!")
            return 0
        else:
            print("❌ Some rules engine tests failed")
            return 1

def main():
    # Get backend URL from environment or use default
    import os
    backend_url = os.getenv('REACT_APP_BACKEND_URL', 'https://build-instructions-4.preview.emergentagent.com')
    
    print(f"Safe-Spend Rules Engine Tester")
    print(f"Backend URL: {backend_url}")
    
    tester = RulesEngineAPITester(backend_url)
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())