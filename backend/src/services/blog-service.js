/**
 * Blog Service
 * Handles blog post operations with auto-computed fields
 */

const { PrismaClient } = require('@prisma/client');
const { marked } = require('marked');
const prisma = new PrismaClient();

// Configure marked for syntax highlighting
marked.setOptions({
    gfm: true,
    breaks: true,
    headerIds: true
});

/**
 * Generate a URL-friendly slug from a title
 */
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        .substring(0, 100);
}

/**
 * Ensure slug is unique by appending a number if needed
 */
async function ensureUniqueSlug(slug, excludeId = null) {
    let uniqueSlug = slug;
    let counter = 1;
    
    while (true) {
        const existing = await prisma.blogPost.findUnique({
            where: { slug: uniqueSlug }
        });
        
        if (!existing || (excludeId && existing.id === excludeId)) {
            return uniqueSlug;
        }
        
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }
}

/**
 * Count words in text
 */
function countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Calculate reading time (250 words per minute)
 */
function calculateReadingTime(wordCount) {
    return Math.max(1, Math.ceil(wordCount / 250));
}

/**
 * Extract excerpt from markdown content
 */
function extractExcerpt(content, maxLength = 155) {
    // Remove markdown formatting
    const plainText = content
        .replace(/#{1,6}\s+/g, '') // Remove headers
        .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.+?)\*/g, '$1') // Remove italic
        .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links
        .replace(/`{1,3}[^`]+`{1,3}/g, '') // Remove code
        .replace(/\n+/g, ' ') // Replace newlines with spaces
        .trim();
    
    // Get first paragraph or truncate
    const firstParagraph = plainText.split(/\n\n/)[0];
    
    if (firstParagraph.length <= maxLength) {
        return firstParagraph;
    }
    
    return firstParagraph.substring(0, maxLength - 3).trim() + '...';
}

/**
 * Generate JSON-LD structured data for a blog post
 */
function generateStructuredData(post) {
    const baseUrl = 'https://safe-spend.dev';
    const canonicalUrl = post.seoCanonicalUrl || `${baseUrl}/blog/${post.slug}`;
    const keywords = post.seoKeywords ? JSON.parse(post.seoKeywords) : [];
    
    return JSON.stringify([
        {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "description": post.seoMetaDescription || post.excerpt,
            "image": post.coverImageUrl || `${baseUrl}/logo512.png`,
            "author": {
                "@type": "Person",
                "name": post.authorName,
                "url": "https://agentictrust.app"
            },
            "publisher": {
                "@type": "Organization",
                "name": "AgenticTrust",
                "url": "https://agentictrust.app",
                "logo": {
                    "@type": "ImageObject",
                    "url": `${baseUrl}/logo512.png`
                }
            },
            "datePublished": post.publishedAt?.toISOString() || post.createdAt.toISOString(),
            "dateModified": post.updatedAt.toISOString(),
            "mainEntityOfPage": canonicalUrl,
            "keywords": keywords.join(', '),
            "wordCount": post.wordCount,
            "articleSection": post.category || "Blog",
            "url": canonicalUrl
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": baseUrl },
                { "@type": "ListItem", "position": 2, "name": "Blog", "item": `${baseUrl}/blog` },
                { "@type": "ListItem", "position": 3, "name": post.title, "item": canonicalUrl }
            ]
        }
    ]);
}

/**
 * Compute all auto-generated fields for a blog post
 */
function computeFields(data, existingPost = null) {
    const baseUrl = 'https://safe-spend.dev';
    const content = data.content || existingPost?.content || '';
    const title = data.title || existingPost?.title || '';
    
    // Compute word count and reading time
    const wordCount = countWords(content);
    const readingTimeMinutes = calculateReadingTime(wordCount);
    
    // Render markdown to HTML
    const contentHtml = marked(content);
    
    // Generate excerpt if not provided
    const excerpt = data.excerpt || extractExcerpt(content);
    
    // Generate slug if not provided
    const slug = data.slug || generateSlug(title);
    
    // SEO defaults
    const seoMetaTitle = data.seo?.meta_title || data.seoMetaTitle || 
        (title ? `${title.substring(0, 50)} | Safe-Spend` : existingPost?.seoMetaTitle);
    
    const seoMetaDescription = data.seo?.meta_description || data.seoMetaDescription || 
        excerpt || existingPost?.seoMetaDescription;
    
    const seoCanonicalUrl = data.seo?.canonical_url || data.seoCanonicalUrl || 
        `${baseUrl}/blog/${slug}`;
    
    const seoOgTitle = data.seo?.og_title || data.seoOgTitle || title;
    const seoOgDescription = data.seo?.og_description || data.seoOgDescription || seoMetaDescription;
    const seoOgImage = data.seo?.og_image || data.seoOgImage || data.cover_image?.url || data.coverImageUrl;
    const seoTwitterTitle = data.seo?.twitter_title || data.seoTwitterTitle || seoOgTitle;
    const seoTwitterDescription = data.seo?.twitter_description || data.seoTwitterDescription || seoOgDescription;
    const seoTwitterImage = data.seo?.twitter_image || data.seoTwitterImage || seoOgImage;
    const seoKeywords = data.seo?.keywords ? JSON.stringify(data.seo.keywords) : 
        (data.seoKeywords || existingPost?.seoKeywords);
    
    return {
        wordCount,
        readingTimeMinutes,
        contentHtml,
        excerpt,
        slug,
        seoMetaTitle,
        seoMetaDescription,
        seoCanonicalUrl,
        seoOgTitle,
        seoOgDescription,
        seoOgImage,
        seoTwitterTitle,
        seoTwitterDescription,
        seoTwitterImage,
        seoKeywords
    };
}

/**
 * Create a new blog post
 */
async function createPost(data) {
    const computed = computeFields(data);
    const uniqueSlug = await ensureUniqueSlug(computed.slug);
    
    const post = await prisma.blogPost.create({
        data: {
            title: data.title,
            slug: uniqueSlug,
            content: data.content,
            contentHtml: computed.contentHtml,
            excerpt: computed.excerpt,
            status: data.status || 'draft',
            
            // Author
            authorName: data.author?.name || data.authorName || 'Safe-Spend Team',
            authorBio: data.author?.bio || data.authorBio,
            authorAvatarUrl: data.author?.avatar_url || data.authorAvatarUrl,
            
            // Cover image
            coverImageUrl: data.cover_image?.url || data.coverImageUrl,
            coverImageAlt: data.cover_image?.alt || data.coverImageAlt,
            
            // Categorization
            tags: JSON.stringify(data.tags || []),
            category: data.category,
            
            // SEO
            seoMetaTitle: computed.seoMetaTitle,
            seoMetaDescription: computed.seoMetaDescription,
            seoCanonicalUrl: computed.seoCanonicalUrl,
            seoOgTitle: computed.seoOgTitle,
            seoOgDescription: computed.seoOgDescription,
            seoOgImage: computed.seoOgImage,
            seoOgType: data.seo?.og_type || 'article',
            seoTwitterCard: data.seo?.twitter_card || 'summary_large_image',
            seoTwitterTitle: computed.seoTwitterTitle,
            seoTwitterDescription: computed.seoTwitterDescription,
            seoTwitterImage: computed.seoTwitterImage,
            seoKeywords: computed.seoKeywords,
            seoRobots: data.seo?.robots || 'index, follow',
            
            // Computed
            wordCount: computed.wordCount,
            readingTimeMinutes: computed.readingTimeMinutes,
            
            // Features
            isFeatured: data.is_featured || data.isFeatured || false,
            relatedPosts: JSON.stringify(data.related_posts || data.relatedPosts || [])
        }
    });
    
    // Generate and update structured data
    const structuredData = generateStructuredData(post);
    await prisma.blogPost.update({
        where: { id: post.id },
        data: { seoStructuredData: structuredData }
    });
    
    return formatPostResponse(await prisma.blogPost.findUnique({ where: { id: post.id } }));
}

/**
 * Update an existing blog post
 */
async function updatePost(id, data) {
    const existingPost = await prisma.blogPost.findUnique({ where: { id } });
    if (!existingPost) {
        throw new Error('Post not found');
    }
    
    const updateData = {};
    
    // Update basic fields if provided
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.is_featured !== undefined || data.isFeatured !== undefined) {
        updateData.isFeatured = data.is_featured || data.isFeatured;
    }
    if (data.related_posts !== undefined || data.relatedPosts !== undefined) {
        updateData.relatedPosts = JSON.stringify(data.related_posts || data.relatedPosts);
    }
    
    // Author updates
    if (data.author?.name || data.authorName) updateData.authorName = data.author?.name || data.authorName;
    if (data.author?.bio || data.authorBio) updateData.authorBio = data.author?.bio || data.authorBio;
    if (data.author?.avatar_url || data.authorAvatarUrl) {
        updateData.authorAvatarUrl = data.author?.avatar_url || data.authorAvatarUrl;
    }
    
    // Cover image updates
    if (data.cover_image?.url || data.coverImageUrl) {
        updateData.coverImageUrl = data.cover_image?.url || data.coverImageUrl;
    }
    if (data.cover_image?.alt || data.coverImageAlt) {
        updateData.coverImageAlt = data.cover_image?.alt || data.coverImageAlt;
    }
    
    // Recompute fields if content or title changed
    if (data.content !== undefined || data.title !== undefined) {
        const computed = computeFields(
            { ...data, content: data.content || existingPost.content, title: data.title || existingPost.title },
            existingPost
        );
        updateData.contentHtml = computed.contentHtml;
        updateData.wordCount = computed.wordCount;
        updateData.readingTimeMinutes = computed.readingTimeMinutes;
        
        if (!data.excerpt) {
            updateData.excerpt = computed.excerpt;
        }
    }
    
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
    
    // Handle slug update
    if (data.slug !== undefined && data.slug !== existingPost.slug) {
        updateData.slug = await ensureUniqueSlug(data.slug, id);
    }
    
    // SEO updates
    if (data.seo) {
        if (data.seo.meta_title) updateData.seoMetaTitle = data.seo.meta_title;
        if (data.seo.meta_description) updateData.seoMetaDescription = data.seo.meta_description;
        if (data.seo.canonical_url) updateData.seoCanonicalUrl = data.seo.canonical_url;
        if (data.seo.og_title) updateData.seoOgTitle = data.seo.og_title;
        if (data.seo.og_description) updateData.seoOgDescription = data.seo.og_description;
        if (data.seo.og_image) updateData.seoOgImage = data.seo.og_image;
        if (data.seo.og_type) updateData.seoOgType = data.seo.og_type;
        if (data.seo.twitter_card) updateData.seoTwitterCard = data.seo.twitter_card;
        if (data.seo.twitter_title) updateData.seoTwitterTitle = data.seo.twitter_title;
        if (data.seo.twitter_description) updateData.seoTwitterDescription = data.seo.twitter_description;
        if (data.seo.twitter_image) updateData.seoTwitterImage = data.seo.twitter_image;
        if (data.seo.keywords) updateData.seoKeywords = JSON.stringify(data.seo.keywords);
        if (data.seo.robots) updateData.seoRobots = data.seo.robots;
    }
    
    const updatedPost = await prisma.blogPost.update({
        where: { id },
        data: updateData
    });
    
    // Regenerate structured data
    const structuredData = generateStructuredData(updatedPost);
    await prisma.blogPost.update({
        where: { id },
        data: { seoStructuredData: structuredData }
    });
    
    return formatPostResponse(await prisma.blogPost.findUnique({ where: { id } }));
}

/**
 * Publish a draft post
 */
async function publishPost(id) {
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
        throw new Error('Post not found');
    }
    
    const updatedPost = await prisma.blogPost.update({
        where: { id },
        data: {
            status: 'published',
            publishedAt: new Date()
        }
    });
    
    // Regenerate structured data with publish date
    const structuredData = generateStructuredData(updatedPost);
    await prisma.blogPost.update({
        where: { id },
        data: { seoStructuredData: structuredData }
    });
    
    return formatPostResponse(await prisma.blogPost.findUnique({ where: { id } }));
}

/**
 * Unpublish a post (revert to draft)
 */
async function unpublishPost(id) {
    const post = await prisma.blogPost.update({
        where: { id },
        data: {
            status: 'draft',
            publishedAt: null
        }
    });
    
    return formatPostResponse(post);
}

/**
 * Soft delete (archive) or hard delete a post
 */
async function deletePost(id, hard = false) {
    if (hard) {
        await prisma.blogPost.delete({ where: { id } });
        return { deleted: true };
    }
    
    const post = await prisma.blogPost.update({
        where: { id },
        data: { status: 'archived' }
    });
    
    return formatPostResponse(post);
}

/**
 * Get a single post by ID
 */
async function getPostById(id) {
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) return null;
    return formatPostResponse(post);
}

/**
 * Get a single published post by slug (increment views)
 */
async function getPublishedPostBySlug(slug) {
    const post = await prisma.blogPost.findUnique({ where: { slug } });
    
    if (!post || post.status !== 'published') {
        return null;
    }
    
    // Increment views
    await prisma.blogPost.update({
        where: { slug },
        data: { views: { increment: 1 } }
    });
    
    return formatPostResponse(post);
}

/**
 * List published posts (public)
 */
async function listPublishedPosts({ page = 1, limit = 10, tag, category, featured } = {}) {
    const skip = (page - 1) * limit;
    
    const where = { status: 'published' };
    
    if (tag) {
        where.tags = { contains: tag };
    }
    
    if (category) {
        where.category = category;
    }
    
    if (featured !== undefined) {
        where.isFeatured = featured === 'true' || featured === true;
    }
    
    const [posts, total] = await Promise.all([
        prisma.blogPost.findMany({
            where,
            orderBy: { publishedAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.blogPost.count({ where })
    ]);
    
    return {
        posts: posts.map(formatPostResponse),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
}

/**
 * List all posts (admin)
 */
async function listAllPosts({ page = 1, limit = 20, status } = {}) {
    const skip = (page - 1) * limit;
    
    const where = {};
    if (status) {
        where.status = status;
    }
    
    const [posts, total] = await Promise.all([
        prisma.blogPost.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.blogPost.count({ where })
    ]);
    
    return {
        posts: posts.map(formatPostResponse),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
}

/**
 * Get all tags with post counts
 */
async function getAllTags() {
    const posts = await prisma.blogPost.findMany({
        where: { status: 'published' },
        select: { tags: true }
    });
    
    const tagCounts = {};
    posts.forEach(post => {
        const tags = JSON.parse(post.tags || '[]');
        tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });
    
    return Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);
}

/**
 * Get all categories with post counts
 */
async function getAllCategories() {
    const posts = await prisma.blogPost.findMany({
        where: { status: 'published', category: { not: null } },
        select: { category: true }
    });
    
    const categoryCounts = {};
    posts.forEach(post => {
        if (post.category) {
            categoryCounts[post.category] = (categoryCounts[post.category] || 0) + 1;
        }
    });
    
    return Object.entries(categoryCounts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);
}

/**
 * Generate sitemap data
 */
async function getSitemapData() {
    const posts = await prisma.blogPost.findMany({
        where: { status: 'published' },
        select: { slug: true, updatedAt: true },
        orderBy: { publishedAt: 'desc' }
    });
    
    return posts.map(post => ({
        url: `https://safe-spend.dev/blog/${post.slug}`,
        lastmod: post.updatedAt.toISOString()
    }));
}

