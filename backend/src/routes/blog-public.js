/**
 * Blog Public API Routes
 * Public endpoints for accessing published blog content
 */

const express = require('express');
const router = express.Router();
const blogService = require('../services/blog-service');

/**
 * GET /api/blog/posts
 * List published posts with pagination
 */
router.get('/posts', async (req, res) => {
    try {
        const { page = 1, limit = 10, tag, category, featured } = req.query;
        
        const result = await blogService.listPublishedPosts({
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 50), // Max 50 per page
            tag,
            category,
            featured
        });
        
        res.json(result);
    } catch (error) {
        console.error('Error listing blog posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

/**
 * GET /api/blog/posts/:slug
 * Get a single published post by slug
 */
router.get('/posts/:slug', async (req, res) => {
    try {
        const post = await blogService.getPublishedPostBySlug(req.params.slug);
        
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        res.json(post);
    } catch (error) {
        console.error('Error fetching blog post:', error);
        res.status(500).json({ error: 'Failed to fetch post' });
    }
});

/**
 * GET /api/blog/tags
 * List all tags with post counts
 */
router.get('/tags', async (req, res) => {
    try {
        const tags = await blogService.getAllTags();
        res.json({ tags });
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({ error: 'Failed to fetch tags' });
    }
});

/**
 * GET /api/blog/categories
 * List all categories with post counts
 */
router.get('/categories', async (req, res) => {
    try {
        const categories = await blogService.getAllCategories();
        res.json({ categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

/**
 * GET /api/blog/sitemap
 * Blog sitemap XML
 */
router.get('/sitemap', async (req, res) => {
    try {
        const posts = await blogService.getSitemapData();
        
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://safe-spend.dev/blog</loc>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
    </url>
${posts.map(post => `    <url>
        <loc>${post.url}</loc>
        <lastmod>${post.lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>`).join('\n')}
</urlset>`;
        
        res.set('Content-Type', 'application/xml');
        res.send(xml);
    } catch (error) {
        console.error('Error generating sitemap:', error);
        res.status(500).json({ error: 'Failed to generate sitemap' });
    }
});

/**
 * GET /api/blog/rss
 * RSS 2.0 feed
 */
router.get('/rss', async (req, res) => {
    try {
        const posts = await blogService.getRssFeedData();
        
        const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>Safe-Spend Blog</title>
        <link>https://safe-spend.dev/blog</link>
        <description>Insights on AI agent spending controls, escrow, financial guardrails, and the infrastructure keeping autonomous agents fiscally responsible.</description>
        <language>en-us</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <atom:link href="https://safe-spend.dev/blog/rss" rel="self" type="application/rss+xml"/>
        <image>
            <url>https://safe-spend.dev/logo512.png</url>
            <title>Safe-Spend Blog</title>
            <link>https://safe-spend.dev/blog</link>
        </image>
${posts.map(post => `        <item>
            <title><![CDATA[${post.title}]]></title>
            <link>${post.seo.canonical_url}</link>
            <guid isPermaLink="true">${post.seo.canonical_url}</guid>
            <pubDate>${new Date(post.published_at || post.created_at).toUTCString()}</pubDate>
            <description><![CDATA[${post.excerpt}]]></description>
            <content:encoded><![CDATA[${post.content_html}]]></content:encoded>
            <author>${post.author.name}</author>
            ${post.category ? `<category>${post.category}</category>` : ''}
            ${post.tags.map(tag => `<category>${tag}</category>`).join('\n            ')}
        </item>`).join('\n')}
    </channel>
</rss>`;
        
        res.set('Content-Type', 'application/rss+xml');
        res.send(rss);
    } catch (error) {
        console.error('Error generating RSS feed:', error);
        res.status(500).json({ error: 'Failed to generate RSS feed' });
    }
});

module.exports = router;
