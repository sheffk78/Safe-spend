"""Safe-Spend Python SDK client implementation."""

import time
import uuid
from typing import Any, Dict, List, Optional

import requests

from .errors import (
    APIError,
    AuthenticationError,
    NotFoundError,
    PermissionError,
    RateLimitError,
    SafeSpendError,
    ValidationError,
)
from .types import Approval, EscrowAccount, SpendingPolicy, SpendRequest


class SafeSpendClient:
    """
    Python client for the Safe-Spend API.
    
    Safe-Spend provides escrow and spending-control APIs for AI agents,
    part of the Agentic Trust suite.
    
    Example:
        >>> from safespend import SafeSpendClient
        >>> client = SafeSpendClient(api_key="sk_test_...")
        >>> escrows = client.list_escrow_accounts()
        >>> spend = client.create_spend(
        ...     escrow_id="esc_123",
        ...     amount_cents=1000,
        ...     vendor="Anthropic",
        ... )
    """
    
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.safespend.app",
        timeout: float = 10.0,
        max_retries: int = 3,
        retry_delay: float = 1.0,
    ) -> None:
        """
        Initialize the Safe-Spend client.
        
        Args:
            api_key: Your Safe-Spend API key (starts with 'sk_').
            base_url: Base URL for the Safe-Spend API. Override for staging/local dev.
            timeout: Request timeout in seconds.
            max_retries: Maximum number of retries for transient failures (5xx, timeouts).
            retry_delay: Initial delay between retries in seconds (uses exponential backoff).
        """
        if not api_key:
            raise ValueError("api_key is required")
        
        self.api_key = api_key
        # Normalize base URL - ensure it ends with /api if it's a custom deployment
        base_url = base_url.rstrip("/")
        if not base_url.endswith("/api") and "api.safespend.app" not in base_url:
            # Custom deployment URL (e.g., preview.emergentagent.com) - add /api prefix
            self.base_url = f"{base_url}/api"
        else:
            self.base_url = base_url
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self._session = requests.Session()
        self._session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "safespend-python/0.1.0",
        })
    
    def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """
        Make an HTTP request with automatic retry for transient failures.
        
        Args:
            method: HTTP method (GET, POST, PATCH, DELETE).
            path: API path (e.g., '/v1/escrow-accounts').
            params: Query parameters.
            json: JSON body for POST/PATCH requests.
            
        Returns:
            Parsed JSON response body.
            
        Raises:
            AuthenticationError: On 401 responses.
            PermissionError: On 403 responses.
            NotFoundError: On 404 responses.
            ValidationError: On 400 responses.
            RateLimitError: On 429 responses.
            APIError: On 5xx or other unexpected responses.
        """
        url = f"{self.base_url}{path}"
        last_error: Optional[Exception] = None
        
        for attempt in range(self.max_retries + 1):
            try:
                response = self._session.request(
                    method=method,
                    url=url,
                    params=params,
                    json=json,
                    timeout=self.timeout,
                )
            except requests.exceptions.Timeout:
                last_error = APIError("Request timed out", status_code=0, body=None)
                if attempt < self.max_retries:
                    time.sleep(self.retry_delay * (2 ** attempt))
                    continue
                raise last_error
            except requests.exceptions.ConnectionError as e:
                last_error = APIError(f"Connection error: {e}", status_code=0, body=None)
                if attempt < self.max_retries:
                    time.sleep(self.retry_delay * (2 ** attempt))
                    continue
                raise last_error
            except requests.exceptions.RequestException as e:
                raise APIError(f"Request failed: {e}", status_code=0, body=None)
            
            # Parse response body
            try:
                body = response.json()
            except ValueError:
                body = {"raw": response.text}
            
            # Handle error responses
            if response.status_code == 400:
                error_msg = body.get("error", "Validation error")
                details = body.get("details")
                raise ValidationError(error_msg, details=details)
            
            if response.status_code == 401:
                error_msg = body.get("error", "Authentication failed")
                raise AuthenticationError(error_msg)
            
            if response.status_code == 403:
                error_msg = body.get("error", "Permission denied")
                raise PermissionError(error_msg)
            
            if response.status_code == 404:
                error_msg = body.get("error", "Not found")
                raise NotFoundError(error_msg)
            
            if response.status_code == 429:
                # Rate limit - retry with exponential backoff
                if attempt < self.max_retries:
                    time.sleep(self.retry_delay * (2 ** attempt))
                    continue
                error_msg = body.get("error", "Rate limit exceeded")
                raise RateLimitError(error_msg)
            
            if response.status_code >= 500:
                # Server error - retry with exponential backoff
                if attempt < self.max_retries:
                    time.sleep(self.retry_delay * (2 ** attempt))
                    continue
                error_msg = body.get("error", "Server error")
                raise APIError(error_msg, status_code=response.status_code, body=body)
            
            if not response.ok:
                error_msg = body.get("error", f"HTTP {response.status_code}")
                raise APIError(error_msg, status_code=response.status_code, body=body)
            
            return body
        
        # Should not reach here
        if last_error:
            raise last_error
        raise APIError("Unknown error", status_code=0, body=None)
    
    # -------------------------------------------------------------------------
    # Escrow Accounts
    # -------------------------------------------------------------------------
    
    def list_escrow_accounts(self) -> List[EscrowAccount]:
        """
        List all escrow accounts for your organization.
        
        Returns:
            List of escrow accounts.
            
        Example:
            >>> escrows = client.list_escrow_accounts()
            >>> for e in escrows:
            ...     print(f"{e['name']}: ${e['balance_cents']/100:.2f}")
        """
        response = self._request("GET", "/v1/escrow-accounts")
        return response.get("data", [])
    
    def get_escrow_account(self, escrow_id: str) -> EscrowAccount:
        """
        Get details of a specific escrow account.
        
        Args:
            escrow_id: The escrow account ID.
            
        Returns:
            Escrow account details.
            
        Raises:
            NotFoundError: If the escrow account doesn't exist.
        """
        return self._request("GET", f"/v1/escrow-accounts/{escrow_id}")
    
    def create_escrow_account(
        self,
        *,
        name: str,
        description: Optional[str] = None,
        currency: str = "usd",
    ) -> EscrowAccount:
        """
        Create a new escrow account.
        
        Args:
            name: Display name for the escrow account.
            description: Optional description.
            currency: Currency code (default: 'usd').
            
        Returns:
            The created escrow account.
            
        Example:
            >>> escrow = client.create_escrow_account(
            ...     name="Marketing Budget Q1",
            ...     description="Budget for ad spend and AI compute"
            ... )
        """
        payload: Dict[str, Any] = {"name": name, "currency": currency}
        if description is not None:
            payload["description"] = description
        
        return self._request("POST", "/v1/escrow-accounts", json=payload)
    
    def fund_escrow_account(
        self,
        escrow_id: str,
        *,
        amount_cents: int,
    ) -> EscrowAccount:
        """
        Fund an escrow account (simulated funding for testing).
        
        Args:
            escrow_id: The escrow account ID to fund.
            amount_cents: Amount to fund in cents.
            
        Returns:
            Updated escrow account with new balance.
            
        Note:
            For production funding with Stripe, use the dashboard
            or the /fund-session endpoint directly.
        """
        if amount_cents <= 0:
            raise ValueError("amount_cents must be positive")
        
        response = self._request(
            "POST",
            f"/v1/escrow-accounts/{escrow_id}/fund",
            json={"amount_cents": amount_cents},
        )
        return response.get("escrow", response)
    
    def get_escrow_balance(self, escrow_id: str) -> Dict[str, Any]:
        """
        Get the current balance of an escrow account.
        
        Args:
            escrow_id: The escrow account ID.
            
        Returns:
            Balance info with escrow_id, balance_cents, currency, and status.
        """
        return self._request("GET", f"/v1/escrow-accounts/{escrow_id}/balance")
    
    def pause_escrow_account(self, escrow_id: str) -> EscrowAccount:
        """
        Pause spending on an escrow account.
        
        Args:
            escrow_id: The escrow account ID.
            
        Returns:
            Updated escrow account with 'paused' status.
        """
        return self._request("POST", f"/v1/escrow-accounts/{escrow_id}/pause")
    
    def resume_escrow_account(self, escrow_id: str) -> EscrowAccount:
        """
        Resume spending on a paused escrow account.
        
        Args:
            escrow_id: The escrow account ID.
            
        Returns:
            Updated escrow account with 'active' status.
        """
        return self._request("POST", f"/v1/escrow-accounts/{escrow_id}/resume")
    
    def close_escrow_account(self, escrow_id: str) -> EscrowAccount:
        """
        Close an escrow account (remaining balance will be refunded).
        
        Args:
            escrow_id: The escrow account ID.
            
        Returns:
            Updated escrow account with 'closed' status.
            
        Warning:
            This action is irreversible. The account cannot be reopened.
        """
        return self._request("POST", f"/v1/escrow-accounts/{escrow_id}/close")
    
    # -------------------------------------------------------------------------
    # Spending Policies
    # -------------------------------------------------------------------------
    
    def list_policies(self, *, escrow_id: Optional[str] = None) -> List[SpendingPolicy]:
        """
        List spending policies.
        
        Args:
            escrow_id: Optional filter by escrow account.
            
        Returns:
            List of spending policies.
        """
        params = {}
        if escrow_id:
            params["escrow_id"] = escrow_id
        
        response = self._request("GET", "/v1/policies", params=params or None)
        return response.get("data", [])
    
    def get_policy(self, policy_id: str) -> SpendingPolicy:
        """
        Get details of a specific spending policy.
        
        Args:
            policy_id: The policy ID.
            
        Returns:
            Policy details.
        """
        return self._request("GET", f"/v1/policies/{policy_id}")
    
    def create_policy(
        self,
        *,
        escrow_id: str,
        name: str,
        per_transaction_limit_cents: Optional[int] = None,
        daily_limit_cents: Optional[int] = None,
        weekly_limit_cents: Optional[int] = None,
        monthly_limit_cents: Optional[int] = None,
        vendor_allowlist: Optional[List[str]] = None,
        vendor_blocklist: Optional[List[str]] = None,
        auto_approve_under_cents: Optional[int] = None,
        require_human_above_cents: Optional[int] = None,
    ) -> SpendingPolicy:
        """
        Create a new spending policy.
        
        Args:
            escrow_id: The escrow account this policy applies to.
            name: Display name for the policy.
            per_transaction_limit_cents: Max amount per transaction.
            daily_limit_cents: Max daily spending.
            weekly_limit_cents: Max weekly spending.
            monthly_limit_cents: Max monthly spending.
            vendor_allowlist: List of allowed vendors (if set, only these are allowed).
            vendor_blocklist: List of blocked vendors.
            auto_approve_under_cents: Auto-approve spends under this amount.
            require_human_above_cents: Require human approval above this amount.
            
        Returns:
            The created policy.
            
        Example:
            >>> policy = client.create_policy(
            ...     escrow_id="esc_123",
            ...     name="Marketing Policy",
            ...     per_transaction_limit_cents=10000,  # $100 max per tx
            ...     daily_limit_cents=50000,  # $500/day
            ...     auto_approve_under_cents=5000,  # Auto-approve under $50
            ... )
        """
        payload: Dict[str, Any] = {
            "escrow_id": escrow_id,
            "name": name,
        }
        
        if per_transaction_limit_cents is not None:
            payload["per_transaction_limit_cents"] = per_transaction_limit_cents
        if daily_limit_cents is not None:
            payload["daily_limit_cents"] = daily_limit_cents
        if weekly_limit_cents is not None:
            payload["weekly_limit_cents"] = weekly_limit_cents
        if monthly_limit_cents is not None:
            payload["monthly_limit_cents"] = monthly_limit_cents
        if vendor_allowlist is not None:
            payload["allowed_vendors"] = vendor_allowlist
        if vendor_blocklist is not None:
            payload["blocked_vendors"] = vendor_blocklist
        if auto_approve_under_cents is not None:
            payload["auto_approve_under_cents"] = auto_approve_under_cents
        if require_human_above_cents is not None:
            payload["require_human_above_cents"] = require_human_above_cents
        
        return self._request("POST", "/v1/policies", json=payload)
    
    def delete_policy(self, policy_id: str) -> Dict[str, str]:
        """
        Delete a spending policy.
        
        Args:
            policy_id: The policy ID to delete.
            
        Returns:
            Confirmation message.
        """
        return self._request("DELETE", f"/v1/policies/{policy_id}")
    
    # -------------------------------------------------------------------------
    # Spend Requests
    # -------------------------------------------------------------------------
    
    def create_spend(
        self,
        *,
        escrow_id: str,
        amount_cents: int,
        vendor: str,
        currency: str = "usd",
        category: Optional[str] = None,
        description: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> SpendRequest:
        """
        Create a spend request.
        
        This runs through the 13-step rules engine and may result in:
        - 'approved': Spend was auto-approved and executed.
        - 'denied': Spend was denied by a policy rule.
        - 'pending': Spend requires human approval.
        
        Args:
            escrow_id: The escrow account to spend from.
            amount_cents: Amount to spend in cents.
            vendor: Vendor/merchant name.
            currency: Currency code (default: 'usd').
            category: Optional spending category.
            description: Optional description for audit.
            idempotency_key: Optional key for idempotent requests.
            metadata: Optional metadata dict.
            
        Returns:
            The spend request with status and rules evaluation.
            
        Example:
            >>> spend = client.create_spend(
            ...     escrow_id="esc_123",
            ...     amount_cents=4999,
            ...     vendor="Anthropic",
            ...     category="ai_compute",
            ...     description="Claude API credits top-up",
            ... )
            >>> if spend["status"] == "approved":
            ...     print(f"Spend approved! Remaining: ${spend.get('remaining_balance_cents', 0)/100:.2f}")
            >>> elif spend["status"] == "pending":
            ...     print(f"Awaiting approval. ID: {spend.get('approval_id')}")
        """
        if amount_cents <= 0:
            raise ValueError("amount_cents must be positive")
        
        # Generate idempotency key if not provided
        if idempotency_key is None:
            idempotency_key = f"py-sdk-{int(time.time())}-{uuid.uuid4().hex[:8]}"
        
        payload: Dict[str, Any] = {
            "escrow_id": escrow_id,
            "amount_cents": amount_cents,
            "currency": currency,
            "vendor": vendor,
            "idempotency_key": idempotency_key,
        }
        
        if category is not None:
            payload["category"] = category
        if description is not None:
            payload["description"] = description
        if metadata is not None:
            payload["metadata"] = metadata
        
        return self._request("POST", "/v1/spend", json=payload)
    
    def list_spend_requests(
        self,
        *,
        escrow_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[SpendRequest]:
        """
        List spend requests.
        
        Args:
            escrow_id: Filter by escrow account.
            status: Filter by status (approved, denied, pending, expired).
            limit: Max results to return (default 50).
            offset: Pagination offset.
            
        Returns:
            List of spend requests.
        """
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if escrow_id:
            params["escrow_id"] = escrow_id
        if status:
            params["status"] = status
        
        response = self._request("GET", "/v1/spend", params=params)
        return response.get("data", [])
    
    def get_spend_request(self, spend_id: str) -> SpendRequest:
        """
        Get details of a specific spend request.
        
        Args:
            spend_id: The spend request ID.
            
        Returns:
            Spend request details.
        """
        return self._request("GET", f"/v1/spend/{spend_id}")
    
    def cancel_spend_request(self, spend_id: str) -> SpendRequest:
        """
        Cancel a pending spend request.
        
        Args:
            spend_id: The spend request ID.
            
        Returns:
            Updated spend request with 'cancelled' status.
            
        Raises:
            ValidationError: If the spend request is not pending.
        """
        return self._request("POST", f"/v1/spend/{spend_id}/cancel")
    
    # -------------------------------------------------------------------------
    # Approvals (requires org token, not API key)
    # -------------------------------------------------------------------------
    
    def list_approvals(
        self,
        *,
        status: Optional[str] = "pending",
        limit: int = 50,
        offset: int = 0,
    ) -> List[Approval]:
        """
        List approvals awaiting human review.
        
        Note:
            This endpoint requires an organization token (JWT), not an API key.
            Approvals are designed for human review, not agent automation.
        
        Args:
            status: Filter by status (pending, approved, denied, expired).
                   Defaults to 'pending'.
            limit: Max results to return.
            offset: Pagination offset.
            
        Returns:
            List of approvals with spend request details.
        """
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if status:
            params["status"] = status
        
        response = self._request("GET", "/v1/approvals", params=params)
        return response.get("data", [])
    
    def get_approval(self, approval_id: str) -> Approval:
        """
        Get details of a specific approval.
        
        Args:
            approval_id: The approval ID.
            
        Returns:
            Approval details with spend request info.
        """
        return self._request("GET", f"/v1/approvals/{approval_id}")
    
    def approve(self, approval_id: str, *, note: Optional[str] = None) -> Approval:
        """
        Approve a pending spend request.
        
        This executes the spend, deducting from the escrow balance.
        
        Args:
            approval_id: The approval ID.
            note: Optional note for audit trail.
            
        Returns:
            Updated approval/spend request with 'approved' status.
            
        Raises:
            ValidationError: If approval is expired or already resolved.
        """
        payload = {}
        if note is not None:
            payload["note"] = note
        
        return self._request(
            "POST",
            f"/v1/approvals/{approval_id}/approve",
            json=payload if payload else None,
        )
    
    def deny(self, approval_id: str, *, note: Optional[str] = None, reason: Optional[str] = None) -> Approval:
        """
        Deny a pending spend request.
        
        This does NOT deduct from the escrow balance.
        
        Args:
            approval_id: The approval ID.
            note: Optional note for audit trail.
            reason: Optional denial reason code.
            
        Returns:
            Updated approval/spend request with 'denied' status.
        """
        payload: Dict[str, Any] = {}
        if note is not None:
            payload["note"] = note
        if reason is not None:
            payload["reason"] = reason
        
        return self._request(
            "POST",
            f"/v1/approvals/{approval_id}/deny",
            json=payload if payload else None,
        )
