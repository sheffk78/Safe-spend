"""
Safe-Spend Dashboard API Tests
Tests all dashboard pages APIs: Escrow Accounts, Policies, Transactions, Approvals, API Keys, Audit Log
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@test.com"
TEST_PASSWORD = "Test123!"


class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    def test_login_success(self):
        """Test successful login"""
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "organization" in data
        print(f"Login successful, org: {data['organization'].get('name', 'N/A')}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": "wrong@test.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
    
    def test_get_current_org(self, auth_token):
        """Test getting current organization"""
        response = requests.get(f"{BASE_URL}/api/v1/auth/me", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "name" in data
        print(f"Current org: {data['name']}")


class TestEscrowAccounts:
    """Escrow Accounts CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_list_escrow_accounts(self, headers):
        """Test listing escrow accounts"""
        response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        print(f"Found {data['total']} escrow accounts")
        return data["data"]
    
    def test_create_escrow_account(self, headers):
        """Test creating a new escrow account"""
        payload = {
            "name": "TEST_Dashboard_Test_Account",
            "description": "Test account for dashboard testing"
        }
        response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == payload["name"]
        assert "id" in data
        assert data["balance_cents"] == 0
        print(f"Created escrow account: {data['id']}")
        return data
    
    def test_fund_escrow_account(self, headers):
        """Test funding an escrow account"""
        # First create an account
        create_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json={
            "name": "TEST_Fund_Test_Account"
        })
        assert create_response.status_code == 201
        account_id = create_response.json()["id"]
        
        # Fund the account
        fund_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{account_id}/fund", headers=headers, json={
            "amount_cents": 10000  # $100
        })
        assert fund_response.status_code == 200
        data = fund_response.json()
        assert data["escrow"]["balance_cents"] == 10000
        print(f"Funded account {account_id} with $100")
    
    def test_pause_escrow_account(self, headers):
        """Test pausing an escrow account"""
        # Create and fund an account
        create_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json={
            "name": "TEST_Pause_Test_Account"
        })
        account_id = create_response.json()["id"]
        
        # Pause the account
        pause_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{account_id}/pause", headers=headers)
        assert pause_response.status_code == 200
        data = pause_response.json()
        assert data["status"] == "paused"
        print(f"Paused account {account_id}")
    
    def test_resume_escrow_account(self, headers):
        """Test resuming a paused escrow account"""
        # Create, fund, and pause an account
        create_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json={
            "name": "TEST_Resume_Test_Account"
        })
        account_id = create_response.json()["id"]
        
        # Fund first
        requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{account_id}/fund", headers=headers, json={
            "amount_cents": 5000
        })
        
        # Pause
        requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{account_id}/pause", headers=headers)
        
        # Resume
        resume_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{account_id}/resume", headers=headers)
        assert resume_response.status_code == 200
        data = resume_response.json()
        assert data["status"] == "active"
        print(f"Resumed account {account_id}")
    
    def test_close_escrow_account(self, headers):
        """Test closing an escrow account"""
        # Create an account
        create_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json={
            "name": "TEST_Close_Test_Account"
        })
        account_id = create_response.json()["id"]
        
        # Close the account
        close_response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts/{account_id}/close", headers=headers)
        assert close_response.status_code == 200
        data = close_response.json()
        assert data["status"] == "closed"
        print(f"Closed account {account_id}")
    
    def test_get_escrow_account_balance(self, headers):
        """Test getting escrow account balance"""
        # Get list first
        list_response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers)
        accounts = list_response.json()["data"]
        
        if accounts:
            account_id = accounts[0]["id"]
            balance_response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts/{account_id}/balance", headers=headers)
            assert balance_response.status_code == 200
            data = balance_response.json()
            assert "balance_cents" in data
            print(f"Account {account_id} balance: ${data['balance_cents']/100:.2f}")


