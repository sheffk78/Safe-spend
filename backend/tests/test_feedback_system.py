"""
Feedback System API Tests
Tests for Safe-Spend Feedback System including:
- Public feedback endpoints (POST /api/v1/feedback, GET /api/v1/feedback/tracking, etc.)
- Feature request board (GET/POST /api/v1/feedback/requests, voting, commenting)
- Admin feedback dashboard (GET/PATCH /api/admin/feedback, stats, requests management)
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://agent-vault-demo.preview.emergentagent.com').rstrip('/')
ADMIN_API_KEY = "ss_admin_12a29bce42c6462deb6d36cc3f4412d3"


class TestSetup:
    """Setup fixtures for feedback tests"""
    
    @staticmethod
    def create_test_user():
        """Create a new test user and return token"""
        unique_id = str(uuid.uuid4())[:8]
        email = f"feedback_test_{unique_id}@test.com"
        
        response = requests.post(
            f"{BASE_URL}/api/v1/auth/signup",
            json={
                "email": email,
                "password": "TestPass123!",
                "name": f"Feedback Test {unique_id}",
                "company": "Test Corp"
            }
        )
        
        if response.status_code == 201:
            data = response.json()
            return {
                "token": data.get("token"),
                "org_id": data.get("organization", {}).get("id"),
                "email": email
            }
        return None


@pytest.fixture(scope="module")
def test_user():
    """Create a test user for the module"""
    user = TestSetup.create_test_user()
    assert user is not None, "Failed to create test user"
    assert user["token"] is not None, "No token returned"
    return user


@pytest.fixture(scope="module")
def auth_headers(test_user):
    """Return auth headers for user requests"""
    return {"Authorization": f"Bearer {test_user['token']}"}


@pytest.fixture(scope="module")
def admin_headers():
    """Return admin headers"""
    return {"X-Admin-Api-Key": ADMIN_API_KEY}


# ==================== PUBLIC FEEDBACK ENDPOINTS ====================

class TestInlineFeedback:
    """Tests for POST /api/v1/feedback - Submit inline feedback"""
    
    def test_submit_inline_reaction(self, auth_headers):
        """T1.1: Submit inline_reaction feedback"""
        response = requests.post(
            f"{BASE_URL}/api/v1/feedback",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "type": "inline_reaction",
                "sentiment": "good",
                "page": "/dashboard"
            }
        )
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain feedback id"
        assert data["id"].startswith("fb_"), f"ID should start with fb_, got {data['id']}"
        assert "message" in data, "Response should contain message"
        print(f"✓ T1.1: Inline reaction submitted: {data['id']}")
    
    def test_submit_inline_reaction_with_note(self, auth_headers):
        """T1.2: Submit inline_reaction with note"""
        response = requests.post(
            f"{BASE_URL}/api/v1/feedback",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "type": "inline_reaction",
                "sentiment": "great",
                "note": "This page is very helpful!",
                "page": "/escrows"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        print(f"✓ T1.2: Inline reaction with note submitted: {data['id']}")
    
    def test_submit_milestone_feedback(self, auth_headers):
        """T1.3: Submit milestone_feedback"""
        response = requests.post(
            f"{BASE_URL}/api/v1/feedback",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "type": "milestone_feedback",
                "sentiment": "great",
                "milestone": "first_escrow_created",
                "note": "Setup was easy!"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        print(f"✓ T1.3: Milestone feedback submitted: {data['id']}")
    
    def test_submit_error_clarity_feedback(self, auth_headers):
        """T1.4: Submit error_clarity feedback"""
        response = requests.post(
            f"{BASE_URL}/api/v1/feedback",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "type": "error_clarity",
                "sentiment": "negative",
                "note": "Error message was confusing",
                "endpoint": "/api/v1/spend",
                "error_code": "INSUFFICIENT_BALANCE"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        print(f"✓ T1.4: Error clarity feedback submitted: {data['id']}")
    
    def test_submit_doc_feedback(self, auth_headers):
        """T1.5: Submit doc_feedback"""
        response = requests.post(
            f"{BASE_URL}/api/v1/feedback",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "type": "doc_feedback",
                "sentiment": "good",
                "page": "/docs/api-reference"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        print(f"✓ T1.5: Doc feedback submitted: {data['id']}")
    
    def test_submit_pulse_check(self, auth_headers):
        """T1.6: Submit pulse_check with NPS score"""
        response = requests.post(
            f"{BASE_URL}/api/v1/feedback",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "type": "pulse_check",
                "nps_score": 9,
                "note": "Great product!",
                "use_cases": ["agent_spending", "team_budgets"]
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        print(f"✓ T1.6: Pulse check submitted: {data['id']}")
    
    def test_invalid_feedback_type(self, auth_headers):
        """T1.7: Invalid feedback type returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/v1/feedback",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "type": "invalid_type",
                "sentiment": "good"
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ T1.7: Invalid feedback type rejected")
    
    def test_feedback_requires_auth(self):
        """T1.8: Feedback requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/v1/feedback",
            headers={"Content-Type": "application/json"},
            json={
                "type": "inline_reaction",
                "sentiment": "good"
            }
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ T1.8: Unauthenticated feedback rejected")


class TestFeedbackTracking:
    """Tests for GET /api/v1/feedback/tracking and POST /api/v1/feedback/tracking/pulse-shown"""
    
    def test_get_tracking_info(self, auth_headers):
        """T2.1: Get user's feedback tracking info"""
        response = requests.get(
            f"{BASE_URL}/api/v1/feedback/tracking",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "milestones_shown" in data
        assert "should_show_pulse" in data
        print(f"✓ T2.1: Tracking info retrieved: should_show_pulse={data['should_show_pulse']}")
    
    def test_mark_pulse_shown(self, auth_headers):
        """T2.2: Mark pulse as shown"""
        response = requests.post(
            f"{BASE_URL}/api/v1/feedback/tracking/pulse-shown",
            headers={**auth_headers, "Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print("✓ T2.2: Pulse marked as shown")
    
    def test_tracking_after_pulse_shown(self, auth_headers):
        """T2.3: Verify tracking updates after pulse shown"""
        response = requests.get(
            f"{BASE_URL}/api/v1/feedback/tracking",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        # After marking pulse shown, should_show_pulse should be false (within 14 days)
        assert data.get("last_pulse_shown_at") is not None or data.get("should_show_pulse") == False
        print("✓ T2.3: Tracking updated after pulse shown")


# ==================== FEATURE REQUESTS ====================

class TestFeatureRequests:
    """Tests for feature request board endpoints"""
    
    @pytest.fixture(scope="class")
    def created_request_id(self, auth_headers):
        """Create a feature request for testing"""
        # First, we need an account that's at least 24 hours old
        # For testing, we'll try to create and handle the 403 gracefully
        response = requests.post(
            f"{BASE_URL}/api/v1/feedback/requests",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "title": "TEST_Add Slack Integration",
                "description": "Would love to get notifications in Slack when approvals are needed",
                "category": "integrations",
                "is_anonymous": False
            }
        )
        
        if response.status_code == 403:
            # New account restriction - skip tests that need created request
            pytest.skip("New accounts must wait 24 hours to submit feature requests")
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        return data.get("id")
    
    def test_list_feature_requests(self, auth_headers):
        """T3.1: List feature requests"""
        response = requests.get(
            f"{BASE_URL}/api/v1/feedback/requests",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "requests" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        print(f"✓ T3.1: Listed {len(data['requests'])} feature requests (total: {data['total']})")
    
    def test_list_requests_with_sort(self, auth_headers):
        """T3.2: List requests with sort parameter"""
        for sort in ["top", "new"]:
            response = requests.get(
                f"{BASE_URL}/api/v1/feedback/requests?sort={sort}",
                headers=auth_headers
            )
            assert response.status_code == 200
        print("✓ T3.2: Sort parameters work correctly")
    
    def test_list_requests_with_search(self, auth_headers):
        """T3.3: List requests with search"""
        response = requests.get(
            f"{BASE_URL}/api/v1/feedback/requests?search=integration",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        print("✓ T3.3: Search parameter works")
    
    def test_submit_feature_request_validation(self, auth_headers):
        """T3.4: Feature request validation"""
        # Missing title
        response = requests.post(
            f"{BASE_URL}/api/v1/feedback/requests",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "description": "Test description",
                "category": "api"
            }
        )
        assert response.status_code == 400, "Should reject missing title"
        
        # Invalid category
        response = requests.post(
            f"{BASE_URL}/api/v1/feedback/requests",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "title": "Test",
                "description": "Test description",
                "category": "invalid_category"
            }
        )
        assert response.status_code == 400, "Should reject invalid category"
        print("✓ T3.4: Feature request validation works")
    
    def test_get_categories(self, auth_headers):
        """T3.5: Get category list with counts"""
        response = requests.get(
            f"{BASE_URL}/api/v1/feedback/categories",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # Should have standard categories
        categories = [c["category"] for c in data]
        assert "api" in categories
        assert "dashboard" in categories
        print(f"✓ T3.5: Got {len(data)} categories")


class TestFeatureRequestInteractions:
    """Tests for voting and commenting on feature requests"""
    
    def test_vote_on_request(self, auth_headers, admin_headers):
        """T4.1: Vote on a feature request"""
        # First get a request to vote on
        list_response = requests.get(
            f"{BASE_URL}/api/admin/feedback/requests",
            headers=admin_headers
        )
        
        if list_response.status_code != 200 or not list_response.json().get("requests"):
            pytest.skip("No feature requests available to vote on")
        
        request_id = list_response.json()["requests"][0]["id"]
        
        # Vote
        response = requests.post(
            f"{BASE_URL}/api/v1/feedback/requests/{request_id}/vote",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "vote_count" in data
        assert "has_voted" in data
        print(f"✓ T4.1: Voted on request {request_id}, vote_count={data['vote_count']}")
    
    def test_toggle_vote(self, auth_headers, admin_headers):
        """T4.2: Toggle vote (vote then unvote)"""
        # Get a request
        list_response = requests.get(
            f"{BASE_URL}/api/admin/feedback/requests",
            headers=admin_headers
        )
        
        if list_response.status_code != 200 or not list_response.json().get("requests"):
            pytest.skip("No feature requests available")
        
        request_id = list_response.json()["requests"][0]["id"]
        
        # First vote
        response1 = requests.post(
            f"{BASE_URL}/api/v1/feedback/requests/{request_id}/vote",
            headers=auth_headers
        )
        assert response1.status_code == 200
        first_state = response1.json()["has_voted"]
        
        # Toggle vote
        response2 = requests.post(
            f"{BASE_URL}/api/v1/feedback/requests/{request_id}/vote",
            headers=auth_headers
        )
        assert response2.status_code == 200
        second_state = response2.json()["has_voted"]
        
        assert first_state != second_state, "Vote should toggle"
        print("✓ T4.2: Vote toggle works correctly")
    
    def test_comment_on_request(self, auth_headers, admin_headers):
        """T4.3: Add comment to feature request"""
        # Get a request
        list_response = requests.get(
            f"{BASE_URL}/api/admin/feedback/requests",
            headers=admin_headers
        )
        
        if list_response.status_code != 200 or not list_response.json().get("requests"):
            pytest.skip("No feature requests available")
        
        request_id = list_response.json()["requests"][0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/v1/feedback/requests/{request_id}/comment",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"body": "This would be really useful for our team!"}
        )
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["id"].startswith("cmt_")
        assert data.get("is_team") == False
        print(f"✓ T4.3: Comment added: {data['id']}")
    
    def test_comment_validation(self, auth_headers, admin_headers):
        """T4.4: Comment validation"""
        list_response = requests.get(
            f"{BASE_URL}/api/admin/feedback/requests",
            headers=admin_headers
        )
        
        if list_response.status_code != 200 or not list_response.json().get("requests"):
            pytest.skip("No feature requests available")
        
        request_id = list_response.json()["requests"][0]["id"]
        
        # Empty comment
        response = requests.post(
            f"{BASE_URL}/api/v1/feedback/requests/{request_id}/comment",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"body": ""}
        )
        assert response.status_code == 400
        print("✓ T4.4: Empty comment rejected")
    
    def test_get_request_detail(self, auth_headers, admin_headers):
        """T4.5: Get feature request detail"""
        list_response = requests.get(
            f"{BASE_URL}/api/admin/feedback/requests",
            headers=admin_headers
        )
        
        if list_response.status_code != 200 or not list_response.json().get("requests"):
            pytest.skip("No feature requests available")
        
        request_id = list_response.json()["requests"][0]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/v1/feedback/requests/{request_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["id"] == request_id
        assert "title" in data
        assert "description" in data
        assert "status" in data
        assert "vote_count" in data
        assert "comments" in data
        assert "status_history" in data
        print(f"✓ T4.5: Got request detail: {data['title']}")


# ==================== ADMIN FEEDBACK ENDPOINTS ====================

class TestAdminFeedback:
    """Tests for admin feedback dashboard endpoints"""
    
    def test_admin_list_feedback(self, admin_headers):
        """T5.1: Admin list all feedback items"""
        response = requests.get(
            f"{BASE_URL}/api/admin/feedback",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        print(f"✓ T5.1: Admin listed {len(data['items'])} feedback items (total: {data['total']})")
    
    def test_admin_list_feedback_with_filters(self, admin_headers):
        """T5.2: Admin list feedback with type filter"""
        for feedback_type in ["inline_reaction", "pulse_check", "error_clarity"]:
            response = requests.get(
                f"{BASE_URL}/api/admin/feedback?type={feedback_type}",
                headers=admin_headers
            )
            assert response.status_code == 200
        print("✓ T5.2: Admin feedback type filters work")
    
    def test_admin_get_stats(self, admin_headers):
        """T5.3: Admin get feedback statistics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/feedback/stats?days=30",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "period_days" in data
        assert "nps" in data
        assert "feature_requests" in data
        assert "inline_reactions" in data
        assert "top_requests" in data
        assert "pain_points" in data
        print(f"✓ T5.3: Admin stats retrieved - NPS: {data['nps']['current']}, Reactions: {data['inline_reactions']['total']}")
    
    def test_admin_get_digest(self, admin_headers):
        """T5.4: Admin get daily digest"""
        response = requests.get(
            f"{BASE_URL}/api/admin/feedback/digest?hours=24",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "period" in data
        assert "summary" in data
        print(f"✓ T5.4: Admin digest retrieved - total items: {data['summary']['total_items']}")
    
    def test_admin_acknowledge_feedback(self, admin_headers, auth_headers):
        """T5.5: Admin acknowledge feedback item"""
        # First create a feedback item
        create_response = requests.post(
            f"{BASE_URL}/api/v1/feedback",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "type": "inline_reaction",
                "sentiment": "neutral",
                "note": "Test feedback for acknowledgment",
                "page": "/test"
            }
        )
        
        if create_response.status_code != 201:
            pytest.skip("Could not create feedback item")
        
        feedback_id = create_response.json()["id"]
        
        # Acknowledge it
        response = requests.patch(
            f"{BASE_URL}/api/admin/feedback/{feedback_id}",
            headers={**admin_headers, "Content-Type": "application/json"},
            json={"is_acknowledged": True}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("is_acknowledged") == True
        print(f"✓ T5.5: Feedback {feedback_id} acknowledged")
    
    def test_admin_add_notes(self, admin_headers, auth_headers):
        """T5.6: Admin add notes to feedback"""
        # Create feedback
        create_response = requests.post(
            f"{BASE_URL}/api/v1/feedback",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "type": "inline_reaction",
                "sentiment": "negative",
                "note": "Something is broken",
                "page": "/test"
            }
        )
        
        if create_response.status_code != 201:
            pytest.skip("Could not create feedback item")
        
        feedback_id = create_response.json()["id"]
        
        # Add admin notes
        response = requests.patch(
            f"{BASE_URL}/api/admin/feedback/{feedback_id}",
            headers={**admin_headers, "Content-Type": "application/json"},
            json={"admin_notes": "Investigating this issue"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("admin_notes") == "Investigating this issue"
        print(f"✓ T5.6: Admin notes added to {feedback_id}")
    
    def test_admin_requires_auth(self):
        """T5.7: Admin endpoints require admin key"""
        response = requests.get(f"{BASE_URL}/api/admin/feedback")
        assert response.status_code == 401
        
        response = requests.get(
            f"{BASE_URL}/api/admin/feedback",
            headers={"X-Admin-Api-Key": "invalid_key"}
        )
        assert response.status_code == 401
        print("✓ T5.7: Admin endpoints require valid admin key")


class TestAdminFeatureRequests:
    """Tests for admin feature request management"""
    
    def test_admin_list_requests(self, admin_headers):
        """T6.1: Admin list all feature requests"""
        response = requests.get(
            f"{BASE_URL}/api/admin/feedback/requests",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "requests" in data
        assert "total" in data
        print(f"✓ T6.1: Admin listed {len(data['requests'])} feature requests")
    
    def test_admin_update_request_status(self, admin_headers):
        """T6.2: Admin update feature request status"""
        # Get a request
        list_response = requests.get(
            f"{BASE_URL}/api/admin/feedback/requests",
            headers=admin_headers
        )
        
        if list_response.status_code != 200 or not list_response.json().get("requests"):
            pytest.skip("No feature requests available")
        
        request_id = list_response.json()["requests"][0]["id"]
        
        # Update status
        response = requests.patch(
            f"{BASE_URL}/api/admin/feedback/requests/{request_id}",
            headers={**admin_headers, "Content-Type": "application/json"},
            json={
                "status": "under_review",
                "status_note": "Looking into this"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("status") == "under_review"
        print(f"✓ T6.2: Request {request_id} status updated to under_review")
    
    def test_admin_pin_request(self, admin_headers):
        """T6.3: Admin pin feature request"""
        list_response = requests.get(
            f"{BASE_URL}/api/admin/feedback/requests",
            headers=admin_headers
        )
        
        if list_response.status_code != 200 or not list_response.json().get("requests"):
            pytest.skip("No feature requests available")
        
        request_id = list_response.json()["requests"][0]["id"]
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/feedback/requests/{request_id}",
            headers={**admin_headers, "Content-Type": "application/json"},
            json={"is_pinned": True}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("is_pinned") == True
        print(f"✓ T6.3: Request {request_id} pinned")
    
    def test_admin_comment_as_team(self, admin_headers):
        """T6.4: Admin comment as team"""
        list_response = requests.get(
            f"{BASE_URL}/api/admin/feedback/requests",
            headers=admin_headers
        )
        
        if list_response.status_code != 200 or not list_response.json().get("requests"):
            pytest.skip("No feature requests available")
        
        request_id = list_response.json()["requests"][0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/admin/feedback/requests/{request_id}/comment",
            headers={**admin_headers, "Content-Type": "application/json"},
            json={"body": "Thanks for the suggestion! We're looking into this."}
        )
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("is_team") == True
        assert data.get("org_name") == "Safe-Spend Team"
        print(f"✓ T6.4: Team comment added: {data['id']}")
    
    def test_admin_invalid_status(self, admin_headers):
        """T6.5: Admin invalid status rejected"""
        list_response = requests.get(
            f"{BASE_URL}/api/admin/feedback/requests",
            headers=admin_headers
        )
        
        if list_response.status_code != 200 or not list_response.json().get("requests"):
            pytest.skip("No feature requests available")
        
        request_id = list_response.json()["requests"][0]["id"]
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/feedback/requests/{request_id}",
            headers={**admin_headers, "Content-Type": "application/json"},
            json={"status": "invalid_status"}
        )
        
        assert response.status_code == 400
        print("✓ T6.5: Invalid status rejected")
    
    def test_admin_export_csv(self, admin_headers):
        """T6.6: Admin export feedback as CSV"""
        response = requests.get(
            f"{BASE_URL}/api/admin/feedback/export",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert "text/csv" in response.headers.get("Content-Type", "")
        assert "attachment" in response.headers.get("Content-Disposition", "")
        print("✓ T6.6: CSV export works")


class TestEdgeCases:
    """Edge case and error handling tests"""
    
    def test_nonexistent_feedback_item(self, admin_headers):
        """T7.1: 404 for nonexistent feedback item"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/feedback/fb_nonexistent123",
            headers={**admin_headers, "Content-Type": "application/json"},
            json={"is_acknowledged": True}
        )
        
        assert response.status_code == 404
        print("✓ T7.1: 404 for nonexistent feedback item")
    
    def test_nonexistent_feature_request(self, auth_headers):
        """T7.2: 404 for nonexistent feature request"""
        response = requests.get(
            f"{BASE_URL}/api/v1/feedback/requests/req_nonexistent123",
            headers=auth_headers
        )
        
        assert response.status_code == 404
        print("✓ T7.2: 404 for nonexistent feature request")
    
    def test_vote_nonexistent_request(self, auth_headers):
        """T7.3: 404 when voting on nonexistent request"""
        response = requests.post(
            f"{BASE_URL}/api/v1/feedback/requests/req_nonexistent123/vote",
            headers=auth_headers
        )
        
        assert response.status_code == 404
        print("✓ T7.3: 404 when voting on nonexistent request")
    
    def test_comment_nonexistent_request(self, auth_headers):
        """T7.4: 404 when commenting on nonexistent request"""
        response = requests.post(
            f"{BASE_URL}/api/v1/feedback/requests/req_nonexistent123/comment",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"body": "Test comment"}
        )
        
        assert response.status_code == 404
        print("✓ T7.4: 404 when commenting on nonexistent request")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
