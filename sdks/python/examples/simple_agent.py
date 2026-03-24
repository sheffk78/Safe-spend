#!/usr/bin/env python3
"""
Simple Safe-Spend Agent Example

A minimal example showing how to use Safe-Spend with LangChain
to build an AI agent that can make governed purchases.

Requirements:
    pip install safespend[langchain] langchain langchain-openai

Usage:
    export SAFESPEND_API_KEY="sk_agent_..."
    export OPENAI_API_KEY="sk-..."
    python simple_agent.py
"""

import os
from langchain.agents import initialize_agent, AgentType
from langchain_openai import ChatOpenAI
from safespend import SafeSpendClient
from safespend.integrations import create_safespend_toolkit


def main():
    # Initialize clients
    client = SafeSpendClient(
        api_key=os.environ["SAFESPEND_API_KEY"],
        base_url=os.environ.get("SAFESPEND_BASE_URL", "https://api.safespend.app"),
    )
    
    # Create toolkit with your escrow account
    tools = create_safespend_toolkit(
        client=client,
        default_escrow_id=os.environ.get("SAFESPEND_ESCROW_ID", "esc_demo"),
    )
    
    # Initialize LangChain agent
    llm = ChatOpenAI(model="gpt-4", api_key=os.environ["OPENAI_API_KEY"])
    agent = initialize_agent(
        tools,
        llm,
        agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION,
        verbose=True,
    )
    
    # Example: Agent checks budget and makes a purchase
    print("\n" + "=" * 50)
    print("Simple Safe-Spend Agent Demo")
    print("=" * 50)
    
    # Task 1: Check balance
    print("\n[Task 1] Checking balance...")
    result = agent.invoke({
        "input": "Check my available budget balance"
    })
    print(f"Result: {result['output']}")
    
    # Task 2: Make a purchase
    print("\n[Task 2] Making a purchase...")
    result = agent.invoke({
        "input": "Buy $10 worth of OpenAI API credits for AI compute"
    })
    print(f"Result: {result['output']}")
    
    # Task 3: Check remaining balance
    print("\n[Task 3] Checking remaining balance...")
    result = agent.invoke({
        "input": "What's my remaining balance?"
    })
    print(f"Result: {result['output']}")
    
    print("\n" + "=" * 50)
    print("Demo complete!")
    print("=" * 50)


if __name__ == "__main__":
    main()
