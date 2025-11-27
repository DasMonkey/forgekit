/**
 * Secure logging utility
 * Prevents sensitive data leakage in production
 */

const isDevelopment = import.meta.env.DEV;

/**
 * Safe error logging that sanitizes sensitive data
 */
export const logError = (message: string, error?: any): void => {
  if (isDevelopment) {
    console.error(message, error);
  } else {
    // In production, log only safe information
    console.error(message);
    
    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // trackError({ message, timestamp: Date.now() });
  }
};

/**
 * Safe warning logging
 */
export const logWarning = (message: string, data?: any): void => {
  if (isDevelopment) {
    console.warn(message, data);
  }
};

/**
 * Safe info logging
 */
export const logInfo = (message: string): void => {
  if (isDevelopment) {
    console.log(message);
  }
};

/**
 * Sanitize error for user display
 */
export const getUserFriendlyError = (error: any): string => {
  // Never expose internal error details to users
  const genericMessages: Record<string, string> = {
    'network': 'Network error. Please check your connection.',
    'auth': 'Authentication failed. Please try again.',
    'rate_limit': 'Too many requests. Please wait a moment.',
    'storage': 'Storage error. Your browser may be full.',
    'validation': 'Invalid data. Please check your input.',
  };

  // Map error types to user-friendly messages
  if (error?.message?.includes('fetch')) return genericMessages.network;
  if (error?.message?.includes('401') || error?.message?.includes('403')) return genericMessages.auth;
  if (error?.message?.includes('429') || error?.message?.includes('rate')) return genericMessages.rate_limit;
  if (error?.message?.includes('storage') || error?.message?.includes('quota')) return genericMessages.storage;

  return 'An error occurred. Please try again.';
};
