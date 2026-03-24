"""LangChain tools for Safe-Spend integration.

Provides LangChain-compatible tools for AI agents to interact with
the Safe-Spend escrow and spending control API.

Example:
    >>> from langchain.agents import initialize_agent, AgentType
    >>> from langchain_openai import ChatOpenAI
    >>> from safespend import SafeSpendClient
    >>> from safespend.integrations import create_safespend_toolkit
    >>>
    >>> client = SafeSpendClient(api_key="sk_test_...")
    >>> tools = create_safespend_toolkit(client, default_escrow_id="esc_123")
    >>>
    >>> llm = ChatOpenAI(model="gpt-4")
    >>> agent = initialize_agent(tools, llm, agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION)
    >>> agent.run("Check my budget balance")
"""

from typing import Any, Dict, List, Optional, Type
from pydantic import BaseModel, Field

try:
    from langchain_core.tools import BaseTool
    from langchain_core.callbacks import CallbackManagerForToolRun
except ImportError:
    try:
        # Fallback for older langchain versions
        from langchain.tools import BaseTool
        from langchain.callbacks.manager import CallbackManagerForToolRun
    except ImportError:
        raise ImportError(
            "LangChain is required for this integration. "
            "Install it with: pip install langchain langchain-core"
        )

from ..client import SafeSpendClient


# =============================================================================
# Input Schemas (Pydantic models for structured tool inputs)
# =============================================================================

class CreateSpendInput(BaseModel):
    """Input schema for creating a spend request."""
    amount_cents: int = Field(description="Amount to spend in cents (e.g., 4999 for $49.99)")
    vendor: str = Field(description="Vendor/merchant name (e.g., 'OpenAI', 'AWS')")
    category: Optional[str] = Field(default=None, description="Spending category (e.g., 'ai_compute', 'cloud_services')")
    description: Optional[str] = Field(default=None, description="Description for audit trail")


class CheckBalanceInput(BaseModel):
    """Input schema for checking escrow balance."""
    escrow_id: Optional[str] = Field(default=None, description="Escrow account ID. If not provided, uses default.")


class ListSpendsInput(BaseModel):
    """Input schema for listing spend requests."""
    status: Optional[str] = Field(default=None, description="Filter by status: approved, denied, pending, expired")
    limit: int = Field(default=10, description="Maximum number of results to return")


class GetSpendInput(BaseModel):
    """Input schema for getting spend request details."""
    spend_id: str = Field(description="The spend request ID (e.g., 'spr_abc123')")


# =============================================================================
# LangChain Tools
# =============================================================================

