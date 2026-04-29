"""
Safe-Spend Python SDK

A minimal, developer-friendly Python client for the Safe-Spend API,
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

Async Example:
    >>> from safespend import AsyncSafeSpendClient
    >>> import asyncio
    >>> async def main():
    ...     async with AsyncSafeSpendClient(api_key="sk_test_...") as client:
    ...         escrows = await client.list_escrow_accounts()
    >>> asyncio.run(main())
"""

from .client import SafeSpendClient
from .errors import (
    APIError,
    AuthenticationError,
    NotFoundError,
    PermissionError,
    RateLimitError,
    SafeSpendError,
    ValidationError,
)
from ._version import __version__

# Lazy import async client to avoid httpx dependency requirement
def __getattr__(name):
    if name == "AsyncSafeSpendClient":
        from .async_client import AsyncSafeSpendClient
        return AsyncSafeSpendClient
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

__all__ = [
    "SafeSpendClient",
    "SafeSpend",  # Alias for SafeSpendClient
    "AsyncSafeSpendClient",
    "SafeSpendError",
    "AuthenticationError",
    "PermissionError",
    "NotFoundError",
    "RateLimitError",
    "ValidationError",
    "APIError",
    "__version__",
]

# Backward-compatible alias
SafeSpend = SafeSpendClient
