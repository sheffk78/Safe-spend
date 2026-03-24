/**
 * Safe-Spend TypeScript SDK client implementation.
 */

import {
  APIError,
  AuthenticationError,
  NotFoundError,
  PermissionError,
  RateLimitError,
  ValidationError,
} from './errors';
import type {
  Approval,
  ApprovalResult,
  ApproveOptions,
  CreateEscrowOptions,
  CreatePolicyOptions,
  CreateSpendOptions,
  DenyOptions,
  EscrowAccount,
  EscrowBalance,
  FundEscrowOptions,
  ListApprovalsOptions,
  ListSpendOptions,
  SafeSpendConfig,
  SpendingPolicy,
  SpendRequest,
} from './types';

/**
 * TypeScript client for the Safe-Spend API.
 *
 * Safe-Spend provides escrow and spending-control APIs for AI agents,
 * part of the Agentic Trust suite.
 *
 * @example
 * ```typescript
 * import { SafeSpendClient } from 'safespend';
 *
 * const client = new SafeSpendClient({ apiKey: 'sk_test_...' });
 * const escrows = await client.listEscrowAccounts();
 * const spend = await client.createSpend({
 *   escrow_id: 'esc_123',
 *   amount_cents: 1000,
 *   vendor: 'Anthropic',
 * });
 * ```
 */
