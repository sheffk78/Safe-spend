import React, { useState } from 'react';
import { Shield, Key, Users, AlertTriangle, Check, Eye, EyeOff, Info } from 'lucide-react';

const ENFORCEMENT_MODES = [
  { value: 'none', label: 'Disabled', description: 'AAV not checked' },
  { value: 'log_only', label: 'Log Only', description: 'Check AAV but allow even if denied (for testing)' },
  { value: 'verify', label: 'Verify (Strict)', description: 'Require AAV authorization - deny if check fails' }
];

/**
 * AAV Configuration Card for Escrow Accounts
 */
export const EscrowAAVConfig = ({ escrow, onUpdate, loading }) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [aavApiKey, setAavApiKey] = useState('');
  const [config, setConfig] = useState({
    aav_enabled: escrow.aav_enabled || false,
    aav_enforcement_mode: escrow.aav_enforcement_mode || 'none',
    authorized_agent_ids: escrow.authorized_agent_ids || [],
    aav_grant_ids: escrow.aav_grant_ids || [],
    aav_require_certificate: escrow.aav_require_certificate || false
  });
  const [agentIdInput, setAgentIdInput] = useState('');
  const [grantIdInput, setGrantIdInput] = useState('');

  const handleToggle = (field) => {
    setConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleModeChange = (mode) => {
    setConfig(prev => ({ ...prev, aav_enforcement_mode: mode }));
  };

  const addAgentId = () => {
    if (agentIdInput.trim() && !config.authorized_agent_ids.includes(agentIdInput.trim())) {
      setConfig(prev => ({
        ...prev,
        authorized_agent_ids: [...prev.authorized_agent_ids, agentIdInput.trim()]
      }));
      setAgentIdInput('');
    }
  };

  const removeAgentId = (id) => {
    setConfig(prev => ({
      ...prev,
      authorized_agent_ids: prev.authorized_agent_ids.filter(a => a !== id)
    }));
  };

  const addGrantId = () => {
    if (grantIdInput.trim() && !config.aav_grant_ids.includes(grantIdInput.trim())) {
      setConfig(prev => ({
        ...prev,
        aav_grant_ids: [...prev.aav_grant_ids, grantIdInput.trim()]
      }));
      setGrantIdInput('');
    }
  };

  const removeGrantId = (id) => {
    setConfig(prev => ({
      ...prev,
      aav_grant_ids: prev.aav_grant_ids.filter(g => g !== id)
    }));
  };

  const handleSave = () => {
    const updates = { ...config };
    if (aavApiKey) {
      updates.aav_api_key = aavApiKey;
    }
    onUpdate(updates);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6" data-testid="escrow-aav-config">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-ss-accent/10 rounded-lg">
          <Shield className="w-5 h-5 text-ss-accent" />
        </div>
        <div>
          <h3 className="text-ss-text font-medium">Agent Authority Vault (AAV)</h3>
          <p className="text-sm text-ss-text-tertiary">Control which AI agents can spend from this protected account</p>
        </div>
      </div>

      {/* Enable Toggle */}
      <div className="flex items-center justify-between py-3 border-b border-gray-200">
        <div>
          <span className="text-ss-text text-sm">Enable AAV Integration</span>
          <p className="text-xs text-gray-500">Require agents to be authorized by AAV before spending</p>
        </div>
        <button
          onClick={() => handleToggle('aav_enabled')}
          className={`w-12 h-6 rounded-full transition-colors ${
            config.aav_enabled ? 'bg-ss-accent' : 'bg-gray-400'
          }`}
        >
          <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
            config.aav_enabled ? 'translate-x-6' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      {config.aav_enabled && (
        <>
          {/* Enforcement Mode */}
          <div className="py-4 border-b border-gray-200">
            <span className="text-ss-text text-sm mb-3 block">Enforcement Mode</span>
            <div className="grid grid-cols-3 gap-2">
              {ENFORCEMENT_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => handleModeChange(mode.value)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    config.aav_enforcement_mode === mode.value
                      ? 'bg-ss-accent bg-ss-accent/5'
                      : 'border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]'
                  }`}
                >
                  <span className={`text-sm font-medium ${
                    config.aav_enforcement_mode === mode.value ? 'text-ss-accent' : 'text-ss-text'
                  }`}>
                    {mode.label}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{mode.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* AAV API Key */}
          <div className="py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-ss-text text-sm">AAV API Key</span>
              {escrow.aav_api_key_configured && (
                <span className="px-2 py-0.5 bg-ss-accent/10 text-ss-accent text-xs rounded">
                  Configured
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Server-to-server key from <a href="https://agentictrust.app" target="_blank" rel="noopener noreferrer" className="text-ss-accent hover:underline">agentictrust.app</a>
            </p>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={aavApiKey}
                  onChange={(e) => setAavApiKey(e.target.value)}
                  placeholder={escrow.aav_api_key_configured ? '••••••••••••••••' : 'aav_live_sk_...'}
                  className="w-full px-4 py-2 bg-ss-elevated border border-gray-200 rounded-lg text-ss-text placeholder-gray-500 text-sm focus:outline-none focus:bg-ss-accent pr-10"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ss-text-tertiary hover:text-ss-text"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Authorized Agent IDs */}
          <div className="py-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-ss-text-tertiary" />
              <span className="text-ss-text text-sm">Authorized Agent IDs</span>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Agent IDs from AAV that can use this protected account (leave empty to allow any authorized agent)
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={agentIdInput}
                onChange={(e) => setAgentIdInput(e.target.value)}
                placeholder="agent_..."
                className="flex-1 px-3 py-2 bg-ss-elevated border border-gray-200 rounded-lg text-ss-text placeholder-gray-500 text-sm focus:outline-none focus:bg-ss-accent"
              />
              <button
                onClick={addAgentId}
                className="px-4 py-2 bg-ss-accent hover:bg-ss-accent-hover text-ss-text rounded-lg text-sm"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.authorized_agent_ids.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-ss-accent/10 text-ss-accent text-xs rounded"
                >
                  {id}
                  <button onClick={() => removeAgentId(id)} className="hover:text-ss-text">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* AAV Grant IDs */}
          <div className="py-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-ss-text-tertiary" />
              <span className="text-ss-text text-sm">Authorized Grant IDs</span>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Specific AAV grants to accept (leave empty to accept any grant)
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={grantIdInput}
                onChange={(e) => setGrantIdInput(e.target.value)}
                placeholder="grant_..."
                className="flex-1 px-3 py-2 bg-ss-elevated border border-gray-200 rounded-lg text-ss-text placeholder-gray-500 text-sm focus:outline-none focus:bg-ss-accent"
              />
              <button
                onClick={addGrantId}
                className="px-4 py-2 bg-ss-accent hover:bg-ss-accent-hover text-ss-text rounded-lg text-sm"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.aav_grant_ids.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-ss-accent/10 text-ss-accent text-xs rounded"
                >
                  {id}
                  <button onClick={() => removeGrantId(id)} className="hover:text-ss-text">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Require Certificate */}
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <span className="text-ss-text text-sm">Require Certificate</span>
              <p className="text-xs text-gray-500">Agents must present a valid AAV certificate for each spend</p>
            </div>
            <button
              onClick={() => handleToggle('aav_require_certificate')}
              className={`w-12 h-6 rounded-full transition-colors ${
                config.aav_require_certificate ? 'bg-ss-accent' : 'bg-gray-400'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                config.aav_require_certificate ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-4 p-3 bg-ss-accent/5 border bg-ss-accent/30 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-ss-accent mt-0.5" />
              <div className="text-xs text-ss-accent">
                <p className="font-medium mb-1">How AAV Integration Works</p>
                <p className="text-ss-accent/80">
                  When enabled, Safe-Spend calls the AAV /verify endpoint before approving spend requests.
                  The agent's authority is checked against the grant limits, approved vendors, and autonomy level
                  configured in Agentic Trust.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Save Button */}
      <div className="mt-6">
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full py-2 bg-ss-accent hover:bg-ss-accent-hover disabled:bg-gray-600 text-ss-text rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? 'Saving...' : 'Save AAV Configuration'}
        </button>
      </div>
    </div>
  );
};

/**
 * AAV Configuration Section for Spending Policies
 */
export const PolicyAAVConfig = ({ policy, onUpdate }) => {
  const [config, setConfig] = useState({
    aav_enabled: policy.aav_enabled || false,
    aav_enforcement_mode: policy.aav_enforcement_mode || null,
    aav_required_autonomy_level: policy.aav_required_autonomy_level || null,
    aav_required_actions: policy.aav_required_actions || [],
    aav_map_vendors: policy.aav_map_vendors || false,
    aav_map_limits: policy.aav_map_limits || false
  });

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    onUpdate({ ...config, [field]: value });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mt-4" data-testid="policy-aav-config">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-5 h-5 text-ss-accent" />
        <span className="text-ss-text font-medium">AAV Policy Settings</span>
      </div>

      {/* Override Enforcement Mode */}
      <div className="mb-4">
        <label className="text-sm text-ss-text-tertiary block mb-2">
          Enforcement Mode (leave blank to inherit from protected account)
        </label>
        <select
          value={config.aav_enforcement_mode || ''}
          onChange={(e) => handleChange('aav_enforcement_mode', e.target.value || null)}
          className="w-full px-4 py-2 bg-ss-elevated border border-gray-200 rounded-lg text-ss-text focus:outline-none focus:bg-ss-accent"
        >
          <option value="">Inherit from protected account</option>
          <option value="none">Disabled</option>
          <option value="log_only">Log Only</option>
          <option value="verify">Verify (Strict)</option>
        </select>
      </div>

      {/* Required Autonomy Level */}
      <div className="mb-4">
        <label className="text-sm text-ss-text-tertiary block mb-2">
          Required Autonomy Level (1-4)
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((level) => (
            <button
              key={level}
              onClick={() => handleChange('aav_required_autonomy_level', 
                config.aav_required_autonomy_level === level ? null : level
              )}
              className={`flex-1 py-2 rounded-lg border text-sm ${
                config.aav_required_autonomy_level === level
                  ? 'bg-ss-accent bg-ss-accent/10 text-ss-accent'
                  : 'border-[rgba(255,255,255,0.06)] text-ss-text-tertiary hover:border-[rgba(255,255,255,0.12)]'
              }`}
            >
              Level {level}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Level 1: Observe only | Level 2: Suggest | Level 3: Act with limits | Level 4: Full autonomy
        </p>
      </div>

      {/* Dual-Limit Enforcement */}
      <div className="flex items-center justify-between py-3 border-t border-gray-200">
        <div>
          <span className="text-ss-text text-sm">Map AAV Limits</span>
          <p className="text-xs text-gray-500">Use AAV grant limits as additional ceiling (stricter-wins)</p>
        </div>
        <button
          onClick={() => handleChange('aav_map_limits', !config.aav_map_limits)}
          className={`w-12 h-6 rounded-full transition-colors ${
            config.aav_map_limits ? 'bg-ss-accent' : 'bg-gray-400'
          }`}
        >
          <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
            config.aav_map_limits ? 'translate-x-6' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      {/* Map Vendors */}
      <div className="flex items-center justify-between py-3 border-t border-gray-200">
        <div>
          <span className="text-ss-text text-sm">Map AAV Vendors</span>
          <p className="text-xs text-gray-500">Sync approved vendors from AAV grant</p>
        </div>
        <button
          onClick={() => handleChange('aav_map_vendors', !config.aav_map_vendors)}
          className={`w-12 h-6 rounded-full transition-colors ${
            config.aav_map_vendors ? 'bg-ss-accent' : 'bg-gray-400'
          }`}
        >
          <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
            config.aav_map_vendors ? 'translate-x-6' : 'translate-x-0.5'
          }`} />
        </button>
      </div>
    </div>
  );
};

/**
 * AAV Verification Badge for Spend Requests
 */
export const AAVVerificationBadge = ({ spendRequest }) => {
  if (!spendRequest.aav_verification_status) {
    return null;
  }

  const statusConfig = {
    verified: { color: 'bg-ss-accent/10 text-ss-accent', icon: Check, label: 'AAV Verified' },
    unverified: { color: 'bg-amber-500/20 text-amber-400', icon: AlertTriangle, label: 'AAV Unverified' },
    denied: { color: 'bg-red-500/20 text-red-400', icon: AlertTriangle, label: 'AAV Denied' },
    bypassed: { color: 'bg-ss-text-tertiary/20 text-ss-text-tertiary', icon: Shield, label: 'AAV Bypassed' },
    error: { color: 'bg-red-500/20 text-red-400', icon: AlertTriangle, label: 'AAV Error' }
  };

  const config = statusConfig[spendRequest.aav_verification_status] || statusConfig.unverified;
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded ${config.color}`} data-testid="aav-badge">
      <Icon className="w-3 h-3" />
      <span className="text-xs font-medium">{config.label}</span>
      {spendRequest.aav_verification_id && (
        <span className="text-xs opacity-70 ml-1">({spendRequest.aav_verification_id.substring(0, 12)}...)</span>
      )}
    </div>
  );
};

