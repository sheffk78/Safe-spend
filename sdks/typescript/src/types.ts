/**
 * Type definitions for Safe-Spend SDK responses.
 */

/** Escrow account representation */
export interface EscrowAccount {
  id: string;
  name: string;
  description?: string;
  balance_cents: number;
  currency: string;
  status: 'active' | 'paused' | 'depleted' | 'closed';
  total_funded_cents?: number;
  total_spent_cents?: number;
  total_denied_cents?: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/** Escrow balance response */
export interface EscrowBalance {
  escrow_id: string;
  balance_cents: number;
  currency: string;
  status: string;
}

/** Spending policy representation */
export interface SpendingPolicy {
  id: string;
  escrow_id: string;
  name: string;
  is_active: boolean;
  per_transaction_limit_cents?: number;
  daily_limit_cents?: number;
  weekly_limit_cents?: number;
  monthly_limit_cents?: number;
  allowed_vendors?: string[];
  blocked_vendors?: string[];
  vendor_match_mode?: string;
  allowed_categories?: string[];
  blocked_categories?: string[];
  active_days?: string[];
  active_hours_start?: string;
  active_hours_end?: string;
  active_timezone?: string;
  auto_approve_under_cents?: number;
  require_human_above_cents?: number;
  approval_timeout_minutes?: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/** Rule evaluation step */
export interface RuleEvaluation {
  rule: string;
  passed: boolean;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/** Spend request representation */
export interface SpendRequest {
  id: string;
  escrow_id: string;
  amount_cents: number;
  currency: string;
  vendor: string;
  category?: string;
  description?: string;
  idempotency_key?: string;
  status: 'approved' | 'denied' | 'pending' | 'expired' | 'cancelled';
  resolved_at?: string;
  resolved_by?: string;
  denial_reason?: string;
  denial_rule_id?: string;
  rules_evaluated?: RuleEvaluation[];
  balance_before_cents?: number;
  balance_after_cents?: number;
  remaining_balance_cents?: number;
  approval_id?: string;
  approval_expires_at?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

/** Spend request in approval context */
export interface ApprovalSpendRequest {
  id: string;
  escrow_id: string;
  amount_cents: number;
  currency: string;
  vendor: string;
  category?: string;
  description?: string;
  status: string;
  rules_evaluated?: RuleEvaluation[];
}

/** Escrow account summary in approval context */
export interface ApprovalEscrowAccount {
  id: string;
  name: string;
  balance_cents: number;
}

/** Approval representation */
export interface Approval {
  id: string;
  spend_request_id: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  requested_at: string;
  expires_at: string;
  decided_by?: string;
  decided_at?: string;
  decision_note?: string;
  notification_sent?: boolean;
  spend_request?: ApprovalSpendRequest;
  escrow_account?: ApprovalEscrowAccount;
}

/** Approval action result */
export interface ApprovalResult {
  id: string;
  approval_id: string;
  status: string;
  escrow_id: string;
  amount_cents: number;
  currency: string;
  vendor: string;
  category?: string;
  description?: string;
  remaining_balance_cents?: number;
  balance_before_cents?: number;
  balance_after_cents?: number;
  rules_evaluated?: RuleEvaluation[];
  resolved_at?: string;
  resolved_by?: string;
  approved_by?: string;
  approved_at?: string;
  denied_by?: string;
  denied_at?: string;
  denial_reason?: string;
}

/** List response wrapper */
export interface ListResponse<T> {
  data: T[];
  total: number;
  limit?: number;
  offset?: number;
}

/** Create escrow options */
export interface CreateEscrowOptions {
  name: string;
  description?: string;
  currency?: string;
}

/** Fund escrow options */
export interface FundEscrowOptions {
  amount_cents: number;
}

/** Create policy options */
export interface CreatePolicyOptions {
  escrow_id: string;
  name: string;
  per_transaction_limit_cents?: number;
  daily_limit_cents?: number;
  weekly_limit_cents?: number;
  monthly_limit_cents?: number;
  vendor_allowlist?: string[];
  vendor_blocklist?: string[];
  auto_approve_under_cents?: number;
  require_human_above_cents?: number;
}

/** Create spend options */
export interface CreateSpendOptions {
  escrow_id: string;
  amount_cents: number;
  vendor: string;
  currency?: string;
  category?: string;
  description?: string;
  idempotency_key?: string;
  metadata?: Record<string, unknown>;
}

/** List spend options */
export interface ListSpendOptions {
  escrow_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

/** List approvals options */
export interface ListApprovalsOptions {
  status?: 'pending' | 'approved' | 'denied' | 'expired';
  limit?: number;
  offset?: number;
}

/** Approve options */
export interface ApproveOptions {
  note?: string;
}

/** Deny options */
export interface DenyOptions {
  note?: string;
  reason?: string;
}

/** Client configuration */
export interface SafeSpendConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}
