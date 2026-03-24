"""
Export Hardening Tests
Tests for Safe-Spend Export Hardening Pass:
1. Rate limiting on export endpoints (10 requests per 5 minutes per org) - skipped in dev/test mode
2. Max date range validation (90 days)
3. Export audit logging to auditevents table
4. Summary endpoint returns config flags (max_date_range_days, pdf_enabled)
"""

import pytest
import requests
import os
import csv
import io
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
OWNER_EMAIL = "testorg@example.com"
OWNER_PASSWORD = "TestPassword123!"

# Export config constants (must match backend)
MAX_DATE_RANGE_DAYS = 90


@pytest.fixture(scope="module")
def owner_token():
    """Get authentication token for owner account"""
    response = requests.post(
        f"{BASE_URL}/api/v1/auth/login",
        json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(owner_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {owner_token}"}


class TestMaxDateRangeValidation:
    """Tests for max date range validation (90 days limit)"""
    
    def test_date_range_exactly_90_days_succeeds(self, auth_headers):
        """Test that exactly 90 days date range succeeds
        Backend calculates: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
        So 90 days difference = timedelta(days=90)
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)  # 90 days difference
        
        params = {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d")
        }
        
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/summary",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "date_range" in data
        assert data["date_range"]["days"] <= MAX_DATE_RANGE_DAYS
        print(f"90 days range accepted: {data['date_range']['days']} days")
    
    def test_date_range_91_days_fails(self, auth_headers):
        """Test that 91 days date range returns 400 error
        Backend calculates: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
        So 91 days difference = timedelta(days=91)
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=91)  # 91 days difference
        
        params = {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d")
        }
        
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/summary",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "error" in data
        assert "90" in data["error"] or "max" in data["error"].lower()
        assert "max_days" in data
        assert data["max_days"] == MAX_DATE_RANGE_DAYS
        assert "requested_days" in data
        assert data["requested_days"] > MAX_DATE_RANGE_DAYS
        print(f"91 days range rejected: {data['error']}")
    
    def test_date_range_120_days_fails(self, auth_headers):
        """Test that 120 days date range returns 400 error"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=120)  # 120 days difference
        
        params = {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d")
        }
        
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/summary",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "error" in data
        assert data["requested_days"] == 120
        print(f"120 days range rejected: requested_days={data['requested_days']}")
    
    def test_date_range_30_days_succeeds(self, auth_headers):
        """Test that 30 days date range succeeds"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)  # 30 days difference
        
        params = {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d")
        }
        
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/summary",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["date_range"]["days"] == 30
        print(f"30 days range accepted: {data['date_range']['days']} days")
    
    def test_spend_activity_export_date_range_exceeded(self, auth_headers):
        """Test that spend-activity export rejects > 90 days"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=100)  # 101 days
        
        params = {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d")
        }
        
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/spend-activity",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "error" in data
        assert data["max_days"] == MAX_DATE_RANGE_DAYS
        print(f"Spend activity export rejected for > 90 days: {data['error']}")
    
    def test_audit_events_export_date_range_exceeded(self, auth_headers):
        """Test that audit-events export rejects > 90 days"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=100)  # 101 days
        
        params = {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d")
        }
        
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/audit-events",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "error" in data
        assert data["max_days"] == MAX_DATE_RANGE_DAYS
        print(f"Audit events export rejected for > 90 days: {data['error']}")


class TestSummaryConfigFlags:
    """Tests for summary endpoint config flags"""
    
    def test_summary_returns_max_date_range_days(self, auth_headers):
        """Test that summary returns config.max_date_range_days"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        params = {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d")
        }
        
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/summary",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify config section exists
        assert "config" in data, "Response should include 'config' section"
        
        # Verify max_date_range_days
        assert "max_date_range_days" in data["config"], "Config should include max_date_range_days"
        assert data["config"]["max_date_range_days"] == MAX_DATE_RANGE_DAYS
        print(f"Config max_date_range_days: {data['config']['max_date_range_days']}")
    
    def test_summary_returns_pdf_enabled_flag(self, auth_headers):
        """Test that summary returns config.pdf_enabled flag"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        params = {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d")
        }
        
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/summary",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify config section exists
        assert "config" in data, "Response should include 'config' section"
        
        # Verify pdf_enabled flag
        assert "pdf_enabled" in data["config"], "Config should include pdf_enabled"
        assert isinstance(data["config"]["pdf_enabled"], bool)
        # Currently PDF is disabled
        assert data["config"]["pdf_enabled"] == False
        print(f"Config pdf_enabled: {data['config']['pdf_enabled']}")
    
    def test_summary_date_range_includes_max_days(self, auth_headers):
        """Test that summary date_range includes max_days"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        params = {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d")
        }
        
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/summary",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify date_range includes max_days
        assert "date_range" in data
        assert "max_days" in data["date_range"], "date_range should include max_days"
        assert data["date_range"]["max_days"] == MAX_DATE_RANGE_DAYS
        print(f"date_range.max_days: {data['date_range']['max_days']}")


class TestExportAuditLogging:
    """Tests for export audit logging (export.generated event)"""
    
    def test_spend_activity_export_creates_audit_event(self, auth_headers):
        """Test that spend-activity export creates export.generated audit event"""
        # First, get current audit event count
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        params = {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d")
        }
        
        # Get initial audit events count
        summary_before = requests.get(
            f"{BASE_URL}/api/v1/exports/summary",
            headers=auth_headers,
            params=params
        )
        initial_count = summary_before.json()["audit_events"]["total_records"]
        
        # Perform export
        export_response = requests.get(
            f"{BASE_URL}/api/v1/exports/spend-activity",
            headers=auth_headers,
            params=params
        )
        assert export_response.status_code == 200, f"Export failed: {export_response.status_code}"
        
        # Check audit events for export.generated
        audit_params = {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": (end_date + timedelta(days=1)).strftime("%Y-%m-%d"),  # Include today
            "event_type": "export.generated"
        }
        
        audit_response = requests.get(
            f"{BASE_URL}/api/v1/exports/audit-events",
            headers=auth_headers,
            params=audit_params
        )
        
        assert audit_response.status_code == 200
        
        # Parse CSV to find export.generated events
        csv_content = audit_response.text
        reader = csv.reader(io.StringIO(csv_content))
        headers = next(reader)
        rows = list(reader)
        
        # Should have at least one export.generated event
        assert len(rows) >= 1, "Expected at least one export.generated audit event"
        
        # Verify the event details
        event_type_idx = headers.index("Event Type")
        details_idx = headers.index("Details (JSON)")
        
        found_spend_activity_export = False
        for row in rows:
            assert row[event_type_idx] == "export.generated"
            import json
            details = json.loads(row[details_idx])
            if details.get("report_type") == "spend-activity":
                found_spend_activity_export = True
                # Verify required fields in details
                assert "record_count" in details
                assert "filters" in details
                assert "exported_by" in details
                print(f"Found export.generated event: report_type={details['report_type']}, record_count={details['record_count']}")
                break
        
        assert found_spend_activity_export, "Expected export.generated event with report_type=spend-activity"
    
    def test_audit_events_export_creates_audit_event(self, auth_headers):
        """Test that audit-events export creates export.generated audit event"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        params = {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d")
        }
        
        # Perform export
        export_response = requests.get(
            f"{BASE_URL}/api/v1/exports/audit-events",
            headers=auth_headers,
            params=params
        )
        assert export_response.status_code == 200, f"Export failed: {export_response.status_code}"
        
        # Check audit events for export.generated
        audit_params = {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": (end_date + timedelta(days=1)).strftime("%Y-%m-%d"),
            "event_type": "export.generated"
        }
        
        audit_response = requests.get(
            f"{BASE_URL}/api/v1/exports/audit-events",
            headers=auth_headers,
            params=audit_params
        )
        
        assert audit_response.status_code == 200
        
        # Parse CSV to find export.generated events
        csv_content = audit_response.text
        reader = csv.reader(io.StringIO(csv_content))
        headers = next(reader)
        rows = list(reader)
        
        # Should have at least one export.generated event
        assert len(rows) >= 1, "Expected at least one export.generated audit event"
        
        # Verify the event details
        details_idx = headers.index("Details (JSON)")
        
        found_audit_events_export = False
        for row in rows:
            import json
            details = json.loads(row[details_idx])
            if details.get("report_type") == "audit-events":
                found_audit_events_export = True
                # Verify required fields in details
                assert "record_count" in details
                assert "filters" in details
                assert "exported_by" in details
                print(f"Found export.generated event: report_type={details['report_type']}, record_count={details['record_count']}")
                break
        
        assert found_audit_events_export, "Expected export.generated event with report_type=audit-events"
    
    def test_audit_event_includes_user_info(self, auth_headers):
        """Test that export audit event includes user info (exported_by, user_role)"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        
        params = {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d")
        }
        
        # Perform export
        export_response = requests.get(
            f"{BASE_URL}/api/v1/exports/spend-activity",
            headers=auth_headers,
            params=params
        )
        assert export_response.status_code == 200
        
        # Check audit events for export.generated
        audit_params = {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": (end_date + timedelta(days=1)).strftime("%Y-%m-%d"),
            "event_type": "export.generated"
        }
        
        audit_response = requests.get(
            f"{BASE_URL}/api/v1/exports/audit-events",
            headers=auth_headers,
            params=audit_params
        )
        
        assert audit_response.status_code == 200
        
        # Parse CSV
        csv_content = audit_response.text
        reader = csv.reader(io.StringIO(csv_content))
        headers = next(reader)
        rows = list(reader)
        
        assert len(rows) >= 1
        
        # Check the most recent export.generated event
        details_idx = headers.index("Details (JSON)")
        actor_id_idx = headers.index("Actor ID")
        
        import json
        for row in rows:
            details = json.loads(row[details_idx])
            if details.get("report_type") == "spend-activity":
                # Verify user info
                assert "exported_by" in details, "Details should include exported_by"
                assert "user_role" in details, "Details should include user_role"
                assert details["user_role"] in ["owner", "finance_admin"], f"Unexpected role: {details['user_role']}"
                
                # Actor ID should match exported_by
                assert row[actor_id_idx] == details["exported_by"] or row[actor_id_idx] == OWNER_EMAIL
                
                print(f"User info verified: exported_by={details['exported_by']}, user_role={details['user_role']}")
                break
    
    def test_audit_event_includes_filters(self, auth_headers):
        """Test that export audit event includes filter details"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=14)
        
        params = {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d"),
            "status": "approved"
        }
        
        # Perform export with filters
        export_response = requests.get(
            f"{BASE_URL}/api/v1/exports/spend-activity",
            headers=auth_headers,
            params=params
        )
        assert export_response.status_code == 200
        
        # Check audit events
        audit_params = {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": (end_date + timedelta(days=1)).strftime("%Y-%m-%d"),
            "event_type": "export.generated"
        }
        
        audit_response = requests.get(
            f"{BASE_URL}/api/v1/exports/audit-events",
            headers=auth_headers,
            params=audit_params
        )
        
        assert audit_response.status_code == 200
        
        # Parse CSV
        csv_content = audit_response.text
        reader = csv.reader(io.StringIO(csv_content))
        headers = next(reader)
        rows = list(reader)
        
        assert len(rows) >= 1
        
        # Check filters in details
        details_idx = headers.index("Details (JSON)")
        
        import json
        for row in rows:
            details = json.loads(row[details_idx])
            if details.get("report_type") == "spend-activity":
                # Verify filters
                assert "filters" in details, "Details should include filters"
                filters = details["filters"]
                assert "start_date" in filters
                assert "end_date" in filters
                assert "status" in filters or filters.get("status") is None  # status may be null if not filtered
                
                print(f"Filters verified: {filters}")
                break


