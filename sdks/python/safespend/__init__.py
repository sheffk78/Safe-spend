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

__all__ = [
    "SafeSpendClient",
    "SafeSpendError",
    "AuthenticationError",
    "PermissionError",
    "NotFoundError",
    "RateLimitError",
    "ValidationError",
    "APIError",
    "__version__",
]
