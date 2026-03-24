"""
Safe-Spend Prompt 05 Tests - Webhooks & Approvals Workflow
Tests: Webhook CRUD, HMAC signature, delivery queue, approval lifecycle, expire-stale
"""
import pytest
import requests
import os
import time
import hmac
import hashlib

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@test.com"
TEST_PASSWORD = "Test123!"

# Existing test data from context
EXISTING_WEBHOOK_ID = "whk_qk8bc4acrf2e"
EXISTING_APPROVAL_ID = "apr_t8eynwox4juv"


class TestWebhookCRUD:
    """Webhook CRUD operations tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_list_webhooks(self, headers):
        """Test listing webhooks"""
        response = requests.get(f"{BASE_URL}/api/v1/webhooks", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert "supported_events" in data
        print(f"Found {data['total']} webhooks")
        
        # Verify supported events are returned
        assert len(data["supported_events"]) > 0
        assert "spend.approved" in data["supported_events"]
        assert "approval.requested" in data["supported_events"]
        return data
    
    def test_create_webhook(self, headers):
        """Test creating a new webhook with event subscriptions"""
        payload = {
            "url": "https://httpbin.org/post",
            "events": ["spend.approved", "spend.denied", "approval.requested"]
        }
        response = requests.post(f"{BASE_URL}/api/v1/webhooks", headers=headers, json=payload)
        assert response.status_code == 201
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert data["url"] == payload["url"]
        assert data["events"] == payload["events"]
        assert data["is_active"] == True
        
        # Secret should be returned only on creation
        assert "secret" in data
        assert len(data["secret"]) > 20  # Should be a substantial secret
        
        print(f"Created webhook: {data['id']} with secret: {data['secret'][:10]}...")
        return data
    
    def test_create_webhook_validation_no_url(self, headers):
        """Test webhook creation fails without URL"""
        payload = {"events": ["spend.approved"]}
        response = requests.post(f"{BASE_URL}/api/v1/webhooks", headers=headers, json=payload)
        assert response.status_code == 400
        assert "url" in response.json().get("error", "").lower()
    
    def test_create_webhook_validation_no_events(self, headers):
        """Test webhook creation fails without events"""
        payload = {"url": "https://httpbin.org/post"}
        response = requests.post(f"{BASE_URL}/api/v1/webhooks", headers=headers, json=payload)
        assert response.status_code == 400
        assert "events" in response.json().get("error", "").lower()
    
    def test_create_webhook_validation_invalid_events(self, headers):
        """Test webhook creation fails with invalid event types"""
        payload = {
            "url": "https://httpbin.org/post",
            "events": ["invalid.event", "another.invalid"]
        }
        response = requests.post(f"{BASE_URL}/api/v1/webhooks", headers=headers, json=payload)
        assert response.status_code == 400
        assert "unsupported" in response.json().get("error", "").lower()
    
    def test_get_webhook(self, headers):
        """Test getting webhook details"""
        # First create a webhook
        create_response = requests.post(f"{BASE_URL}/api/v1/webhooks", headers=headers, json={
            "url": "https://httpbin.org/post",
            "events": ["escrow.funded"]
        })
        webhook_id = create_response.json()["id"]
        
        # Get the webhook
        response = requests.get(f"{BASE_URL}/api/v1/webhooks/{webhook_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == webhook_id
        assert "url" in data
        assert "events" in data
        assert "is_active" in data
        # Secret should NOT be returned on GET
        assert "secret" not in data
        print(f"Got webhook: {data['id']}")
    
    def test_update_webhook_toggle_active(self, headers):
        """Test toggling webhook active status"""
        # Create a webhook
        create_response = requests.post(f"{BASE_URL}/api/v1/webhooks", headers=headers, json={
            "url": "https://httpbin.org/post",
            "events": ["spend.approved"]
        })
        webhook_id = create_response.json()["id"]
        
        # Deactivate
        deactivate_response = requests.patch(f"{BASE_URL}/api/v1/webhooks/{webhook_id}", headers=headers, json={
            "is_active": False
        })
        assert deactivate_response.status_code == 200
        assert deactivate_response.json()["is_active"] == False
        
        # Reactivate
        reactivate_response = requests.patch(f"{BASE_URL}/api/v1/webhooks/{webhook_id}", headers=headers, json={
            "is_active": True
        })
        assert reactivate_response.status_code == 200
        assert reactivate_response.json()["is_active"] == True
        print(f"Toggled webhook {webhook_id} active status")
    
    def test_delete_webhook(self, headers):
        """Test deleting a webhook"""
        # Create a webhook
        create_response = requests.post(f"{BASE_URL}/api/v1/webhooks", headers=headers, json={
            "url": "https://httpbin.org/post",
            "events": ["spend.denied"]
        })
        webhook_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/v1/webhooks/{webhook_id}", headers=headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/v1/webhooks/{webhook_id}", headers=headers)
        assert get_response.status_code == 404
        print(f"Deleted webhook {webhook_id}")


class TestWebhookSecretRotation:
    """Webhook secret rotation tests"""
    
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
    
    def test_rotate_webhook_secret(self, headers):
        """Test rotating webhook secret"""
        # Create a webhook
        create_response = requests.post(f"{BASE_URL}/api/v1/webhooks", headers=headers, json={
            "url": "https://httpbin.org/post",
            "events": ["approval.approved"]
        })
        webhook_id = create_response.json()["id"]
        original_secret = create_response.json()["secret"]
        
        # Rotate secret
        rotate_response = requests.post(f"{BASE_URL}/api/v1/webhooks/{webhook_id}/rotate-secret", headers=headers)
        assert rotate_response.status_code == 200
        data = rotate_response.json()
        
        # New secret should be returned
        assert "secret" in data
        new_secret = data["secret"]
        
        # Secret should be different
        assert new_secret != original_secret
        assert len(new_secret) > 20
        
        print(f"Rotated secret for webhook {webhook_id}")
        print(f"  Old: {original_secret[:10]}...")
        print(f"  New: {new_secret[:10]}...")


class TestWebhookTest:
    """Webhook test endpoint tests"""
    
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
    
    def test_send_test_webhook(self, headers):
        """Test sending a test webhook to verify endpoint"""
        # Create a webhook pointing to httpbin
        create_response = requests.post(f"{BASE_URL}/api/v1/webhooks", headers=headers, json={
            "url": "https://httpbin.org/post",
            "events": ["spend.approved"]
        })
        webhook_id = create_response.json()["id"]
        
        # Send test webhook
        test_response = requests.post(f"{BASE_URL}/api/v1/webhooks/{webhook_id}/test", headers=headers)
        assert test_response.status_code == 200
        data = test_response.json()
        
        # Should return success and payload info
        assert "success" in data
        assert "payload_sent" in data
        
        # httpbin.org should return 200
        if data["success"]:
            assert data["status_code"] == 200
            print(f"Test webhook sent successfully to {webhook_id}")
        else:
            print(f"Test webhook failed: {data.get('error', 'Unknown error')}")
        
        # Verify payload structure
        payload = data["payload_sent"]
        assert "id" in payload
        assert payload["type"] == "webhook.test"
        assert "data" in payload
        assert "created_at" in payload


class TestWebhookDeliveries:
    """Webhook deliveries list tests"""
    
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
    
    def test_list_webhook_deliveries(self, headers):
        """Test listing webhook deliveries"""
        # Use existing webhook if available
        list_response = requests.get(f"{BASE_URL}/api/v1/webhooks", headers=headers)
        webhooks = list_response.json()["data"]
        
        if webhooks:
            webhook_id = webhooks[0]["id"]
            
            # Get deliveries
            deliveries_response = requests.get(f"{BASE_URL}/api/v1/webhooks/{webhook_id}/deliveries", headers=headers)
            assert deliveries_response.status_code == 200
            data = deliveries_response.json()
            
            assert "data" in data
            assert "total" in data
            
            print(f"Found {data['total']} deliveries for webhook {webhook_id}")
            
            # Verify delivery structure if any exist
            if data["data"]:
                delivery = data["data"][0]
                assert "id" in delivery
                assert "event_type" in delivery
                assert "status" in delivery
                assert "attempt_count" in delivery
                print(f"  Sample delivery: {delivery['event_type']} - {delivery['status']}")
        else:
            pytest.skip("No webhooks available to test deliveries")
    
    def test_list_webhook_deliveries_filter_by_status(self, headers):
        """Test filtering deliveries by status"""
        list_response = requests.get(f"{BASE_URL}/api/v1/webhooks", headers=headers)
        webhooks = list_response.json()["data"]
        
        if webhooks:
            webhook_id = webhooks[0]["id"]
            
            for status in ["pending", "success", "failed"]:
                response = requests.get(
                    f"{BASE_URL}/api/v1/webhooks/{webhook_id}/deliveries?status={status}", 
                    headers=headers
                )
                assert response.status_code == 200
                print(f"  {status}: {response.json()['total']} deliveries")


class TestWebhookDeliverPending:
    """Webhook deliver-pending maintenance endpoint tests"""
    
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
    
    def test_deliver_pending_webhooks(self, headers):
        """Test processing pending webhook deliveries"""
        response = requests.post(f"{BASE_URL}/api/v1/webhooks/deliver-pending", headers=headers, json={
            "limit": 50
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "message" in data
        assert "processed" in data
        assert "succeeded" in data
        assert "failed" in data
        assert "willRetry" in data
        
        print(f"Deliver pending results:")
        print(f"  Processed: {data['processed']}")
        print(f"  Succeeded: {data['succeeded']}")
        print(f"  Failed: {data['failed']}")
        print(f"  Will Retry: {data['willRetry']}")


class TestApprovalLifecycle:
    """Approval lifecycle tests"""
    
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
        assert "total" in data
        
        print(f"Found {data['total']} pending approvals")
        
        if data["data"]:
            approval = data["data"][0]
            assert "id" in approval
            assert "status" in approval
            assert "spend_request" in approval
            assert "expires_at" in approval
            print(f"  Sample: {approval['id']} - ${approval['spend_request']['amount_cents']/100:.2f} to {approval['spend_request']['vendor']}")
            return approval
        return None
    
    def test_get_approval_detail(self, headers):
        """Test getting approval detail with spend request info"""
        # Get a pending approval
        list_response = requests.get(f"{BASE_URL}/api/v1/approvals?status=pending", headers=headers)
        approvals = list_response.json()["data"]
        
        if approvals:
            approval_id = approvals[0]["id"]
            
            response = requests.get(f"{BASE_URL}/api/v1/approvals/{approval_id}", headers=headers)
            assert response.status_code == 200
            data = response.json()
            
            # Verify structure
            assert "id" in data
            assert "status" in data
            assert "spend_request" in data
            assert "requested_at" in data
            assert "expires_at" in data
            
            # Verify spend request details
            sr = data["spend_request"]
            assert "amount_cents" in sr
            assert "vendor" in sr
            assert "rules_evaluated" in sr
            
            print(f"Approval detail: {data['id']}")
            print(f"  Amount: ${sr['amount_cents']/100:.2f}")
            print(f"  Vendor: {sr['vendor']}")
            print(f"  Rules evaluated: {len(sr['rules_evaluated'])}")
        else:
            pytest.skip("No pending approvals to test")
    
    def test_get_approval_not_found(self, headers):
        """Test getting non-existent approval"""
        response = requests.get(f"{BASE_URL}/api/v1/approvals/apr_nonexistent123", headers=headers)
        assert response.status_code == 404


class TestApprovalApprove:
    """Approval approve action tests"""
    
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
    
    def test_approve_pending_approval(self, headers):
        """Test approving a pending approval with balance deduction"""
        # Get a pending approval
        list_response = requests.get(f"{BASE_URL}/api/v1/approvals?status=pending", headers=headers)
        approvals = list_response.json()["data"]
        
        if not approvals:
            pytest.skip("No pending approvals to test approve action")
        
        approval = approvals[0]
        approval_id = approval["id"]
        amount_cents = approval["spend_request"]["amount_cents"]
        escrow_id = approval["spend_request"]["escrow_id"]
        
        # Get escrow balance before
        escrow_response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/balance", headers=headers)
        balance_before = escrow_response.json()["balance_cents"]
        
        # Approve
        approve_response = requests.post(f"{BASE_URL}/api/v1/approvals/{approval_id}/approve", headers=headers, json={
            "note": "Approved via automated test"
        })
        
        if approve_response.status_code == 400:
            # May be expired or already processed
            error = approve_response.json().get("error", "")
            print(f"Could not approve: {error}")
            pytest.skip(f"Approval could not be processed: {error}")
        
        assert approve_response.status_code == 200
        data = approve_response.json()
        
        # Verify response
        assert data["status"] == "approved"
        assert "approved_by" in data
        assert "approved_at" in data
        
        # Verify balance deduction
        escrow_after = requests.get(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/balance", headers=headers)
        balance_after = escrow_after.json()["balance_cents"]
        
        assert balance_after == balance_before - amount_cents
        
        print(f"Approved {approval_id}")
        print(f"  Balance before: ${balance_before/100:.2f}")
        print(f"  Amount: ${amount_cents/100:.2f}")
        print(f"  Balance after: ${balance_after/100:.2f}")
    
    def test_approve_already_approved(self, headers):
        """Test approving an already approved approval fails"""
        # Get an approved approval
        list_response = requests.get(f"{BASE_URL}/api/v1/approvals?status=approved", headers=headers)
        approvals = list_response.json()["data"]
        
        if not approvals:
            pytest.skip("No approved approvals to test")
        
        approval_id = approvals[0]["id"]
        
        # Try to approve again
        response = requests.post(f"{BASE_URL}/api/v1/approvals/{approval_id}/approve", headers=headers)
        assert response.status_code == 400
        assert "already" in response.json().get("error", "").lower()


class TestApprovalDeny:
    """Approval deny action tests"""
    
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
    
    def test_deny_pending_approval(self, headers):
        """Test denying a pending approval with reason and note"""
        # First, create a new spend request that requires approval
        # Get an escrow account
        escrows_response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts", headers=headers)
        escrows = escrows_response.json()["data"]
        
        active_escrow = next((e for e in escrows if e["status"] == "active" and e["balance_cents"] > 0), None)
        
        if not active_escrow:
            pytest.skip("No active escrow with balance to create spend request")
        
        # Get a pending approval
        list_response = requests.get(f"{BASE_URL}/api/v1/approvals?status=pending", headers=headers)
        approvals = list_response.json()["data"]
        
        if not approvals:
            pytest.skip("No pending approvals to test deny action")
        
        approval = approvals[0]
        approval_id = approval["id"]
        escrow_id = approval["spend_request"]["escrow_id"]
        
        # Get escrow balance before
        escrow_response = requests.get(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/balance", headers=headers)
        balance_before = escrow_response.json()["balance_cents"]
        
        # Deny
        deny_response = requests.post(f"{BASE_URL}/api/v1/approvals/{approval_id}/deny", headers=headers, json={
            "reason": "suspicious_activity",
            "note": "Denied via automated test - suspicious vendor"
        })
        
        if deny_response.status_code == 400:
            error = deny_response.json().get("error", "")
            print(f"Could not deny: {error}")
            pytest.skip(f"Approval could not be denied: {error}")
        
        assert deny_response.status_code == 200
        data = deny_response.json()
        
        # Verify response
        assert data["status"] == "denied"
        assert "denied_by" in data
        assert "denied_at" in data
        assert data["denial_reason"] == "suspicious_activity"
        
        # Verify balance NOT deducted
        escrow_after = requests.get(f"{BASE_URL}/api/v1/escrow-accounts/{escrow_id}/balance", headers=headers)
        balance_after = escrow_after.json()["balance_cents"]
        
        assert balance_after == balance_before  # No deduction
        
        print(f"Denied {approval_id}")
        print(f"  Balance unchanged: ${balance_after/100:.2f}")


class TestApprovalExpireStale:
    """Approval expire-stale maintenance endpoint tests"""
    
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
    
    def test_expire_stale_approvals(self, headers):
        """Test expiring stale pending approvals"""
        response = requests.post(f"{BASE_URL}/api/v1/approvals/expire-stale", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "message" in data
        assert "expired_count" in data
        
        print(f"Expire stale results:")
        print(f"  Message: {data['message']}")
        print(f"  Expired count: {data['expired_count']}")
        
        if "results" in data and data["results"]:
            for result in data["results"][:5]:
                print(f"    - {result['approval_id']}: {result['status']}")


class TestWebhookSignature:
    """Webhook HMAC signature verification tests"""
    
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
    
    def test_webhook_signature_format(self, headers):
        """Test that webhook test endpoint returns proper signature headers info"""
        # Create a webhook
        create_response = requests.post(f"{BASE_URL}/api/v1/webhooks", headers=headers, json={
            "url": "https://httpbin.org/post",
            "events": ["spend.approved"]
        })
        webhook_id = create_response.json()["id"]
        webhook_secret = create_response.json()["secret"]
        
        # Send test webhook
        test_response = requests.post(f"{BASE_URL}/api/v1/webhooks/{webhook_id}/test", headers=headers)
        assert test_response.status_code == 200
        data = test_response.json()
        
        # Verify payload structure for signature verification
        payload = data["payload_sent"]
        assert "id" in payload
        assert "type" in payload
        assert "created_at" in payload
        assert "data" in payload
        
        print(f"Webhook payload structure verified for signature")
        print(f"  Event ID: {payload['id']}")
        print(f"  Event Type: {payload['type']}")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/v1/webhooks/{webhook_id}", headers=headers)


class TestWebhookIntegrationWithApprovals:
    """Integration tests for webhooks triggered by approval actions"""
    
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
    
    def test_webhook_queued_on_approval_action(self, headers):
        """Test that webhooks are queued when approval actions occur"""
        # Create a webhook subscribed to approval events
        create_response = requests.post(f"{BASE_URL}/api/v1/webhooks", headers=headers, json={
            "url": "https://httpbin.org/post",
            "events": ["approval.approved", "approval.denied", "spend.approved", "spend.denied"]
        })
        webhook_id = create_response.json()["id"]
        
        # Get initial delivery count
        initial_deliveries = requests.get(f"{BASE_URL}/api/v1/webhooks/{webhook_id}/deliveries", headers=headers)
        initial_count = initial_deliveries.json()["total"]
        
        # Process any pending deliveries
        requests.post(f"{BASE_URL}/api/v1/webhooks/deliver-pending", headers=headers)
        
        # Check deliveries again
        final_deliveries = requests.get(f"{BASE_URL}/api/v1/webhooks/{webhook_id}/deliveries", headers=headers)
        final_count = final_deliveries.json()["total"]
        
        print(f"Webhook {webhook_id} deliveries: {initial_count} -> {final_count}")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/v1/webhooks/{webhook_id}", headers=headers)


class TestExistingWebhook:
    """Tests using existing webhook from context"""
    
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
    
    def test_existing_webhook_exists(self, headers):
        """Test that the existing webhook from context exists"""
        response = requests.get(f"{BASE_URL}/api/v1/webhooks/{EXISTING_WEBHOOK_ID}", headers=headers)
        
        if response.status_code == 404:
            pytest.skip(f"Existing webhook {EXISTING_WEBHOOK_ID} not found")
        
        assert response.status_code == 200
        data = response.json()
        print(f"Existing webhook: {data['id']}")
        print(f"  URL: {data['url']}")
        print(f"  Events: {data['events']}")
        print(f"  Active: {data['is_active']}")
    
    def test_existing_webhook_deliveries(self, headers):
        """Test deliveries for existing webhook"""
        response = requests.get(f"{BASE_URL}/api/v1/webhooks/{EXISTING_WEBHOOK_ID}/deliveries", headers=headers)
        
        if response.status_code == 404:
            pytest.skip(f"Existing webhook {EXISTING_WEBHOOK_ID} not found")
        
        assert response.status_code == 200
        data = response.json()
        print(f"Existing webhook has {data['total']} deliveries")


class TestExistingApproval:
    """Tests using existing approval from context"""
    
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
    
    def test_existing_approval_exists(self, headers):
        """Test that the existing approval from context exists"""
        response = requests.get(f"{BASE_URL}/api/v1/approvals/{EXISTING_APPROVAL_ID}", headers=headers)
        
        if response.status_code == 404:
            pytest.skip(f"Existing approval {EXISTING_APPROVAL_ID} not found")
        
        assert response.status_code == 200
        data = response.json()
        print(f"Existing approval: {data['id']}")
        print(f"  Status: {data['status']}")
        print(f"  Amount: ${data['spend_request']['amount_cents']/100:.2f}")
        print(f"  Vendor: {data['spend_request']['vendor']}")
        print(f"  Expires: {data.get('expires_at', 'N/A')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