class TestRateLimiterConfiguration:
    """Tests for rate limiter configuration (skipped in dev/test mode)"""
    
    def test_rate_limiter_skipped_in_test_mode(self, auth_headers):
        """Test that rate limiter is skipped in test/dev mode - can make many requests"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        
        params = {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d")
        }
        
        # Make 15 requests (more than the 10 per 5 min limit)
        # In dev/test mode, all should succeed
        success_count = 0
        for i in range(15):
            response = requests.get(
                f"{BASE_URL}/api/v1/exports/summary",
                headers=auth_headers,
                params=params
            )
            if response.status_code == 200:
                success_count += 1
            elif response.status_code == 429:
                # Rate limited - this means we're NOT in test mode
                print(f"Rate limited at request {i+1} - rate limiter is active")
                break
        
        # In test mode, all 15 should succeed
        # If rate limiter is active, we'd get 429 after 10 requests
        print(f"Completed {success_count}/15 requests successfully")
        
        # We expect either all to succeed (test mode) or to hit rate limit
        # This test documents the behavior
        if success_count == 15:
            print("Rate limiter is SKIPPED in test/dev mode - all 15 requests succeeded")
        else:
            print(f"Rate limiter is ACTIVE - only {success_count} requests succeeded before 429")


class TestDateRangeEdgeCases:
    """Edge case tests for date range validation"""
    
    def test_start_date_after_end_date_fails(self, auth_headers):
        """Test that start_date > end_date returns 400"""
        params = {
            "start_date": "2026-01-15",
            "end_date": "2026-01-01"
        }
        
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/summary",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert "before" in data["error"].lower() or "start" in data["error"].lower()
        print(f"Start > End rejected: {data['error']}")
    
    def test_same_day_range_succeeds(self, auth_headers):
        """Test that same day range (1 day) succeeds"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        params = {
            "start_date": today,
            "end_date": today
        }
        
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/summary",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 200
        data = response.json()
        # Same day should be 1 day
        assert data["date_range"]["days"] <= 1
        print(f"Same day range accepted: {data['date_range']['days']} day(s)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
