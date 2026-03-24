/**
 * Safe-Spend TypeScript SDK
 *
 * A minimal, developer-friendly TypeScript client for the Safe-Spend API,
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
 *
 * @packageDocumentation
 */

export { SafeSpendClient } from './client';

export {
  SafeSpendError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  APIError,
} from './errors';

export type {
  // Core types
  EscrowAccount,
  EscrowBalance,
  SpendingPolicy,
  SpendRequest,
  Approval,
  ApprovalResult,
  RuleEvaluation,
  
  // Options types
  SafeSpendConfig,
  CreateEscrowOptions,
  FundEscrowOptions,
  CreatePolicyOptions,
  CreateSpendOptions,
  ListSpendOptions,
  ListApprovalsOptions,
  ApproveOptions,
  DenyOptions,
  
  // Response types
  ListResponse,
  ApprovalSpendRequest,
  ApprovalEscrowAccount,
} from './types';

/** SDK version */
export const VERSION = '0.1.0';
