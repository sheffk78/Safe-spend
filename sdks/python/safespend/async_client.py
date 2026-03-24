"""Async Safe-Spend Python SDK client implementation."""

import asyncio
from typing import Any, Dict, List, Optional

try:
    import httpx
except ImportError:
    httpx = None  # type: ignore

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


class AsyncSafeSpendClient:
    """
    Async Python client for the Safe-Spend API.
    
    Requires httpx to be installed: pip install safespend[async]
    
    Example:
        >>> from safespend import AsyncSafeSpendClient
        >>> async def main():
        ...     async with AsyncSafeSpendClient(api_key="sk_test_...") as client:
        ...         escrows = await client.list_escrow_accounts()
        ...         spend = await client.create_spend(
        ...             escrow_id="esc_123",
        ...             amount_cents=1000,
        ...             vendor="Anthropic",
        ...         )
        >>> asyncio.run(main())
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
        Initialize the async Safe-Spend client.
        
        Args:
            api_key: Your Safe-Spend API key (starts with 'sk_').
            base_url: Base URL for the Safe-Spend API.
            timeout: Request timeout in seconds.
            max_retries: Maximum number of retries for transient failures.
            retry_delay: Initial delay between retries (exponential backoff).
        """
        if httpx is None:
            raise ImportError(
                "httpx is required for async client. "
                "Install it with: pip install safespend[async]"
            )
        
        if not api_key:
            raise ValueError("api_key is required")
        
        self.api_key = api_key
        # Normalize base URL
        base_url = base_url.rstrip("/")
        if not base_url.endswith("/api") and "api.safespend.app" not in base_url:
            self.base_url = f"{base_url}/api"
        else:
            self.base_url = base_url
        
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self._client: Optional[httpx.AsyncClient] = None
    
    async def __aenter__(self) -> "AsyncSafeSpendClient":
        """Async context manager entry."""
        await self._ensure_client()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        await self.close()
    
    async def _ensure_client(self) -> None:
        """Ensure httpx client is created."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "safespend-python/0.1.0-async",
                },
                timeout=self.timeout,
            )
    
    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None
    
    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """Make an HTTP request with automatic retry for transient failures."""
        await self._ensure_client()
        
        url = f"{self.base_url}{path}"
        last_error: Optional[Exception] = None
        
        for attempt in range(self.max_retries + 1):
            try:
                response = await self._client.request(
                    method=method,
                    url=url,
                    params=params,
                    json=json,
                )
                
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
                    # Rate limit - retry with backoff
                    if attempt < self.max_retries:
                        delay = self.retry_delay * (2 ** attempt)
                        await asyncio.sleep(delay)
                        continue
                    error_msg = body.get("error", "Rate limit exceeded")
                    raise RateLimitError(error_msg)
                
                if response.status_code >= 500:
                    # Server error - retry with backoff
                    if attempt < self.max_retries:
                        delay = self.retry_delay * (2 ** attempt)
                        await asyncio.sleep(delay)
                        continue
                    error_msg = body.get("error", "Server error")
                    raise APIError(error_msg, status_code=response.status_code, body=body)
                
                if not response.is_success:
                    error_msg = body.get("error", f"HTTP {response.status_code}")
                    raise APIError(error_msg, status_code=response.status_code, body=body)
                
                return body
                
            except (httpx.TimeoutException, httpx.ConnectError) as e:
                last_error = e
                if attempt < self.max_retries:
                    delay = self.retry_delay * (2 ** attempt)
                    await asyncio.sleep(delay)
                    continue
                raise APIError(f"Request failed after {self.max_retries + 1} attempts: {e}", status_code=0, body=None)
        
        # Should not reach here, but just in case
        if last_error:
            raise APIError(f"Request failed: {last_error}", status_code=0, body=None)
        raise APIError("Unknown error", status_code=0, body=None)
    
    # -------------------------------------------------------------------------
    # Escrow Accounts
    # -------------------------------------------------------------------------
    
    async def list_escrow_accounts(self) -> List[EscrowAccount]:
        """List all escrow accounts for your organization."""
        response = await self._request("GET", "/v1/escrow-accounts")
        return response.get("data", [])
    
    async def get_escrow_account(self, escrow_id: str) -> EscrowAccount:
        """Get details of a specific escrow account."""
        return await self._request("GET", f"/v1/escrow-accounts/{escrow_id}")
    
    async def get_escrow_balance(self, escrow_id: str) -> Dict[str, Any]:
        """Get the current balance of an escrow account."""
        return await self._request("GET", f"/v1/escrow-accounts/{escrow_id}/balance")
    
    async def create_escrow_account(
        self,
        *,
        name: str,
        description: Optional[str] = None,
        currency: str = "usd",
    ) -> EscrowAccount:
        """Create a new escrow account."""
        payload: Dict[str, Any] = {"name": name, "currency": currency}
        if description is not None:
            payload["description"] = description
        return await self._request("POST", "/v1/escrow-accounts", json=payload)
    
    # -------------------------------------------------------------------------
    # Spend Requests
    # -------------------------------------------------------------------------
    
    async def create_spend(
        self,
        *,
        escrow_id: str,
        amount_cents: int,
        vendor: str,
        category: Optional[str] = None,
        description: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> SpendRequest:
        """Create a new spend request from an escrow account."""
        payload: Dict[str, Any] = {
            "escrow_id": escrow_id,
            "amount_cents": amount_cents,
            "vendor": vendor,
        }
        if category is not None:
            payload["category"] = category
        if description is not None:
            payload["description"] = description
        if idempotency_key is not None:
            payload["idempotency_key"] = idempotency_key
        if metadata is not None:
            payload["metadata"] = metadata
        
        return await self._request("POST", "/v1/spend", json=payload)
    
    async def get_spend_request(self, spend_id: str) -> SpendRequest:
        """Get details of a specific spend request."""
        return await self._request("GET", f"/v1/spend/{spend_id}")
    
    async def list_spend_requests(
        self,
        *,
        escrow_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> List[SpendRequest]:
        """List spend requests with optional filters."""
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if escrow_id is not None:
            params["escrow_id"] = escrow_id
        if status is not None:
            params["status"] = status
        
        response = await self._request("GET", "/v1/spend", params=params)
        return response.get("data", [])
    
    # -------------------------------------------------------------------------
    # Approvals
    # -------------------------------------------------------------------------
    
    async def list_pending_approvals(
        self,
        *,
        escrow_id: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> List[Approval]:
        """List pending approvals."""
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if escrow_id is not None:
            params["escrow_id"] = escrow_id
        
        response = await self._request("GET", "/v1/approvals/pending", params=params)
        return response.get("data", [])
    
    async def approve_spend(
        self,
        approval_id: str,
        *,
        note: Optional[str] = None,
    ) -> Approval:
        """Approve a pending spend request."""
        payload: Dict[str, Any] = {}
        if note is not None:
            payload["note"] = note
        
        return await self._request(
            "POST",
            f"/v1/approvals/{approval_id}/approve",
            json=payload if payload else None,
        )
    
    async def deny_spend(
        self,
        approval_id: str,
        *,
        note: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> Approval:
        """Deny a pending spend request."""
        payload: Dict[str, Any] = {}
        if note is not None:
            payload["note"] = note
        if reason is not None:
            payload["reason"] = reason
        
        return await self._request(
            "POST",
            f"/v1/approvals/{approval_id}/deny",
            json=payload if payload else None,
        )
