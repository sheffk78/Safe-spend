"""Type definitions for Safe-Spend SDK responses."""

from typing import Any, List, Optional, TypedDict


class EscrowAccount(TypedDict, total=False):
    """Escrow account representation."""
    id: str
    name: str
    balance_cents: int
    currency: str
    status: str
    total_funded_cents: Optional[int]
    total_spent_cents: Optional[int]
    created_at: Optional[str]


class SpendingPolicy(TypedDict, total=False):
    """Spending policy representation."""
    id: str
    name: str
    escrow_id: str
    is_active: bool
    per_transaction_limit_cents: Optional[int]
    daily_limit_cents: Optional[int]
    weekly_limit_cents: Optional[int]
    monthly_limit_cents: Optional[int]
    auto_approve_under_cents: Optional[int]
    require_human_above_cents: Optional[int]


class SpendRequest(TypedDict, total=False):
    """Spend request representation."""
    id: str
    status: str  # approved, denied, pending_approval, expired, cancelled
    escrow_id: str
    amount_cents: int
    currency: str
    vendor: Optional[str]
    category: Optional[str]
    description: Optional[str]
    denial_reason: Optional[str]
    approval_id: Optional[str]
    approval_expires_at: Optional[str]
    rules_evaluated: Optional[Any]
    created_at: Optional[str]


class Approval(TypedDict, total=False):
    """Approval representation."""
    id: str
    spend_request_id: str
    status: str  # pending, approved, denied, expired
    amount_cents: int
    currency: str
    vendor: Optional[str]
    category: Optional[str]
    requested_at: str
    expires_at: str
    resolved_at: Optional[str]
    resolved_by: Optional[str]
    denial_note: Optional[str]


class FundingEvent(TypedDict, total=False):
    """Funding event representation."""
    id: str
    escrow_id: str
    amount_cents: int
    status: str
    stripe_session_id: Optional[str]
    created_at: str
