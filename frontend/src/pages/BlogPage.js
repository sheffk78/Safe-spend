import React, { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Calendar, Clock, User, Tag, ArrowLeft, ChevronLeft, ChevronRight, Rss, Menu, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

// Fetch helper
const fetchBlog = async (endpoint) => {
    const res = await fetch(`${API_URL}/api/blog${endpoint}`);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};

// Format date
const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
};

// Responsive Blog Header
const BlogHeader = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    return (
        <header className="border-b border-white/[0.06] bg-[#111113]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 text-white font-bold text-xl shrink-0">
                    <span className="text-emerald-500">&#9670;</span>
                    Safe-Spend
                </Link>
                {/* Desktop nav */}
                <nav className="hidden sm:flex items-center gap-8">
                    <Link to="/" className="text-zinc-400 hover:text-white text-sm font-medium">Home</Link>
                    <Link to="/dashboard" className="text-zinc-400 hover:text-white text-sm font-medium">Dashboard</Link>
                    <Link to="/docs" className="text-zinc-400 hover:text-white text-sm font-medium">Docs</Link>
                    <Link to="/blog" className="text-emerald-500 text-sm font-medium">Blog</Link>
                    <a href="/api/blog/rss" className="text-zinc-400 hover:text-white" title="RSS Feed">
                        <Rss size={18} />
                    </a>
                </nav>
                {/* Mobile hamburger */}
                <button
                    className="sm:hidden p-2 text-zinc-400 hover:text-white"
                    onClick={() => setMenuOpen(!menuOpen)}
                    data-testid="blog-mobile-menu-btn"
                >
                    {menuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>
            {/* Mobile dropdown */}
            {menuOpen && (
                <nav className="sm:hidden border-t border-white/[0.06] bg-[#111113] px-4 pb-4 flex flex-col gap-3">
                    <Link to="/" className="text-zinc-400 hover:text-white text-sm font-medium py-2">Home</Link>
                    <Link to="/dashboard" className="text-zinc-400 hover:text-white text-sm font-medium py-2">Dashboard</Link>
                    <Link to="/docs" className="text-zinc-400 hover:text-white text-sm font-medium py-2">Docs</Link>
                    <Link to="/blog" className="text-emerald-500 text-sm font-medium py-2">Blog</Link>
                    <a href="/api/blog/rss" className="text-zinc-400 hover:text-white text-sm font-medium py-2 flex items-center gap-2">
                        <Rss size={16} /> RSS Feed
                    </a>
                </nav>
            )}
        </header>
    );
};

