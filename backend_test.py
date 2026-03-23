#!/usr/bin/env python3
"""
Safe-Spend Backend API Testing Suite
Tests all core API endpoints with proper authentication flows
"""

import requests
import json
import sys
import time
from datetime import datetime
from typing import Dict, Any, Optional

class SafeSpendAPITester:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.jwt_token = None
        self.api_key = None
        self.org_data = None
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

    def test_health_check(self):
        """Test health endpoint"""
        success, status, data = self.make_request('GET', '../health', expected_status=200)
        self.log_test("Health Check", success, 
                     f"Status: {status}" if not success else "")

    def test_auth_signup(self):
        """Test organization signup"""
        timestamp = int(time.time())
        signup_data = {
            "name": f"Test Org {timestamp}",
            "email": f"test{timestamp}@safespend.test",
            "password": "TestPassword123!"
        }
        
        success, status, data = self.make_request('POST', 'auth/signup', signup_data, expected_status=201)
        
        if success and 'token' in data and 'organization' in data:
            self.jwt_token = data['token']
            self.org_data = data['organization']
            # Verify org ID has proper prefix
            if not self.org_data['id'].startswith('org_'):
                success = False
                self.log_test("Auth Signup", False, "Organization ID missing 'org_' prefix")
            else:
                self.log_test("Auth Signup", True)
        else:
            self.log_test("Auth Signup", False, f"Status: {status}, Data: {data}")

    def test_auth_login(self):
        """Test organization login"""
        if not self.org_data:
            self.log_test("Auth Login", False, "No org data from signup")
            return

        login_data = {
            "email": self.org_data['email'],
            "password": "TestPassword123!"
        }
        
        success, status, data = self.make_request('POST', 'auth/login', login_data, expected_status=200)
        
        if success and 'token' in data:
            # Update token
            self.jwt_token = data['token']
            self.log_test("Auth Login", True)
        else:
            self.log_test("Auth Login", False, f"Status: {status}, Data: {data}")

    def test_auth_me(self):
        """Test get current organization profile"""
        if not self.jwt_token:
            self.log_test("Auth Me", False, "No JWT token available")
            return

        success, status, data = self.make_request('GET', 'auth/me', expected_status=200)
        
        if success and 'id' in data and data['id'] == self.org_data['id']:
            self.log_test("Auth Me", True)
        else:
            self.log_test("Auth Me", False, f"Status: {status}, Data: {data}")

    def test_create_escrow_account(self):
        """Test creating escrow account"""
        if not self.jwt_token:
            self.log_test("Create Escrow Account", False, "No JWT token available")
            return

        escrow_data = {
            "name": "Test Escrow Account",
            "description": "Test escrow for API testing",
            "currency": "usd",
            "metadata": {"test": True}
        }
        
        success, status, data = self.make_request('POST', 'escrow-accounts', escrow_data, expected_status=201)
        
        if success and 'id' in data and data['id'].startswith('esc_'):
            self.escrow_id = data['id']
            self.log_test("Create Escrow Account", True)
        else:
            self.log_test("Create Escrow Account", False, f"Status: {status}, Data: {data}")

    def test_list_escrow_accounts(self):
        """Test listing escrow accounts"""
        if not self.jwt_token:
            self.log_test("List Escrow Accounts", False, "No JWT token available")
            return

        success, status, data = self.make_request('GET', 'escrow-accounts', expected_status=200)
        
        if success and 'data' in data and isinstance(data['data'], list):
            self.log_test("List Escrow Accounts", True)
        else:
            self.log_test("List Escrow Accounts", False, f"Status: {status}, Data: {data}")

    def test_fund_escrow_account(self):
        """Test funding escrow account (placeholder implementation)"""
        if not self.escrow_id:
            self.log_test("Fund Escrow Account", False, "No escrow account ID available")
            return

        fund_data = {
            "amount_cents": 10000  # $100.00
        }
        
        success, status, data = self.make_request('POST', f'escrow-accounts/{self.escrow_id}/fund', 
                                                fund_data, expected_status=200)
        
        if success and 'message' in data:
            self.log_test("Fund Escrow Account", True)
        else:
            self.log_test("Fund Escrow Account", False, f"Status: {status}, Data: {data}")

    def test_get_escrow_balance(self):
        """Test getting escrow account balance"""
        if not self.escrow_id:
            self.log_test("Get Escrow Balance", False, "No escrow account ID available")
            return

        success, status, data = self.make_request('GET', f'escrow-accounts/{self.escrow_id}/balance', 
                                                expected_status=200)
        
        if success and 'balance_cents' in data and 'escrow_id' in data:
            self.log_test("Get Escrow Balance", True)
        else:
            self.log_test("Get Escrow Balance", False, f"Status: {status}, Data: {data}")

    def test_create_api_key(self):
        """Test creating API key"""
        if not self.jwt_token:
            self.log_test("Create API Key", False, "No JWT token available")
            return

        api_key_data = {
            "key_type": "agent",
            "label": "Test Agent Key",
            "permissions": ["spend", "balance"]
        }
        
        success, status, data = self.make_request('POST', 'api-keys', api_key_data, expected_status=201)
        
        if success and 'key' in data and data['key'].startswith('sk_agent_'):
            self.api_key = data['key']
            # Verify proper ID prefix
            if 'id' in data and data['id'].startswith('key_'):
                self.log_test("Create API Key", True)
            else:
                self.log_test("Create API Key", False, "API key ID missing 'key_' prefix")
        else:
            self.log_test("Create API Key", False, f"Status: {status}, Data: {data}")

    def test_create_spend_request_approved(self):
        """Test creating spend request that should be approved"""
        if not self.escrow_id:
            self.log_test("Create Spend Request (Approved)", False, "No escrow account ID available")
            return

        spend_data = {
            "escrow_id": self.escrow_id,
            "amount_cents": 5000,  # $50.00 - should be approved if balance sufficient
            "vendor": "Test Vendor",
            "category": "testing",
            "description": "Test spend request",
            "metadata": {"test": True}
        }
        
        success, status, data = self.make_request('POST', 'spend', spend_data, expected_status=201)
        
        if success and 'id' in data and data['id'].startswith('spr_'):
            if data.get('status') == 'approved':
                self.log_test("Create Spend Request (Approved)", True)
            else:
                self.log_test("Create Spend Request (Approved)", False, 
                            f"Expected approved status, got: {data.get('status')}")
        else:
            self.log_test("Create Spend Request (Approved)", False, f"Status: {status}, Data: {data}")

    def test_create_spend_request_insufficient_funds(self):
        """Test creating spend request with insufficient funds"""
        if not self.escrow_id:
            self.log_test("Create Spend Request (Insufficient Funds)", False, "No escrow account ID available")
            return

        spend_data = {
            "escrow_id": self.escrow_id,
            "amount_cents": 100000,  # $1000.00 - should exceed balance
            "vendor": "Expensive Vendor",
            "category": "testing",
            "description": "Test spend request with insufficient funds"
        }
        
        success, status, data = self.make_request('POST', 'spend', spend_data, expected_status=400)
        
        if success and 'error' in data and 'insufficient' in data['error'].lower():
            self.log_test("Create Spend Request (Insufficient Funds)", True)
        else:
            self.log_test("Create Spend Request (Insufficient Funds)", False, 
                        f"Status: {status}, Data: {data}")

    def test_list_spend_requests(self):
        """Test listing spend requests"""
        if not self.jwt_token:
            self.log_test("List Spend Requests", False, "No JWT token available")
            return

        success, status, data = self.make_request('GET', 'spend', expected_status=200)
        
        if success and 'data' in data and isinstance(data['data'], list):
            self.log_test("List Spend Requests", True)
        else:
            self.log_test("List Spend Requests", False, f"Status: {status}, Data: {data}")

    def test_spend_with_api_key(self):
        """Test spend request using API key authentication"""
        if not self.api_key or not self.escrow_id:
            self.log_test("Spend with API Key", False, "No API key or escrow account available")
            return

        spend_data = {
            "escrow_id": self.escrow_id,
            "amount_cents": 2000,  # $20.00
            "vendor": "API Vendor",
            "category": "api_testing",
            "description": "Test spend via API key"
        }
        
        success, status, data = self.make_request('POST', 'spend', spend_data, 
                                                auth_token=self.api_key, expected_status=201)
        
        if success and 'id' in data and data['id'].startswith('spr_'):
            self.log_test("Spend with API Key", True)
        else:
            self.log_test("Spend with API Key", False, f"Status: {status}, Data: {data}")

    def test_invalid_api_key(self):
        """Test request with invalid API key"""
        spend_data = {
            "escrow_id": self.escrow_id or "esc_invalid",
            "amount_cents": 1000,
            "vendor": "Test Vendor"
        }
        
        success, status, data = self.make_request('POST', 'spend', spend_data, 
                                                auth_token="sk_agent_invalid_key", expected_status=401)
        
        if success and 'error' in data:
            self.log_test("Invalid API Key Rejection", True)
        else:
            self.log_test("Invalid API Key Rejection", False, f"Status: {status}, Data: {data}")

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Safe-Spend Backend API Tests")
        print(f"Testing against: {self.base_url}")
        print("-" * 50)

        # Health check
        self.test_health_check()
        
        # Authentication flow
        self.test_auth_signup()
        self.test_auth_login()
        self.test_auth_me()
        
        # Escrow account management
        self.test_create_escrow_account()
        self.test_list_escrow_accounts()
        self.test_fund_escrow_account()
        self.test_get_escrow_balance()
        
        # API key management
        self.test_create_api_key()
        
        # Spend requests
        self.test_create_spend_request_approved()
        self.test_create_spend_request_insufficient_funds()
        self.test_list_spend_requests()
        
        # API key authentication
        self.test_spend_with_api_key()
        self.test_invalid_api_key()

        # Print summary
        print("-" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("❌ Some tests failed")
            return 1

def main():
    # Get backend URL from environment or use default
    import os
    backend_url = os.getenv('REACT_APP_BACKEND_URL', 'https://build-instructions-4.preview.emergentagent.com')
    
    print(f"Safe-Spend Backend API Tester")
    print(f"Backend URL: {backend_url}")
    
    tester = SafeSpendAPITester(backend_url)
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())