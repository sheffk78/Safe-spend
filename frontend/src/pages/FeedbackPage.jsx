import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronUp, MessageSquare, Plus, Search, X, Check,
  Clock, Rocket, CheckCircle, XCircle, Eye
} from 'lucide-react';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const CATEGORIES = [
  { id: 'api', label: 'API', color: 'bg-blue-500/20 text-blue-400' },
  { id: 'sdk', label: 'SDK', color: 'bg-purple-500/20 text-purple-400' },
  { id: 'dashboard', label: 'Dashboard', color: 'bg-emerald-500/20 text-emerald-400' },
  { id: 'integrations', label: 'Integrations', color: 'bg-orange-500/20 text-orange-400' },
  { id: 'docs', label: 'Docs', color: 'bg-cyan-500/20 text-cyan-400' },
  { id: 'billing', label: 'Billing', color: 'bg-pink-500/20 text-pink-400' },
  { id: 'other', label: 'Other', color: 'bg-gray-500/20 text-gray-400' }
];

const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-gray-500/20 text-gray-400', icon: Clock },
  under_review: { label: 'Under Review', color: 'bg-amber-500/20 text-amber-400', icon: Eye },
  planned: { label: 'Planned', color: 'bg-emerald-500/20 text-emerald-400', icon: Check },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/20 text-blue-400', icon: Rocket },
  shipped: { label: 'Shipped', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle },
  declined: { label: 'Declined', color: 'bg-gray-500/20 text-gray-400', icon: XCircle }
};

