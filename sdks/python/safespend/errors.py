"""Custom exceptions for the Safe-Spend SDK."""

from typing import Any, Optional


class SafeSpendError(Exception):
    """Base exception for Safe-Spend SDK."""
    pass


class AuthenticationError(SafeSpendError):
    """Raised when authentication fails (401)."""
    pass


class PermissionError(SafeSpendError):
    """Raised when permission is denied (403)."""
    pass


class NotFoundError(SafeSpendError):
    """Raised when a resource is not found (404)."""
    pass


class RateLimitError(SafeSpendError):
    """Raised when rate limit is exceeded (429)."""
    pass


class ValidationError(SafeSpendError):
    """Raised when request validation fails (400)."""
    
    def __init__(self, message: str, details: Optional[Any] = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details
    
    def __str__(self) -> str:
        if self.details:
            return f"{self.message}: {self.details}"
        return self.message


class APIError(SafeSpendError):
    """Raised for general API errors (5xx, unexpected errors)."""
    
    def __init__(self, message: str, status_code: int, body: Any) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.body = body
    
    def __str__(self) -> str:
        return f"{self.message} (status={self.status_code})"
