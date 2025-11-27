/**
 * Error handling and sanitization utilities
 * Prevents sensitive information disclosure in error messages
 */

/// <reference types="vite/client" />

/**
 * Error codes for tracking and debugging
 */
export enum ErrorCode {
  // Authentication errors (1xxx)
  AUTH_INVALID_KEY = 1001,
  AUTH_UNAUTHORIZED = 1002,
  
  // Rate limiting errors (2xxx)
  RATE_LIMIT_EXCEEDED = 2001,
  QUOTA_EXCEEDED = 2002,
  
  // Network errors (3xxx)
  NETWORK_CONNECTION = 3001,
  NETWORK_TIMEOUT = 3002,
  
  // Validation errors (4xxx)
  VALIDATION_INVALID_INPUT = 4001,
  VALIDATION_FILE_SIZE = 4002,
  VALIDATION_FILE_TYPE = 4003,
  
  // Storage errors (5xxx)
  STORAGE_QUOTA_EXCEEDED = 5001,
  STORAGE_READ_ERROR = 5002,
  STORAGE_WRITE_ERROR = 5003,
  
  // Service errors (6xxx)
  SERVICE_UNAVAILABLE = 6001,
  SERVICE_OVERLOADED = 6002,
  
  // Generic errors (9xxx)
  UNKNOWN_ERROR = 9999,
}

/**
 * Structured error with code and context
 */
export class CraftusError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'CraftusError';
  }
}

/**
 * Patterns that indicate sensitive information in error messages
 */
const SENSITIVE_PATTERNS = [
  /\/[a-zA-Z0-9_\-./]+\.(ts|tsx|js|jsx)/gi, // File paths
  /at\s+[a-zA-Z0-9_]+\s+\(/gi, // Stack trace function names
  /line\s+\d+/gi, // Line numbers
  /column\s+\d+/gi, // Column numbers
  /localhost:\d+/gi, // Local ports
  /127\.0\.0\.1/gi, // Local IP
  /\b[A-Z][a-zA-Z0-9_]*Error\b/g, // Error class names (except at start)
  /table\s+["']?\w+["']?/gi, // Database table references
  /column\s+["']?\w+["']?/gi, // Database column references
  /key\s+["']?\w+["']?/gi, // Key references
  /token/gi, // Token references
  /secret/gi, // Secret references
  /password/gi, // Password references
];

/**
 * Sanitizes error messages for user display
 * Removes sensitive information while keeping useful context
 */
export const sanitizeError = (error: unknown): string => {
  // Default generic message
  const genericMessage = 'An error occurred. Please try again.';

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // API key related errors
    if (message.includes('api key') || message.includes('authentication') || message.includes('unauthorized')) {
      return 'Authentication error. Please check your configuration.';
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('quota') || message.includes('too many requests')) {
      // Extract wait time if present (sanitized)
      const match = error.message.match(/wait (\d+) seconds?/i);
      if (match && parseInt(match[1]) < 3600) { // Sanity check: less than 1 hour
        return `Rate limit exceeded. Please wait ${match[1]} seconds.`;
      }
      return 'Too many requests. Please try again later.';
    }

    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection') || message.includes('timeout')) {
      return 'Connection error. Please check your internet connection.';
    }

    // File upload errors (safe to show)
    if (message.includes('file') && (message.includes('size') || message.includes('type') || message.includes('format'))) {
      // Remove any file paths but keep the validation message
      let sanitized = error.message;
      SENSITIVE_PATTERNS.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '[redacted]');
      });
      return sanitized;
    }

    // Validation errors (safe to show, but sanitize)
    if (message.includes('invalid') || message.includes('validation') || message.includes('required')) {
      // Remove sensitive patterns from validation messages
      let sanitized = error.message;
      SENSITIVE_PATTERNS.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '[redacted]');
      });
      // Only return if it's still meaningful after sanitization
      if (sanitized.length > 10 && !sanitized.includes('[redacted]')) {
        return sanitized;
      }
      return 'Invalid input. Please check your data and try again.';
    }

    // Model overload
    if (message.includes('overload') || message.includes('503') || message.includes('service unavailable')) {
      return 'Service temporarily busy. Retrying...';
    }

    // Storage errors
    if (message.includes('storage') || message.includes('quota exceeded') || message.includes('localstorage')) {
      return 'Storage limit reached. Please clear some projects.';
    }

    // Permission errors
    if (message.includes('permission') || message.includes('forbidden') || message.includes('403')) {
      return 'Permission denied. Please check your access rights.';
    }

    // Not found errors
    if (message.includes('not found') || message.includes('404')) {
      return 'Resource not found. Please try again.';
    }

    // In development, show full error (but still sanitize sensitive patterns)
    if (import.meta.env.DEV) {
      let devMessage = error.message;
      // Even in dev, redact API keys and tokens
      devMessage = devMessage.replace(/[a-zA-Z0-9_-]{20,}/g, (match) => {
        if (match.length > 30) return '[REDACTED_TOKEN]';
        return match;
      });
      return devMessage;
    }

    // In production, use generic message
    return genericMessage;
  }

  // Non-Error objects
  if (typeof error === 'string') {
    // Don't expose raw strings in production
    if (import.meta.env.DEV) {
      // Sanitize even in dev
      let sanitized = error;
      SENSITIVE_PATTERNS.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '[redacted]');
      });
      return sanitized;
    }
    return genericMessage;
  }

  return genericMessage;
};