export class SafeSpendClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  /**
   * Initialize the Safe-Spend client.
   *
   * @param config - Client configuration
   * @param config.apiKey - Your Safe-Spend API key (starts with 'sk_')
   * @param config.baseUrl - Base URL for the Safe-Spend API. Override for staging/local dev.
   * @param config.timeout - Request timeout in milliseconds (default: 10000)
   */
  constructor(config: SafeSpendConfig) {
    if (!config.apiKey) {
      throw new Error('apiKey is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || 'https://api.safespend.app').replace(/\/$/, '');
    this.timeout = config.timeout || 10000;
  }

  /**
   * Make an HTTP request and handle errors.
   */
  private async request<T>(
    method: string,
    path: string,
    options?: {
      params?: Record<string, string | number | undefined>;
      body?: Record<string, unknown>;
    }
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    // Add query parameters
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'safespend-typescript/0.1.0',
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response body
      let body: Record<string, unknown>;
      try {
        body = await response.json();
      } catch {
        body = { raw: await response.text() };
      }

      // Handle error responses
      if (response.status === 400) {
        const errorMsg = (body.error as string) || 'Validation error';
        throw new ValidationError(errorMsg, body.details);
      }

      if (response.status === 401) {
        const errorMsg = (body.error as string) || 'Authentication failed';
        throw new AuthenticationError(errorMsg);
      }

      if (response.status === 403) {
        const errorMsg = (body.error as string) || 'Permission denied';
        throw new PermissionError(errorMsg);
      }

      if (response.status === 404) {
        const errorMsg = (body.error as string) || 'Not found';
        throw new NotFoundError(errorMsg);
      }

      if (response.status === 429) {
        const errorMsg = (body.error as string) || 'Rate limit exceeded';
        throw new RateLimitError(errorMsg);
      }

      if (response.status >= 500) {
        const errorMsg = (body.error as string) || 'Server error';
        throw new APIError(errorMsg, response.status, body);
      }

      if (!response.ok) {
        const errorMsg = (body.error as string) || `HTTP ${response.status}`;
        throw new APIError(errorMsg, response.status, body);
      }

      return body as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof SafeSpendError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new APIError('Request timed out', 0, null);
        }
        throw new APIError(`Request failed: ${error.message}`, 0, null);
      }

      throw new APIError('Request failed', 0, null);
    }
  }

  // -------------------------------------------------------------------------
  // Escrow Accounts
  // -------------------------------------------------------------------------

  /**
   * List all escrow accounts for your organization.
   *
   * @returns List of escrow accounts
   *
   * @example
   * ```typescript
   * const escrows = await client.listEscrowAccounts();
   * for (const e of escrows) {
   *   console.log(`${e.name}: $${(e.balance_cents / 100).toFixed(2)}`);
   * }
   * ```
   */
  async listEscrowAccounts(): Promise<EscrowAccount[]> {
    const response = await this.request<{ data: EscrowAccount[] }>('GET', '/v1/escrow-accounts');
    return response.data || [];
  }

  /**
   * Get details of a specific escrow account.
   *
   * @param escrowId - The escrow account ID
   * @returns Escrow account details
   * @throws NotFoundError if the escrow account doesn't exist
   */
  async getEscrowAccount(escrowId: string): Promise<EscrowAccount> {
    return this.request<EscrowAccount>('GET', `/v1/escrow-accounts/${escrowId}`);
  }

  /**
   * Create a new escrow account.
   *
   * @param options - Create options
   * @returns The created escrow account
   *
   * @example
   * ```typescript
   * const escrow = await client.createEscrowAccount({
   *   name: 'Marketing Budget Q1',
   *   description: 'Budget for ad spend and AI compute',
   * });
   * ```
   */
  async createEscrowAccount(options: CreateEscrowOptions): Promise<EscrowAccount> {
    return this.request<EscrowAccount>('POST', '/v1/escrow-accounts', {
      body: {
        name: options.name,
        description: options.description,
        currency: options.currency || 'usd',
      },
    });
  }

  /**
   * Fund an escrow account (simulated funding for testing).
   *
   * @param escrowId - The escrow account ID to fund
   * @param options - Fund options
   * @returns Updated escrow account with new balance
   *
   * @note For production funding with Stripe, use the dashboard
   * or the /fund-session endpoint directly.
   */
  async fundEscrowAccount(escrowId: string, options: FundEscrowOptions): Promise<EscrowAccount> {
    if (options.amount_cents <= 0) {
      throw new Error('amount_cents must be positive');
    }

    const response = await this.request<{ escrow: EscrowAccount }>('POST', `/v1/escrow-accounts/${escrowId}/fund`, {
      body: { amount_cents: options.amount_cents },
    });

    return response.escrow || (response as unknown as EscrowAccount);
  }

  /**
   * Get the current balance of an escrow account.
   *
   * @param escrowId - The escrow account ID
   * @returns Balance info with escrow_id, balance_cents, currency, and status
   */
  async getEscrowBalance(escrowId: string): Promise<EscrowBalance> {
    return this.request<EscrowBalance>('GET', `/v1/escrow-accounts/${escrowId}/balance`);
  }

  /**
   * Pause spending on an escrow account.
   *
   * @param escrowId - The escrow account ID
   * @returns Updated escrow account with 'paused' status
   */
  async pauseEscrowAccount(escrowId: string): Promise<EscrowAccount> {
    return this.request<EscrowAccount>('POST', `/v1/escrow-accounts/${escrowId}/pause`);
  }

  /**
   * Resume spending on a paused escrow account.
   *
   * @param escrowId - The escrow account ID
   * @returns Updated escrow account with 'active' status
   */
  async resumeEscrowAccount(escrowId: string): Promise<EscrowAccount> {
    return this.request<EscrowAccount>('POST', `/v1/escrow-accounts/${escrowId}/resume`);
  }

  /**
   * Close an escrow account (remaining balance will be refunded).
   *
   * @param escrowId - The escrow account ID
   * @returns Updated escrow account with 'closed' status
   *
   * @warning This action is irreversible. The account cannot be reopened.
   */
  async closeEscrowAccount(escrowId: string): Promise<EscrowAccount> {
    return this.request<EscrowAccount>('POST', `/v1/escrow-accounts/${escrowId}/close`);
  }

  // -------------------------------------------------------------------------
  // Spending Policies
  // -------------------------------------------------------------------------

  /**
   * List spending policies.
   *
   * @param escrowId - Optional filter by escrow account
   * @returns List of spending policies
   */
  async listPolicies(escrowId?: string): Promise<SpendingPolicy[]> {
    const response = await this.request<{ data: SpendingPolicy[] }>('GET', '/v1/policies', {
      params: escrowId ? { escrow_id: escrowId } : undefined,
    });
    return response.data || [];
  }

  /**
   * Get details of a specific spending policy.
   *
   * @param policyId - The policy ID
   * @returns Policy details
   */
  async getPolicy(policyId: string): Promise<SpendingPolicy> {
    return this.request<SpendingPolicy>('GET', `/v1/policies/${policyId}`);
  }

  /**
   * Create a new spending policy.
   *
   * @param options - Create options
   * @returns The created policy
   *
   * @example
   * ```typescript
   * const policy = await client.createPolicy({
   *   escrow_id: 'esc_123',
   *   name: 'Marketing Policy',
   *   per_transaction_limit_cents: 10000, // $100 max per tx
   *   daily_limit_cents: 50000, // $500/day
   *   auto_approve_under_cents: 5000, // Auto-approve under $50
   * });
   * ```
   */
  async createPolicy(options: CreatePolicyOptions): Promise<SpendingPolicy> {
    const body: Record<string, unknown> = {
      escrow_id: options.escrow_id,
      name: options.name,
    };

    if (options.per_transaction_limit_cents !== undefined) {
      body.per_transaction_limit_cents = options.per_transaction_limit_cents;
    }
    if (options.daily_limit_cents !== undefined) {
      body.daily_limit_cents = options.daily_limit_cents;
    }
    if (options.weekly_limit_cents !== undefined) {
      body.weekly_limit_cents = options.weekly_limit_cents;
    }
    if (options.monthly_limit_cents !== undefined) {
      body.monthly_limit_cents = options.monthly_limit_cents;
    }
    if (options.vendor_allowlist !== undefined) {
      body.allowed_vendors = options.vendor_allowlist;
    }
    if (options.vendor_blocklist !== undefined) {
      body.blocked_vendors = options.vendor_blocklist;
    }
    if (options.auto_approve_under_cents !== undefined) {
      body.auto_approve_under_cents = options.auto_approve_under_cents;
    }
    if (options.require_human_above_cents !== undefined) {
      body.require_human_above_cents = options.require_human_above_cents;
    }

    return this.request<SpendingPolicy>('POST', '/v1/policies', { body });
  }

  /**
   * Delete a spending policy.
   *
   * @param policyId - The policy ID to delete
   * @returns Confirmation message
   */
  async deletePolicy(policyId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('DELETE', `/v1/policies/${policyId}`);
  }

  // -------------------------------------------------------------------------
  // Spend Requests
  // -------------------------------------------------------------------------

  /**
   * Create a spend request.
   *
   * This runs through the 13-step rules engine and may result in:
   * - 'approved': Spend was auto-approved and executed.
   * - 'denied': Spend was denied by a policy rule.
   * - 'pending': Spend requires human approval.
   *
   * @param options - Spend options
   * @returns The spend request with status and rules evaluation
   *
   * @example
   * ```typescript
   * const spend = await client.createSpend({
   *   escrow_id: 'esc_123',
   *   amount_cents: 4999,
   *   vendor: 'Anthropic',
   *   category: 'ai_compute',
   *   description: 'Claude API credits top-up',
   * });
   *
   * if (spend.status === 'approved') {
   *   console.log(`Spend approved! Remaining: $${(spend.remaining_balance_cents || 0) / 100}`);
   * } else if (spend.status === 'pending') {
   *   console.log(`Awaiting approval. ID: ${spend.approval_id}`);
   * }
   * ```
   */
  async createSpend(options: CreateSpendOptions): Promise<SpendRequest> {
    if (options.amount_cents <= 0) {
      throw new Error('amount_cents must be positive');
    }

    // Generate idempotency key if not provided
    const idempotencyKey = options.idempotency_key || 
      `ts-sdk-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    const body: Record<string, unknown> = {
      escrow_id: options.escrow_id,
      amount_cents: options.amount_cents,
      currency: options.currency || 'usd',
      vendor: options.vendor,
      idempotency_key: idempotencyKey,
    };

    if (options.category !== undefined) {
      body.category = options.category;
    }
    if (options.description !== undefined) {
      body.description = options.description;
    }
    if (options.metadata !== undefined) {
      body.metadata = options.metadata;
    }

    return this.request<SpendRequest>('POST', '/v1/spend', { body });
  }

  /**
   * List spend requests.
   *
   * @param options - Filter options
   * @returns List of spend requests
   */
  async listSpendRequests(options?: ListSpendOptions): Promise<SpendRequest[]> {
    const response = await this.request<{ data: SpendRequest[] }>('GET', '/v1/spend', {
      params: {
        escrow_id: options?.escrow_id,
        status: options?.status,
        limit: options?.limit ?? 50,
        offset: options?.offset ?? 0,
      },
    });
    return response.data || [];
  }

  /**
   * Get details of a specific spend request.
   *
   * @param spendId - The spend request ID
   * @returns Spend request details
   */
  async getSpendRequest(spendId: string): Promise<SpendRequest> {
    return this.request<SpendRequest>('GET', `/v1/spend/${spendId}`);
  }

  /**
   * Cancel a pending spend request.
   *
   * @param spendId - The spend request ID
   * @returns Updated spend request with 'cancelled' status
   * @throws ValidationError if the spend request is not pending
   */
  async cancelSpendRequest(spendId: string): Promise<SpendRequest> {
    return this.request<SpendRequest>('POST', `/v1/spend/${spendId}/cancel`);
  }

  // -------------------------------------------------------------------------
  // Approvals (requires org token, not API key)
  // -------------------------------------------------------------------------

  /**
   * List approvals awaiting human review.
   *
   * @note This endpoint requires an organization token (JWT), not an API key.
   * Approvals are designed for human review, not agent automation.
   *
   * @param options - Filter options
   * @returns List of approvals with spend request details
   */
  async listApprovals(options?: ListApprovalsOptions): Promise<Approval[]> {
    const response = await this.request<{ data: Approval[] }>('GET', '/v1/approvals', {
      params: {
        status: options?.status ?? 'pending',
        limit: options?.limit ?? 50,
        offset: options?.offset ?? 0,
      },
    });
    return response.data || [];
  }

  /**
   * Get details of a specific approval.
   *
   * @param approvalId - The approval ID
   * @returns Approval details with spend request info
   */
  async getApproval(approvalId: string): Promise<Approval> {
    return this.request<Approval>('GET', `/v1/approvals/${approvalId}`);
  }

  /**
   * Approve a pending spend request.
   *
   * This executes the spend, deducting from the escrow balance.
   *
   * @param approvalId - The approval ID
   * @param options - Optional approval options
   * @returns Updated approval/spend request with 'approved' status
   * @throws ValidationError if approval is expired or already resolved
   */
  async approve(approvalId: string, options?: ApproveOptions): Promise<ApprovalResult> {
    const body = options?.note ? { note: options.note } : undefined;
    return this.request<ApprovalResult>('POST', `/v1/approvals/${approvalId}/approve`, { body });
  }

  /**
   * Deny a pending spend request.
   *
   * This does NOT deduct from the escrow balance.
   *
   * @param approvalId - The approval ID
   * @param options - Optional denial options
   * @returns Updated approval/spend request with 'denied' status
   */
  async deny(approvalId: string, options?: DenyOptions): Promise<ApprovalResult> {
    const body: Record<string, unknown> = {};
    if (options?.note) body.note = options.note;
    if (options?.reason) body.reason = options.reason;

    return this.request<ApprovalResult>('POST', `/v1/approvals/${approvalId}/deny`, {
      body: Object.keys(body).length > 0 ? body : undefined,
    });
  }
}

// Re-export SafeSpendError for catch blocks
import { SafeSpendError } from './errors';
export { SafeSpendError };
