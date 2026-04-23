/**
 * Safe-Spend API Client
 * Centralized API calls with auth handling
 */

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const getAuthHeaders = () => {
    const token = localStorage.getItem('ss_token');
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
};

const handleResponse = async (response) => {
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
    }
    return data;
};

// ============ Auth ============
export const getCurrentOrg = async () => {
    const response = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

// ============ Escrow Accounts ============
export const listEscrowAccounts = async () => {
    const response = await fetch(`${API_URL}/api/v1/escrow-accounts`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const getEscrowAccount = async (id) => {
    const response = await fetch(`${API_URL}/api/v1/escrow-accounts/${id}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const createEscrowAccount = async (payload) => {
    const response = await fetch(`${API_URL}/api/v1/escrow-accounts`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    });
    return handleResponse(response);
};

export const fundEscrowAccount = async (id, amountCents) => {
    const response = await fetch(`${API_URL}/api/v1/escrow-accounts/${id}/fund`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount_cents: amountCents })
    });
    return handleResponse(response);
};

export const createFundingSession = async (id, amountCents, successUrl, cancelUrl) => {
    const response = await fetch(`${API_URL}/api/v1/escrow-accounts/${id}/fund-session`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
            amount_cents: amountCents,
            success_url: successUrl,
            cancel_url: cancelUrl
        })
    });
    return handleResponse(response);
};

export const confirmFunding = async (id, sessionId) => {
    const response = await fetch(`${API_URL}/api/v1/escrow-accounts/${id}/confirm-funding`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ session_id: sessionId })
    });
    return handleResponse(response);
};

export const getFundingHistory = async (id) => {
    const response = await fetch(`${API_URL}/api/v1/escrow-accounts/${id}/funding-history`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const pauseEscrowAccount = async (id) => {
    const response = await fetch(`${API_URL}/api/v1/escrow-accounts/${id}/pause`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const resumeEscrowAccount = async (id) => {
    const response = await fetch(`${API_URL}/api/v1/escrow-accounts/${id}/resume`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const closeEscrowAccount = async (id) => {
    const response = await fetch(`${API_URL}/api/v1/escrow-accounts/${id}/close`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

// ============ Policies ============
export const listPolicies = async (escrowId) => {
    const params = escrowId ? `?escrow_id=${escrowId}` : '';
    const response = await fetch(`${API_URL}/api/v1/policies${params}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const getPolicy = async (id) => {
    const response = await fetch(`${API_URL}/api/v1/policies/${id}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const createPolicy = async (payload) => {
    const response = await fetch(`${API_URL}/api/v1/policies`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    });
    return handleResponse(response);
};

export const updatePolicy = async (id, payload) => {
    const response = await fetch(`${API_URL}/api/v1/policies/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    });
    return handleResponse(response);
};

export const deletePolicy = async (id) => {
    const response = await fetch(`${API_URL}/api/v1/policies/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const lockPolicy = async (id) => {
    const response = await fetch(`${API_URL}/api/v1/policies/${id}/lock`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const unlockPolicy = async (id) => {
    const response = await fetch(`${API_URL}/api/v1/policies/${id}/unlock`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ confirm: true })
    });
    return handleResponse(response);
};

export const archivePolicy = async (id) => {
    const response = await fetch(`${API_URL}/api/v1/policies/${id}/archive`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

// ============ Spend Requests / Transactions ============
export const listSpendRequests = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.escrow_id) params.append('escrow_id', filters.escrow_id);
    if (filters.status) params.append('status', filters.status);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);
    
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/api/v1/spend${queryString ? `?${queryString}` : ''}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const getSpendRequest = async (id) => {
    const response = await fetch(`${API_URL}/api/v1/spend/${id}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

// ============ Approvals ============
export const listApprovals = async (status = 'pending') => {
    const response = await fetch(`${API_URL}/api/v1/approvals?status=${status}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const getApproval = async (id) => {
    const response = await fetch(`${API_URL}/api/v1/approvals/${id}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const approveApproval = async (id, note) => {
    const response = await fetch(`${API_URL}/api/v1/approvals/${id}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ note })
    });
    return handleResponse(response);
};

export const denyApproval = async (id, reason, note) => {
    const response = await fetch(`${API_URL}/api/v1/approvals/${id}/deny`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason, note })
    });
    return handleResponse(response);
};

// ============ API Keys ============
export const listApiKeys = async () => {
    const response = await fetch(`${API_URL}/api/v1/api-keys`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const createApiKey = async (payload) => {
    const response = await fetch(`${API_URL}/api/v1/api-keys`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    });
    return handleResponse(response);
};

export const revokeApiKey = async (id) => {
    const response = await fetch(`${API_URL}/api/v1/api-keys/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const deactivateApiKey = async (id) => {
    const response = await fetch(`${API_URL}/api/v1/api-keys/${id}/deactivate`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const reactivateApiKey = async (id) => {
    const response = await fetch(`${API_URL}/api/v1/api-keys/${id}/reactivate`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

// ============ Audit Events ============
export const listAuditEvents = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.escrow_id) params.append('escrow_id', filters.escrow_id);
    if (filters.event_type) params.append('event_type', filters.event_type);
    if (filters.actor_type) params.append('actor_type', filters.actor_type);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);
    
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/api/v1/audit${queryString ? `?${queryString}` : ''}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const getAuditEvent = async (id) => {
    const response = await fetch(`${API_URL}/api/v1/audit/${id}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

// ============ Webhooks ============
export const listWebhooks = async () => {
    const response = await fetch(`${API_URL}/api/v1/webhooks`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const getWebhook = async (id) => {
    const response = await fetch(`${API_URL}/api/v1/webhooks/${id}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const createWebhook = async (payload) => {
    const response = await fetch(`${API_URL}/api/v1/webhooks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    });
    return handleResponse(response);
};

export const updateWebhook = async (id, payload) => {
    const response = await fetch(`${API_URL}/api/v1/webhooks/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    });
    return handleResponse(response);
};

export const deleteWebhook = async (id) => {
    const response = await fetch(`${API_URL}/api/v1/webhooks/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const testWebhook = async (id) => {
    const response = await fetch(`${API_URL}/api/v1/webhooks/${id}/test`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const rotateWebhookSecret = async (id) => {
    const response = await fetch(`${API_URL}/api/v1/webhooks/${id}/rotate-secret`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const listWebhookDeliveries = async (webhookId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.limit) params.append('limit', filters.limit);
    
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/api/v1/webhooks/${webhookId}/deliveries${queryString ? `?${queryString}` : ''}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const triggerWebhookDelivery = async () => {
    const response = await fetch(`${API_URL}/api/v1/webhooks/deliver-pending`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const expireStaleApprovals = async () => {
    const response = await fetch(`${API_URL}/api/v1/approvals/expire-stale`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

// ============ Team / RBAC ============
export const listTeamMembers = async () => {
    const response = await fetch(`${API_URL}/api/v1/team`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const getTeamRoles = async () => {
    const response = await fetch(`${API_URL}/api/v1/team/roles`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const getMyRole = async () => {
    const response = await fetch(`${API_URL}/api/v1/team/my-role`, {
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const inviteTeamMember = async (email, role) => {
    const response = await fetch(`${API_URL}/api/v1/team/invite`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email, role })
    });
    return handleResponse(response);
};

export const updateMemberRole = async (memberId, role) => {
    const response = await fetch(`${API_URL}/api/v1/team/${memberId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role })
    });
    return handleResponse(response);
};

export const removeMember = async (memberId) => {
    const response = await fetch(`${API_URL}/api/v1/team/${memberId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

export const getInviteDetails = async (token) => {
    const response = await fetch(`${API_URL}/api/v1/team/invite/${token}`, {
        headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse(response);
};

export const acceptInvite = async (token) => {
    const response = await fetch(`${API_URL}/api/v1/team/accept-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
    });
    return handleResponse(response);
};

// ============ Utility Functions ============
export const formatCents = (cents) => {
    if (cents === null || cents === undefined) return '$0.00';
    return `$${(cents / 100).toFixed(2)}`;
};

export const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
};

export const formatShortDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
};

export const centsToDollars = (cents) => {
    return (cents / 100).toFixed(2);
};

export const dollarsToCents = (dollars) => {
    return Math.round(parseFloat(dollars) * 100);
};
