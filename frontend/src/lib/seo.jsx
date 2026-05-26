import React from 'react';
import { Helmet } from 'react-helmet-async';

// Per-route SEO configuration
export const routeSEO = {
  '/': {
    title: 'Safe-Spend | Spending Governance for AI Agents',
    description: 'Policy-based spend control for AI agents. Fund a spending pool, define guardrails, your agent spends within them. Every dollar logged.',
    ogType: 'website',
    ogImage: 'https://safe-spend.dev/og-image.png',
  },
  '/about': {
    title: 'About Safe-Spend | Agentic Trust',
    description: 'Safe-Spend is built by Agentic Trust — trust-grade infrastructure for autonomous agents. Learn about our team and mission.',
    ogType: 'website',
    ogImage: 'https://safe-spend.dev/og-image.png',
  },
  '/pricing': {
    title: 'Pricing | Safe-Spend — Spend Controls for AI',
    description: 'Transparent pricing for Safe-Spend. Free tier available. Scale as your agent fleet grows. No hidden fees.',
    ogType: 'website',
    ogImage: 'https://safe-spend.dev/og-image.png',
  },
  '/features': {
    title: 'Features | Safe-Spend — Policy Engine, Protected Accounts, Audit Trail',
    description: 'Explore Safe-Spend features: policy-based spending rules, segregated protected accounts, approval workflows, and complete audit trails for AI agents.',
    ogType: 'website',
    ogImage: 'https://safe-spend.dev/og-image.png',
  },
  '/faq': {
    title: 'FAQ | Safe-Spend',
    description: 'Common questions about Safe-Spend: how protected accounts work, policy enforcement, API integration, and security.',
    ogType: 'website',
    ogImage: 'https://safe-spend.dev/og-image.png',
  },
  '/docs': {
    title: 'Documentation | Safe-Spend API & SDKs',
    description: 'Developer documentation for Safe-Spend. API reference, quickstart guides, SDKs for Python and TypeScript, webhook setup, and more.',
    ogType: 'website',
    ogImage: 'https://safe-spend.dev/og-image.png',
  },
  '/playground': {
    title: 'API Playground | Safe-Spend',
    description: 'Try the Safe-Spend API in your browser. Create protected accounts, define policies, and test spend requests — no signup required.',
    ogType: 'website',
    ogImage: 'https://safe-spend.dev/og-image.png',
  },
  '/signup': {
    title: 'Get Started | Safe-Spend — Free API Keys',
    description: 'Create your free Safe-Spend account. Get API keys, set up your first protected account, and define spending policies in minutes.',
    ogType: 'website',
    ogImage: 'https://safe-spend.dev/og-image.png',
  },
  '/contact': {
    title: 'Contact | Safe-Spend',
    description: 'Get in touch with the Safe-Spend team. Sales, support, and partnership inquiries.',
    ogType: 'website',
    ogImage: 'https://safe-spend.dev/og-image.png',
  },
  '/terms': {
    title: 'Terms of Service | Safe-Spend',
    description: 'Safe-Spend terms of service and usage policies.',
    ogType: 'website',
    ogImage: 'https://safe-spend.dev/og-image.png',
  },
  '/privacy': {
    title: 'Privacy Policy | Safe-Spend',
    description: 'Safe-Spend privacy policy. How we handle your data and protect your information.',
    ogType: 'website',
    ogImage: 'https://safe-spend.dev/og-image.png',
  },
  '/blog': {
    title: 'Blog | Safe-Spend — AI Spending Governance',
    description: 'Insights on AI agent spending, protected accounts, policy-based governance, and the future of autonomous financial controls.',
    ogType: 'website',
    ogImage: 'https://safe-spend.dev/og-image.png',
  },
  '/login': {
    title: 'Log In | Safe-Spend',
    description: 'Log in to your Safe-Spend dashboard.',
    ogType: 'website',
    ogImage: 'https://safe-spend.dev/og-image.png',
  },
};

// Default fallback
const defaultSEO = {
  title: 'Safe-Spend | Spending Governance for AI Agents',
  description: 'Policy-based spend control for AI agents. Fund a spending pool, define guardrails, your agent spends within them. Every dollar logged.',
  ogType: 'website',
  ogImage: 'https://safe-spend.dev/og-image.png',
};

// Organization JSON-LD schema
export const organizationSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "SoftwareCompany"],
      "@id": "https://safe-spend.dev/#organization",
      "name": "Safe-Spend",
      "alternateName": "SafeSpend",
      "legalName": "Agentic Trust",
      "url": "https://safe-spend.dev",
      "logo": {
        "@type": "ImageObject",
        "url": "https://safe-spend.dev/logo-safespend-primary.svg",
        "width": 512,
        "height": 128
      },
      "description": "Fiat-first protected-account and spending control for AI agents. Policy-based governance, segregated accounts, and complete audit trails.",
      "email": "support@safe-spend.dev",
      "foundingDate": "2025",
      "founder": {
        "@type": "Person",
        "@id": "https://safe-spend.dev/#founder",
        "name": "Jeffrey Kohler"
      },
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Heber City",
        "addressRegion": "UT",
        "addressCountry": "US"
      },
      "areaServed": "WW",
      "priceRange": "$0-$299/mo",
      "sameAs": [
        "https://x.com/AgenticTrustKit",
        "https://github.com/sheffk78/Safe-spend",
        "https://www.linkedin.com/company/agentictrust"
      ],
      "knowsAbout": [
        "AI agent spending controls",
        "protected account infrastructure",
        "policy-based governance",
        "spending compliance",
        "autonomous agent management",
        "spending policy engine",
        "AI safety",
        "agent authorization",
        "spending audit trails",
        "programmable protected accounts",
        "agent budget controls",
        "AI financial governance",
        "trust infrastructure",
        "agent spend limits",
        "approval workflows"
      ],
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Safe-Spend Plans",
        "itemListElement": [
          {
            "@type": "Offer",
            "name": "Free Tier",
            "description": "Up to 3 agents, $100/mo protected account cap, basic policies",
            "price": "0",
            "priceCurrency": "USD"
          },
          {
            "@type": "Offer",
            "name": "Pro",
            "description": "Unlimited agents, $10,000/mo protected account cap, advanced policies, approval workflows",
            "price": "49",
            "priceCurrency": "USD"
          },
          {
            "@type": "Offer",
            "name": "Enterprise",
            "description": "Custom limits, SSO, dedicated support, compliance reporting",
            "price": "299",
            "priceCurrency": "USD"
          }
        ]
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer support",
        "email": "support@safe-spend.dev"
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://safe-spend.dev/#website",
      "url": "https://safe-spend.dev",
      "name": "Safe-Spend",
      "publisher": { "@id": "https://safe-spend.dev/#organization" },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://safe-spend.dev/docs/api-reference?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }
  ]
};

export function SEOHead({ pathname = '/' }) {
  const seo = routeSEO[pathname] || defaultSEO;
  const canonicalUrl = `https://safe-spend.dev${pathname}`;
  const isNoIndex = ['/login'].includes(pathname);

  return (
    <Helmet>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <link rel="canonical" href={canonicalUrl} />
      {isNoIndex && <meta name="robots" content="noindex, nofollow" />}
      {!isNoIndex && <meta name="robots" content="index, follow" />}

      {/* Open Graph */}
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content="Safe-Spend" />
      <meta property="og:type" content={seo.ogType} />
      <meta property="og:image" content={seo.ogImage} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content={seo.ogImage} />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />

      {/* JSON-LD Schema */}
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
    </Helmet>
  );
}