/**
 * Generate RSS feed data
 */
async function getRssFeedData() {
    const posts = await prisma.blogPost.findMany({
        where: { status: 'published' },
        orderBy: { publishedAt: 'desc' },
        take: 20
    });
    
    return posts.map(formatPostResponse);
}

/**
 * Format post for API response
 */
function formatPostResponse(post) {
    if (!post) return null;
    
    return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        content: post.content,
        content_html: post.contentHtml,
        excerpt: post.excerpt,
        status: post.status,
        author: {
            name: post.authorName,
            bio: post.authorBio,
            avatar_url: post.authorAvatarUrl
        },
        cover_image: post.coverImageUrl ? {
            url: post.coverImageUrl,
            alt: post.coverImageAlt
        } : null,
        tags: JSON.parse(post.tags || '[]'),
        category: post.category,
        seo: {
            meta_title: post.seoMetaTitle,
            meta_description: post.seoMetaDescription,
            canonical_url: post.seoCanonicalUrl,
            og_title: post.seoOgTitle,
            og_description: post.seoOgDescription,
            og_image: post.seoOgImage,
            og_type: post.seoOgType,
            twitter_card: post.seoTwitterCard,
            twitter_title: post.seoTwitterTitle,
            twitter_description: post.seoTwitterDescription,
            twitter_image: post.seoTwitterImage,
            keywords: post.seoKeywords ? JSON.parse(post.seoKeywords) : [],
            robots: post.seoRobots,
            structured_data: post.seoStructuredData ? JSON.parse(post.seoStructuredData) : null
        },
        reading_time_minutes: post.readingTimeMinutes,
        word_count: post.wordCount,
        published_at: post.publishedAt?.toISOString() || null,
        scheduled_at: post.scheduledAt?.toISOString() || null,
        created_at: post.createdAt.toISOString(),
        updated_at: post.updatedAt.toISOString(),
        views: post.views,
        is_featured: post.isFeatured,
        related_posts: JSON.parse(post.relatedPosts || '[]')
    };
}

module.exports = {
    createPost,
    updatePost,
    publishPost,
    unpublishPost,
    deletePost,
    getPostById,
    getPublishedPostBySlug,
    listPublishedPosts,
    listAllPosts,
    getAllTags,
    getAllCategories,
    getSitemapData,
    getRssFeedData
};
