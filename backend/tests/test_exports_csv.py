"""
Export CSV API Tests
Tests for CSV export functionality for governance reviews and audits
- GET /api/v1/exports/summary - Get export preview counts
- GET /api/v1/exports/spend-activity - CSV download of spend requests
- GET /api/v1/exports/audit-events - CSV download of audit events
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
TEST_ORG_ID = "org_j9sso51o4pam"


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


class TestExportSummary:
    """Tests for GET /api/v1/exports/summary endpoint"""
    
    def test_summary_success(self, auth_headers):
        """Test export summary with valid date range"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2026-12-31"
        }
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/summary",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "date_range" in data
        assert "spend_activity" in data
        assert "audit_events" in data
        
        # Verify date_range
        assert "start" in data["date_range"]
        assert "end" in data["date_range"]
        
        # Verify spend_activity structure
        assert "total_records" in data["spend_activity"]
        assert "by_status" in data["spend_activity"]
        assert isinstance(data["spend_activity"]["total_records"], int)
        
        # Verify audit_events structure
        assert "total_records" in data["audit_events"]
        assert "top_event_types" in data["audit_events"]
        assert isinstance(data["audit_events"]["total_records"], int)
        
        print(f"Summary: {data['spend_activity']['total_records']} spend records, {data['audit_events']['total_records']} audit events")
    
    def test_summary_requires_start_date(self, auth_headers):
        """Test that start_date is required"""
        params = {"end_date": "2026-12-31"}
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/summary",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert "start_date" in data["error"].lower() or "end_date" in data["error"].lower()
    
    def test_summary_requires_end_date(self, auth_headers):
        """Test that end_date is required"""
        params = {"start_date": "2024-01-01"}
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/summary",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
    
    def test_summary_requires_auth(self):
        """Test that summary requires authentication"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2026-12-31"
        }
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/summary",
            params=params
        )
        
        assert response.status_code == 401
    
    def test_summary_with_escrow_filter(self, auth_headers):
        """Test summary with escrow_id filter"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2026-12-31",
            "escrow_id": "escrow_nonexistent"
        }
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/summary",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 200
        data = response.json()
        # With non-existent escrow, should return 0 records
        assert data["spend_activity"]["total_records"] == 0
        assert data["audit_events"]["total_records"] == 0


class TestSpendActivityExport:
    """Tests for GET /api/v1/exports/spend-activity endpoint"""
    
    def test_spend_activity_csv_format(self, auth_headers):
        """Test spend activity export returns valid CSV"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2026-12-31"
        }
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/spend-activity",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 200
        
        # Verify content type
        assert "text/csv" in response.headers.get("Content-Type", "")
        
        # Verify Content-Disposition header
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition
        assert "filename=" in content_disposition
        assert "spend-activity" in content_disposition
        assert ".csv" in content_disposition
        
        # Verify filename format: safe-spend-{org-slug}-spend-activity-{YYYY-MM-DD}.csv
        assert "safe-spend-" in content_disposition
        
        # Parse CSV and verify headers
        csv_content = response.text
        reader = csv.reader(io.StringIO(csv_content))
        headers = next(reader)
        
        # Expected headers
        expected_headers = [
            "Timestamp", "Request ID", "Escrow Account", "Escrow ID",
            "Amount (USD)", "Currency", "Vendor", "Category", "Description",
            "Status", "Resolved At", "Resolved By", "Denial Reason",
            "Balance Before (USD)", "Balance After (USD)", "API Key",
            "API Key Type", "Approval ID", "Approval Status", "Approver",
            "Approval Note", "Idempotency Key"
        ]
        
        assert headers == expected_headers, f"Headers mismatch: {headers}"
        print(f"CSV headers verified: {len(headers)} columns")
    
    def test_spend_activity_requires_dates(self, auth_headers):
        """Test that date range is required"""
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/spend-activity",
            headers=auth_headers
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
    
    def test_spend_activity_requires_auth(self):
        """Test that export requires authentication"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2026-12-31"
        }
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/spend-activity",
            params=params
        )
        
        assert response.status_code == 401
    
    def test_spend_activity_with_status_filter(self, auth_headers):
        """Test spend activity export with status filter"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2026-12-31",
            "status": "approved"
        }
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/spend-activity",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("Content-Type", "")
    
    def test_spend_activity_with_escrow_filter(self, auth_headers):
        """Test spend activity export with escrow_id filter"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2026-12-31",
            "escrow_id": "escrow_test123"
        }
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/spend-activity",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("Content-Type", "")


