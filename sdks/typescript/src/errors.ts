/**
 * Custom exceptions for the Safe-Spend SDK.
 */

/** Base exception for Safe-Spend SDK */
export class SafeSpendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SafeSpendError';
    Object.setPrototypeOf(this, SafeSpendError.prototype);
  }
}

/** Raised when authentication fails (401) */
export class AuthenticationError extends SafeSpendError {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/** Raised when permission is denied (403) */
export class PermissionError extends SafeSpendError {
  constructor(message: string = 'Permission denied') {
    super(message);
    this.name = 'PermissionError';
    Object.setPrototypeOf(this, PermissionError.prototype);
  }
}

/** Raised when a resource is not found (404) */
export class NotFoundError extends SafeSpendError {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/** Raised when rate limit is exceeded (429) */
export class RateLimitError extends SafeSpendError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/** Raised when request validation fails (400) */
export class ValidationError extends SafeSpendError {
  details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  toString(): string {
    if (this.details) {
      return `${this.message}: ${JSON.stringify(this.details)}`;
    }
    return this.message;
  }
}

/** Raised for general API errors (5xx, unexpected errors) */
export class APIError extends SafeSpendError {
  statusCode: number;
  body: unknown;

  constructor(message: string, statusCode: number, body: unknown) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.body = body;
    Object.setPrototypeOf(this, APIError.prototype);
  }

  toString(): string {
    return `${this.message} (status=${this.statusCode})`;
  }
}
