/**
 * Blog Pages Router
 * Server-rendered HTML pages for SEO-friendly blog content
 */

const express = require('express');
const router = express.Router();
const blogService = require('../services/blog-service');

// Blog page styles (embedded for simplicity)
const getStyles = () => `
    <style>
        :root {
            --bg-primary: #0A0A0B;
            --bg-secondary: #111113;
            --bg-tertiary: #18181B;
            --text-primary: #FAFAFA;
            --text-secondary: #A1A1AA;
            --text-tertiary: #71717A;
            --accent: #10B981;
            --accent-hover: #059669;
            --border: rgba(255, 255, 255, 0.06);
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.7;
            min-height: 100vh;
        }
        
        a { color: var(--accent); text-decoration: none; transition: color 0.2s; }
        a:hover { color: var(--accent-hover); }
        
        .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
        .content-container { max-width: 720px; margin: 0 auto; }
        
        /* Header */
        .header {
            background: var(--bg-secondary);
            border-bottom: 1px solid var(--border);
            padding: 16px 0;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .header-inner {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .logo {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 20px;
            font-weight: 700;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .logo-icon { color: var(--accent); }
        .nav { display: flex; gap: 32px; }
        .nav a { color: var(--text-secondary); font-size: 14px; font-weight: 500; }
        .nav a:hover { color: var(--text-primary); }
        .nav a.active { color: var(--accent); }
        
        /* Hero */
        .hero {
            padding: 80px 0 60px;
            text-align: center;
            border-bottom: 1px solid var(--border);
        }
        .hero h1 {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 48px;
            font-weight: 700;
            margin-bottom: 16px;
        }
        .hero p {
            color: var(--text-secondary);
            font-size: 18px;
            max-width: 600px;
            margin: 0 auto;
        }
        
        /* Tags Filter */
        .tags-bar {
            padding: 24px 0;
            border-bottom: 1px solid var(--border);
            overflow-x: auto;
        }
        .tags-list {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }
        .tag-pill {
            padding: 8px 16px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            border-radius: 20px;
            font-size: 13px;
            color: var(--text-secondary);
            white-space: nowrap;
            transition: all 0.2s;
        }
        .tag-pill:hover, .tag-pill.active {
            background: var(--accent);
            border-color: var(--accent);
            color: white;
        }
        
        /* Post Grid */
        .posts-grid {
            padding: 48px 0;
            display: grid;
            gap: 32px;
        }
        .post-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
            transition: transform 0.2s, border-color 0.2s;
        }
        .post-card:hover {
            transform: translateY(-4px);
            border-color: var(--accent);
        }
        .post-card-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
            background: var(--bg-tertiary);
        }
        .post-card-content { padding: 24px; }
        .post-card-meta {
            display: flex;
            gap: 16px;
            margin-bottom: 12px;
            font-size: 13px;
            color: var(--text-tertiary);
        }
        .post-card h2 {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 22px;
            font-weight: 600;
            margin-bottom: 12px;
            color: var(--text-primary);
        }
        .post-card p {
            color: var(--text-secondary);
            font-size: 15px;
            margin-bottom: 16px;
        }
        .post-card-tags {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .post-card-tag {
            padding: 4px 10px;
            background: var(--bg-tertiary);
            border-radius: 4px;
            font-size: 12px;
            color: var(--text-tertiary);
        }
        
        /* Single Post */
        .post-header {
            padding: 60px 0 40px;
            text-align: center;
        }
        .post-category {
            display: inline-block;
            padding: 6px 14px;
            background: var(--accent);
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            color: white;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .post-title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 42px;
            font-weight: 700;
            line-height: 1.2;
            margin-bottom: 24px;
        }
        .post-meta {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 24px;
            color: var(--text-secondary);
            font-size: 14px;
        }
        .post-author {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .post-author-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--bg-tertiary);
        }
        
        /* Cover Image */
        .post-cover {
            width: 100%;
            max-height: 500px;
            object-fit: cover;
            border-radius: 12px;
            margin-bottom: 48px;
        }
        
        /* Post Content */
        .post-content {
            padding-bottom: 60px;
        }
        .post-content h1, .post-content h2, .post-content h3, .post-content h4 {
            font-family: 'Space Grotesk', sans-serif;
            color: var(--text-primary);
            margin-top: 48px;
            margin-bottom: 16px;
        }
        .post-content h2 { font-size: 28px; }
        .post-content h3 { font-size: 22px; }
        .post-content p {
            margin-bottom: 24px;
            color: var(--text-secondary);
        }
        .post-content ul, .post-content ol {
            margin-bottom: 24px;
            padding-left: 24px;
            color: var(--text-secondary);
        }
        .post-content li { margin-bottom: 8px; }
        .post-content blockquote {
            border-left: 4px solid var(--accent);
            padding-left: 20px;
            margin: 32px 0;
            font-style: italic;
            color: var(--text-secondary);
        }
        .post-content img {
            max-width: 100%;
            border-radius: 8px;
            margin: 24px 0;
        }
        .post-content code {
            background: var(--bg-tertiary);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
        }
        .post-content pre {
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 20px;
            overflow-x: auto;
            margin: 24px 0;
        }
        .post-content pre code {
            background: none;
            padding: 0;
        }
        
        /* Post Footer */
        .post-tags {
            padding: 32px 0;
            border-top: 1px solid var(--border);
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }
        
        /* Pagination */
        .pagination {
            display: flex;
            justify-content: center;
            gap: 12px;
            padding: 32px 0;
        }
        .pagination a, .pagination span {
            padding: 10px 16px;
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 8px;
            font-size: 14px;
            color: var(--text-secondary);
        }
        .pagination a:hover { border-color: var(--accent); color: var(--accent); }
        .pagination .active { background: var(--accent); border-color: var(--accent); color: white; }
        
        /* Footer */
        .footer {
            background: var(--bg-secondary);
            border-top: 1px solid var(--border);
            padding: 40px 0;
            text-align: center;
            color: var(--text-tertiary);
            font-size: 14px;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .hero h1 { font-size: 32px; }
            .post-title { font-size: 28px; }
            .post-meta { flex-direction: column; gap: 12px; }
            .nav { gap: 16px; }
        }
    </style>
`;

