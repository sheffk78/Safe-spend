#!/usr/bin/env python3
"""
Budget-Aware Agent Example

This example demonstrates how to build an AI agent that can make governed
spending decisions using Safe-Spend and LangChain.

The agent:
1. Checks available budget before making purchases
2. Makes spend requests through Safe-Spend's escrow system
3. Handles approvals, denials, and pending states gracefully
4. Maintains awareness of remaining budget throughout its tasks

Requirements:
    pip install safespend[langchain] langchain langchain-openai

Usage:
    export SAFESPEND_API_KEY="sk_agent_..."
    export OPENAI_API_KEY="sk-..."
    python budget_aware_agent.py
"""

import os
from typing import Optional

# LangChain imports
from langchain.agents import AgentExecutor, create_structured_chat_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI

# Safe-Spend imports
from safespend import SafeSpendClient
from safespend.integrations import create_safespend_toolkit


def create_budget_aware_agent(
    safespend_api_key: str,
    openai_api_key: str,
    escrow_id: str,
    safespend_base_url: str = "https://api.safe-spend.dev",
    model: str = "gpt-4",
    verbose: bool = True,
) -> AgentExecutor:
    """
    Create a budget-aware LangChain agent with Safe-Spend integration.
    
    Args:
        safespend_api_key: Your Safe-Spend API key (sk_agent_... or sk_test_...)
        openai_api_key: Your OpenAI API key
        escrow_id: The escrow account ID to use for spending
        safespend_base_url: Safe-Spend API base URL
        model: OpenAI model to use
        verbose: Whether to print agent reasoning
    
    Returns:
        AgentExecutor ready to handle budget-aware tasks
    """
    
    # Initialize Safe-Spend client
    client = SafeSpendClient(
        api_key=safespend_api_key,
        base_url=safespend_base_url,
    )
    
    # Create Safe-Spend toolkit
    tools = create_safespend_toolkit(
        client=client,
        default_escrow_id=escrow_id,
    )
    
    # Initialize LLM
    llm = ChatOpenAI(
        model=model,
        api_key=openai_api_key,
        temperature=0,  # Deterministic for financial operations
    )
    
    # Create system prompt for budget-aware behavior
    system_prompt = """You are a Budget-Aware AI Assistant with access to a governed spending account.

## Your Capabilities
You can check your budget balance, make purchases, and review your spending history using these tools:
- safe_spend_check_balance: Check available funds before spending
- safe_spend_request: Make a purchase (requires escrow_id, amount_cents, vendor, category)
- safe_spend_list_requests: View recent transactions
- safe_spend_get_request: Get details of a specific transaction

## Spending Guidelines
1. ALWAYS check your balance before making a purchase
2. If a purchase is denied, explain the reason to the user
3. If a purchase requires approval, inform the user it's pending
4. Keep track of your remaining budget throughout the conversation
5. Refuse to overspend - if a request exceeds your balance, explain why you can't fulfill it

## Response Format
- Be concise and clear about financial transactions
- Always confirm the amount in dollars (not cents) with the user
- Report remaining balance after each successful purchase

Remember: You are spending real money from a governed escrow account. Be responsible!

{tools}

{tool_names}

{agent_scratchpad}"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="chat_history", optional=True),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])
    
    # Create the agent
    agent = create_structured_chat_agent(llm, tools, prompt)
    
    # Create executor with error handling
    executor = AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=verbose,
        handle_parsing_errors=True,
        max_iterations=10,
    )
    
    return executor


def run_interactive_session(agent: AgentExecutor):
    """
    Run an interactive chat session with the budget-aware agent.
    """
    print("\n" + "=" * 60)
    print("Budget-Aware Agent - Interactive Session")
    print("=" * 60)
    print("\nCommands:")
    print("  - Type your request (e.g., 'Buy $50 of OpenAI credits')")
    print("  - Type 'balance' to check your budget")
    print("  - Type 'history' to see recent transactions")
    print("  - Type 'quit' to exit")
    print("=" * 60 + "\n")
    
    chat_history = []
    
    while True:
        try:
            user_input = input("\nYou: ").strip()
            
            if not user_input:
                continue
            
            if user_input.lower() == 'quit':
                print("\nGoodbye! Remember to review your spending in the Safe-Spend dashboard.")
                break
            
            # Shortcuts for common operations
            if user_input.lower() == 'balance':
                user_input = "Check my current budget balance"
            elif user_input.lower() == 'history':
                user_input = "Show my recent transactions"
            
            # Run the agent
            result = agent.invoke({
                "input": user_input,
                "chat_history": chat_history,
            })
            
            print(f"\nAgent: {result['output']}")
            
            # Update chat history
            chat_history.append(("human", user_input))
            chat_history.append(("assistant", result['output']))
            
        except KeyboardInterrupt:
            print("\n\nSession interrupted. Goodbye!")
            break
        except Exception as e:
            print(f"\nError: {e}")
            print("Please try again or type 'quit' to exit.")


def run_demo_scenario(agent: AgentExecutor):
    """
    Run a demo scenario showing the agent's capabilities.
    """
    print("\n" + "=" * 60)
    print("Budget-Aware Agent - Demo Scenario")
    print("=" * 60)
    
    scenarios = [
        "First, check my available budget balance.",
        "I need to purchase $25 worth of OpenAI API credits for AI compute.",
        "Now buy $15 of Anthropic credits for our Claude integration.",
        "What's my remaining balance after these purchases?",
        "Show me my recent transaction history.",
    ]
    
    chat_history = []
    
    for i, scenario in enumerate(scenarios, 1):
        print(f"\n--- Step {i} ---")
        print(f"User: {scenario}")
        
        try:
            result = agent.invoke({
                "input": scenario,
                "chat_history": chat_history,
            })
            
            print(f"Agent: {result['output']}")
            
            chat_history.append(("human", scenario))
            chat_history.append(("assistant", result['output']))
            
        except Exception as e:
            print(f"Error: {e}")
    
    print("\n" + "=" * 60)
    print("Demo Complete!")
    print("=" * 60)


def main():
    """
    Main entry point for the budget-aware agent example.
    """
    # Get configuration from environment
    safespend_api_key = os.environ.get("SAFESPEND_API_KEY")
    openai_api_key = os.environ.get("OPENAI_API_KEY")
    escrow_id = os.environ.get("SAFESPEND_ESCROW_ID", "esc_demo")
    base_url = os.environ.get("SAFESPEND_BASE_URL", "https://api.safe-spend.dev")
    
    # Validate required keys
    if not safespend_api_key:
        print("Error: SAFESPEND_API_KEY environment variable is required")
        print("Get your API key from: https://agentictrust.app/dashboard/keys")
        return
    
    if not openai_api_key:
        print("Error: OPENAI_API_KEY environment variable is required")
        return
    
    print("Initializing Budget-Aware Agent...")
    print(f"  - Safe-Spend API: {base_url}")
    print(f"  - Escrow ID: {escrow_id}")
    
    # Create the agent
    agent = create_budget_aware_agent(
        safespend_api_key=safespend_api_key,
        openai_api_key=openai_api_key,
        escrow_id=escrow_id,
        safespend_base_url=base_url,
        verbose=True,
    )
    
    # Ask user which mode to run
    print("\nSelect mode:")
    print("  1. Interactive session")
    print("  2. Demo scenario")
    
    choice = input("\nEnter choice (1 or 2): ").strip()
    
    if choice == "2":
        run_demo_scenario(agent)
    else:
        run_interactive_session(agent)


if __name__ == "__main__":
    main()
