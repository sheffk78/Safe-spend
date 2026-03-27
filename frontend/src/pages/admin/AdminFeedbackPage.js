import React, { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { 
  MessageSquare, TrendingUp, TrendingDown, BarChart2, 
  CheckCircle, XCircle, ArrowRight, RefreshCw, Download,
  Clock, Filter
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const TYPE_CONFIG = {
  inline_reaction: { label: 'Reaction', color: 'bg-yellow-500/20 text-yellow-400' },
  pulse_check: { label: 'Pulse', color: 'bg-blue-500/20 text-blue-400' },
  milestone_feedback: { label: 'Milestone', color: 'bg-purple-500/20 text-purple-400' },
  error_clarity: { label: 'Error', color: 'bg-red-500/20 text-red-400' },
  doc_feedback: { label: 'Docs', color: 'bg-cyan-500/20 text-cyan-400' }
};

const SENTIMENT_COLORS = {
  great: 'text-emerald-400',
  good: 'text-emerald-300',
  neutral: 'text-gray-400',
  negative: 'text-red-400'
};

const AdminFeedbackPage = () => {
  const { adminKey } = useAdmin();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [featureRequests, setFeatureRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  const fetchData = useCallback(async () => {
    if (!adminKey) return;
    setLoading(true);

    try {
      // Fetch stats
      const statsRes = await fetch(`${API_URL}/api/admin/feedback/stats?days=30`, {
        headers: { 'X-Admin-Api-Key': adminKey }
      });
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      // Fetch feedback items
      const feedbackRes = await fetch(`${API_URL}/api/admin/feedback?limit=50`, {
        headers: { 'X-Admin-Api-Key': adminKey }
      });
      if (feedbackRes.ok) {
        const data = await feedbackRes.json();
        setFeedbackItems(data.items);
      }

      // Fetch feature requests
      const requestsRes = await fetch(`${API_URL}/api/admin/feedback/requests?limit=50`, {
        headers: { 'X-Admin-Api-Key': adminKey }
      });
      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setFeatureRequests(data.requests);
      }
    } catch (error) {
      console.error('Error fetching feedback data:', error);
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAcknowledge = async (itemId) => {
    try {
      await fetch(`${API_URL}/api/admin/feedback/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Api-Key': adminKey
        },
        body: JSON.stringify({ is_acknowledged: true })
      });
      setFeedbackItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, is_acknowledged: true } : item
      ));
    } catch (error) {
      console.error('Acknowledge error:', error);
    }
  };

  const handleConvertToRequest = async (itemId) => {
    try {
      await fetch(`${API_URL}/api/admin/feedback/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Api-Key': adminKey
        },
        body: JSON.stringify({ convert_to_request: true })
      });
      fetchData();
    } catch (error) {
      console.error('Convert error:', error);
    }
  };

  const handleUpdateRequestStatus = async (requestId, status, statusNote = '') => {
    try {
      await fetch(`${API_URL}/api/admin/feedback/requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Api-Key': adminKey
        },
        body: JSON.stringify({ status, status_note: statusNote })
      });
      fetchData();
    } catch (error) {
      console.error('Status update error:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/feedback/export`, {
        headers: { 'X-Admin-Api-Key': adminKey }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feedback-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const filteredItems = filterType === 'all' 
    ? feedbackItems 
    : feedbackItems.filter(item => item.type === filterType);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Feedback Dashboard</h1>
          <p className="text-gray-400">Review and manage user feedback</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#141416] rounded-lg p-1 border border-white/6 mb-8 w-fit">
        {['overview', 'triage', 'requests'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded text-sm transition-colors ${
              activeTab === tab
                ? 'bg-emerald-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div>
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* NPS Score */}
            <div className="bg-[#141416] border border-white/6 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm">NPS Score</span>
                <BarChart2 className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">
                  {stats.nps.current !== null ? stats.nps.current.toFixed(1) : 'N/A'}
                </span>
                {stats.nps.trend && (
                  <span className={`flex items-center text-sm ${
                    stats.nps.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {stats.nps.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 mr-1" />
                    )}
                    from {stats.nps.previous?.toFixed(1)}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">{stats.nps.responses} responses</p>
            </div>

            {/* Feature Requests */}
            <div className="bg-[#141416] border border-white/6 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm">Feature Requests</span>
                <MessageSquare className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{stats.feature_requests.total}</span>
                <span className="text-emerald-400 text-sm">{stats.feature_requests.new} new</span>
              </div>
            </div>

            {/* Inline Reactions */}
            <div className="bg-[#141416] border border-white/6 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm">Inline Reactions</span>
                {stats.inline_reactions.positive_percent >= 70 ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{stats.inline_reactions.total}</span>
                <span className="text-emerald-400 text-sm">{stats.inline_reactions.positive_percent}% positive</span>
              </div>
              <div className="flex gap-2 mt-3">
                <span className="text-xs text-emerald-400">Great: {stats.inline_reactions.breakdown.great}</span>
                <span className="text-xs text-emerald-300">Good: {stats.inline_reactions.breakdown.good}</span>
                <span className="text-xs text-gray-400">Neutral: {stats.inline_reactions.breakdown.neutral}</span>
                <span className="text-xs text-red-400">Negative: {stats.inline_reactions.breakdown.negative}</span>
              </div>
            </div>
          </div>

          {/* Top Requests & Pain Points */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-[#141416] border border-white/6 rounded-xl p-6">
              <h3 className="text-white font-medium mb-4">Top Requested Features</h3>
              {stats.top_requests.length > 0 ? (
                <div className="space-y-3">
                  {stats.top_requests.map((req, i) => (
                    <div key={req.id} className="flex items-center gap-3">
                      <span className="text-gray-500 text-sm w-4">{i + 1}.</span>
                      <span className="flex-1 text-gray-300 text-sm truncate">{req.title}</span>
                      <span className="text-emerald-400 text-sm font-mono">{req.votes}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No feature requests yet</p>
              )}
            </div>

            <div className="bg-[#141416] border border-white/6 rounded-xl p-6">
              <h3 className="text-white font-medium mb-4">Recent Pain Points</h3>
              {stats.pain_points.length > 0 ? (
                <div className="space-y-3">
                  {stats.pain_points.map((point, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-red-400">•</span>
                      <span className="text-gray-300 text-sm line-clamp-2">"{point}"</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No pain points recorded</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Triage Tab */}
      {activeTab === 'triage' && (
        <div>
          {/* Filter */}
          <div className="flex items-center gap-3 mb-6">
            <Filter className="w-4 h-4 text-gray-500" />
            <div className="flex gap-1 bg-[#0A0A0B] rounded-lg p-1 border border-white/6">
              {['all', 'inline_reaction', 'pulse_check', 'error_clarity', 'doc_feedback'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    filterType === type
                      ? 'bg-white/10 text-white'
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  {type === 'all' ? 'All' : TYPE_CONFIG[type]?.label || type}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Items */}
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const typeConfig = TYPE_CONFIG[item.type] || {};
              
              return (
                <div
                  key={item.id}
                  className={`bg-[#141416] border rounded-lg p-4 ${
                    item.is_acknowledged ? 'border-white/6 opacity-60' : 'border-white/12'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>
                        {item.page && (
                          <span className="text-xs text-gray-500">{item.page}</span>
                        )}
                        {item.sentiment && (
                          <span className={`text-xs ${SENTIMENT_COLORS[item.sentiment]}`}>
                            {item.sentiment}
                          </span>
                        )}
                        {item.nps_score && (
                          <span className="text-xs text-blue-400">NPS: {item.nps_score}</span>
                        )}
                        <span className="text-xs text-gray-500">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      {item.note && (
                        <p className="text-gray-300 text-sm mb-2">"{item.note}"</p>
                      )}
                      
                      <p className="text-xs text-gray-500">
                        {item.org_name} ({item.org_id})
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {!item.is_acknowledged && (
                        <button
                          onClick={() => handleAcknowledge(item.id)}
                          className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 text-gray-300 rounded transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                      {item.note && !item.converted_to && (
                        <button
                          onClick={() => handleConvertToRequest(item.id)}
                          className="px-3 py-1 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded transition-colors flex items-center gap-1"
                        >
                          <ArrowRight className="w-3 h-3" />
                          Request
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-3">
          {featureRequests.map((request) => (
            <div
              key={request.id}
              className="bg-[#141416] border border-white/6 rounded-lg p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-emerald-400 font-mono text-sm">{request.vote_count} votes</span>
                    <span className="text-xs text-gray-500">{request.comment_count} comments</span>
                    {request.is_pinned && (
                      <span className="text-xs text-amber-400">📌 Pinned</span>
                    )}
                  </div>
                  
                  <h3 className="text-white font-medium mb-1">{request.title}</h3>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-2">{request.description}</p>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{request.submitted_by_org_name}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <select
                    value={request.status}
                    onChange={(e) => handleUpdateRequestStatus(request.id, e.target.value)}
                    className="px-3 py-1 text-xs bg-[#0A0A0B] border border-white/6 rounded text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="new">New</option>
                    <option value="under_review">Under Review</option>
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="shipped">Shipped</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminFeedbackPage;