/**
 * Logs error for debugging without exposing to user
 */
export const logError = (context: string, error: unknown, additionalInfo?: Record<string, any>) => {
  const timestamp = new Date().toISOString();
  const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const errorData = {
    errorId,
    context,
    timestamp,
    error: error instanceof Error ? {
      message: error.message,
      stack: import.meta.env.DEV ? error.stack : undefined,
      name: error.name,
      code: error instanceof CraftusError ? error.code : undefined,
    } : error,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    ...additionalInfo,
  };
  
  console.error(`[${timestamp}] ${context} [${errorId}]:`, errorData);

  // In production, send to error tracking service
  if (import.meta.env.PROD) {
    // Store in localStorage for later upload (if quota available)
    try {
      const errorLog = localStorage.getItem('craftus_error_log');
      const errors = errorLog ? JSON.parse(errorLog) : [];
      errors.push({
        ...errorData,
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          code: error instanceof CraftusError ? error.code : undefined,
        } : error,
      });
      // Keep only last 50 errors
      const recentErrors = errors.slice(-50);
      localStorage.setItem('craftus_error_log', JSON.stringify(recentErrors));
    } catch (storageError) {
      // Ignore storage errors in error handler
      console.warn('Failed to log error to storage:', storageError);
    }
    
    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureException(error, { contexts: { custom: errorData } });
  }
  
  return errorId;
};

/**
 * Safe error handler for async operations
 */
export const handleAsyncError = async <T>(
  operation: () => Promise<T>,
  context: string,
  fallback?: T
): Promise<T | undefined> => {
  try {
    return await operation();
  } catch (error) {
    logError(context, error);
    return fallback;
  }
};

/**
 * Error boundary fallback component data
 */
export interface ErrorBoundaryInfo {
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Get user-friendly error boundary info
 */
export const getErrorBoundaryInfo = (error: Error): ErrorBoundaryInfo => {
  return {
    title: 'Something went wrong',
    message: sanitizeError(error),
    action: {
      label: 'Reload Page',
      onClick: () => window.location.reload(),
    },
  };
};

/**
 * Security event types for audit logging
 */
export enum SecurityEventType {
  INVALID_INPUT = 'invalid_input',
  RATE_LIMIT_HIT = 'rate_limit_hit',
  FILE_UPLOAD_REJECTED = 'file_upload_rejected',
  STORAGE_QUOTA_EXCEEDED = 'storage_quota_exceeded',
  XSS_ATTEMPT_BLOCKED = 'xss_attempt_blocked',
  SUSPICIOUS_PATTERN_DETECTED = 'suspicious_pattern_detected',
}

/**
 * Log security events for audit trail
 */
export const logSecurityEvent = (
  eventType: SecurityEventType,
  details: Record<string, any>
) => {
  const timestamp = new Date().toISOString();
  const eventId = `SEC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const securityEvent = {
    eventId,
    eventType,
    timestamp,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    ...details,
  };
  
  // Always log security events
  console.warn(`[SECURITY] ${eventType} [${eventId}]:`, securityEvent);
  
  // Store security events separately
  try {
    const securityLog = localStorage.getItem('craftus_security_log');
    const events = securityLog ? JSON.parse(securityLog) : [];
    events.push(securityEvent);
    // Keep only last 100 security events
    const recentEvents = events.slice(-100);
    localStorage.setItem('craftus_security_log', JSON.stringify(recentEvents));
  } catch (storageError) {
    console.warn('Failed to log security event to storage:', storageError);
  }
  
  // In production, send to security monitoring service
  if (import.meta.env.PROD) {
    // TODO: Send to security monitoring service
    // Example: SecurityMonitor.logEvent(securityEvent);
  }
  
  return eventId;
};
