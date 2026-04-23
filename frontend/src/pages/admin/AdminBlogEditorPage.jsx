/**
 * Admin Blog Editor Page
 * Create and edit blog posts with markdown support
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAdmin } from '@/contexts/AdminContext';
import {
    ArrowLeftIcon,
    DocumentTextIcon,
    EyeIcon,
    ArrowPathIcon,
    CheckIcon,
    PhotoIcon,
    CloudArrowUpIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

// Markdown preview (basic)
const renderMarkdownPreview = (content) => {
    if (!content) return '';
    
    // Very basic markdown rendering for preview
    let html = content
        // Escape HTML
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Headers
        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-[#F5F5F5] mt-4 mb-2">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-[#F5F5F5] mt-6 mb-3">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-[#F5F5F5] mt-6 mb-4">$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Code blocks
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-[#0A0A0B] p-3 rounded-lg overflow-x-auto my-4"><code class="text-sm text-[#10B981]">$2</code></pre>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code class="bg-[#1A1A1E] px-1.5 py-0.5 rounded text-[#10B981] text-sm">$1</code>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#10B981] underline">$1</a>')
        // Line breaks
        .replace(/\n\n/g, '</p><p class="text-[#9CA3AF] mb-4">')
        .replace(/\n/g, '<br>');
    
    return `<p class="text-[#9CA3AF] mb-4">${html}</p>`;
};

const AdminBlogEditorPage = () => {
    const { adminFetch } = useAdmin();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = Boolean(id);

    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showPreview, setShowPreview] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [slug, setSlug] = useState('');
    const [content, setContent] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [author, setAuthor] = useState('Safe-Spend Team');
    const [coverImageUrl, setCoverImageUrl] = useState('');
    const [tags, setTags] = useState('');
    const [status, setStatus] = useState('draft');
    const [metaTitle, setMetaTitle] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    
    // Image upload state
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Load post if editing
    useEffect(() => {
        if (isEditing) {
            fetchPost();
        }
    }, [id]);

    const fetchPost = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await adminFetch(`/api/admin/blog/posts/${id}`);
            
            if (res.ok) {
                const post = await res.json();
                setTitle(post.title || '');
                setSubtitle(post.subtitle || '');
                setSlug(post.slug || '');
                setContent(post.content || '');
                setExcerpt(post.excerpt || '');
                // Author can be an object with name property or a string
                setAuthor(typeof post.author === 'object' ? (post.author?.name || 'Safe-Spend Team') : (post.author || 'Safe-Spend Team'));
                setCoverImageUrl(post.cover_image?.url || post.cover_image_url || '');
                setTags((post.tags || []).join(', '));
                setStatus(post.status || 'draft');
                setMetaTitle(post.seo?.meta_title || '');
                setMetaDescription(post.seo?.meta_description || '');
            } else {
                throw new Error('Failed to load post');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Auto-generate slug from title
    const handleTitleChange = (value) => {
        setTitle(value);
        if (!isEditing || !slug) {
            setSlug(value
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim()
            );
        }
    };

    // Auto-generate excerpt from content
    const generateExcerpt = () => {
        if (!content) return;
        const plainText = content
            .replace(/#{1,6}\s/g, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/\n/g, ' ')
            .trim();
        setExcerpt(plainText.substring(0, 160) + (plainText.length > 160 ? '...' : ''));
    };

    // Handle image upload
    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setError('Only JPEG, PNG, GIF, and WebP images are allowed');
            return;
        }
        
        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be smaller than 5MB');
            return;
        }
        
        setUploading(true);
        setError(null);
        
        try {
            const formData = new FormData();
            formData.append('image', file);
            
            const res = await adminFetch('/api/admin/blog/images', {
                method: 'POST',
                body: formData,
                // Don't set Content-Type header - browser will set it with boundary
                headers: {} 
            });
            
            if (res.ok) {
                const data = await res.json();
                setCoverImageUrl(data.image.url);
                setSuccess('Image uploaded!');
                setTimeout(() => setSuccess(null), 2000);
            } else {
                const errData = await res.json();
                throw new Error(errData.error?.message || 'Failed to upload image');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleSave = async (saveStatus = status) => {
        if (!title || !content) {
            setError('Title and content are required');
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                title,
                subtitle: subtitle || undefined,
                slug: slug || undefined,
                content,
                excerpt: excerpt || undefined,
                author,
                cover_image_url: coverImageUrl || undefined,
                tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                status: saveStatus,
                seo: {
                    meta_title: metaTitle || title,
                    meta_description: metaDescription || excerpt
                }
            };

            const url = isEditing 
                ? `/api/admin/blog/posts/${id}`
                : '/api/admin/blog/posts';
            
            const res = await adminFetch(url, {
                method: isEditing ? 'PATCH' : 'POST',
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                setSuccess(isEditing ? 'Post saved!' : 'Post created!');
                
                if (!isEditing && data.id) {
                    // Navigate to edit page for the new post
                    setTimeout(() => {
                        navigate(`/admin/blog/edit/${data.id}`);
                    }, 500);
                }
            } else {
                const errData = await res.json();
                throw new Error(errData.error?.message || 'Failed to save post');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handlePublish = async () => {
        await handleSave('published');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="admin-blog-editor-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/blog')}
                        className="p-2 text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[#141416] rounded-lg transition-all"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="font-heading text-2xl font-bold text-[#F5F5F5]">
                            {isEditing ? 'Edit Post' : 'New Post'}
                        </h1>
                        <p className="text-[#9CA3AF] mt-1">
                            {isEditing ? 'Update your blog post' : 'Create a new blog post'}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                            showPreview 
                                ? 'bg-[#10B981] text-white' 
                                : 'bg-[#141416] border border-[rgba(255,255,255,0.06)] text-[#9CA3AF] hover:text-[#F5F5F5]'
                        }`}
                    >
                        <EyeIcon className="w-4 h-4" />
                        Preview
                    </button>
                    
                    <button
                        onClick={() => handleSave()}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-[#141416] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#9CA3AF] hover:text-[#F5F5F5] text-sm transition-all disabled:opacity-50"
                    >
                        {saving ? (
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                            <DocumentTextIcon className="w-4 h-4" />
                        )}
                        Save Draft
                    </button>
                    
                    <button
                        onClick={handlePublish}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-[#10B981] hover:bg-[#34D399] rounded-lg text-white font-medium text-sm transition-all disabled:opacity-50"
                    >
                        {saving ? (
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                            <CheckIcon className="w-4 h-4" />
                        )}
                        Publish
                    </button>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg text-[#EF4444]">
                    {error}
                </div>
            )}
            {success && (
                <div className="p-4 bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] rounded-lg text-[#10B981]">
                    {success}
                </div>
            )}

            {/* Editor Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Content Editor (Left) */}
                <div className={`space-y-4 ${showPreview ? 'lg:col-span-3' : 'lg:col-span-3'}`}>
                    {/* Title */}
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="Post title..."
                        className="w-full px-4 py-3 bg-[#141416] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#F5F5F5] text-2xl font-heading placeholder-[#6B7280] focus:outline-none focus:border-[#10B981]"
                        data-testid="post-title-input"
                    />

                    {/* Subtitle */}
                    <input
                        type="text"
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        placeholder="Subtitle (optional)..."
                        className="w-full px-4 py-2 bg-[#141416] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#9CA3AF] placeholder-[#6B7280] focus:outline-none focus:border-[#10B981]"
                    />

                    {/* Content Editor */}
                    <div className="relative">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Write your post in Markdown..."
                            rows={20}
                            className="w-full px-4 py-3 bg-[#141416] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#F5F5F5] font-mono text-sm placeholder-[#6B7280] focus:outline-none focus:border-[#10B981] resize-y"
                            data-testid="post-content-input"
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-[#6B7280]">
                            Markdown supported
                        </div>
                    </div>
                </div>

                {/* Metadata / Preview (Right) */}
                <div className={`space-y-4 ${showPreview ? 'lg:col-span-2' : 'lg:col-span-2'}`}>
                    {showPreview ? (
                        /* Preview */
                        <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)] p-6 sticky top-6">
                            <h3 className="font-heading font-semibold text-[#F5F5F5] mb-4">Preview</h3>
                            
                            {coverImageUrl && (
                                <img 
                                    src={coverImageUrl} 
                                    alt="Cover" 
                                    className="w-full h-40 object-cover rounded-lg mb-4"
                                />
                            )}
                            
                            <h1 className="text-2xl font-bold text-[#F5F5F5] mb-2">{title || 'Untitled'}</h1>
                            {subtitle && <p className="text-[#9CA3AF] mb-4">{subtitle}</p>}
                            
                            <div 
                                className="prose prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(content) }}
                            />
                        </div>
                    ) : (
                        /* Metadata Form */
                        <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)] p-6 space-y-4 sticky top-6">
                            <h3 className="font-heading font-semibold text-[#F5F5F5]">Post Settings</h3>

                            {/* Slug */}
                            <div>
                                <label className="block text-sm text-[#9CA3AF] mb-1">URL Slug</label>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    placeholder="post-url-slug"
                                    className="w-full px-3 py-2 bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#F5F5F5] font-mono text-sm placeholder-[#6B7280] focus:outline-none focus:border-[#10B981]"
                                />
                                <p className="text-xs text-[#6B7280] mt-1">/blog/{slug || 'your-post-slug'}</p>
                            </div>

                            {/* Author */}
                            <div>
                                <label className="block text-sm text-[#9CA3AF] mb-1">Author</label>
                                <input
                                    type="text"
                                    value={author}
                                    onChange={(e) => setAuthor(e.target.value)}
                                    placeholder="Author name"
                                    className="w-full px-3 py-2 bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#F5F5F5] text-sm placeholder-[#6B7280] focus:outline-none focus:border-[#10B981]"
                                />
                            </div>

                            {/* Cover Image */}
                            <div>
                                <label className="block text-sm text-[#9CA3AF] mb-2">Cover Image</label>
                                
                                {/* Upload Button */}
                                <div className="mb-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        id="cover-image-upload"
                                    />
                                    <label
                                        htmlFor="cover-image-upload"
                                        className={`flex items-center justify-center gap-2 w-full px-3 py-3 border-2 border-dashed border-[rgba(255,255,255,0.1)] hover:border-[#10B981] rounded-lg cursor-pointer transition-all ${
                                            uploading ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                    >
                                        {uploading ? (
                                            <>
                                                <ArrowPathIcon className="w-5 h-5 text-[#10B981] animate-spin" />
                                                <span className="text-sm text-[#9CA3AF]">Uploading...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CloudArrowUpIcon className="w-5 h-5 text-[#6B7280]" />
                                                <span className="text-sm text-[#6B7280]">Upload Image</span>
                                            </>
                                        )}
                                    </label>
                                    <p className="text-xs text-[#6B7280] mt-1 text-center">Max 5MB • JPEG, PNG, GIF, WebP</p>
                                </div>
                                
                                {/* Or manual URL */}
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={coverImageUrl}
                                        onChange={(e) => setCoverImageUrl(e.target.value)}
                                        placeholder="Or enter image URL..."
                                        className="w-full px-3 py-2 bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#F5F5F5] text-sm placeholder-[#6B7280] focus:outline-none focus:border-[#10B981] pr-8"
                                    />
                                    {coverImageUrl && (
                                        <button
                                            onClick={() => setCoverImageUrl('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#EF4444]"
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                
                                {/* Preview */}
                                {coverImageUrl && (
                                    <div className="relative mt-2">
                                        <img 
                                            src={coverImageUrl} 
                                            alt="Cover Preview" 
                                            className="w-full h-32 object-cover rounded-lg"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                        <div className="hidden items-center justify-center w-full h-32 bg-[#1A1A1E] rounded-lg text-[#6B7280] text-sm">
                                            Failed to load image
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-sm text-[#9CA3AF] mb-1">Tags</label>
                                <input
                                    type="text"
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                    placeholder="tag1, tag2, tag3"
                                    className="w-full px-3 py-2 bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#F5F5F5] text-sm placeholder-[#6B7280] focus:outline-none focus:border-[#10B981]"
                                />
                                <p className="text-xs text-[#6B7280] mt-1">Separate with commas</p>
                            </div>

                            {/* Excerpt */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm text-[#9CA3AF]">Excerpt</label>
                                    <button
                                        onClick={generateExcerpt}
                                        className="text-xs text-[#10B981] hover:text-[#34D399]"
                                    >
                                        Auto-generate
                                    </button>
                                </div>
                                <textarea
                                    value={excerpt}
                                    onChange={(e) => setExcerpt(e.target.value)}
                                    placeholder="Brief description for previews..."
                                    rows={3}
                                    className="w-full px-3 py-2 bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#F5F5F5] text-sm placeholder-[#6B7280] focus:outline-none focus:border-[#10B981] resize-none"
                                />
                                <p className="text-xs text-[#6B7280] mt-1">{excerpt.length}/160 characters</p>
                            </div>

                            <hr className="border-[rgba(255,255,255,0.06)]" />

                            {/* SEO */}
                            <h4 className="text-sm font-medium text-[#F5F5F5]">SEO Settings</h4>

                            <div>
                                <label className="block text-sm text-[#9CA3AF] mb-1">Meta Title</label>
                                <input
                                    type="text"
                                    value={metaTitle}
                                    onChange={(e) => setMetaTitle(e.target.value)}
                                    placeholder={title || 'Post title'}
                                    className="w-full px-3 py-2 bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#F5F5F5] text-sm placeholder-[#6B7280] focus:outline-none focus:border-[#10B981]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-[#9CA3AF] mb-1">Meta Description</label>
                                <textarea
                                    value={metaDescription}
                                    onChange={(e) => setMetaDescription(e.target.value)}
                                    placeholder={excerpt || 'Description for search engines...'}
                                    rows={2}
                                    className="w-full px-3 py-2 bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#F5F5F5] text-sm placeholder-[#6B7280] focus:outline-none focus:border-[#10B981] resize-none"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminBlogEditorPage;