class TestAuditEventsExport:
    """Tests for GET /api/v1/exports/audit-events endpoint"""
    
    def test_audit_events_csv_format(self, auth_headers):
        """Test audit events export returns valid CSV with data"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2026-12-31"
        }
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/audit-events",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 200
        
        # Verify content type
        assert "text/csv" in response.headers.get("Content-Type", "")
        
        # Verify Content-Disposition header
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition
        assert "filename=" in content_disposition
        assert "audit-events" in content_disposition
        assert ".csv" in content_disposition
        
        # Verify filename format
        assert "safe-spend-" in content_disposition
        
        # Parse CSV and verify headers
        csv_content = response.text
        reader = csv.reader(io.StringIO(csv_content))
        headers = next(reader)
        
        # Expected headers
        expected_headers = [
            "Timestamp", "Event ID", "Event Type", "Actor Type", "Actor ID",
            "Escrow Account", "Escrow ID", "IP Address", "Amount (USD)",
            "Vendor", "Spend Request ID", "Approval ID", "Policy ID",
            "API Key ID", "Reason", "Note", "Details (JSON)"
        ]
        
        assert headers == expected_headers, f"Headers mismatch: {headers}"
        
        # Verify we have data rows (test org has audit events)
        rows = list(reader)
        assert len(rows) > 0, "Expected audit events data"
        print(f"CSV has {len(rows)} audit event rows")
        
        # Verify first row has ISO 8601 timestamp format
        if rows:
            timestamp = rows[0][0]
            # ISO 8601 format: YYYY-MM-DDTHH:MM:SS.sssZ
            assert "T" in timestamp, f"Timestamp not in ISO 8601 format: {timestamp}"
            assert timestamp.endswith("Z"), f"Timestamp should end with Z: {timestamp}"
    
    def test_audit_events_requires_dates(self, auth_headers):
        """Test that date range is required"""
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/audit-events",
            headers=auth_headers
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
    
    def test_audit_events_requires_auth(self):
        """Test that export requires authentication"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2026-12-31"
        }
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/audit-events",
            params=params
        )
        
        assert response.status_code == 401
    
    def test_audit_events_with_event_type_filter(self, auth_headers):
        """Test audit events export with event_type filter"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2026-12-31",
            "event_type": "org.login"
        }
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/audit-events",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("Content-Type", "")
        
        # Parse and verify all rows have the filtered event type
        csv_content = response.text
        reader = csv.reader(io.StringIO(csv_content))
        headers = next(reader)
        event_type_idx = headers.index("Event Type")
        
        for row in reader:
            assert row[event_type_idx] == "org.login", f"Expected org.login, got {row[event_type_idx]}"
    
    def test_audit_events_with_actor_type_filter(self, auth_headers):
        """Test audit events export with actor_type filter"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2026-12-31",
            "actor_type": "human"
        }
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/audit-events",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("Content-Type", "")


class TestExportPermissions:
    """Tests for export permission restrictions"""
    
    def test_owner_can_export(self, auth_headers):
        """Test that owner can access exports"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2026-12-31"
        }
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/summary",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 200
        print("Owner can access exports - PASS")
    
    def test_invalid_token_rejected(self):
        """Test that invalid token is rejected"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2026-12-31"
        }
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/summary",
            headers={"Authorization": "Bearer invalid_token_here"},
            params=params
        )
        
        assert response.status_code == 401


class TestCSVFormatValidation:
    """Tests for CSV format compliance"""
    
    def test_csv_escaping_special_characters(self, auth_headers):
        """Test that CSV properly escapes special characters"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2026-12-31"
        }
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/audit-events",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 200
        
        # Verify CSV can be parsed without errors
        csv_content = response.text
        try:
            reader = csv.reader(io.StringIO(csv_content))
            rows = list(reader)
            assert len(rows) >= 1, "CSV should have at least header row"
            print(f"CSV parsed successfully: {len(rows)} rows")
        except csv.Error as e:
            pytest.fail(f"CSV parsing failed: {e}")
    
    def test_iso8601_date_format(self, auth_headers):
        """Test that dates are in ISO 8601 format"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2026-12-31"
        }
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/audit-events",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 200
        
        csv_content = response.text
        reader = csv.reader(io.StringIO(csv_content))
        headers = next(reader)
        
        # Check first data row timestamp
        for row in reader:
            timestamp = row[0]  # Timestamp is first column
            # ISO 8601 format: YYYY-MM-DDTHH:MM:SS.sssZ
            try:
                # Parse to verify format
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                assert dt is not None
                print(f"Timestamp format verified: {timestamp}")
                break  # Only need to check one
            except ValueError as e:
                pytest.fail(f"Invalid ISO 8601 timestamp: {timestamp} - {e}")
    
    def test_filename_format(self, auth_headers):
        """Test that filename follows expected format"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2026-12-31"
        }
        
        # Test spend-activity filename
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/spend-activity",
            headers=auth_headers,
            params=params
        )
        
        content_disposition = response.headers.get("Content-Disposition", "")
        # Expected: safe-spend-{org-slug}-spend-activity-{YYYY-MM-DD}.csv
        assert "safe-spend-" in content_disposition
        assert "spend-activity" in content_disposition
        assert ".csv" in content_disposition
        
        # Extract and verify date format in filename
        import re
        date_match = re.search(r'\d{4}-\d{2}-\d{2}', content_disposition)
        assert date_match, f"Date not found in filename: {content_disposition}"
        
        # Verify it's today's date
        today = datetime.now().strftime("%Y-%m-%d")
        assert date_match.group() == today, f"Expected today's date {today}, got {date_match.group()}"
        
        print(f"Filename format verified: {content_disposition}")


class TestDateRangeValidation:
    """Tests for date range validation"""
    
    def test_invalid_date_format_rejected(self, auth_headers):
        """Test that invalid date format is rejected"""
        params = {
            "start_date": "invalid-date",
            "end_date": "2026-12-31"
        }
        response = requests.get(
            f"{BASE_URL}/api/v1/exports/summary",
            headers=auth_headers,
            params=params
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
    
    def test_narrow_date_range(self, auth_headers):
        """Test export with narrow date range"""
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
        assert "spend_activity" in data
        assert "audit_events" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