class TestPolicies:
    """Spending Policies CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_escrow_id(self, headers):
        """Create a test escrow account for policy tests"""
        response = requests.post(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers, json={
            "name": "TEST_Policy_Test_Escrow"
        })
        return response.json()["id"]
    
    def test_list_policies(self, headers):
        """Test listing policies"""
        response = requests.get(f"{BASE_URL}/api/v1/policies", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        print(f"Found {data['total']} policies")
    
    def test_create_policy(self, headers, test_escrow_id):
        """Test creating a new policy"""
        payload = {
            "escrow_id": test_escrow_id,
            "name": "TEST_Dashboard_Test_Policy",
            "per_transaction_limit_cents": 10000,
            "daily_limit_cents": 50000,
            "allowed_vendors": ["Google Ads", "Meta Ads"],
            "auto_approve_under_cents": 5000,
            "require_human_above_cents": 10000
        }
        response = requests.post(f"{BASE_URL}/api/v1/policies", headers=headers, json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == payload["name"]
        assert data["per_transaction_limit_cents"] == 10000
        assert data["auto_approve_under_cents"] == 5000
        print(f"Created policy: {data['id']}")
        return data
    
    def test_update_policy(self, headers, test_escrow_id):
        """Test updating a policy"""
        # Create a policy first
        create_response = requests.post(f"{BASE_URL}/api/v1/policies", headers=headers, json={
            "escrow_id": test_escrow_id,
            "name": "TEST_Update_Test_Policy"
        })
        policy_id = create_response.json()["id"]
        
        # Update the policy
        update_response = requests.patch(f"{BASE_URL}/api/v1/policies/{policy_id}", headers=headers, json={
            "name": "TEST_Updated_Policy_Name",
            "per_transaction_limit_cents": 20000
        })
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["name"] == "TEST_Updated_Policy_Name"
        assert data["per_transaction_limit_cents"] == 20000
        print(f"Updated policy {policy_id}")
    
    def test_toggle_policy_active(self, headers, test_escrow_id):
        """Test toggling policy active status"""
        # Create a policy
        create_response = requests.post(f"{BASE_URL}/api/v1/policies", headers=headers, json={
            "escrow_id": test_escrow_id,
            "name": "TEST_Toggle_Test_Policy"
        })
        policy_id = create_response.json()["id"]
        
        # Deactivate
        deactivate_response = requests.patch(f"{BASE_URL}/api/v1/policies/{policy_id}", headers=headers, json={
            "is_active": False
        })
        assert deactivate_response.status_code == 200
        assert deactivate_response.json()["is_active"] == False
        
        # Reactivate
        reactivate_response = requests.patch(f"{BASE_URL}/api/v1/policies/{policy_id}", headers=headers, json={
            "is_active": True
        })
        assert reactivate_response.status_code == 200
        assert reactivate_response.json()["is_active"] == True
        print(f"Toggled policy {policy_id} active status")
    
    def test_delete_policy(self, headers, test_escrow_id):
        """Test deleting a policy"""
        # Create a policy
        create_response = requests.post(f"{BASE_URL}/api/v1/policies", headers=headers, json={
            "escrow_id": test_escrow_id,
            "name": "TEST_Delete_Test_Policy"
        })
        policy_id = create_response.json()["id"]
        
        # Delete the policy
        delete_response = requests.delete(f"{BASE_URL}/api/v1/policies/{policy_id}", headers=headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/v1/policies/{policy_id}", headers=headers)
        assert get_response.status_code == 404
        print(f"Deleted policy {policy_id}")


class TestTransactions:
    """Transactions (Spend Requests) tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_list_transactions(self, headers):
        """Test listing transactions"""
        response = requests.get(f"{BASE_URL}/api/v1/spend?limit=100", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        print(f"Found {len(data['data'])} transactions")
        
        # Verify transaction structure
        if data["data"]:
            tx = data["data"][0]
            assert "id" in tx
            assert "amount_cents" in tx
            assert "vendor" in tx
            assert "status" in tx
            print(f"Sample transaction: {tx['id']} - {tx['vendor']} - ${tx['amount_cents']/100:.2f} - {tx['status']}")
    
    def test_get_transaction_detail(self, headers):
        """Test getting transaction detail with rules evaluation"""
        # Get list first
        list_response = requests.get(f"{BASE_URL}/api/v1/spend?limit=10", headers=headers)
        transactions = list_response.json()["data"]
        
        if transactions:
            tx_id = transactions[0]["id"]
            detail_response = requests.get(f"{BASE_URL}/api/v1/spend/{tx_id}", headers=headers)
            assert detail_response.status_code == 200
            data = detail_response.json()
            
            assert "id" in data
            assert "amount_cents" in data
            assert "vendor" in data
            assert "status" in data
            
            # Check for rules evaluation
            if "rules_evaluated" in data and data["rules_evaluated"]:
                print(f"Transaction {tx_id} has {len(data['rules_evaluated'])} rules evaluated")
                for rule in data["rules_evaluated"][:3]:
                    print(f"  - {rule['rule']}: {'PASS' if rule['passed'] else 'FAIL'}")
            else:
                print(f"Transaction {tx_id} has no rules_evaluated data")
    
    def test_filter_transactions_by_status(self, headers):
        """Test filtering transactions by status"""
        for status in ["approved", "pending", "denied"]:
            response = requests.get(f"{BASE_URL}/api/v1/spend?status={status}&limit=10", headers=headers)
            assert response.status_code == 200
            data = response.json()
            print(f"Found {len(data['data'])} {status} transactions")


class TestApprovals:
    """Approvals tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_list_pending_approvals(self, headers):
        """Test listing pending approvals"""
        response = requests.get(f"{BASE_URL}/api/v1/approvals?status=pending", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        print(f"Found {len(data['data'])} pending approvals")
        
        if data["data"]:
            approval = data["data"][0]
            assert "id" in approval
            assert "status" in approval
            assert "spend_request" in approval
            print(f"Sample approval: {approval['id']} - ${approval['spend_request']['amount_cents']/100:.2f}")
    
    def test_list_approved_approvals(self, headers):
        """Test listing approved approvals"""
        response = requests.get(f"{BASE_URL}/api/v1/approvals?status=approved", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"Found {len(data['data'])} approved approvals")
    
    def test_list_denied_approvals(self, headers):
        """Test listing denied approvals"""
        response = requests.get(f"{BASE_URL}/api/v1/approvals?status=denied", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"Found {len(data['data'])} denied approvals")


class TestApiKeys:
    """API Keys CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_list_api_keys(self, headers):
        """Test listing API keys"""
        response = requests.get(f"{BASE_URL}/api/v1/api-keys", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        print(f"Found {data['total']} API keys")
        
        if data["data"]:
            key = data["data"][0]
            assert "id" in key
            assert "key_prefix" in key
            assert "key_type" in key
            print(f"Sample key: {key['key_prefix']}... ({key['key_type']})")
    
    def test_create_api_key(self, headers):
        """Test creating a new API key"""
        payload = {
            "key_type": "test",
            "label": "TEST_Dashboard_Test_Key",
            "permissions": ["view_transactions", "create_spend"]
        }
        response = requests.post(f"{BASE_URL}/api/v1/api-keys", headers=headers, json=payload)
        assert response.status_code == 201
        data = response.json()
        assert "key" in data  # Full key only shown on creation
        assert data["key_type"] == "test"
        assert data["label"] == payload["label"]
        print(f"Created API key: {data['key_prefix']}...")
        return data
    
    def test_deactivate_api_key(self, headers):
        """Test deactivating an API key"""
        # Create a key first
        create_response = requests.post(f"{BASE_URL}/api/v1/api-keys", headers=headers, json={
            "key_type": "test",
            "label": "TEST_Deactivate_Test_Key"
        })
        key_id = create_response.json()["id"]
        
        # Deactivate
        deactivate_response = requests.post(f"{BASE_URL}/api/v1/api-keys/{key_id}/deactivate", headers=headers)
        assert deactivate_response.status_code == 200
        assert deactivate_response.json()["is_active"] == False
        print(f"Deactivated key {key_id}")
    
    def test_reactivate_api_key(self, headers):
        """Test reactivating an API key"""
        # Create and deactivate a key
        create_response = requests.post(f"{BASE_URL}/api/v1/api-keys", headers=headers, json={
            "key_type": "test",
            "label": "TEST_Reactivate_Test_Key"
        })
        key_id = create_response.json()["id"]
        
        requests.post(f"{BASE_URL}/api/v1/api-keys/{key_id}/deactivate", headers=headers)
        
        # Reactivate
        reactivate_response = requests.post(f"{BASE_URL}/api/v1/api-keys/{key_id}/reactivate", headers=headers)
        assert reactivate_response.status_code == 200
        assert reactivate_response.json()["is_active"] == True
        print(f"Reactivated key {key_id}")
    
    def test_revoke_api_key(self, headers):
        """Test revoking (deleting) an API key"""
        # Create a key
        create_response = requests.post(f"{BASE_URL}/api/v1/api-keys", headers=headers, json={
            "key_type": "test",
            "label": "TEST_Revoke_Test_Key"
        })
        key_id = create_response.json()["id"]
        
        # Revoke
        revoke_response = requests.delete(f"{BASE_URL}/api/v1/api-keys/{key_id}", headers=headers)
        assert revoke_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/v1/api-keys/{key_id}", headers=headers)
        assert get_response.status_code == 404
        print(f"Revoked key {key_id}")


class TestAuditLog:
    """Audit Log tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_list_audit_events(self, headers):
        """Test listing audit events"""
        response = requests.get(f"{BASE_URL}/api/v1/audit?limit=50", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        print(f"Found {data['total']} audit events")
        
        if data["data"]:
            event = data["data"][0]
            assert "id" in event
            assert "event_type" in event
            assert "actor_type" in event
            print(f"Sample event: {event['event_type']} by {event['actor_type']}")
    
    def test_filter_audit_by_event_type(self, headers):
        """Test filtering audit events by event type"""
        response = requests.get(f"{BASE_URL}/api/v1/audit?event_type=escrow.created&limit=10", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"Found {len(data['data'])} escrow.created events")
    
    def test_filter_audit_by_actor_type(self, headers):
        """Test filtering audit events by actor type"""
        for actor_type in ["human", "agent", "system"]:
            response = requests.get(f"{BASE_URL}/api/v1/audit?actor_type={actor_type}&limit=10", headers=headers)
            assert response.status_code == 200
            data = response.json()
            print(f"Found {len(data['data'])} events by {actor_type}")
    
    def test_get_audit_event_detail(self, headers):
        """Test getting audit event detail"""
        # Get list first
        list_response = requests.get(f"{BASE_URL}/api/v1/audit?limit=5", headers=headers)
        events = list_response.json()["data"]
        
        if events:
            event_id = events[0]["id"]
            detail_response = requests.get(f"{BASE_URL}/api/v1/audit/{event_id}", headers=headers)
            assert detail_response.status_code == 200
            data = detail_response.json()
            assert "id" in data
            assert "event_type" in data
            assert "details" in data
            print(f"Event detail: {data['event_type']} - {data['details']}")


class TestDashboardOverview:
    """Dashboard Overview stats tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_dashboard_data_aggregation(self, headers):
        """Test that all dashboard data endpoints work together"""
        # Fetch all data needed for dashboard
        accounts_response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers)
        transactions_response = requests.get(f"{BASE_URL}/api/v1/spend?limit=5", headers=headers)
        approvals_response = requests.get(f"{BASE_URL}/api/v1/approvals?status=pending", headers=headers)
        policies_response = requests.get(f"{BASE_URL}/api/v1/policies", headers=headers)
        
        assert accounts_response.status_code == 200
        assert transactions_response.status_code == 200
        assert approvals_response.status_code == 200
        assert policies_response.status_code == 200
        
        accounts = accounts_response.json()["data"]
        transactions = transactions_response.json()["data"]
        approvals = approvals_response.json()["data"]
        policies = policies_response.json()["data"]
        
        # Calculate stats
        total_balance = sum(acc.get("balance_cents", 0) for acc in accounts)
        total_spent = sum(acc.get("total_spent_cents", 0) for acc in accounts)
        active_policies = len([p for p in policies if p.get("is_active")])
        pending_approvals = len(approvals)
        
        print(f"Dashboard Stats:")
        print(f"  Total Escrowed: ${total_balance/100:.2f}")
        print(f"  Total Spent: ${total_spent/100:.2f}")
        print(f"  Active Rules: {active_policies}")
        print(f"  Pending Approvals: {pending_approvals}")
        print(f"  Recent Transactions: {len(transactions)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
