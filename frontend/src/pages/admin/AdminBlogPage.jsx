/**
 * Admin Blog Manager Page
 * Blog post management with CRUD operations
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '@/contexts/AdminContext';
import {
    DocumentTextIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    EyeIcon,
    ArrowPathIcon,
    MagnifyingGlassIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';

// Format date
const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

// Status badge colors
const statusColors = {
    published: 'bg-[rgba(16,185,129,0.1)] text-[#14B8A6] border-[rgba(16,185,129,0.2)]',
    draft: 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B] border-[rgba(245,158,11,0.2)]',
    archived: 'bg-[rgba(107,114,128,0.1)] text-[#6B7280] border-[rgba(107,114,128,0.2)]'
};

const AdminBlogPage = () => {
    const { adminFetch } = useAdmin();
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [deleting, setDeleting] = useState(null);
    const [publishing, setPublishing] = useState(null);

    useEffect(() => {
        fetchPosts();
    }, [filter]);

    const fetchPosts = async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({ limit: '50' });
            if (filter !== 'all') {
                params.set('status', filter);
            }
            
            const res = await adminFetch(`/api/admin/blog/posts?${params}`);
            
            if (res.ok) {
                const data = await res.json();
                setPosts(data.posts || []);
            } else {
                throw new Error('Failed to fetch posts');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async (postId) => {
        setPublishing(postId);
        try {
            const res = await adminFetch(`/api/admin/blog/posts/${postId}/publish`, {
                method: 'POST'
            });
            
            if (res.ok) {
                fetchPosts();
            } else {
                throw new Error('Failed to publish post');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setPublishing(null);
        }
    };

    const handleUnpublish = async (postId) => {
        setPublishing(postId);
        try {
            const res = await adminFetch(`/api/admin/blog/posts/${postId}/unpublish`, {
                method: 'POST'
            });
            
            if (res.ok) {
                fetchPosts();
            } else {
                throw new Error('Failed to unpublish post');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setPublishing(null);
        }
    };

    const handleDelete = async (postId) => {
        if (!confirm('Are you sure you want to delete this post?')) return;
        
        setDeleting(postId);
        try {
            const res = await adminFetch(`/api/admin/blog/posts/${postId}`, {
                method: 'DELETE'
            });
            
            if (res.ok) {
                fetchPosts();
            } else {
                throw new Error('Failed to delete post');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setDeleting(null);
        }
    };

    // Filter posts by search
    const filteredPosts = posts.filter(post => {
        if (!search) return true;
        const q = search.toLowerCase();
        return post.title?.toLowerCase().includes(q) || 
               post.slug?.toLowerCase().includes(q) ||
               post.author?.toLowerCase().includes(q);
    });

    // Count by status
    const statusCounts = {
        all: posts.length,
        published: posts.filter(p => p.status === 'published').length,
        draft: posts.filter(p => p.status === 'draft').length,
        archived: posts.filter(p => p.status === 'archived').length
    };

    return (
        <div className="space-y-6" data-testid="admin-blog-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-ss-text">Blog Manager</h1>
                    <p className="text-ss-text-tertiary mt-1">Create and manage blog content</p>
                </div>
                <Link
                    to="/admin/blog/new"
                    className="flex items-center gap-2 px-4 py-2 bg-ss-accent hover:bg-[#2DD4BF] rounded-lg text-ss-text font-medium transition-all"
                    data-testid="new-post-btn"
                >
                    <PlusIcon className="w-5 h-5" />
                    New Post
                </Link>
            </div>

            {/* Error display */}
            {error && (
                <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg text-[#EF4444]">
                    {error}
                </div>
            )}

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Status Filters */}
                <div className="flex items-center gap-2">
                    {['all', 'published', 'draft', 'archived'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                                filter === status
                                    ? 'bg-ss-accent text-ss-text'
                                    : 'bg-white text-ss-text-tertiary hover:text-ss-text border border-gray-100'
                            }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                            <span className="ml-1.5 text-xs opacity-75">({statusCounts[status]})</span>
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search posts..."
                        className="pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent text-sm w-64"
                    />
                </div>
            </div>

            {/* Posts Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-[#14B8A6] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div className="text-center py-12">
                        <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 text-[#6B7280]" />
                        <p className="text-[#6B7280]">
                            {posts.length === 0 ? 'No blog posts yet' : 'No posts match your search'}
                        </p>
                        {posts.length === 0 && (
                            <Link
                                to="/admin/blog/new"
                                className="inline-flex items-center gap-2 mt-4 text-sm text-[#14B8A6] hover:text-[#2DD4BF]"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Create your first post
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-gray-100">
                                <tr>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                                        Title
                                    </th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[100px]">
                                        Status
                                    </th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[120px]">
                                        Published
                                    </th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                                        Tags
                                    </th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[180px]">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPosts.map((post) => (
                                    <tr 
                                        key={post.id}
                                        className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]"
                                    >
                                        <td className="py-4 px-4">
                                            <Link 
                                                to={`/admin/blog/edit/${post.id}`}
                                                className="hover:text-[#14B8A6] transition-colors"
                                            >
                                                <p className="font-medium text-ss-text">{post.title}</p>
                                                {post.subtitle && (
                                                    <p className="text-xs text-[#6B7280] mt-0.5 truncate max-w-md">
                                                        {post.subtitle}
                                                    </p>
                                                )}
                                            </Link>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className={`px-2 py-0.5 text-xs rounded border ${statusColors[post.status] || statusColors.draft}`}>
                                                {post.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-ss-text-tertiary">
                                            {formatDate(post.published_at)}
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex flex-wrap gap-1">
                                                {(post.tags || []).slice(0, 3).map((tag, i) => (
                                                    <span 
                                                        key={i}
                                                        className="px-1.5 py-0.5 text-xs bg-ss-elevated text-ss-text-tertiary rounded"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                                {(post.tags || []).length > 3 && (
                                                    <span className="text-xs text-[#6B7280]">
                                                        +{post.tags.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* View on site */}
                                                {post.status === 'published' && (
                                                    <a
                                                        href={`/blog/${post.slug}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 text-[#6B7280] hover:text-ss-text hover:bg-ss-elevated rounded-lg transition-all"
                                                        title="View on site"
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                    </a>
                                                )}
                                                
                                                {/* Publish/Unpublish */}
                                                {post.status === 'draft' && (
                                                    <button
                                                        onClick={() => handlePublish(post.id)}
                                                        disabled={publishing === post.id}
                                                        className="p-2 text-[#14B8A6] hover:bg-[rgba(16,185,129,0.1)] rounded-lg transition-all disabled:opacity-50"
                                                        title="Publish"
                                                    >
                                                        {publishing === post.id ? (
                                                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <CheckCircleIcon className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                )}
                                                {post.status === 'published' && (
                                                    <button
                                                        onClick={() => handleUnpublish(post.id)}
                                                        disabled={publishing === post.id}
                                                        className="p-2 text-[#F59E0B] hover:bg-[rgba(245,158,11,0.1)] rounded-lg transition-all disabled:opacity-50"
                                                        title="Unpublish (revert to draft)"
                                                    >
                                                        {publishing === post.id ? (
                                                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <ArrowPathIcon className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                )}

                                                {/* Edit */}
                                                <Link
                                                    to={`/admin/blog/edit/${post.id}`}
                                                    className="p-2 text-[#6B7280] hover:text-ss-text hover:bg-ss-elevated rounded-lg transition-all"
                                                    title="Edit"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </Link>

                                                {/* Delete */}
                                                <button
                                                    onClick={() => handleDelete(post.id)}
                                                    disabled={deleting === post.id}
                                                    className="p-2 text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] rounded-lg transition-all disabled:opacity-50"
                                                    title="Delete"
                                                >
                                                    {deleting === post.id ? (
                                                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <TrashIcon className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminBlogPage;
