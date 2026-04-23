import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const IMPROVEMENT_PLACEHOLDERS = [
  "Better Python SDK docs",
  "Faster webhook delivery",
  "More spending policy templates",
  "Approval flow on mobile"
];

const PulseCheck = ({ onClose }) => {
  const [npsScore, setNpsScore] = useState(null);
  const [improvement, setImprovement] = useState('');
  const [useCases, setUseCases] = useState([]);
  const [otherUseCase, setOtherUseCase] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    // Rotate placeholder
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % IMPROVEMENT_PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Mark pulse as shown
    const markShown = async () => {
      try {
        const token = localStorage.getItem('ss_token');
        if (!token) return;

        await fetch(`${API_URL}/api/v1/feedback/tracking/pulse-shown`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Failed to mark pulse as shown:', error);
      }
    };
    markShown();
  }, []);

  const toggleUseCase = (useCase) => {
    setUseCases((prev) =>
      prev.includes(useCase)
        ? prev.filter((u) => u !== useCase)
        : [...prev, useCase]
    );
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('ss_token');
      if (!token) return;

      const finalUseCases = [...useCases];
      if (otherUseCase.trim()) {
        finalUseCases.push(`other: ${otherUseCase.trim()}`);
      }

      await fetch(`${API_URL}/api/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'pulse_check',
          nps_score: npsScore,
          note: improvement || null,
          use_cases: finalUseCases.length > 0 ? finalUseCases : null
        })
      });

      setSubmitted(true);
      setTimeout(onClose, 2000);
    } catch (error) {
      console.error('Pulse check submission error:', error);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (submitted) {
    return (
      <div className="bg-[#141416] border border-white/6 rounded-xl p-6 mb-6 animate-fadeIn">
        <p className="text-emerald-400 text-center">Thanks for your feedback! It helps us improve Safe-Spend.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#141416] border border-white/6 rounded-xl p-6 mb-6 animate-slideDown" data-testid="pulse-check">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">Quick Check-In <span className="text-gray-500 text-sm">(30 seconds)</span></h3>
        <button onClick={handleSkip} className="text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Q1: NPS Score */}
      <div className="mb-6">
        <p className="text-sm text-gray-300 mb-3">
          Q1: How likely are you to recommend Safe-Spend to another developer building with AI agents?
        </p>
        <div className="flex gap-1 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
            <button
              key={score}
              onClick={() => setNpsScore(score)}
              className={`w-10 h-10 rounded-lg border text-sm transition-all ${
                npsScore === score
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'border-white/6 text-gray-400 hover:border-emerald-500/50 hover:text-white'
              }`}
              data-testid={`nps-${score}`}
            >
              {score}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
          <span>Not at all</span>
          <span>Absolutely</span>
        </div>
      </div>

      {/* Q2: Improvement */}
      <div className="mb-6">
        <p className="text-sm text-gray-300 mb-3">
          Q2: What's the one thing we should improve next?
        </p>
        <input
          type="text"
          value={improvement}
          onChange={(e) => setImprovement(e.target.value)}
          placeholder={`e.g., "${IMPROVEMENT_PLACEHOLDERS[placeholderIndex]}"`}
          className="w-full px-4 py-2 bg-[#0A0A0B] border border-white/6 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500"
          data-testid="improvement-input"
        />
      </div>

      {/* Q3: Use Cases */}
      <div className="mb-6">
        <p className="text-sm text-gray-300 mb-3">
          Q3: How are you using Safe-Spend? <span className="text-gray-500">(select all that apply)</span>
        </p>
        <div className="space-y-2">
          {[
            { id: 'agent_spending', label: 'Controlling AI agent spending' },
            { id: 'team_budgets', label: 'Managing team/department budgets' },
            { id: 'platform_building', label: 'Building a platform that needs spending controls' },
            { id: 'evaluating', label: 'Evaluating for a future project' }
          ].map((option) => (
            <label key={option.id} className="flex items-center gap-3 cursor-pointer group">
              <div
                className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                  useCases.includes(option.id)
                    ? 'bg-emerald-600 border-emerald-500'
                    : 'border-white/20 group-hover:border-white/40'
                }`}
              >
                {useCases.includes(option.id) && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <input
                type="checkbox"
                checked={useCases.includes(option.id)}
                onChange={() => toggleUseCase(option.id)}
                className="sr-only"
              />
              <span className="text-sm text-gray-300">{option.label}</span>
            </label>
          ))}
          <div className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                useCases.includes('other')
                  ? 'bg-emerald-600 border-emerald-500'
                  : 'border-white/20'
              }`}
              onClick={() => toggleUseCase('other')}
            >
              {useCases.includes('other') && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <span className="text-sm text-gray-300">Other:</span>
            <input
              type="text"
              value={otherUseCase}
              onChange={(e) => {
                setOtherUseCase(e.target.value);
                if (e.target.value && !useCases.includes('other')) {
                  toggleUseCase('other');
                }
              }}
              placeholder="..."
              className="flex-1 px-3 py-1 bg-[#0A0A0B] border border-white/6 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={!npsScore}
          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          data-testid="submit-pulse"
        >
          Submit Check-In
        </button>
        <button
          onClick={handleSkip}
          className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
        >
          Skip — I'll answer next time →
        </button>
      </div>
    </div>
  );
};

export default PulseCheck;
