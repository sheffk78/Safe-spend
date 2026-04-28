import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Sparkles, MessageSquare, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

// Inline Page Reaction Footer
export const PageFeedbackFooter = ({ page }) => {
  const [selectedSentiment, setSelectedSentiment] = useState(null);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Check if already submitted this session
  useEffect(() => {
    const sessionKey = `feedback_${page}_${Date.now().toString().slice(0, -5)}`;
    if (sessionStorage.getItem(sessionKey)) {
      setHidden(true);
    }
  }, [page]);

  const submitFeedback = async (sentiment, noteText = '') => {
    try {
      const token = localStorage.getItem('ss_token');
      if (!token) return;

      await fetch(`${API_URL}/api/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'inline_reaction',
          sentiment,
          note: noteText || null,
          page
        })
      });

      // Mark as submitted for this session
      const sessionKey = `feedback_${page}_${Date.now().toString().slice(0, -5)}`;
      sessionStorage.setItem(sessionKey, 'true');
      
      setSubmitted(true);
      setTimeout(() => setHidden(true), 2000);
    } catch (error) {
      console.error('Feedback submission error:', error);
    }
  };

  const handleSentimentClick = (sentiment) => {
    setSelectedSentiment(sentiment);
    if (!showNote) {
      submitFeedback(sentiment);
    }
  };

  const handleNoteSubmit = () => {
    if (selectedSentiment) {
      submitFeedback(selectedSentiment, note);
    }
  };

  if (hidden) return null;

  if (submitted) {
    return (
      <div className="mt-8 py-4 px-6 bg-white border border-gray-200 rounded-lg text-center">
        <span className="text-ss-accent text-sm">Thanks — noted.</span>
      </div>
    );
  }

  return (
    <div className="mt-8 py-4 px-6 bg-white border border-gray-200 rounded-lg" data-testid="page-feedback-footer">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <span className="text-sm text-ss-text-tertiary">How's this page working for you?</span>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSentimentClick('neutral')}
            className={`p-2 rounded-lg border transition-all ${
              selectedSentiment === 'neutral' 
                ? 'bg-ss-accent/10 border-gray-300' 
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            title="Neutral"
            data-testid="feedback-neutral"
          >
            <XCircle className="w-5 h-5 text-ss-text-tertiary" />
          </button>
          <button
            onClick={() => handleSentimentClick('good')}
            className={`p-2 rounded-lg border transition-all ${
              selectedSentiment === 'good' 
                ? 'bg-ss-accent/10 border-ss-accent' 
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            title="Good"
            data-testid="feedback-good"
          >
            <CheckCircle className="w-5 h-5 text-ss-accent" />
          </button>
          <button
            onClick={() => handleSentimentClick('great')}
            className={`p-2 rounded-lg border transition-all ${
              selectedSentiment === 'great' 
                ? 'bg-ss-accent/10 border-ss-accent' 
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            title="Great"
            data-testid="feedback-great"
          >
            <Sparkles className="w-5 h-5 text-yellow-400" />
          </button>
          
          <button
            onClick={() => setShowNote(!showNote)}
            className="ml-2 text-sm text-ss-accent hover:text-ss-accent-hover flex items-center gap-1"
            data-testid="add-note-btn"
          >
            <MessageSquare className="w-4 h-4" />
            Add a note
          </button>
        </div>
      </div>
      
      {showNote && (
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What would make this better?"
            className="flex-1 px-4 py-2 bg-ss-elevated border border-gray-200 rounded-lg text-ss-text placeholder-gray-500 text-sm focus:outline-none focus:border-ss-accent"
            data-testid="feedback-note-input"
          />
          <button
            onClick={handleNoteSubmit}
            disabled={!selectedSentiment}
            className="px-4 py-2 bg-ss-accent hover:bg-ss-accent-hover disabled:bg-gray-300 disabled:cursor-not-allowed text-ss-text rounded-lg text-sm transition-colors"
            data-testid="submit-note-btn"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
};

// Milestone Feedback Toast
export const MilestoneFeedbackToast = ({ milestone, title, onClose }) => {
  const [selectedSentiment, setSelectedSentiment] = useState(null);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Auto-dismiss after 15 seconds
    const timer = setTimeout(() => {
      if (!submitted) onClose();
    }, 15000);
    return () => clearTimeout(timer);
  }, [onClose, submitted]);

  const submitFeedback = async () => {
    if (!selectedSentiment) return;
    
    try {
      const token = localStorage.getItem('ss_token');
      if (!token) return;

      await fetch(`${API_URL}/api/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'milestone_feedback',
          sentiment: selectedSentiment,
          note: note || null,
          milestone
        })
      });

      setSubmitted(true);
      setTimeout(onClose, 1500);
    } catch (error) {
      console.error('Milestone feedback error:', error);
    }
  };

  if (submitted) {
    return (
      <div className="fixed bottom-6 right-6 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 animate-slideIn z-50">
        <p className="text-ss-accent text-center">Thanks for the feedback!</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 animate-slideIn z-50" data-testid="milestone-toast">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-ss-text-tertiary hover:text-ss-text"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎯</span>
        <span className="text-ss-text font-medium">{title}</span>
      </div>
      
      <p className="text-sm text-ss-text-tertiary mb-4">How was the setup experience?</p>
      
      <div className="flex gap-2 mb-4">
        {['confusing', 'fine', 'easy'].map((sentiment) => (
          <button
            key={sentiment}
            onClick={() => setSelectedSentiment(sentiment === 'confusing' ? 'negative' : sentiment === 'fine' ? 'neutral' : 'great')}
            className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-all ${
              (sentiment === 'confusing' && selectedSentiment === 'negative') ||
              (sentiment === 'fine' && selectedSentiment === 'neutral') ||
              (sentiment === 'easy' && selectedSentiment === 'great')
                ? 'bg-ss-accent/10 border-ss-accent text-ss-text'
                : 'border-gray-200 text-ss-text-tertiary hover:border-gray-300'
            }`}
          >
            {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
          </button>
        ))}
      </div>
      
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional: tell us more..."
        className="w-full px-3 py-2 bg-ss-elevated border border-gray-200 rounded-lg text-ss-text placeholder-gray-500 text-sm mb-3 focus:outline-none focus:border-ss-accent"
      />
      
      <button
        onClick={submitFeedback}
        disabled={!selectedSentiment}
        className="w-full py-2 bg-ss-accent hover:bg-ss-accent-hover disabled:bg-gray-300 disabled:cursor-not-allowed text-ss-text rounded-lg text-sm transition-colors"
      >
        Send
      </button>
    </div>
  );
};

// Error Clarity Feedback
export const ErrorClarityFeedback = ({ errorCode, endpoint, errorMessage }) => {
  const [wasHelpful, setWasHelpful] = useState(null);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submitFeedback = async (helpful, noteText = '') => {
    try {
      const token = localStorage.getItem('ss_token');
      if (!token) return;

      await fetch(`${API_URL}/api/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'error_clarity',
          sentiment: helpful ? 'good' : 'negative',
          note: noteText || null,
          endpoint,
          error_code: errorCode
        })
      });

      setSubmitted(true);
    } catch (error) {
      console.error('Error clarity feedback error:', error);
    }
  };

  const handleResponse = (helpful) => {
    setWasHelpful(helpful);
    if (helpful) {
      submitFeedback(true);
    } else {
      setShowNote(true);
    }
  };

  if (submitted) {
    return <p className="text-xs text-gray-500 mt-2">Thanks for the feedback!</p>;
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-200" data-testid="error-clarity-feedback">
      {!showNote ? (
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Was this error message clear?</span>
          <button
            onClick={() => handleResponse(true)}
            className="text-xs text-ss-accent hover:text-ss-accent-hover"
          >
            Yes
          </button>
          <button
            onClick={() => handleResponse(false)}
            className="text-xs text-red-400 hover:text-red-300"
          >
            No
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What was confusing?"
            className="flex-1 px-3 py-1 bg-ss-elevated border border-gray-200 rounded text-ss-text placeholder-gray-500 text-xs focus:outline-none focus:border-ss-accent"
          />
          <button
            onClick={() => submitFeedback(false, note)}
            className="px-3 py-1 bg-ss-accent hover:bg-ss-accent-hover text-ss-text rounded text-xs"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
};

// Doc Page Feedback
export const DocFeedback = ({ page }) => {
  const [helpful, setHelpful] = useState(null);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submitFeedback = async (wasHelpful, noteText = '') => {
    try {
      const token = localStorage.getItem('ss_token');
      if (!token) return;

      await fetch(`${API_URL}/api/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'doc_feedback',
          sentiment: wasHelpful ? 'good' : 'negative',
          note: noteText || null,
          page
        })
      });

      setSubmitted(true);
    } catch (error) {
      console.error('Doc feedback error:', error);
    }
  };

  const handleResponse = (wasHelpful) => {
    setHelpful(wasHelpful);
    if (wasHelpful) {
      submitFeedback(true);
    } else {
      setShowNote(true);
    }
  };

  if (submitted) {
    return (
      <div className="mt-8 py-4 text-center text-ss-accent text-sm">
        Thanks for the feedback!
      </div>
    );
  }

  return (
    <div className="mt-8 py-4 border-t border-gray-200" data-testid="doc-feedback">
      {!showNote ? (
        <div className="flex items-center justify-center gap-4">
          <span className="text-sm text-ss-text-tertiary">Did this page help you integrate?</span>
          <button
            onClick={() => handleResponse(true)}
            className="flex items-center gap-1 px-3 py-1 text-sm text-ss-accent hover:text-ss-accent-hover border border-ss-accent/30 rounded hover:bg-ss-accent-hover/10"
          >
            👍 Yes
          </button>
          <button
            onClick={() => handleResponse(false)}
            className="flex items-center gap-1 px-3 py-1 text-sm text-red-400 hover:text-red-300 border border-red-500/30 rounded hover:bg-red-500/10"
          >
            👎 No
          </button>
        </div>
      ) : (
        <div className="max-w-md mx-auto">
          <p className="text-sm text-ss-text-tertiary mb-2 text-center">What were you trying to do?</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tell us what's missing..."
              className="flex-1 px-4 py-2 bg-ss-elevated border border-gray-200 rounded-lg text-ss-text placeholder-gray-500 text-sm focus:outline-none focus:border-ss-accent"
            />
            <button
              onClick={() => submitFeedback(false, note)}
              className="px-4 py-2 bg-ss-accent hover:bg-ss-accent-hover text-ss-text rounded-lg text-sm"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default {
  PageFeedbackFooter,
  MilestoneFeedbackToast,
  ErrorClarityFeedback,
  DocFeedback
};
