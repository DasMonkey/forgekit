/**
 * Authentication utility functions for Craftus
 * Handles email validation, password strength checking, and session management
 */

import { sanitizeText } from './security';

/**
 * User interface
 */
export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
  lastLogin: Date;
}

/**
 * Auth session interface
 */
export interface AuthSession {
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Subscription tier type
 */
export type SubscriptionTier = 'free' | 'pro';

/**
 * Validates email format
 */
export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Basic email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // Length check
  if (email.length > 254) {
    return false;
  }

  return emailRegex.test(email);
};

/**
 * Validates password strength
 * Requirements: At least 8 characters, contains letter and number
 */
export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password must be less than 128 characters' };
  }

  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one letter' };
  }

  // Must contain at least one number
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  return { valid: true };
};

/**
 * Sanitizes and validates display name
 */
export const sanitizeDisplayName = (name: string): string => {
  return sanitizeText(name, 100);
};

/**
 * Validates session data
 */
export const isSessionValid = (session: AuthSession | null): boolean => {
  if (!session) return false;
  
  try {
    // Check if session has expired
    const expiresAt = new Date(session.expiresAt);
    const now = new Date();
    
    if (now >= expiresAt) {
      return false;
    }

    // Validate required fields
    if (!session.userId || !session.token) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * Creates a new session
 * For MVP, this is client-side only with a simple token
 */
export const createSession = (userId: string): AuthSession => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  return {
    userId,
    token: generateSessionToken(),
    expiresAt,
    createdAt: now,
  };
};

/**
 * Generates a session token
 * For MVP, uses crypto.randomUUID()
 */
const generateSessionToken = (): string => {
  return crypto.randomUUID();
};

/**
 * Creates a new user object
 */
export const createUser = (email: string, displayName: string): User => {
  const now = new Date();
  
  return {
    id: crypto.randomUUID(),
    email: email.toLowerCase().trim(),
    displayName: sanitizeDisplayName(displayName),
    createdAt: now,
    lastLogin: now,
  };
};

/**
 * Validates user data structure
 */
export const validateUserData = (user: any): boolean => {
  if (!user || typeof user !== 'object') {
    return false;
  }

  // Required fields
  if (!user.id || typeof user.id !== 'string') return false;
  if (!user.email || typeof user.email !== 'string') return false;
  if (!user.displayName || typeof user.displayName !== 'string') return false;

  // Validate email format
  if (!validateEmail(user.email)) return false;

  // Length limits
  if (user.id.length > 100) return false;
  if (user.email.length > 254) return false;
  if (user.displayName.length > 100) return false;

  // Validate dates
  try {
    new Date(user.createdAt);
    new Date(user.lastLogin);
  } catch {
    return false;
  }

  return true;
};

/**
 * Simple password hashing for MVP (client-side only)
 * In production, this should be done server-side with proper bcrypt/argon2
 */
export const hashPassword = async (password: string): Promise<string> => {
  // For MVP, use a simple hash
  // In production, this would be done server-side
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Verifies password against hash
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
};