class SafeSpendTool(BaseTool):
    """
    LangChain tool for creating governed spend requests through Safe-Spend.
    
    This tool allows an AI agent to request spending from an escrow account,
    subject to organizational spending policies and rules.
    
    Example:
        >>> from safespend import SafeSpendClient
        >>> from safespend.integrations import SafeSpendTool
        >>>
        >>> client = SafeSpendClient(api_key="sk_test_...")
        >>> tool = SafeSpendTool(client=client, escrow_id="esc_123")
        >>>
        >>> # Use with an agent or directly
        >>> result = tool._run(
        ...     amount_cents=2500,
        ...     vendor="OpenAI",
        ...     category="ai_compute",
        ...     description="GPT-4 API credits"
        ... )
    """
    
    name: str = "safe_spend_request"
    description: str = (
        "Request a governed spend from an escrow account. "
        "The request will be evaluated against organizational spending policies. "
        "Returns: status (approved/denied/pending), remaining_balance_cents, and denial_reason if denied. "
        "Use this when you need to make a purchase or payment."
    )
    args_schema: Type[BaseModel] = CreateSpendInput
    
    client: Any = Field(exclude=True)
    escrow_id: str = Field(exclude=True)
    
    class Config:
        arbitrary_types_allowed = True
    
    def __init__(self, client: SafeSpendClient, escrow_id: str, **kwargs):
        """
        Initialize the Safe-Spend tool.
        
        Args:
            client: SafeSpendClient instance.
            escrow_id: Default escrow account ID to spend from.
        """
        super().__init__(client=client, escrow_id=escrow_id, **kwargs)
    
    def _run(
        self,
        amount_cents: int,
        vendor: str,
        category: Optional[str] = None,
        description: Optional[str] = None,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> Dict[str, Any]:
        """Execute the spend request."""
        try:
            spend = self.client.create_spend(
                escrow_id=self.escrow_id,
                amount_cents=amount_cents,
                vendor=vendor,
                category=category,
                description=description,
            )
            
            # Format response for LLM consumption
            result = {
                "status": spend.get("status"),
                "spend_id": spend.get("id"),
                "amount_cents": spend.get("amount_cents"),
                "amount_dollars": f"${spend.get('amount_cents', 0) / 100:.2f}",
                "vendor": spend.get("vendor"),
            }
            
            if spend.get("status") == "approved":
                result["remaining_balance_cents"] = spend.get("remaining_balance_cents")
                result["remaining_balance_dollars"] = f"${spend.get('remaining_balance_cents', 0) / 100:.2f}"
                result["message"] = f"Spend approved. Remaining balance: {result['remaining_balance_dollars']}"
            elif spend.get("status") == "denied":
                result["denial_reason"] = spend.get("denial_reason")
                result["message"] = f"Spend denied: {spend.get('denial_reason')}"
            elif spend.get("status") == "pending":
                result["approval_id"] = spend.get("approval_id")
                result["approval_expires_at"] = spend.get("approval_expires_at")
                result["message"] = f"Spend requires human approval. Approval ID: {spend.get('approval_id')}"
            
            return result
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "message": f"Failed to create spend request: {e}"
            }
    
    async def _arun(
        self,
        amount_cents: int,
        vendor: str,
        category: Optional[str] = None,
        description: Optional[str] = None,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> Dict[str, Any]:
        """Async version - currently calls sync version."""
        return self._run(amount_cents, vendor, category, description, run_manager)


class SafeSpendCheckBalanceTool(BaseTool):
    """
    LangChain tool for checking escrow account balance.
    
    Use this before making spend requests to check available funds.
    """
    
    name: str = "safe_spend_check_balance"
    description: str = (
        "Check the current balance of an escrow account. "
        "Returns: balance_cents, balance_dollars, currency, and status. "
        "Use this to check available budget before making purchases."
    )
    args_schema: Type[BaseModel] = CheckBalanceInput
    
    client: Any = Field(exclude=True)
    default_escrow_id: Optional[str] = Field(default=None, exclude=True)
    
    class Config:
        arbitrary_types_allowed = True
    
    def __init__(
        self,
        client: SafeSpendClient,
        default_escrow_id: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize the balance check tool.
        
        Args:
            client: SafeSpendClient instance.
            default_escrow_id: Default escrow ID if not provided in call.
        """
        super().__init__(client=client, default_escrow_id=default_escrow_id, **kwargs)
    
    def _run(
        self,
        escrow_id: Optional[str] = None,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> Dict[str, Any]:
        """Check the escrow balance."""
        try:
            eid = escrow_id or self.default_escrow_id
            if not eid:
                return {
                    "status": "error",
                    "error": "No escrow_id provided and no default set",
                    "message": "Please provide an escrow_id"
                }
            
            balance = self.client.get_escrow_balance(eid)
            
            return {
                "escrow_id": eid,
                "balance_cents": balance.get("balance_cents"),
                "balance_dollars": f"${balance.get('balance_cents', 0) / 100:.2f}",
                "currency": balance.get("currency", "usd").upper(),
                "status": balance.get("status"),
                "message": f"Balance: ${balance.get('balance_cents', 0) / 100:.2f} {balance.get('currency', 'usd').upper()}"
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "message": f"Failed to check balance: {e}"
            }
    
    async def _arun(
        self,
        escrow_id: Optional[str] = None,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> Dict[str, Any]:
        """Async version - currently calls sync version."""
        return self._run(escrow_id, run_manager)


class SafeSpendListSpendsTool(BaseTool):
    """
    LangChain tool for listing recent spend requests.
    
    Useful for reviewing spending history and pending approvals.
    """
    
    name: str = "safe_spend_list_requests"
    description: str = (
        "List recent spend requests from the escrow account. "
        "Can filter by status: approved, denied, pending, expired. "
        "Returns a list of spend requests with status, amount, and vendor."
    )
    args_schema: Type[BaseModel] = ListSpendsInput
    
    client: Any = Field(exclude=True)
    default_escrow_id: Optional[str] = Field(default=None, exclude=True)
    
    class Config:
        arbitrary_types_allowed = True
    
    def __init__(
        self,
        client: SafeSpendClient,
        default_escrow_id: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize the list spends tool.
        
        Args:
            client: SafeSpendClient instance.
            default_escrow_id: Default escrow ID to filter by.
        """
        super().__init__(client=client, default_escrow_id=default_escrow_id, **kwargs)
    
    def _run(
        self,
        status: Optional[str] = None,
        limit: int = 10,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> Dict[str, Any]:
        """List spend requests."""
        try:
            spends = self.client.list_spend_requests(
                escrow_id=self.default_escrow_id,
                status=status,
                limit=limit,
            )
            
            formatted = []
            for s in spends[:limit]:
                formatted.append({
                    "id": s.get("id"),
                    "status": s.get("status"),
                    "amount_cents": s.get("amount_cents"),
                    "amount_dollars": f"${s.get('amount_cents', 0) / 100:.2f}",
                    "vendor": s.get("vendor"),
                    "category": s.get("category"),
                    "created_at": s.get("created_at"),
                })
            
            return {
                "count": len(formatted),
                "total_available": len(spends),
                "requests": formatted,
                "message": f"Found {len(formatted)} spend request(s)" + (f" with status '{status}'" if status else "")
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "message": f"Failed to list spend requests: {e}"
            }
    
    async def _arun(
        self,
        status: Optional[str] = None,
        limit: int = 10,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> Dict[str, Any]:
        """Async version - currently calls sync version."""
        return self._run(status, limit, run_manager)


class SafeSpendGetSpendTool(BaseTool):
    """
    LangChain tool for getting details of a specific spend request.
    """
    
    name: str = "safe_spend_get_request"
    description: str = (
        "Get detailed information about a specific spend request by ID. "
        "Returns full details including status, amount, rules evaluated, and resolution info."
    )
    args_schema: Type[BaseModel] = GetSpendInput
    
    client: Any = Field(exclude=True)
    
    class Config:
        arbitrary_types_allowed = True
    
    def __init__(self, client: SafeSpendClient, **kwargs):
        """Initialize the get spend tool."""
        super().__init__(client=client, **kwargs)
    
    def _run(
        self,
        spend_id: str,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> Dict[str, Any]:
        """Get spend request details."""
        try:
            spend = self.client.get_spend_request(spend_id)
            
            return {
                "id": spend.get("id"),
                "status": spend.get("status"),
                "amount_cents": spend.get("amount_cents"),
                "amount_dollars": f"${spend.get('amount_cents', 0) / 100:.2f}",
                "vendor": spend.get("vendor"),
                "category": spend.get("category"),
                "description": spend.get("description"),
                "denial_reason": spend.get("denial_reason"),
                "created_at": spend.get("created_at"),
                "resolved_at": spend.get("resolved_at"),
                "message": f"Spend {spend_id}: {spend.get('status')} - ${spend.get('amount_cents', 0) / 100:.2f} to {spend.get('vendor')}"
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "message": f"Failed to get spend request: {e}"
            }
    
    async def _arun(
        self,
        spend_id: str,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> Dict[str, Any]:
        """Async version - currently calls sync version."""
        return self._run(spend_id, run_manager)


# =============================================================================
# Toolkit Factory
# =============================================================================

def create_safespend_toolkit(
    client: SafeSpendClient,
    default_escrow_id: Optional[str] = None,
    include_spend: bool = True,
    include_balance: bool = True,
    include_list: bool = True,
    include_get: bool = True,
) -> List[BaseTool]:
    """
    Create a toolkit of LangChain tools for Safe-Spend.
    
    This is the recommended way to create Safe-Spend tools for use with
    LangChain agents.
    
    Args:
        client: SafeSpendClient instance.
        default_escrow_id: Default escrow ID for all tools.
        include_spend: Include the spend request tool.
        include_balance: Include the balance check tool.
        include_list: Include the list spends tool.
        include_get: Include the get spend details tool.
    
    Returns:
        List of LangChain tools.
    
    Example:
        >>> from langchain.agents import initialize_agent, AgentType
        >>> from langchain_openai import ChatOpenAI
        >>> from safespend import SafeSpendClient
        >>> from safespend.integrations import create_safespend_toolkit
        >>>
        >>> client = SafeSpendClient(
        ...     api_key="sk_test_...",
        ...     base_url="https://api.safespend.app"
        ... )
        >>> tools = create_safespend_toolkit(
        ...     client=client,
        ...     default_escrow_id="esc_abc123"
        ... )
        >>>
        >>> llm = ChatOpenAI(model="gpt-4")
        >>> agent = initialize_agent(
        ...     tools,
        ...     llm,
        ...     agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION,
        ...     verbose=True
        ... )
        >>>
        >>> # Agent can now make governed purchases
        >>> result = agent.run(
        ...     "Buy $25 worth of OpenAI API credits for AI compute"
        ... )
    """
    tools = []
    
    if include_balance:
        tools.append(SafeSpendCheckBalanceTool(
            client=client,
            default_escrow_id=default_escrow_id,
        ))
    
    if include_spend and default_escrow_id:
        tools.append(SafeSpendTool(
            client=client,
            escrow_id=default_escrow_id,
        ))
    
    if include_list:
        tools.append(SafeSpendListSpendsTool(
            client=client,
            default_escrow_id=default_escrow_id,
        ))
    
    if include_get:
        tools.append(SafeSpendGetSpendTool(client=client))
    
    return tools
