import React, { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Calendar, Clock, User, Tag, ArrowLeft, ChevronLeft, ChevronRight, Rss, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const fetchBlog = async (endpoint) => {
    const res = await fetch(`${API_URL}/api/blog${endpoint}`);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
};

const BlogHeader = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    return (
        <header className="border-b border-gray-100 bg-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 shrink-0">
                    <img src="/logo-safespend-compact-light.svg" alt="Safe-Spend" className="h-7" />
                </Link>
                <nav className="hidden sm:flex items-center gap-8">
                    <Link to="/" className="text-ss-text-tertiary hover:text-ss-text text-sm font-medium transition-colors">Home</Link>
                    <Link to="/dashboard" className="text-ss-text-tertiary hover:text-ss-text text-sm font-medium transition-colors">Dashboard</Link>
                    <Link to="/docs" className="text-ss-text-tertiary hover:text-ss-text text-sm font-medium transition-colors">Docs</Link>
                    <Link to="/blog" className="text-ss-accent text-sm font-medium">Blog</Link>
                    <a href="/api/blog/rss" className="text-ss-text-tertiary hover:text-ss-accent transition-colors" title="RSS Feed">
                        <Rss size={18} />
                    </a>
                </nav>
                <button
                    className="sm:hidden p-2 text-ss-text-tertiary hover:text-ss-text transition-colors"
                    onClick={() => setMenuOpen(!menuOpen)}
                    data-testid="blog-mobile-menu-btn"
                >
                    {menuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>
            <AnimatePresence>
                {menuOpen && (
                    <motion.nav
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="sm:hidden border-t border-gray-100 px-4 pb-4 flex flex-col gap-3 overflow-hidden"
                    >
                        <Link to="/" className="text-ss-text-tertiary hover:text-ss-text text-sm font-medium py-2 transition-colors">Home</Link>
                        <Link to="/dashboard" className="text-ss-text-tertiary hover:text-ss-text text-sm font-medium py-2 transition-colors">Dashboard</Link>
                        <Link to="/docs" className="text-ss-text-tertiary hover:text-ss-text text-sm font-medium py-2 transition-colors">Docs</Link>
                        <Link to="/blog" className="text-ss-accent text-sm font-medium py-2">Blog</Link>
                        <a href="/api/blog/rss" className="text-ss-text-tertiary hover:text-ss-accent text-sm font-medium py-2 flex items-center gap-2 transition-colors">
                            <Rss size={16} /> RSS Feed
                        </a>
                    </motion.nav>
                )}
            </AnimatePresence>
        </header>
    );
};

export const BlogIndexPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [posts, setPosts] = useState([]);
    const [tags, setTags] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    
    const currentTag = searchParams.get('tag');
    const currentPage = parseInt(searchParams.get('page') || '1');
    
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [postsData, tagsData] = await Promise.all([
                    fetchBlog(`/posts?page=${currentPage}&limit=10${currentTag ? `&tag=${encodeURIComponent(currentTag)}` : ''}`),
                    fetchBlog('/tags')
                ]);
                setPosts(postsData.posts);
                setPagination(postsData.pagination);
                setTags(tagsData.tags);
            } catch (err) {
                console.error('Failed to load blog:', err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [currentPage, currentTag]);
    
    const handleTagClick = (tag) => {
        if (tag === currentTag) {
            searchParams.delete('tag');
        } else {
            searchParams.set('tag', tag);
        }
        searchParams.delete('page');
        setSearchParams(searchParams);
    };
    
    const handlePageChange = (newPage) => {
        searchParams.set('page', newPage.toString());
        setSearchParams(searchParams);
    };
    
    return (
        <div className="min-h-screen bg-ss-bg page-enter">
            <Helmet>
                <title>Blog | Safe-Spend</title>
                <meta name="description" content="Insights on AI agent spending controls, spending pools, financial guardrails, and the infrastructure keeping autonomous agents fiscally responsible." />
                <meta property="og:type" content="website" />
                <meta property="og:title" content="Blog | Safe-Spend" />
                <meta property="og:description" content="Insights on AI agent spending controls, spending pools, financial guardrails, and the infrastructure keeping autonomous agents fiscally responsible." />
                <meta property="og:url" content="https://safe-spend.dev/blog" />
                <meta property="og:image" content="https://safe-spend.dev/og-image.png" />
                <link rel="canonical" href="https://safe-spend.dev/blog" />
                <link rel="alternate" type="application/rss+xml" title="Safe-Spend Blog" href="/api/blog/rss" />
            </Helmet>
            
            <BlogHeader />
            
            {/* Hero */}
            <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="text-center py-16 border-b border-gray-100"
            >
                <div className="max-w-3xl mx-auto px-6">
                    <h1 className="text-4xl md:text-5xl font-bold text-ss-text mb-4 font-heading">
                        Safe-Spend Blog
                    </h1>
                    <p className="text-ss-text-secondary text-lg">
                        Insights on AI agent spending controls, spending pools, financial guardrails, and the infrastructure keeping autonomous agents fiscally responsible.
                    </p>
                </div>
            </motion.section>
            
            {/* Tags Filter */}
            {tags.length > 0 && (
                <section className="border-b border-gray-100 py-4 overflow-x-auto">
                    <div className="max-w-6xl mx-auto px-6">
                        <div className="flex gap-3 flex-wrap">
                            <button
                                onClick={() => handleTagClick(null)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                                    !currentTag 
                                        ? 'bg-ss-accent text-white shadow-ss-accent' 
                                        : 'bg-white text-ss-text-secondary hover:text-ss-text border border-gray-200 hover:border-ss-accent/30'
                                }`}
                            >
                                All
                            </button>
                            {tags.slice(0, 10).map(t => (
                                <button
                                    key={t.tag}
                                    onClick={() => handleTagClick(t.tag)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                                        currentTag === t.tag 
                                            ? 'bg-ss-accent text-white shadow-ss-accent' 
                                            : 'bg-white text-ss-text-secondary hover:text-ss-text border border-gray-200 hover:border-ss-accent/30'
                                    }`}
                                >
                                    {t.tag} ({t.count})
                                </button>
                            ))}
                        </div>
                    </div>
                </section>
            )}
            
            {/* Posts Grid */}
            <main className="max-w-6xl mx-auto px-6 py-12">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin h-8 w-8 border-2 border-ss-accent border-t-transparent rounded-full mx-auto"></div>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-20 text-ss-text-tertiary">
                        <p>No posts yet. Check back soon!</p>
                    </div>
                ) : (
                    <motion.div 
                        initial="hidden"
                        animate="show"
                        variants={{
                            hidden: { opacity: 0 },
                            show: { opacity: 1, transition: { staggerChildren: 0.1 } }
                        }}
                        className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
                    >
                        {posts.map(post => (
                            <motion.article
                                key={post.id}
                                variants={{
                                    hidden: { opacity: 0, y: 20 },
                                    show: { opacity: 1, y: 0 }
                                }}
                                className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-ss-accent/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-ss-lg card-hover"
                            >
                                <Link to={`/blog/${post.slug}`}>
                                    {post.cover_image ? (
                                        <img 
                                            src={post.cover_image.url} 
                                            alt={post.cover_image.alt || post.title}
                                            className="w-full h-48 object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-48 bg-ss-elevated flex items-center justify-center text-4xl text-ss-accent/30">
                                            ◆
                                        </div>
                                    )}
                                </Link>
                                <div className="p-6">
                                    <div className="flex items-center gap-4 text-xs text-ss-text-tertiary mb-3">
                                        <span className="flex items-center gap-1">
                                            <User size={12} />
                                            {post.author.name}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            {formatDate(post.published_at || post.created_at)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} />
                                            {post.reading_time_minutes} min
                                        </span>
                                    </div>
                                    <Link to={`/blog/${post.slug}`}>
                                        <h2 className="text-lg font-semibold text-ss-text mb-2 hover:text-ss-accent transition-colors font-heading">
                                            {post.title}
                                        </h2>
                                    </Link>
                                    <p className="text-ss-text-secondary text-sm mb-4 line-clamp-3">
                                        {post.excerpt}
                                    </p>
                                    <div className="flex gap-2 flex-wrap">
                                        {post.tags.slice(0, 3).map(tag => (
                                            <span 
                                                key={tag}
                                                className="px-2 py-1 bg-ss-accent/5 rounded text-xs text-ss-accent"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </motion.article>
                        ))}
                    </motion.div>
                )}
                
                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-12">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-ss-text-tertiary hover:text-ss-text hover:border-ss-accent/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    page === currentPage 
                                        ? 'bg-ss-accent text-white shadow-ss-accent' 
                                        : 'bg-white border border-gray-200 text-ss-text-secondary hover:border-ss-accent/30 hover:text-ss-text'
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= pagination.totalPages}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-ss-text-tertiary hover:text-ss-text hover:border-ss-accent/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}
            </main>
            
            <footer className="border-t border-gray-100 bg-ss-elevated py-8 text-center text-ss-text-tertiary text-sm">
                <p>&copy; {new Date().getFullYear()} AgenticTrust. All rights reserved.</p>
            </footer>
        </div>
    );
};

