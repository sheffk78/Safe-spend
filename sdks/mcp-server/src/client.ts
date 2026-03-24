/**
 * Safe-Spend API client for MCP server.
 * Thin wrapper around the REST API.
 */

export interface SafeSpendConfig {
  apiKey: string;
  baseUrl: string;
}

export interface EscrowAccount {
  id: string;
  name: string;
  description?: string;
  balance_cents: number;
  currency: string;
  status: string;
  total_funded_cents?: number;
  total_spent_cents?: number;
}

export interface SpendingPolicy {
  id: string;
  escrow_id: string;
  name: string;
  is_active: boolean;
  per_transaction_limit_cents?: number;
  daily_limit_cents?: number;
  auto_approve_under_cents?: number;
}

export interface SpendRequest {
  id: string;
  escrow_id: string;
  amount_cents: number;
  currency: string;
  vendor: string;
  category?: string;
  description?: string;
  status: string;
  denial_reason?: string;
  remaining_balance_cents?: number;
  approval_id?: string;
  approval_expires_at?: string;
}

export interface Approval {
  id: string;
  spend_request_id: string;
  status: string;
  requested_at: string;
  expires_at: string;
  spend_request?: {
    amount_cents: number;
    vendor: string;
    category?: string;
  };
}

export class SafeSpendClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: SafeSpendConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data as T;
  }

  // Escrow Accounts
  async listEscrowAccounts(): Promise<EscrowAccount[]> {
    const res = await this.request<{ data: EscrowAccount[] }>('GET', '/v1/escrow-accounts');
    return res.data || [];
  }

  async getEscrowAccount(escrowId: string): Promise<EscrowAccount> {
    return this.request<EscrowAccount>('GET', `/v1/escrow-accounts/${escrowId}`);
  }

  async getEscrowBalance(escrowId: string): Promise<{ balance_cents: number; currency: string; status: string }> {
    return this.request('GET', `/v1/escrow-accounts/${escrowId}/balance`);
  }

  async createEscrowAccount(name: string, description?: string): Promise<EscrowAccount> {
    return this.request<EscrowAccount>('POST', '/v1/escrow-accounts', {
      name,
      description,
      currency: 'usd',
    });
  }

  async fundEscrowAccount(escrowId: string, amountCents: number): Promise<EscrowAccount> {
    const res = await this.request<{ escrow: EscrowAccount }>('POST', `/v1/escrow-accounts/${escrowId}/fund`, {
      amount_cents: amountCents,
    });
    return res.escrow;
  }

  async pauseEscrowAccount(escrowId: string): Promise<EscrowAccount> {
    return this.request<EscrowAccount>('POST', `/v1/escrow-accounts/${escrowId}/pause`);
  }

  async resumeEscrowAccount(escrowId: string): Promise<EscrowAccount> {
    return this.request<EscrowAccount>('POST', `/v1/escrow-accounts/${escrowId}/resume`);
  }

  // Policies
  async listPolicies(escrowId?: string): Promise<SpendingPolicy[]> {
    const params = escrowId ? `?escrow_id=${escrowId}` : '';
    const res = await this.request<{ data: SpendingPolicy[] }>('GET', `/v1/policies${params}`);
    return res.data || [];
  }

  async getPolicy(policyId: string): Promise<SpendingPolicy> {
    return this.request<SpendingPolicy>('GET', `/v1/policies/${policyId}`);
  }

  // Spend
  async createSpend(params: {
    escrowId: string;
    amountCents: number;
    vendor: string;
    category?: string;
    description?: string;
    idempotencyKey?: string;
  }): Promise<SpendRequest> {
    return this.request<SpendRequest>('POST', '/v1/spend', {
      escrow_id: params.escrowId,
      amount_cents: params.amountCents,
      vendor: params.vendor,
      category: params.category,
      description: params.description,
      idempotency_key: params.idempotencyKey || `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    });
  }

  async listSpendRequests(escrowId?: string, status?: string): Promise<SpendRequest[]> {
    const params = new URLSearchParams();
    if (escrowId) params.append('escrow_id', escrowId);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<{ data: SpendRequest[] }>('GET', `/v1/spend${query}`);
    return res.data || [];
  }

  // Approvals (requires org token, not API key)
  async listApprovals(status?: string): Promise<Approval[]> {
    const params = status ? `?status=${status}` : '?status=pending';
    const res = await this.request<{ data: Approval[] }>('GET', `/v1/approvals${params}`);
    return res.data || [];
  }
}