// Common HTML head
const getHead = (title, description, seo = {}, extra = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    ${seo.keywords ? `<meta name="keywords" content="${Array.isArray(seo.keywords) ? seo.keywords.join(', ') : seo.keywords}">` : ''}
    <meta name="robots" content="${seo.robots || 'index, follow'}">
    <link rel="canonical" href="${seo.canonical_url || 'https://safe-spend.dev/blog'}">
    
    <!-- Open Graph -->
    <meta property="og:type" content="${seo.og_type || 'website'}">
    <meta property="og:title" content="${seo.og_title || title}">
    <meta property="og:description" content="${seo.og_description || description}">
    <meta property="og:url" content="${seo.canonical_url || 'https://safe-spend.dev/blog'}">
    ${seo.og_image ? `<meta property="og:image" content="${seo.og_image}">` : ''}
    
    <!-- Twitter -->
    <meta name="twitter:card" content="${seo.twitter_card || 'summary_large_image'}">
    <meta name="twitter:title" content="${seo.twitter_title || title}">
    <meta name="twitter:description" content="${seo.twitter_description || description}">
    ${seo.twitter_image ? `<meta name="twitter:image" content="${seo.twitter_image}">` : ''}
    
    <!-- RSS -->
    <link rel="alternate" type="application/rss+xml" title="Safe-Spend Blog" href="/blog/rss">
    
    <!-- Favicon -->
    <link rel="icon" href="/favicon.ico">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
    
    ${getStyles()}
    ${extra}
</head>
`;

// Header component
const getHeader = (activePage = 'blog') => `
<header class="header">
    <div class="container header-inner">
        <a href="/" class="logo">
            <span class="logo-icon">◆</span>
            Safe-Spend
        </a>
        <nav class="nav">
            <a href="/">Home</a>
            <a href="/dashboard">Dashboard</a>
            <a href="/docs">Docs</a>
            <a href="/blog" class="${activePage === 'blog' ? 'active' : ''}">Blog</a>
        </nav>
    </div>
</header>
`;

// Footer component
const getFooter = () => `
<footer class="footer">
    <div class="container">
        <p>&copy; ${new Date().getFullYear()} AgenticTrust. All rights reserved.</p>
    </div>
</footer>
`;

/**
 * GET /blog
 * Blog index page
 */
router.get('/', async (req, res) => {
    try {
        const { page = 1, tag, category } = req.query;
        const result = await blogService.listPublishedPosts({
            page: parseInt(page),
            limit: 10,
            tag,
            category
        });
        
        const tags = await blogService.getAllTags();
        
        const html = `
${getHead(
    'Blog | Safe-Spend',
    'Insights on AI agent spending controls, escrow, financial guardrails, and the infrastructure keeping autonomous agents fiscally responsible.',
    { canonical_url: 'https://safe-spend.dev/blog' }
)}
<body>
    ${getHeader('blog')}
    
    <section class="hero">
        <div class="container">
            <h1>Safe-Spend Blog</h1>
            <p>Insights on AI agent spending controls, escrow, financial guardrails, and the infrastructure keeping autonomous agents fiscally responsible.</p>
        </div>
    </section>
    
    ${tags.length > 0 ? `
    <section class="tags-bar">
        <div class="container">
            <div class="tags-list">
                <a href="/blog" class="tag-pill ${!tag ? 'active' : ''}">All</a>
                ${tags.slice(0, 10).map(t => `
                    <a href="/blog?tag=${encodeURIComponent(t.tag)}" class="tag-pill ${tag === t.tag ? 'active' : ''}">${t.tag} (${t.count})</a>
                `).join('')}
            </div>
        </div>
    </section>
    ` : ''}
    
    <main class="container">
        <div class="posts-grid">
            ${result.posts.length === 0 ? `
                <p style="text-align: center; color: var(--text-secondary); padding: 60px 0;">
                    No posts yet. Check back soon!
                </p>
            ` : result.posts.map(post => `
                <article class="post-card">
                    <a href="/blog/${post.slug}">
                        ${post.cover_image ? `
                            <img src="${post.cover_image.url}" alt="${post.cover_image.alt || post.title}" class="post-card-image">
                        ` : `
                            <div class="post-card-image" style="display: flex; align-items: center; justify-content: center; font-size: 48px; color: var(--accent);">◆</div>
                        `}
                    </a>
                    <div class="post-card-content">
                        <div class="post-card-meta">
                            <span>${post.author.name}</span>
                            <span>${new Date(post.published_at || post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span>${post.reading_time_minutes} min read</span>
                        </div>
                        <a href="/blog/${post.slug}">
                            <h2>${post.title}</h2>
                        </a>
                        <p>${post.excerpt}</p>
                        <div class="post-card-tags">
                            ${post.tags.slice(0, 3).map(t => `<span class="post-card-tag">${t}</span>`).join('')}
                        </div>
                    </div>
                </article>
            `).join('')}
        </div>
        
        ${result.pagination.totalPages > 1 ? `
        <div class="pagination">
            ${result.pagination.page > 1 ? `<a href="/blog?page=${result.pagination.page - 1}${tag ? '&tag=' + tag : ''}">← Previous</a>` : ''}
            ${Array.from({ length: Math.min(result.pagination.totalPages, 5) }, (_, i) => i + 1).map(p => `
                <a href="/blog?page=${p}${tag ? '&tag=' + tag : ''}" class="${p === result.pagination.page ? 'active' : ''}">${p}</a>
            `).join('')}
            ${result.pagination.page < result.pagination.totalPages ? `<a href="/blog?page=${result.pagination.page + 1}${tag ? '&tag=' + tag : ''}">Next →</a>` : ''}
        </div>
        ` : ''}
    </main>
    
    ${getFooter()}
</body>
</html>
`;
        
        res.send(html);
    } catch (error) {
        console.error('Error rendering blog index:', error);
        res.status(500).send('Error loading blog');
    }
});

/**
 * GET /blog/tag/:tag
 * Tag filter page
 */
router.get('/tag/:tag', async (req, res) => {
    const tag = req.params.tag;
    res.redirect(`/blog?tag=${encodeURIComponent(tag)}`);
});

/**
 * GET /blog/rss
 * RSS feed (redirect to API)
 */
router.get('/rss', (req, res) => {
    res.redirect('/api/blog/rss');
});

/**
 * GET /blog/sitemap.xml
 * Sitemap (redirect to API)
 */
router.get('/sitemap.xml', (req, res) => {
    res.redirect('/api/blog/sitemap');
});

/**
 * GET /blog/:slug
 * Single post page
 */
router.get('/:slug', async (req, res) => {
    try {
        const post = await blogService.getPublishedPostBySlug(req.params.slug);
        
        if (!post) {
            return res.status(404).send(`
${getHead('Post Not Found | Safe-Spend', 'The requested post could not be found.')}
<body>
    ${getHeader('blog')}
    <main class="container" style="padding: 100px 0; text-align: center;">
        <h1 style="font-size: 48px; margin-bottom: 20px;">404</h1>
        <p style="color: var(--text-secondary); margin-bottom: 30px;">The post you're looking for doesn't exist.</p>
        <a href="/blog" style="padding: 12px 24px; background: var(--accent); color: white; border-radius: 8px;">Back to Blog</a>
    </main>
    ${getFooter()}
</body>
</html>
            `);
        }
        
        const structuredDataScript = post.seo.structured_data ? `
    <script type="application/ld+json">
    ${JSON.stringify(post.seo.structured_data)}
    </script>
        ` : '';
        
        const html = `
${getHead(
    post.seo.meta_title || `${post.title} | Safe-Spend`,
    post.seo.meta_description || post.excerpt,
    post.seo,
    structuredDataScript
)}
<body>
    ${getHeader('blog')}
    
    <article>
        <header class="post-header">
            <div class="content-container">
                ${post.category ? `<span class="post-category">${post.category}</span>` : ''}
                <h1 class="post-title">${post.title}</h1>
                <div class="post-meta">
                    <div class="post-author">
                        ${post.author.avatar_url ? `
                            <img src="${post.author.avatar_url}" alt="${post.author.name}" class="post-author-avatar">
                        ` : `
                            <div class="post-author-avatar" style="display: flex; align-items: center; justify-content: center; font-weight: 600;">${post.author.name.charAt(0)}</div>
                        `}
                        <span>${post.author.name}</span>
                    </div>
                    <span>${new Date(post.published_at || post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    <span>${post.reading_time_minutes} min read</span>
                </div>
            </div>
        </header>
        
        ${post.cover_image ? `
        <div class="container">
            <img src="${post.cover_image.url}" alt="${post.cover_image.alt || post.title}" class="post-cover">
        </div>
        ` : ''}
        
        <div class="content-container post-content">
            ${post.content_html}
        </div>
        
        <div class="content-container post-tags">
            ${post.tags.map(t => `<a href="/blog?tag=${encodeURIComponent(t)}" class="tag-pill">${t}</a>`).join('')}
        </div>
    </article>
    
    ${getFooter()}
</body>
</html>
`;
        
        res.send(html);
    } catch (error) {
        console.error('Error rendering blog post:', error);
        res.status(500).send('Error loading post');
    }
});

module.exports = router;
