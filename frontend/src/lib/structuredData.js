/**
 * Homepage JSON-LD structured data for Safe-Spend.
 * Organization + SoftwareApplication graph.
 * Injected via <SeoHelmet structuredData={homepageStructuredData} /> on the landing page.
 */

export const homepageStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": ["Organization", "SoftwareApplication"],
            "@id": "https://safe-spend.dev/#organization",
            "name": "Safe-Spend",
            "legalName": "Agentic Trust LLC",
            "url": "https://safe-spend.dev",
            "logo": {
                "@type": "ImageObject",
                "@id": "https://safe-spend.dev/#logo",
                "url": "https://safe-spend.dev/logo-safespend-primary.svg",
                "width": 512,
                "height": 512
            },
            "description": "Policy-based spend control for AI agents. Fund a spending pool, define guardrails, and let your agent spend within them. Every dollar, every decision, every receipt — logged. Part of the Agentic Trust suite.",
            "email": "support@agentictrust.app",
            "sameAs": [
                "https://github.com/AgenticTrustHQ",
                "https://agentictrust.app",
                "https://agentauthority.dev"
            ],
            "foundingDate": "2025",
            "knowsAbout": [
                "AI agent spending controls",
                "AI agent escrow",
                "spending governance for autonomous agents",
                "AI agent policy enforcement",
                "autonomous agent budget management",
                "AI spend auditing",
                "agent financial guardrails",
                "LLM spending limits",
                "AI agent payment controls",
                "agent trust infrastructure",
                "AI agent budget compliance",
                "programmatic spending policies",
                "AI agent transaction monitoring",
                "agent fiduciary controls",
                "multi-agent spend orchestration"
            ],
            "applicationCategory": "FinanceApplication",
            "operatingSystem": "Any",
            "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD",
                "description": "Sandbox plan is free forever"
            },
            "potentialAction": {
                "@type": "UseAction",
                "target": "https://safe-spend.dev/signup"
            },
            "contactPoint": {
                "@type": "ContactPoint",
                "email": "support@agentictrust.app",
                "contactType": "Customer Support",
                "availableLanguage": "English"
            }
        },
        {
            "@type": "WebSite",
            "@id": "https://safe-spend.dev/#website",
            "url": "https://safe-spend.dev",
            "name": "Safe-Spend",
            "publisher": {
                "@id": "https://safe-spend.dev/#organization"
            },
            "potentialAction": {
                "@type": "SearchAction",
                "target": {
                    "@type": "EntryPoint",
                    "urlTemplate": "https://safe-spend.dev/blog?q={search_term_string}"
                },
                "query-input": "required name=search_term_string"
            }
        }
    ]
};

/**
 * FAQPage schema for the landing page FAQ section (if present).
 * Attach this as a second graph node when you add an FAQ section.
 */
export const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {
            "@type": "Question",
            "name": "What is Safe-Spend?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Safe-Spend is a policy-based spend control platform for AI agents. It lets you fund a spending pool, define guardrails like per-transaction limits and vendor allowlists, and let your agent spend within them. Every dollar, every decision, and every receipt is logged in an immutable audit trail."
            }
        },
        {
            "@type": "Question",
            "name": "How does Safe-Spend differ from a regular API key or wallet?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Unlike a raw API key or crypto wallet, Safe-Spend enforces policy-based controls before any spend is approved. A 14-step validation cascade checks limits, categories, vendor allowlists, and approval workflows. The agent never holds payment credentials, and every transaction is logged."
            }
        },
        {
            "@type": "Question",
            "name": "What frameworks does Safe-Spend support?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Safe-Spend provides native SDKs and decorators for LangChain, CrewAI, and OpenAI SDK. It also exposes a clean REST API and an MCP server, so it works with any agent framework that can make HTTP calls."
            }
        },
        {
            "@type": "Question",
            "name": "Is Safe-Spend free to try?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. The Sandbox plan is free forever and includes full API access, all framework SDKs, and unlimited test transactions with fake money. Upgrade to Builder or Scale when you're ready for live spending pools."
            }
        }
    ]
};
