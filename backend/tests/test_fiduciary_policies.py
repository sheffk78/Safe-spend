"""
Test suite for Fiduciary Policies (Spending Policies) API
Tests the policy CRUD operations, purpose field, lock/unlock, and draft functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "org-a@test.com"
TEST_PASSWORD = "TestPassword123!"
EXISTING_ESCROW_ID = "esc_6uquqflbhs6s"


class TestFiduciaryPoliciesAPI:
    """Test Fiduciary Policies (Spending Policies) API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        self.token = data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Store created policy IDs for cleanup
        self.created_policies = []
        
        yield
        
        # Cleanup - delete test policies
        for policy_id in self.created_policies:
            try:
                self.session.delete(f"{BASE_URL}/api/v1/policies/{policy_id}")
            except:
                pass
    
    def test_list_policies(self):
        """Test GET /api/v1/policies - List all policies"""
        response = self.session.get(f"{BASE_URL}/api/v1/policies")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "data" in data
        assert "total" in data
        assert isinstance(data["data"], list)
        print(f"PASS: Listed {data['total']} policies")
    
    def test_create_policy_with_purpose(self):
        """Test POST /api/v1/policies - Create policy with purpose field"""
        payload = {
            "name": "TEST_Policy_With_Purpose",
            "escrow_id": EXISTING_ESCROW_ID,
            "purpose": "Marketing spend for advertising campaigns",
            "draft": True,
            "per_transaction_limit_cents": 10000,
            "daily_limit_cents": 50000,
            "auto_approve_under_cents": 5000,
            "require_human_above_cents": 5000
        }
        
        response = self.session.post(f"{BASE_URL}/api/v1/policies", json=payload)
        
        assert response.status_code == 201, f"Create failed: {response.text}"
        data = response.json()
        
        # Store for cleanup
        self.created_policies.append(data["id"])
        
        # Verify response structure
        assert data["name"] == payload["name"]
        assert data["purpose"] == payload["purpose"]
        assert data["escrow_id"] == EXISTING_ESCROW_ID
        assert data["status"] == "draft"
        assert data["is_active"] == False
        assert data["is_locked"] == False
        assert data["per_transaction_limit_cents"] == 10000
        assert data["auto_approve_under_cents"] == 5000
        assert data["require_human_above_cents"] == 5000
        
        print(f"PASS: Created policy with purpose: {data['id']}")
        return data["id"]
    
    def test_create_policy_without_purpose(self):
        """Test POST /api/v1/policies - Create policy without purpose field"""
        payload = {
            "name": "TEST_Policy_No_Purpose",
            "escrow_id": EXISTING_ESCROW_ID,
            "draft": True,
            "per_transaction_limit_cents": 5000
        }
        
        response = self.session.post(f"{BASE_URL}/api/v1/policies", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        
        self.created_policies.append(data["id"])
        
        assert data["name"] == payload["name"]
        assert data["purpose"] is None
        
        print(f"PASS: Created policy without purpose: {data['id']}")
    
    def test_get_policy_returns_purpose(self):
        """Test GET /api/v1/policies/:id - Verify purpose field is returned"""
        # First create a policy
        create_payload = {
            "name": "TEST_Get_Policy_Purpose",
            "escrow_id": EXISTING_ESCROW_ID,
            "purpose": "Engineering R&D expenses",
            "draft": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/v1/policies", json=create_payload)
        assert create_response.status_code == 201
        policy_id = create_response.json()["id"]
        self.created_policies.append(policy_id)
        
        # Get the policy
        get_response = self.session.get(f"{BASE_URL}/api/v1/policies/{policy_id}")
        
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data["id"] == policy_id
        assert data["purpose"] == "Engineering R&D expenses"
        
        print(f"PASS: GET policy returns purpose field correctly")
    
    def test_update_policy_purpose(self):
        """Test PATCH /api/v1/policies/:id - Update purpose field"""
        # Create a policy
        create_payload = {
            "name": "TEST_Update_Purpose",
            "escrow_id": EXISTING_ESCROW_ID,
            "purpose": "Original purpose",
            "draft": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/v1/policies", json=create_payload)
        assert create_response.status_code == 201
        policy_id = create_response.json()["id"]
        self.created_policies.append(policy_id)
        
        # Update the purpose
        update_payload = {
            "purpose": "Updated purpose - Operations"
        }
        
        update_response = self.session.patch(f"{BASE_URL}/api/v1/policies/{policy_id}", json=update_payload)
        
        assert update_response.status_code == 200
        data = update_response.json()
        
        assert data["purpose"] == "Updated purpose - Operations"
        
        # Verify with GET
        get_response = self.session.get(f"{BASE_URL}/api/v1/policies/{policy_id}")
        assert get_response.json()["purpose"] == "Updated purpose - Operations"
        
        print(f"PASS: Updated policy purpose successfully")
    
    def test_create_active_policy(self):
        """Test POST /api/v1/policies - Create active (non-draft) policy"""
        payload = {
            "name": "TEST_Active_Policy",
            "escrow_id": EXISTING_ESCROW_ID,
            "purpose": "Active policy test",
            "draft": False,  # Create as active
            "per_transaction_limit_cents": 10000
        }
        
        response = self.session.post(f"{BASE_URL}/api/v1/policies", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        
        self.created_policies.append(data["id"])
        
        assert data["status"] == "active"
        assert data["is_active"] == True
        
        print(f"PASS: Created active policy: {data['id']}")
    
    def test_lock_policy(self):
        """Test POST /api/v1/policies/:id/lock - Lock a draft policy"""
        # Create a draft policy
        create_payload = {
            "name": "TEST_Lock_Policy",
            "escrow_id": EXISTING_ESCROW_ID,
            "draft": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/v1/policies", json=create_payload)
        assert create_response.status_code == 201
        policy_id = create_response.json()["id"]
        self.created_policies.append(policy_id)
        
        # Lock the policy
        lock_response = self.session.post(f"{BASE_URL}/api/v1/policies/{policy_id}/lock")
        
        assert lock_response.status_code == 200
        data = lock_response.json()
        
        assert data["policy"]["is_locked"] == True
        assert data["policy"]["status"] == "active"
        assert data["policy"]["locked_at"] is not None
        
        print(f"PASS: Locked policy successfully")
    
    def test_cannot_update_locked_policy(self):
        """Test PATCH /api/v1/policies/:id - Cannot update locked policy"""
        # Create and lock a policy
        create_payload = {
            "name": "TEST_Locked_No_Update",
            "escrow_id": EXISTING_ESCROW_ID,
            "draft": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/v1/policies", json=create_payload)
        policy_id = create_response.json()["id"]
        self.created_policies.append(policy_id)
        
        # Lock it
        self.session.post(f"{BASE_URL}/api/v1/policies/{policy_id}/lock")
        
        # Try to update
        update_response = self.session.patch(f"{BASE_URL}/api/v1/policies/{policy_id}", json={
            "name": "New Name"
        })
        
        assert update_response.status_code == 403
        assert "locked" in update_response.json().get("error", "").lower()
        
        print(f"PASS: Cannot update locked policy (403 returned)")
    
    def test_unlock_policy(self):
        """Test POST /api/v1/policies/:id/unlock - Unlock a locked policy"""
        # Create and lock a policy
        create_payload = {
            "name": "TEST_Unlock_Policy",
            "escrow_id": EXISTING_ESCROW_ID,
            "draft": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/v1/policies", json=create_payload)
        policy_id = create_response.json()["id"]
        self.created_policies.append(policy_id)
        
        # Lock it
        self.session.post(f"{BASE_URL}/api/v1/policies/{policy_id}/lock")
        
        # Unlock it (requires confirm: true)
        unlock_response = self.session.post(f"{BASE_URL}/api/v1/policies/{policy_id}/unlock", json={
            "confirm": True
        })
        
        assert unlock_response.status_code == 200
        data = unlock_response.json()
        
        assert data["policy"]["is_locked"] == False
        assert data["policy"]["locked_at"] is None
        
        print(f"PASS: Unlocked policy successfully")
    
    def test_unlock_requires_confirmation(self):
        """Test POST /api/v1/policies/:id/unlock - Requires confirmation"""
        # Create and lock a policy
        create_payload = {
            "name": "TEST_Unlock_Confirm",
            "escrow_id": EXISTING_ESCROW_ID,
            "draft": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/v1/policies", json=create_payload)
        policy_id = create_response.json()["id"]
        self.created_policies.append(policy_id)
        
        # Lock it
        self.session.post(f"{BASE_URL}/api/v1/policies/{policy_id}/lock")
        
        # Try to unlock without confirmation
        unlock_response = self.session.post(f"{BASE_URL}/api/v1/policies/{policy_id}/unlock", json={})
        
        assert unlock_response.status_code == 400
        assert "confirm" in unlock_response.json().get("error", "").lower()
        
        print(f"PASS: Unlock requires confirmation (400 returned)")
    
    def test_delete_policy(self):
        """Test DELETE /api/v1/policies/:id - Delete a policy"""
        # Create a policy
        create_payload = {
            "name": "TEST_Delete_Policy",
            "escrow_id": EXISTING_ESCROW_ID,
            "draft": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/v1/policies", json=create_payload)
        policy_id = create_response.json()["id"]
        
        # Delete it
        delete_response = self.session.delete(f"{BASE_URL}/api/v1/policies/{policy_id}")
        
        assert delete_response.status_code == 200
        
        # Verify it's gone
        get_response = self.session.get(f"{BASE_URL}/api/v1/policies/{policy_id}")
        assert get_response.status_code == 404
        
        print(f"PASS: Deleted policy successfully")
    
    def test_cannot_delete_locked_policy(self):
        """Test DELETE /api/v1/policies/:id - Cannot delete locked policy"""
        # Create and lock a policy
        create_payload = {
            "name": "TEST_Locked_No_Delete",
            "escrow_id": EXISTING_ESCROW_ID,
            "draft": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/v1/policies", json=create_payload)
        policy_id = create_response.json()["id"]
        self.created_policies.append(policy_id)
        
        # Lock it
        self.session.post(f"{BASE_URL}/api/v1/policies/{policy_id}/lock")
        
        # Try to delete
        delete_response = self.session.delete(f"{BASE_URL}/api/v1/policies/{policy_id}")
        
        assert delete_response.status_code == 403
        assert "locked" in delete_response.json().get("error", "").lower()
        
        print(f"PASS: Cannot delete locked policy (403 returned)")
    
    def test_archive_policy(self):
        """Test POST /api/v1/policies/:id/archive - Archive a policy"""
        # Create a policy
        create_payload = {
            "name": "TEST_Archive_Policy",
            "escrow_id": EXISTING_ESCROW_ID,
            "draft": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/v1/policies", json=create_payload)
        policy_id = create_response.json()["id"]
        self.created_policies.append(policy_id)
        
        # Archive it
        archive_response = self.session.post(f"{BASE_URL}/api/v1/policies/{policy_id}/archive")
        
        assert archive_response.status_code == 200
        data = archive_response.json()
        
        assert data["policy"]["status"] == "archived"
        assert data["policy"]["is_active"] == False
        
        print(f"PASS: Archived policy successfully")
    
    def test_policy_with_all_fields(self):
        """Test creating a policy with all fields populated"""
        payload = {
            "name": "TEST_Full_Policy",
            "escrow_id": EXISTING_ESCROW_ID,
            "purpose": "Full test policy with all fields",
            "draft": True,
            "per_transaction_limit_cents": 10000,
            "daily_limit_cents": 50000,
            "weekly_limit_cents": 200000,
            "monthly_limit_cents": 500000,
            "allowed_vendors": ["Google Ads", "Meta Ads"],
            "blocked_vendors": ["Risky Vendor"],
            "vendor_match_mode": "contains",
            "allowed_categories": ["advertising", "ai_compute"],
            "blocked_categories": ["gambling"],
            "active_days": ["mon", "tue", "wed", "thu", "fri"],
            "active_hours_start": "09",
            "active_hours_end": "17",
            "active_timezone": "America/New_York",
            "auto_approve_under_cents": 2500,
            "require_human_above_cents": 5000,
            "approval_timeout_minutes": 120
        }
        
        response = self.session.post(f"{BASE_URL}/api/v1/policies", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        
        self.created_policies.append(data["id"])
        
        # Verify all fields
        assert data["name"] == payload["name"]
        assert data["purpose"] == payload["purpose"]
        assert data["per_transaction_limit_cents"] == 10000
        assert data["daily_limit_cents"] == 50000
        assert data["weekly_limit_cents"] == 200000
        assert data["monthly_limit_cents"] == 500000
        assert data["allowed_vendors"] == ["Google Ads", "Meta Ads"]
        assert data["blocked_vendors"] == ["Risky Vendor"]
        assert data["vendor_match_mode"] == "contains"
        assert data["allowed_categories"] == ["advertising", "ai_compute"]
        assert data["blocked_categories"] == ["gambling"]
        assert data["active_days"] == ["mon", "tue", "wed", "thu", "fri"]
        assert data["active_hours_start"] == "09"
        assert data["active_hours_end"] == "17"
        assert data["active_timezone"] == "America/New_York"
        assert data["auto_approve_under_cents"] == 2500
        assert data["require_human_above_cents"] == 5000
        assert data["approval_timeout_minutes"] == 120
        
        print(f"PASS: Created policy with all fields: {data['id']}")
    
    def test_filter_policies_by_status(self):
        """Test GET /api/v1/policies?status=draft - Filter by status"""
        response = self.session.get(f"{BASE_URL}/api/v1/policies?status=draft")
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned policies should be drafts
        for policy in data["data"]:
            assert policy["status"] == "draft"
        
        print(f"PASS: Filtered policies by status=draft, got {len(data['data'])} results")
    
    def test_filter_policies_by_escrow(self):
        """Test GET /api/v1/policies?escrow_id=xxx - Filter by escrow"""
        response = self.session.get(f"{BASE_URL}/api/v1/policies?escrow_id={EXISTING_ESCROW_ID}")
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned policies should belong to the escrow
        for policy in data["data"]:
            assert policy["escrow_id"] == EXISTING_ESCROW_ID
        
        print(f"PASS: Filtered policies by escrow_id, got {len(data['data'])} results")
    
    def test_create_policy_missing_required_fields(self):
        """Test POST /api/v1/policies - Missing required fields returns 400"""
        # Missing escrow_id
        response = self.session.post(f"{BASE_URL}/api/v1/policies", json={
            "name": "TEST_Missing_Escrow"
        })
        assert response.status_code == 400
        
        # Missing name
        response = self.session.post(f"{BASE_URL}/api/v1/policies", json={
            "escrow_id": EXISTING_ESCROW_ID
        })
        assert response.status_code == 400
        
        print(f"PASS: Missing required fields returns 400")
    
    def test_create_policy_invalid_escrow(self):
        """Test POST /api/v1/policies - Invalid escrow_id returns 404"""
        response = self.session.post(f"{BASE_URL}/api/v1/policies", json={
            "name": "TEST_Invalid_Escrow",
            "escrow_id": "esc_nonexistent123"
        })
        
        assert response.status_code == 404
        
        print(f"PASS: Invalid escrow_id returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
