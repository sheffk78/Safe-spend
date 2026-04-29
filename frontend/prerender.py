#!/usr/bin/env python3
"""
prerender.py — Generate per-route HTML with proper meta tags and JSON-LD
for SEO and AI crawler visibility. Run AFTER npm run build.
"""

import json
import os
import re
import sys

BUILD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build")

ROUTES = {
    "/": {
        "title": "Safe-Spend — Fiduciary Rails for AI Agents",
        "description": "Connect AI agents to card rails with fiduciary guardrails. Spending limits, policy enforcement, and audit trails — so agents spend like they have a trustee watching.",
        "canonical": "https://safe-spend.dev/",
    },
    "/pricing": {
        "title": "Pricing — Safe-Spend",
        "description": "Start free. Builder plan $29/mo, Scale plan $149/mo. Fiduciary spending controls for AI agents with spending pools, policy engine, and audit trail.",
        "canonical": "https://safe-spend.dev/pricing",
    },
    "/docs": {
        "title": "Documentation — Safe-Spend",
        "description": "Complete API documentation, integration guides, SDK reference, and quickstart for Safe-Spend fiduciary rails.",
        "canonical": "https://safe-spend.dev/docs",
    },
    "/docs/quickstart": {
        "title": "Quickstart — Safe-Spend Docs",
        "description": "Create your first escrow, set a policy, and make a spend request in under 5 minutes. Step-by-step quickstart with Python, JavaScript, and cURL examples.",
        "canonical": "https://safe-spend.dev/docs/quickstart",
    },
    "/docs/api-reference": {
        "title": "API Reference — Safe-Spend Docs",
        "description": "Full REST API reference for Safe-Spend. Escrow accounts, spending policies, spend requests, approvals, webhooks, and subscriptions.",
        "canonical": "https://safe-spend.dev/docs/api-reference",
    },
    "/docs/integrations": {
        "title": "Integrations — Safe-Spend Docs",
        "description": "Connect Safe-Spend to LangChain, CrewAI, AutoGPT, and other agent frameworks. Native Python SDK and JavaScript examples.",
        "canonical": "https://safe-spend.dev/docs/integrations",
    },
    "/docs/sdks": {
        "title": "SDKs — Safe-Spend Docs",
        "description": "Official Python SDK for Safe-Spend. Install with pip, use with LangChain, async support with httpx.",
        "canonical": "https://safe-spend.dev/docs/sdks",
    },
    "/docs/webhooks": {
        "title": "Webhooks — Safe-Spend Docs",
        "description": "Real-time webhook notifications for approvals, denials, escalations, and AAV events. Configure in the dashboard or via API.",
        "canonical": "https://safe-spend.dev/docs/webhooks",
    },
    "/docs/aav-integration": {
        "title": "AAV Integration — Safe-Spend Docs",
        "description": "Two-layer security: Agent Authority Vault for who can spend, Safe-Spend for what can be spent. Enforce modes: none, warn, strict, verify.",
        "canonical": "https://safe-spend.dev/docs/aav-integration",
    },
    "/docs/concepts": {
        "title": "Concepts — Safe-Spend Docs",
        "description": "Escrow accounts, spending policies, approval workflows, and the 14-step rules engine explained.",
        "canonical": "https://safe-spend.dev/docs/concepts",
    },
    "/docs/trust-law": {
        "title": "Trust Law & Fiduciary Duty — Safe-Spend Docs",
        "description": "Why card rails aren't enough — the legal and compliance case for fiduciary spending controls over AI agents.",
        "canonical": "https://safe-spend.dev/docs/trust-law",
    },
    "/signup": {
        "title": "Sign Up — Safe-Spend",
        "description": "Create your Safe-Spend account. Start free, no credit card required. Add fiduciary guardrails to your AI agents in under 10 minutes.",
        "canonical": "https://safe-spend.dev/signup",
    },
    "/login": {
        "title": "Log In — Safe-Spend",
        "description": "Log in to your Safe-Spend dashboard.",
        "canonical": "https://safe-spend.dev/login",
    },
    "/playground": {
        "title": "Playground — Safe-Spend",
        "description": "Try Safe-Spend interactively. Create escrow accounts, set policies, and make spend requests — no account needed.",
        "canonical": "https://safe-spend.dev/playground",
    },
    "/terms": {
        "title": "Terms of Service — Safe-Spend",
        "description": "Terms of Service for Safe-Spend by AgenticTrust.",
        "canonical": "https://safe-spend.dev/terms",
    },
    "/privacy": {
        "title": "Privacy Policy — Safe-Spend",
        "description": "Privacy Policy for Safe-Spend by AgenticTrust.",
        "canonical": "https://safe-spend.dev/privacy",
    },
}

