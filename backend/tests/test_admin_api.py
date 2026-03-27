"""
Admin API Tests
Tests all admin endpoints with scope-based access control

Scopes:
- health: System health and status
- blog: Blog CRUD
- metrics: Platform metrics
- audit: Cross-org audit access
- keys: Admin key management
- *: All scopes (superadmin)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Superadmin key with all scopes
SUPERADMIN_KEY = "ss_admin_28a03b0eba31cace4c500d477c243cb7edf7a2e680ad4a1fdf540c929a5092df"
ADMIN_SETUP_TOKEN = "safe-spend-setup-token-change-in-production"


class TestAdminHealth:
    """Health endpoint tests (scope: health)"""
    
    def test_health_public_no_auth(self):
        """GET /api/admin/health - Public health check (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/admin/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "status" in data
        assert data["status"] == "ok"
        assert "timestamp" in data
        assert "uptime_seconds" in data
        print(f"✓ Health check passed: status={data['status']}, uptime={data['uptime_seconds']}s")
    
    def test_status_requires_auth(self):
        """GET /api/admin/status - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/admin/status")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        data = response.json()
        assert data["error"]["code"] == "MISSING_AUTH"
        print("✓ Status endpoint correctly requires auth")
    
    def test_status_with_superadmin(self):
        """GET /api/admin/status - Detailed system status with superadmin key"""
        headers = {"Authorization": f"Bearer {SUPERADMIN_KEY}"}
        response = requests.get(f"{BASE_URL}/api/admin/status", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "ok"
        assert "services" in data
        assert "database" in data["services"]
        assert "counts" in data
        assert "memory" in data
        print(f"✓ Status check passed: orgs={data['counts']['organizations']}, escrows={data['counts']['active_escrows']}")
    
    def test_errors_with_superadmin(self):
        """GET /api/admin/errors - Recent error logs"""
        headers = {"Authorization": f"Bearer {SUPERADMIN_KEY}"}
        response = requests.get(f"{BASE_URL}/api/admin/errors", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "errors" in data
        assert "total" in data
        print(f"✓ Errors endpoint passed: {data['total']} errors in period")


class TestAdminMetrics:
    """Metrics endpoint tests (scope: metrics)"""
    
    def test_metrics_overview_requires_auth(self):
        """GET /api/admin/metrics/overview - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/admin/metrics/overview")
        assert response.status_code == 401
        print("✓ Metrics overview correctly requires auth")
    
    def test_metrics_overview_with_superadmin(self):
        """GET /api/admin/metrics/overview - Platform metrics"""
        headers = {"Authorization": f"Bearer {SUPERADMIN_KEY}"}
        response = requests.get(f"{BASE_URL}/api/admin/metrics/overview", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "organizations" in data
        assert "escrow_accounts" in data
        assert "spend_requests" in data
        assert "api_keys" in data
        print(f"✓ Metrics overview passed: {data['organizations']['total']} orgs, {data['escrow_accounts']['total']} escrows")
    
    def test_metrics_activity_with_superadmin(self):
        """GET /api/admin/metrics/activity - Activity feed"""
        headers = {"Authorization": f"Bearer {SUPERADMIN_KEY}"}
        response = requests.get(f"{BASE_URL}/api/admin/metrics/activity", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "events" in data
        print(f"✓ Activity feed passed: {len(data['events'])} events")
    
    def test_metrics_stripe_with_superadmin(self):
        """GET /api/admin/metrics/stripe - Stripe metrics"""
        headers = {"Authorization": f"Bearer {SUPERADMIN_KEY}"}
        response = requests.get(f"{BASE_URL}/api/admin/metrics/stripe", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "status" in data
        assert "fundings_this_month" in data
        print(f"✓ Stripe metrics passed: status={data['status']}")


class TestAdminAudit:
    """Audit endpoint tests (scope: audit)"""
    
    def test_audit_requires_auth(self):
        """GET /api/admin/audit - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/admin/audit")
        assert response.status_code == 401
        print("✓ Audit endpoint correctly requires auth")
    
    def test_audit_with_superadmin(self):
        """GET /api/admin/audit - Cross-org audit query"""
        headers = {"Authorization": f"Bearer {SUPERADMIN_KEY}"}
        response = requests.get(f"{BASE_URL}/api/admin/audit", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "events" in data
        assert "pagination" in data
        print(f"✓ Audit query passed: {data['pagination']['total']} total events")
    
    def test_audit_with_filters(self):
        """GET /api/admin/audit - With query filters"""
        headers = {"Authorization": f"Bearer {SUPERADMIN_KEY}"}
        params = {"limit": 10, "offset": 0}
        response = requests.get(f"{BASE_URL}/api/admin/audit", headers=headers, params=params)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["events"]) <= 10
        print(f"✓ Audit with filters passed: {len(data['events'])} events returned")


class TestAdminKeys:
    """Admin key management tests (scope: keys)"""
    
    created_key_id = None
    created_key_token = None
    
    def test_keys_list_requires_auth(self):
        """GET /api/admin/keys - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/admin/keys")
        assert response.status_code == 401
        print("✓ Keys list correctly requires auth")
    
    def test_keys_list_with_superadmin(self):
        """GET /api/admin/keys - List admin keys"""
        headers = {"Authorization": f"Bearer {SUPERADMIN_KEY}"}
        response = requests.get(f"{BASE_URL}/api/admin/keys", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "keys" in data
        print(f"✓ Keys list passed: {len(data['keys'])} keys found")
    
    def test_create_key_with_superadmin(self):
        """POST /api/admin/keys - Create admin key with scopes"""
        headers = {"Authorization": f"Bearer {SUPERADMIN_KEY}", "Content-Type": "application/json"}
        unique_label = f"Test Key {uuid.uuid4().hex[:8]}"
        payload = {
            "label": unique_label,
            "description": "Test key for automated testing",
            "scopes": ["health", "metrics"]
        }
        response = requests.post(f"{BASE_URL}/api/admin/keys", headers=headers, json=payload)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "key" in data  # Full key only returned at creation
        assert data["label"] == unique_label
        assert data["scopes"] == ["health", "metrics"]
        
        # Store for later tests
        TestAdminKeys.created_key_id = data["id"]
        TestAdminKeys.created_key_token = data["key"]
        print(f"✓ Key created: id={data['id']}, scopes={data['scopes']}")
    
    def test_create_key_missing_label(self):
        """POST /api/admin/keys - Should fail without label"""
        headers = {"Authorization": f"Bearer {SUPERADMIN_KEY}", "Content-Type": "application/json"}
        payload = {"description": "No label"}
        response = requests.post(f"{BASE_URL}/api/admin/keys", headers=headers, json=payload)
        assert response.status_code == 400
        
        data = response.json()
        assert data["error"]["code"] == "MISSING_LABEL"
        print("✓ Create key correctly requires label")
    
    def test_scoped_key_can_access_allowed_scope(self):
        """Scoped key should access endpoints within its scope"""
        if not TestAdminKeys.created_key_token:
            pytest.skip("No scoped key created")
        
        headers = {"Authorization": f"Bearer {TestAdminKeys.created_key_token}"}
        
        # Should work - health scope
        response = requests.get(f"{BASE_URL}/api/admin/status", headers=headers)
        assert response.status_code == 200, f"Expected 200 for health scope, got {response.status_code}"
        print("✓ Scoped key can access health endpoint")
        
        # Should work - metrics scope
        response = requests.get(f"{BASE_URL}/api/admin/metrics/overview", headers=headers)
        assert response.status_code == 200, f"Expected 200 for metrics scope, got {response.status_code}"
        print("✓ Scoped key can access metrics endpoint")
    
    def test_scoped_key_denied_for_other_scope(self):
        """Scoped key should be denied for endpoints outside its scope"""
        if not TestAdminKeys.created_key_token:
            pytest.skip("No scoped key created")
        
        headers = {"Authorization": f"Bearer {TestAdminKeys.created_key_token}"}
        
        # Should fail - audit scope not in key
        response = requests.get(f"{BASE_URL}/api/admin/audit", headers=headers)
        assert response.status_code == 403, f"Expected 403 for audit scope, got {response.status_code}"
        
        data = response.json()
        assert data["error"]["code"] == "INSUFFICIENT_SCOPE"
        print("✓ Scoped key correctly denied for audit endpoint")
        
        # Should fail - blog scope not in key
        response = requests.get(f"{BASE_URL}/api/admin/blog/posts", headers=headers)
        assert response.status_code == 403, f"Expected 403 for blog scope, got {response.status_code}"
        print("✓ Scoped key correctly denied for blog endpoint")
        
        # Should fail - keys scope not in key
        response = requests.get(f"{BASE_URL}/api/admin/keys", headers=headers)
        assert response.status_code == 403, f"Expected 403 for keys scope, got {response.status_code}"
        print("✓ Scoped key correctly denied for keys endpoint")
    
    def test_revoke_key(self):
        """DELETE /api/admin/keys/:id - Revoke admin key"""
        if not TestAdminKeys.created_key_id:
            pytest.skip("No key to revoke")
        
        headers = {"Authorization": f"Bearer {SUPERADMIN_KEY}"}
        response = requests.delete(f"{BASE_URL}/api/admin/keys/{TestAdminKeys.created_key_id}", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["is_active"] == False
        print(f"✓ Key revoked: id={data['id']}")
    
    def test_revoked_key_cannot_access(self):
        """Revoked key should not be able to access any endpoint"""
        if not TestAdminKeys.created_key_token:
            pytest.skip("No revoked key to test")
        
        headers = {"Authorization": f"Bearer {TestAdminKeys.created_key_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/status", headers=headers)
        assert response.status_code == 401, f"Expected 401 for revoked key, got {response.status_code}"
        print("✓ Revoked key correctly denied access")


class TestAdminBlog:
    """Blog endpoint tests (scope: blog)"""
    
    created_post_id = None
    
    def test_blog_posts_list_requires_auth(self):
        """GET /api/admin/blog/posts - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/admin/blog/posts")
        assert response.status_code == 401
        print("✓ Blog posts list correctly requires auth")
    
    def test_blog_posts_list_with_superadmin(self):
        """GET /api/admin/blog/posts - List blog posts"""
        headers = {"Authorization": f"Bearer {SUPERADMIN_KEY}"}
        response = requests.get(f"{BASE_URL}/api/admin/blog/posts", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "posts" in data
        assert "pagination" in data
        print(f"✓ Blog posts list passed: {len(data['posts'])} posts")
    
    def test_create_blog_post(self):
        """POST /api/admin/blog/posts - Create blog post"""
        headers = {"Authorization": f"Bearer {SUPERADMIN_KEY}", "Content-Type": "application/json"}
        unique_title = f"Test Post {uuid.uuid4().hex[:8]}"
        payload = {
            "title": unique_title,
            "content": "# Test Content\n\nThis is a test blog post created by automated testing.\n\n## Features\n\n- Feature 1\n- Feature 2\n- Feature 3",
            "tags": ["test", "automation"],
            "category": "Testing",
            "author": {
                "name": "Test Author",
                "bio": "Automated testing system"
            }
        }
        response = requests.post(f"{BASE_URL}/api/admin/blog/posts", headers=headers, json=payload)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "slug" in data
        assert data["status"] == "draft"
        
        TestAdminBlog.created_post_id = data["id"]
        print(f"✓ Blog post created: id={data['id']}, slug={data['slug']}")
    
    def test_get_blog_post_by_id(self):
        """GET /api/admin/blog/posts/:id - Get single post"""
        if not TestAdminBlog.created_post_id:
            pytest.skip("No post created")
        
        headers = {"Authorization": f"Bearer {SUPERADMIN_KEY}"}
        response = requests.get(f"{BASE_URL}/api/admin/blog/posts/{TestAdminBlog.created_post_id}", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == TestAdminBlog.created_post_id
        assert "content" in data
        assert "content_html" in data
        assert "reading_time_minutes" in data
        assert "word_count" in data
        print(f"✓ Get post passed: title={data['title']}, word_count={data['word_count']}")
    
    def test_update_blog_post(self):
        """PATCH /api/admin/blog/posts/:id - Update post"""
        if not TestAdminBlog.created_post_id:
            pytest.skip("No post created")
        
        headers = {"Authorization": f"Bearer {SUPERADMIN_KEY}", "Content-Type": "application/json"}
        payload = {
            "title": "Updated Test Post Title",
            "tags": ["test", "automation", "updated"]
        }
        response = requests.patch(f"{BASE_URL}/api/admin/blog/posts/{TestAdminBlog.created_post_id}", headers=headers, json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["title"] == "Updated Test Post Title"
        assert "updated" in data["tags"]
        print(f"✓ Post updated: title={data['title']}")
    
    def test_publish_blog_post(self):
        """POST /api/admin/blog/posts/:id/publish - Publish post"""
        if not TestAdminBlog.created_post_id:
            pytest.skip("No post created")
        
        headers = {"Authorization": f"Bearer {SUPERADMIN_KEY}"}
        response = requests.post(f"{BASE_URL}/api/admin/blog/posts/{TestAdminBlog.created_post_id}/publish", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "published"
        assert data["published_at"] is not None
        print(f"✓ Post published: published_at={data['published_at']}")
    
    def test_unpublish_blog_post(self):
        """POST /api/admin/blog/posts/:id/unpublish - Unpublish post"""
        if not TestAdminBlog.created_post_id:
            pytest.skip("No post created")
        
        headers = {"Authorization": f"Bearer {SUPERADMIN_KEY}"}
        response = requests.post(f"{BASE_URL}/api/admin/blog/posts/{TestAdminBlog.created_post_id}/unpublish", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "draft"
        assert data["published_at"] is None
        print(f"✓ Post unpublished: status={data['status']}")
    
    def test_delete_blog_post_soft(self):
        """DELETE /api/admin/blog/posts/:id - Soft delete (archive)"""
        if not TestAdminBlog.created_post_id:
            pytest.skip("No post created")
        
        headers = {"Authorization": f"Bearer {SUPERADMIN_KEY}"}
        response = requests.delete(f"{BASE_URL}/api/admin/blog/posts/{TestAdminBlog.created_post_id}", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "archived"
        print(f"✓ Post soft deleted (archived)")
    
    def test_delete_blog_post_hard(self):
        """DELETE /api/admin/blog/posts/:id?hard=true - Hard delete"""
        # Create a new post to hard delete
        headers = {"Authorization": f"Bearer {SUPERADMIN_KEY}", "Content-Type": "application/json"}
        payload = {
            "title": f"Post to Hard Delete {uuid.uuid4().hex[:8]}",
            "content": "This post will be hard deleted."
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/blog/posts", headers=headers, json=payload)
        assert create_response.status_code == 201
        post_id = create_response.json()["id"]
        
        # Hard delete
        response = requests.delete(f"{BASE_URL}/api/admin/blog/posts/{post_id}?hard=true", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["deleted"] == True
        print(f"✓ Post hard deleted")
        
        # Verify it's gone
        get_response = requests.get(f"{BASE_URL}/api/admin/blog/posts/{post_id}", headers=headers)
        assert get_response.status_code == 404
        print(f"✓ Verified post no longer exists")


class TestAdminSetup:
    """Setup endpoint tests"""
    
    def test_setup_fails_when_keys_exist(self):
        """POST /api/admin/setup - Should fail when keys already exist"""
        headers = {"Authorization": f"Bearer {ADMIN_SETUP_TOKEN}", "Content-Type": "application/json"}
        payload = {"label": "New Superadmin"}
        response = requests.post(f"{BASE_URL}/api/admin/setup", headers=headers, json=payload)
        
        # Should fail because keys already exist
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["error"]["code"] == "SETUP_COMPLETE"
        print("✓ Setup correctly fails when keys already exist")
    
    def test_setup_requires_token(self):
        """POST /api/admin/setup - Should require setup token"""
        headers = {"Content-Type": "application/json"}
        payload = {"label": "New Superadmin"}
        response = requests.post(f"{BASE_URL}/api/admin/setup", headers=headers, json=payload)
        assert response.status_code == 401
        print("✓ Setup correctly requires token")
    
    def test_setup_invalid_token(self):
        """POST /api/admin/setup - Should reject invalid token"""
        headers = {"Authorization": "Bearer invalid-token", "Content-Type": "application/json"}
        payload = {"label": "New Superadmin"}
        response = requests.post(f"{BASE_URL}/api/admin/setup", headers=headers, json=payload)
        assert response.status_code == 401
        
        data = response.json()
        assert data["error"]["code"] == "INVALID_SETUP_TOKEN"
        print("✓ Setup correctly rejects invalid token")


class TestAdminAuthErrors:
    """Authentication error tests"""
    
    def test_invalid_key_format(self):
        """Invalid key format should return 401"""
        headers = {"Authorization": "Bearer invalid-key-format"}
        response = requests.get(f"{BASE_URL}/api/admin/status", headers=headers)
        assert response.status_code == 401
        
        data = response.json()
        assert data["error"]["code"] == "INVALID_KEY"
        print("✓ Invalid key format correctly rejected")
    
    def test_missing_bearer_prefix(self):
        """Missing Bearer prefix should return 401"""
        headers = {"Authorization": SUPERADMIN_KEY}
        response = requests.get(f"{BASE_URL}/api/admin/status", headers=headers)
        assert response.status_code == 401
        
        data = response.json()
        assert data["error"]["code"] == "MISSING_AUTH"
        print("✓ Missing Bearer prefix correctly rejected")
    
    def test_nonexistent_key(self):
        """Non-existent key should return 401"""
        headers = {"Authorization": "Bearer ss_admin_0000000000000000000000000000000000000000000000000000000000000000"}
        response = requests.get(f"{BASE_URL}/api/admin/status", headers=headers)
        assert response.status_code == 401
        print("✓ Non-existent key correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