// Blog Index Page
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
        <div className="min-h-screen bg-[#0A0A0B]">
            <Helmet>
                <title>Blog | Safe-Spend</title>
                <meta name="description" content="Insights on AI agent spending controls, escrow, financial guardrails, and the infrastructure keeping autonomous agents fiscally responsible." />
                <link rel="canonical" href="https://safe-spend.dev/blog" />
                <link rel="alternate" type="application/rss+xml" title="Safe-Spend Blog" href="/api/blog/rss" />
            </Helmet>
            
            <BlogHeader />
            
            {/* Hero */}
            <section className="text-center py-16 border-b border-white/[0.06]">
                <div className="max-w-3xl mx-auto px-6">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-['Space_Grotesk']">
                        Safe-Spend Blog
                    </h1>
                    <p className="text-zinc-400 text-lg">
                        Insights on AI agent spending controls, escrow, financial guardrails, and the infrastructure keeping autonomous agents fiscally responsible.
                    </p>
                </div>
            </section>
            
            {/* Tags Filter */}
            {tags.length > 0 && (
                <section className="border-b border-white/[0.06] py-4 overflow-x-auto">
                    <div className="max-w-6xl mx-auto px-6">
                        <div className="flex gap-3 flex-wrap">
                            <button
                                onClick={() => handleTagClick(null)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    !currentTag 
                                        ? 'bg-emerald-500 text-white' 
                                        : 'bg-zinc-800 text-zinc-400 hover:text-white border border-white/[0.06]'
                                }`}
                            >
                                All
                            </button>
                            {tags.slice(0, 10).map(t => (
                                <button
                                    key={t.tag}
                                    onClick={() => handleTagClick(t.tag)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                        currentTag === t.tag 
                                            ? 'bg-emerald-500 text-white' 
                                            : 'bg-zinc-800 text-zinc-400 hover:text-white border border-white/[0.06]'
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
                        <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-20 text-zinc-400">
                        <p>No posts yet. Check back soon!</p>
                    </div>
                ) : (
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {posts.map(post => (
                            <article 
                                key={post.id} 
                                className="bg-[#111113] border border-white/[0.06] rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all hover:-translate-y-1"
                            >
                                <Link to={`/blog/${post.slug}`}>
                                    {post.cover_image ? (
                                        <img 
                                            src={post.cover_image.url} 
                                            alt={post.cover_image.alt || post.title}
                                            className="w-full h-48 object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-48 bg-zinc-800 flex items-center justify-center text-5xl text-emerald-500">
                                            ◆
                                        </div>
                                    )}
                                </Link>
                                <div className="p-6">
                                    <div className="flex items-center gap-4 text-xs text-zinc-500 mb-3">
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
                                        <h2 className="text-lg font-semibold text-white mb-2 hover:text-emerald-500 transition-colors font-['Space_Grotesk']">
                                            {post.title}
                                        </h2>
                                    </Link>
                                    <p className="text-zinc-400 text-sm mb-4 line-clamp-3">
                                        {post.excerpt}
                                    </p>
                                    <div className="flex gap-2 flex-wrap">
                                        {post.tags.slice(0, 3).map(tag => (
                                            <span 
                                                key={tag}
                                                className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-500"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
                
                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-12">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="px-4 py-2 bg-zinc-800 border border-white/[0.06] rounded-lg text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                    page === currentPage 
                                        ? 'bg-emerald-500 text-white' 
                                        : 'bg-zinc-800 border border-white/[0.06] text-zinc-400 hover:text-white'
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= pagination.totalPages}
                            className="px-4 py-2 bg-zinc-800 border border-white/[0.06] rounded-lg text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}
            </main>
            
            {/* Footer */}
            <footer className="border-t border-white/[0.06] bg-[#111113] py-8 text-center text-zinc-500 text-sm">
                <p>&copy; {new Date().getFullYear()} AgenticTrust. All rights reserved.</p>
            </footer>
        </div>
    );
};

// Blog Post Page
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
            <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }
    
    if (error || !post) {
        return (
            <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center text-white">
                <h1 className="text-6xl font-bold mb-4">404</h1>
                <p className="text-zinc-400 mb-8">Post not found</p>
                <Link 
                    to="/blog" 
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors"
                >
                    Back to Blog
                </Link>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-[#0A0A0B]">
            <Helmet>
                <title>{post.seo?.meta_title || `${post.title} | Safe-Spend`}</title>
                <meta name="description" content={post.seo?.meta_description || post.excerpt} />
                {post.seo?.keywords?.length > 0 && (
                    <meta name="keywords" content={post.seo.keywords.join(', ')} />
                )}
                <meta name="robots" content={post.seo?.robots || 'index, follow'} />
                <link rel="canonical" href={post.seo?.canonical_url || `https://safe-spend.dev/blog/${post.slug}`} />
                
                {/* Open Graph */}
                <meta property="og:type" content="article" />
                <meta property="og:title" content={post.seo?.og_title || post.title} />
                <meta property="og:description" content={post.seo?.og_description || post.excerpt} />
                <meta property="og:url" content={post.seo?.canonical_url} />
                {post.seo?.og_image && <meta property="og:image" content={post.seo.og_image} />}
                
                {/* Twitter */}
                <meta name="twitter:card" content={post.seo?.twitter_card || 'summary_large_image'} />
                <meta name="twitter:title" content={post.seo?.twitter_title || post.title} />
                <meta name="twitter:description" content={post.seo?.twitter_description || post.excerpt} />
                {post.seo?.twitter_image && <meta name="twitter:image" content={post.seo.twitter_image} />}
                
                {/* JSON-LD */}
                {post.seo?.structured_data && (
                    <script type="application/ld+json">
                        {JSON.stringify(post.seo.structured_data)}
                    </script>
                )}
            </Helmet>
            
            <BlogHeader />
            
            <article className="max-w-3xl mx-auto px-6 py-12">
                {/* Back Link */}
                <Link 
                    to="/blog" 
                    className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to Blog
                </Link>
                
                {/* Post Header */}
                <header className="text-center mb-12">
                    {post.category && (
                        <span className="inline-block px-4 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-full uppercase tracking-wider mb-6">
                            {post.category}
                        </span>
                    )}
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-6 font-['Space_Grotesk'] leading-tight">
                        {post.title}
                    </h1>
                    <div className="flex items-center justify-center gap-6 text-zinc-400 text-sm">
                        <span className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center text-white font-semibold">
                                {post.author.name.charAt(0)}
                            </div>
                            {post.author.name}
                        </span>
                        <span>{formatDate(post.published_at || post.created_at)}</span>
                        <span>{post.reading_time_minutes} min read</span>
                    </div>
                </header>
                
                {/* Cover Image */}
                {post.cover_image && (
                    <img 
                        src={post.cover_image.url} 
                        alt={post.cover_image.alt || post.title}
                        className="w-full rounded-xl mb-12"
                    />
                )}
                
                {/* Content */}
                <div 
                    className="prose prose-invert prose-emerald max-w-none
                        prose-headings:font-['Space_Grotesk'] prose-headings:text-white
                        prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
                        prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                        prose-p:text-zinc-400 prose-p:leading-relaxed prose-p:mb-6
                        prose-a:text-emerald-500 prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-white
                        prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                        prose-pre:bg-zinc-800 prose-pre:border prose-pre:border-white/[0.06] prose-pre:rounded-lg
                        prose-blockquote:border-l-emerald-500 prose-blockquote:text-zinc-400 prose-blockquote:italic
                        prose-ul:text-zinc-400 prose-ol:text-zinc-400
                        prose-li:mb-2"
                    dangerouslySetInnerHTML={{ __html: post.content_html }}
                />
                
                {/* Tags */}
                <div className="flex gap-3 flex-wrap pt-8 mt-8 border-t border-white/[0.06]">
                    {post.tags.map(tag => (
                        <Link 
                            key={tag}
                            to={`/blog?tag=${encodeURIComponent(tag)}`}
                            className="px-4 py-2 bg-zinc-800 border border-white/[0.06] rounded-full text-sm text-zinc-400 hover:text-white hover:border-emerald-500/50 transition-all"
                        >
                            <Tag size={12} className="inline mr-1.5" />
                            {tag}
                        </Link>
                    ))}
                </div>
            </article>
            
            {/* Footer */}
            <footer className="border-t border-white/[0.06] bg-[#111113] py-8 text-center text-zinc-500 text-sm">
                <p>&copy; {new Date().getFullYear()} AgenticTrust. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default BlogIndexPage;
