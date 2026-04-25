import React from 'react';
import { Helmet } from 'react-helmet';

/**
 * SeoHelmet — reusable SEO wrapper for all public pages
 * Fills in per-page <title>, <meta>, Open Graph, Twitter Cards, and canonical.
 * Also injects JSON-LD on the homepage when `structuredData` is provided.
 */
const SeoHelmet = ({
    title,
    description,
    canonicalPath = '',
    ogImage = 'https://safe-spend.dev/og-image.png',
    ogType = 'website',
    twitterCard = 'summary_large_image',
    noindex = false,
    structuredData = null,
    children,
}) => {
    const canonicalUrl = canonicalPath
        ? `https://safe-spend.dev${canonicalPath}`
        : 'https://safe-spend.dev';

    const pageTitle = title ? `${title} | Safe-Spend` : 'Safe-Spend | Agentic Trust';
    const pageDescription = description ||
        'Policy-based spend control for AI agents. Fund a spending pool, define guardrails, and let your agent spend within them. Every dollar, every decision, every receipt — logged. Part of the Agentic Trust suite.';

    return (
        <Helmet>
            <title>{pageTitle}</title>
            <meta name="description" content={pageDescription} />
            <link rel="canonical" href={canonicalUrl} />
            <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />

            {/* Open Graph */}
            <meta property="og:type" content={ogType} />
            <meta property="og:title" content={pageTitle} />
            <meta property="og:description" content={pageDescription} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:site_name" content="Safe-Spend" />
            <meta property="og:locale" content="en_US" />
            <meta property="og:image" content={ogImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />

            {/* Twitter */}
            <meta name="twitter:card" content={twitterCard} />
            <meta name="twitter:title" content={pageTitle} />
            <meta name="twitter:description" content={pageDescription} />
            <meta name="twitter:image" content={ogImage} />

            {/* Structured Data */}
            {structuredData && (
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            )}

            {children}
        </Helmet>
    );
};

export default SeoHelmet;