const FeedbackPage = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('top');
  const [search, setSearch] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchRequests = useCallback(async () => {
    try {
      const token = localStorage.getItem('ss_token');
      if (!token) {
        navigate('/login');
        return;
      }

      const params = new URLSearchParams({
        sort,
        page: page.toString(),
        limit: '20'
      });
      if (search) params.append('search', search);

      const response = await fetch(`${API_URL}/api/v1/feedback/requests?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setRequests(data.requests);
      setTotalPages(data.pages);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate, sort, search, page]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleVote = async (requestId) => {
    try {
      const token = localStorage.getItem('ss_token');
      const response = await fetch(`${API_URL}/api/v1/feedback/requests/${requestId}/vote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(prev => prev.map(r => 
          r.id === requestId 
            ? { ...r, vote_count: data.vote_count, has_voted: data.has_voted }
            : r
        ));
      }
    } catch (error) {
      console.error('Vote error:', error);
    }
  };

  const getCategoryConfig = (categoryId) => {
    return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[6];
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      {/* Header */}
      <div className="border-b border-white/6 bg-[#141416]">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Feature Requests & Ideas</h1>
              <p className="text-gray-400">Help us build what matters to you.</p>
            </div>
            <button
              onClick={() => setShowSubmitModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
              data-testid="submit-idea-btn"
            >
              <Plus className="w-4 h-4" />
              Submit an Idea
            </button>
          </div>

          {/* Search and Sort */}
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ideas..."
                className="w-full pl-10 pr-4 py-2 bg-[#0A0A0B] border border-white/6 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-1 bg-[#0A0A0B] rounded-lg p-1 border border-white/6">
              {['all', 'top', 'new'].map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={`px-4 py-1.5 rounded text-sm transition-colors ${
                    sort === s
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Request List */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No feature requests yet. Be the first!</p>
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"
            >
              Submit an Idea
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => {
              const category = getCategoryConfig(request.category);
              const status = STATUS_CONFIG[request.status];
              const StatusIcon = status?.icon || Clock;

              return (
                <div
                  key={request.id}
                  className="flex bg-[#141416] border border-white/6 rounded-lg overflow-hidden hover:border-white/12 transition-colors"
                  data-testid={`request-${request.id}`}
                >
                  {/* Vote Column */}
                  <div className="w-16 flex flex-col items-center justify-center py-4 border-r border-white/6">
                    <button
                      onClick={() => handleVote(request.id)}
                      className={`p-1 rounded transition-colors ${
                        request.has_voted
                          ? 'text-emerald-400'
                          : 'text-gray-500 hover:text-emerald-400'
                      }`}
                      data-testid={`vote-${request.id}`}
                    >
                      <ChevronUp className="w-5 h-5" />
                    </button>
                    <span className={`text-sm font-mono ${
                      request.has_voted ? 'text-emerald-400' : 'text-white'
                    }`}>
                      {request.vote_count}
                    </span>
                  </div>

                  {/* Content */}
                  <div 
                    className="flex-1 p-4 cursor-pointer"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-white font-medium mb-1 hover:text-emerald-400 transition-colors">
                          {request.is_pinned && <span className="mr-2">📌</span>}
                          {request.title}
                        </h3>
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {request.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${status?.color}`}>
                            <StatusIcon className="w-3 h-3 inline mr-1" />
                            {status?.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${category.color}`}>
                          {category.label}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {request.comment_count}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded ${
                  page === p
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <SubmitIdeaModal
          onClose={() => setShowSubmitModal(false)}
          onSubmit={() => {
            setShowSubmitModal(false);
            fetchRequests();
          }}
        />
      )}

      {/* Request Detail Modal */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onVote={() => handleVote(selectedRequest.id)}
          onRefresh={fetchRequests}
        />
      )}
    </div>
  );
};

// Submit Idea Modal
const SubmitIdeaModal = ({ onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const token = localStorage.getItem('ss_token');
      const response = await fetch(`${API_URL}/api/v1/feedback/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          category,
          is_anonymous: isAnonymous
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      onSubmit();
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1E] border border-white/6 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/6">
          <h2 className="text-lg font-semibold text-white">Submit an Idea</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-300 mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder='e.g., "Slack notifications for approval requests"'
              className="w-full px-4 py-2 bg-[#0A0A0B] border border-white/6 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              required
              data-testid="idea-title"
            />
            <p className="text-xs text-gray-500 mt-1">{title.length}/100</p>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="What problem does this solve? How would you use it?"
              className="w-full px-4 py-2 bg-[#0A0A0B] border border-white/6 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
              required
              data-testid="idea-description"
            />
            <p className="text-xs text-gray-500 mt-1">
              {description.length}/1000 · Tip: The best requests explain the problem, not just the solution.
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Category *</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    category === cat.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                  data-testid={`category-${cat.id}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                isAnonymous
                  ? 'bg-emerald-600 border-emerald-500'
                  : 'border-white/20'
              }`}
            >
              {isAnonymous && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="sr-only"
            />
            <span className="text-sm text-gray-400">Submit anonymously</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title || !description || !category || submitting}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              data-testid="submit-idea"
            >
              {submitting ? 'Submitting...' : 'Submit Idea →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Request Detail Modal
const RequestDetailModal = ({ request, onClose, onVote, onRefresh }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fullRequest, setFullRequest] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const token = localStorage.getItem('ss_token');
        const response = await fetch(`${API_URL}/api/v1/feedback/requests/${request.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setFullRequest(data);
        setComments(data.comments || []);
      } catch (error) {
        console.error('Error fetching request detail:', error);
      }
    };
    fetchDetail();
  }, [request.id]);

  const handleComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);

    try {
      const token = localStorage.getItem('ss_token');
      const response = await fetch(`${API_URL}/api/v1/feedback/requests/${request.id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ body: newComment })
      });

      if (response.ok) {
        const comment = await response.json();
        setComments(prev => [...prev, comment]);
        setNewComment('');
        onRefresh();
      }
    } catch (error) {
      console.error('Comment error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const status = STATUS_CONFIG[request.status];
  const category = CATEGORIES.find(c => c.id === request.category) || CATEGORIES[6];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1E] border border-white/6 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/6">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded text-xs ${category.color}`}>
              {category.label}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs ${status?.color}`}>
              {status?.label}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex gap-6 mb-6">
            {/* Vote */}
            <div className="flex flex-col items-center">
              <button
                onClick={onVote}
                className={`p-2 rounded-lg border transition-colors ${
                  request.has_voted
                    ? 'bg-emerald-900/50 border-emerald-500 text-emerald-400'
                    : 'border-white/6 text-gray-400 hover:border-emerald-500'
                }`}
              >
                <ChevronUp className="w-6 h-6" />
              </button>
              <span className={`text-lg font-mono ${
                request.has_voted ? 'text-emerald-400' : 'text-white'
              }`}>
                {request.vote_count}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white mb-2">{request.title}</h2>
              <p className="text-gray-300 whitespace-pre-wrap">{request.description}</p>
              <p className="text-sm text-gray-500 mt-4">
                Submitted by {request.submitted_by} · {new Date(request.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Status History */}
          {fullRequest?.status_history && fullRequest.status_history.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Status Timeline</h3>
              <div className="space-y-2">
                {fullRequest.status_history.map((entry, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[entry.status]?.color.replace('text-', 'bg-').split(' ')[0]}`} />
                    <span className="text-gray-300 capitalize">{entry.status.replace('_', ' ')}</span>
                    <span className="text-gray-500">{new Date(entry.changed_at).toLocaleDateString()}</span>
                    {entry.note && <span className="text-gray-400">— {entry.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">
              Comments ({comments.length})
            </h3>
            
            <div className="space-y-4 mb-4">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-[#141416] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-sm font-medium ${
                      comment.is_team ? 'text-emerald-400' : 'text-white'
                    }`}>
                      {comment.org_name}
                    </span>
                    {comment.is_team && (
                      <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                        Safe-Spend Team
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">{comment.body}</p>
                </div>
              ))}
            </div>

            {/* Add Comment */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-4 py-2 bg-[#0A0A0B] border border-white/6 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleComment}
                disabled={!newComment.trim() || submitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Comment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;