/**
 * AAV Details Panel for Spend Request Detail View
 */
export const AAVDetailsPanel = ({ spendRequest }) => {
  if (!spendRequest.aav_agent_id && !spendRequest.aav_verification_id) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-ss-accent" />
        <span className="text-ss-text text-sm font-medium">AAV Details</span>
        <AAVVerificationBadge spendRequest={spendRequest} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {spendRequest.aav_agent_id && (
          <div>
            <span className="text-gray-500">Agent ID</span>
            <p className="text-ss-text font-mono">{spendRequest.aav_agent_id}</p>
          </div>
        )}
        {spendRequest.aav_grant_id && (
          <div>
            <span className="text-gray-500">Grant ID</span>
            <p className="text-ss-text font-mono">{spendRequest.aav_grant_id}</p>
          </div>
        )}
        {spendRequest.aav_certificate_id && (
          <div>
            <span className="text-gray-500">Certificate ID</span>
            <p className="text-ss-text font-mono">{spendRequest.aav_certificate_id}</p>
          </div>
        )}
        {spendRequest.aav_verification_id && (
          <div>
            <span className="text-gray-500">Verification ID</span>
            <p className="text-ss-text font-mono">{spendRequest.aav_verification_id}</p>
          </div>
        )}
        {spendRequest.aav_autonomy_level && (
          <div>
            <span className="text-gray-500">Autonomy Level</span>
            <p className="text-ss-text">Level {spendRequest.aav_autonomy_level}</p>
          </div>
        )}
        {spendRequest.aav_result && (
          <div>
            <span className="text-gray-500">AAV Result</span>
            <p className={`font-medium ${
              spendRequest.aav_result === 'authorized' ? 'text-ss-accent' :
              spendRequest.aav_result === 'denied' ? 'text-red-400' :
              'text-amber-400'
            }`}>
              {spendRequest.aav_result}
            </p>
          </div>
        )}
        {spendRequest.denial_source === 'aav' && (
          <div className="col-span-2">
            <span className="text-gray-500">Denial Source</span>
            <p className="text-red-400 font-medium">Agent Authority Vault</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default {
  EscrowAAVConfig,
  PolicyAAVConfig,
  AAVVerificationBadge,
  AAVDetailsPanel
};