export const BlogPostPage = () => {
    const { slug } = useParams();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        const loadPost = async () => {
            setLoading(true);
            try {
                const data = await fetchBlog(`/posts/${slug}`);
                setPost(data);
            } catch (err) {
                setError('Post not found');
            } finally {
                setLoading(false);
            }
        };
        loadPost();
    }, [slug]);
    
    if (loading) {
        return (
            <div className="min-h-screen bg-ss-bg flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-ss-accent border-t-transparent rounded-full"></div>
            </div>
        );
    }
    
    if (error || !post) {
        return (
            <div className="min-h-screen bg-ss-bg flex flex-col items-center justify-center">
                <h1 className="text-6xl font-bold text-ss-text mb-4 font-heading">404</h1>
                <p className="text-ss-text-secondary mb-8">Post not found</p>
                <Link 
                    to="/blog" 
                    className="px-6 py-3 bg-ss-accent hover:bg-ss-accent-hover text-white rounded-lg btn-hover shadow-ss-accent transition-all duration-200"
                >
                    Back to Blog
                </Link>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-ss-bg page-enter">
            <Helmet>
                <title>{post.seo?.meta_title || `${post.title} | Safe-Spend`}</title>
                <meta name="description" content={post.seo?.meta_description || post.excerpt} />
                {post.seo?.keywords?.length > 0 && (
                    <meta name="keywords" content={post.seo.keywords.join(', ')} />
                )}
                <meta name="robots" content={post.seo?.robots || 'index, follow'} />
                <link rel="canonical" href={post.seo?.canonical_url || `https://safe-spend.dev/blog/${post.slug}`} />
                <meta property="og:type" content="article" />
                <meta property="og:title" content={post.seo?.og_title || post.title} />
                <meta property="og:description" content={post.seo?.og_description || post.excerpt} />
                <meta property="og:url" content={post.seo?.canonical_url} />
                <meta property="og:image" content={post.seo?.og_image || 'https://safe-spend.dev/og-image.png'} />
                <meta name="twitter:card" content={post.seo?.twitter_card || 'summary_large_image'} />
                <meta name="twitter:title" content={post.seo?.twitter_title || post.title} />
                <meta name="twitter:description" content={post.seo?.twitter_description || post.excerpt} />
                {post.seo?.twitter_image && <meta name="twitter:image" content={post.seo.twitter_image} />}
                {post.seo?.structured_data && (
                    <script type="application/ld+json">
                        {JSON.stringify(post.seo.structured_data)}
                    </script>
                )}
            </Helmet>
            
            <BlogHeader />
            
            <article className="max-w-3xl mx-auto px-6 py-12">
                <Link 
                    to="/blog" 
                    className="inline-flex items-center gap-2 text-ss-text-tertiary hover:text-ss-accent mb-8 transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to Blog
                </Link>
                
                <motion.header 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="text-center mb-12"
                >
                    {post.category && (
                        <span className="inline-block px-4 py-1.5 bg-ss-accent text-white text-xs font-semibold rounded-full uppercase tracking-wider mb-6 shadow-ss-accent">
                            {post.category}
                        </span>
                    )}
                    <h1 className="text-3xl md:text-4xl font-bold text-ss-text mb-6 font-heading leading-tight">
                        {post.title}
                    </h1>
                    <div className="flex items-center justify-center gap-6 text-ss-text-tertiary text-sm">
                        <span className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-ss-accent/10 rounded-full flex items-center justify-center text-ss-accent font-semibold text-sm">
                                {post.author.name.charAt(0)}
                            </div>
                            {post.author.name}
                        </span>
                        <span>{formatDate(post.published_at || post.created_at)}</span>
                        <span>{post.reading_time_minutes} min read</span>
                    </div>
                </motion.header>
                
                {post.cover_image && (
                    <motion.img 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        src={post.cover_image.url} 
                        alt={post.cover_image.alt || post.title}
                        className="w-full rounded-xl mb-12 shadow-ss-lg"
                    />
                )}
                
                <div 
                    className="prose prose-lg max-w-none
                        prose-headings:font-heading prose-headings:text-ss-text
                        prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
                        prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                        prose-p:text-ss-text-secondary prose-p:leading-relaxed prose-p:mb-6
                        prose-a:text-ss-accent prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-ss-text
                        prose-code:bg-ss-elevated prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:text-ss-accent
                        prose-pre:bg-ss-code prose-pre:border prose-pre:border-gray-200 prose-pre:rounded-lg
                        prose-blockquote:border-l-ss-accent prose-blockquote:text-ss-text-secondary prose-blockquote:italic
                        prose-ul:text-ss-text-secondary prose-ol:text-ss-text-secondary
                        prose-li:mb-2"
                    dangerouslySetInnerHTML={{ __html: post.content_html }}
                />
                
                <div className="flex gap-3 flex-wrap pt-8 mt-8 border-t border-gray-100">
                    {post.tags.map(tag => (
                        <Link 
                            key={tag}
                            to={`/blog?tag=${encodeURIComponent(tag)}`}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-ss-text-secondary hover:text-ss-accent hover:border-ss-accent/30 transition-all duration-200"
                        >
                            <Tag size={12} className="inline mr-1.5" />
                            {tag}
                        </Link>
                    ))}
                </div>
            </article>
            
            <footer className="border-t border-gray-100 bg-ss-elevated py-8 text-center text-ss-text-tertiary text-sm">
                <p>&copy; {new Date().getFullYear()} AgenticTrust. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default BlogIndexPage;