# Organization JSON-LD
ORG_JSONLD = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@id": "https://safe-spend.dev/#organization",
            "@type": "Organization",
            "name": "Safe-Spend",
            "legalName": "Safe-Spend by AgenticTrust",
            "url": "https://safe-spend.dev",
            "logo": "https://safe-spend.dev/logo.svg",
            "description": "Fiduciary rails for AI agents — spending limits, policy enforcement, and audit trails for autonomous systems.",
            "foundingDate": "2025",
            "email": "support@agentictrust.app",
            "contactPoint": {
                "@type": "ContactPoint",
                "email": "support@agentictrust.app",
                "contactType": "customer support",
            },
            "sameAs": [
                "https://github.com/sheffk78/safe-spend",
                "https://github.com/sheffk78/safespend-python",
                "https://discord.com/invite/clawd",
                "https://x.com/agentictrust",
            ],
            "knowsAbout": [
                "AI agent spending controls",
                "fiduciary rails",
                "escrow accounts for AI",
                "spending policy enforcement",
                "agent authorization",
                "AI governance",
                "autonomous system trust",
                "spending limits for AI",
                "audit trails for AI agents",
                "LangChain spending tools",
                "agent payment controls",
                "fiduciary duty AI",
                "trust law AI agents",
                "card rails vs fiduciary rails",
                "agent authority vault",
            ],
        },
        {
            "@id": "https://safe-spend.dev/#website",
            "@type": "WebSite",
            "name": "Safe-Spend",
            "url": "https://safe-spend.dev",
        },
    ],
}

# SoftwareApplication JSON-LD (homepage only)
APP_JSONLD = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Safe-Spend",
    "url": "https://safe-spend.dev",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": "Fiduciary rails for AI agents — spending limits, policy enforcement, and audit trails for autonomous systems.",
    "offers": [
        {
            "@type": "Offer",
            "name": "Sandbox",
            "price": "0",
            "priceCurrency": "USD",
            "description": "Test mode — no real transactions",
        },
        {
            "@type": "Offer",
            "name": "Builder",
            "price": "29",
            "priceCurrency": "USD",
            "description": "For teams building agent infrastructure",
        },
        {
            "@type": "Offer",
            "name": "Scale",
            "price": "149",
            "priceCurrency": "USD",
            "description": "For organizations running agents in production",
        },
    ],
}


def prerender():
    print("=== Prerendering Safe-Spend routes ===")

    # Read base index.html
    with open(os.path.join(BUILD_DIR, "index.html"), "r") as f:
        base_html = f.read()

    for route, meta in ROUTES.items():
        title = meta["title"]
        desc = meta["description"]
        canonical = meta["canonical"]

        # Determine output path
        if route == "/":
            output_file = os.path.join(BUILD_DIR, "index.html")
        else:
            output_dir = os.path.join(BUILD_DIR, route.lstrip("/"))
            os.makedirs(output_dir, exist_ok=True)
            output_file = os.path.join(output_dir, "index.html")

        # Start with base HTML
        html = base_html

        # Replace title
        html = re.sub(r"<title>[^<]*</title>", f"<title>{title}</title>", html)

        # Add/update meta description
        if 'name="description"' in html:
            html = re.sub(
                r'<meta\s+name="description"\s+content="[^"]*"',
                f'<meta name="description" content="{desc}"',
                html,
            )
        else:
            html = html.replace(
                "</title>", f'</title>\n    <meta name="description" content="{desc}" />'
            )

        # Add canonical link
        if 'rel="canonical"' in html:
            html = re.sub(
                r'<link\s+rel="canonical"\s+href="[^"]*"',
                f'<link rel="canonical" href="{canonical}"',
                html,
            )
        else:
            html = html.replace(
                "</head>",
                f'    <link rel="canonical" href="{canonical}" />\n</head>',
            )

        # Add Open Graph tags
        og_tags = f"""    <meta property="og:title" content="{title}" />
    <meta property="og:description" content="{desc}" />
    <meta property="og:url" content="{canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Safe-Spend" />"""
        html = html.replace("</head>", f"{og_tags}\n</head>")

        # Add Twitter card tags
        twitter_tags = f"""    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="{title}" />
    <meta name="twitter:description" content="{desc}" />"""
        html = html.replace("</head>", f"{twitter_tags}\n</head>")

        # Add JSON-LD
        if route == "/":
            jsonld_data = [ORG_JSONLD, APP_JSONLD]
        else:
            jsonld_data = ORG_JSONLD

        jsonld_tag = f'<script type="application/ld+json">{json.dumps(jsonld_data, separators=(",", ":"))}</script>'
        html = html.replace("</head>", f"    {jsonld_tag}\n</head>")

        # Write output
        with open(output_file, "w") as f:
            f.write(html)

        print(f"✅ Prerendered: {route} → {output_file}")

    print(f"\n=== Prerender complete. {len(ROUTES)} routes generated. ===")


if __name__ == "__main__":
    prerender()