import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import {
  User,
  AuthSession,
  SubscriptionTier,
  validateEmail,
  validateUserData,
  isSessionValid,
  createSession,
  createUser,
  hashPassword,
  verifyPassword,
} from '../utils/auth';
import { encryptApiKey, decryptApiKey, validateApiKeyFormat } from '../utils/encryption';
import { sanitizeText } from '../utils/security';

// State Interface
interface AuthContextState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  apiKey: string | null;
  subscription: SubscriptionTier;
}

// Action Types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; subscription: SubscriptionTier } }
  | { type: 'AUTH_ERROR'; payload: { error: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_PROFILE'; payload: { user: User } }
  | { type: 'SET_API_KEY'; payload: { apiKey: string } }
  | { type: 'REMOVE_API_KEY' }
  | { type: 'UPGRADE_SUBSCRIPTION'; payload: { subscription: SubscriptionTier } }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: { isLoading: boolean } };

// Context Interface
interface AuthContextValue {
  state: AuthContextState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  setApiKey: (apiKey: string) => void;
  removeApiKey: () => void;
  upgradeToPro: () => Promise<void>;
  clearError: () => void;
}

// Initial State
const initialState: AuthContextState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start as loading to check for existing session
  error: null,
  apiKey: null,
  subscription: 'free',
};

// LocalStorage Keys
const STORAGE_KEYS = {
  SESSION: 'craftus_auth_session',
  USER: 'craftus_user_profile',
  API_KEY: 'craftus_user_api_key',
  SUBSCRIPTION: 'craftus_subscription',
  USER_CREDENTIALS: 'craftus_user_credentials', // For MVP only
};

// Rate Limiter for auth attempts
class AuthRateLimiter {
  private attempts: Map<string, { count: number; resetAt: number }> = new Map();
  private maxAttempts = 5;
  private windowMs = 15 * 60 * 1000; // 15 minutes

  canAttempt(identifier: string): boolean {
    const record = this.attempts.get(identifier);
    const now = Date.now();

    if (!record) {
      return true;
    }

    // Reset if window has passed
    if (now >= record.resetAt) {
      this.attempts.delete(identifier);
      return true;
    }

    return record.count < this.maxAttempts;
  }

  recordAttempt(identifier: string): void {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record || now >= record.resetAt) {
      this.attempts.set(identifier, {
        count: 1,
        resetAt: now + this.windowMs,
      });
    } else {
      record.count++;
    }
  }

  getTimeUntilReset(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record) return 0;

    const now = Date.now();
    return Math.max(0, record.resetAt - now);
  }
}

const authRateLimiter = new AuthRateLimiter();

// Reducer
const authReducer = (state: AuthContextState, action: AuthAction): AuthContextState => {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null };

    case 'AUTH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        subscription: action.payload.subscription,
        error: null,
      };

    case 'AUTH_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload.error,
      };

    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
        apiKey: state.apiKey, // Preserve API key on logout
      };

    case 'UPDATE_PROFILE':
      return {
        ...state,
        user: action.payload.user,
      };

    case 'SET_API_KEY':
      return {
        ...state,
        apiKey: action.payload.apiKey,
      };

    case 'REMOVE_API_KEY':
      return {
        ...state,
        apiKey: null,
      };

    case 'UPGRADE_SUBSCRIPTION':
      return {
        ...state,
        subscription: action.payload.subscription,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload.isLoading,
      };

    default:
      return state;
  }
};

// Create Context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Provider Component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, []);

  // Load existing session from LocalStorage
  const loadSession = () => {
    try {
      const sessionData = localStorage.getItem(STORAGE_KEYS.SESSION);
      const userData = localStorage.getItem(STORAGE_KEYS.USER);
      const apiKeyData = localStorage.getItem(STORAGE_KEYS.API_KEY);
      const subscriptionData = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);

      if (sessionData && userData) {
        const session: AuthSession = JSON.parse(sessionData);
        const user: User = JSON.parse(userData);

        // Validate session
        if (isSessionValid(session) && validateUserData(user)) {
          // Restore API key if exists
          let apiKey: string | null = null;
          if (apiKeyData) {
            try {
              apiKey = decryptApiKey(apiKeyData);
            } catch {
              // Invalid API key, remove it
              localStorage.removeItem(STORAGE_KEYS.API_KEY);
            }
          }

          // Restore subscription
          const subscription: SubscriptionTier =
            subscriptionData === 'pro' ? 'pro' : 'free';

          dispatch({ type: 'AUTH_SUCCESS', payload: { user, subscription } });
          if (apiKey) {
            dispatch({ type: 'SET_API_KEY', payload: { apiKey } });
          }
        } else {
          // Invalid session, clear storage
          clearStorage();
          dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
        }
      } else {
        // No session found
        dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      clearStorage();
      dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
    }
  };

  // Clear all auth-related storage
  const clearStorage = () => {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION);
    // Don't remove API key - user may want to keep it
  };

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    // Rate limiting check
    if (!authRateLimiter.canAttempt(email)) {
      const waitTime = authRateLimiter.getTimeUntilReset(email);
      const waitMinutes = Math.ceil(waitTime / 60000);
      throw new Error(
        `Too many login attempts. Please try again in ${waitMinutes} minutes.`
      );
    }

    dispatch({ type: 'AUTH_START' });

    try {
      // Validate inputs
      if (!validateEmail(email)) {
        throw new Error('Invalid email address');
      }

      // For MVP: Check stored credentials
      const storedCredentials = localStorage.getItem(STORAGE_KEYS.USER_CREDENTIALS);
      if (!storedCredentials) {
        authRateLimiter.recordAttempt(email);
        throw new Error('Invalid email or password');
      }

      const credentials = JSON.parse(storedCredentials);
      const userCredential = credentials[email.toLowerCase()];

      if (!userCredential) {
        authRateLimiter.recordAttempt(email);
        throw new Error('Invalid email or password');
      }

      // Verify password
      const isValid = await verifyPassword(password, userCredential.passwordHash);
      if (!isValid) {
        authRateLimiter.recordAttempt(email);
        throw new Error('Invalid email or password');
      }

      // Create session
      const user: User = userCredential.user;
      user.lastLogin = new Date();

      const session = createSession(user.id);

      // Save to storage
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

      // Update stored user data
      credentials[email.toLowerCase()].user = user;
      localStorage.setItem(STORAGE_KEYS.USER_CREDENTIALS, JSON.stringify(credentials));

      // Get subscription
      const subscription: SubscriptionTier =
        localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION) === 'pro' ? 'pro' : 'free';

      dispatch({ type: 'AUTH_SUCCESS', payload: { user, subscription } });
    } catch (error: any) {
      dispatch({
        type: 'AUTH_ERROR',
        payload: { error: error.message || 'Login failed' },
      });
      throw error;
    }
  };

  // Signup function
  const signup = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<void> => {
    dispatch({ type: 'AUTH_START' });

    try {
      // Validate inputs
      if (!validateEmail(email)) {
        throw new Error('Invalid email address');
      }

      const passwordValidation = await import('../utils/validation').then(m =>
        m.validatePassword(password)
      );
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.error || 'Invalid password');
      }

      const sanitizedName = sanitizeText(displayName, 100);
      if (!sanitizedName || sanitizedName.length === 0) {
        throw new Error('Display name is required');
      }

      // Check if user already exists
      const storedCredentials = localStorage.getItem(STORAGE_KEYS.USER_CREDENTIALS);
      const credentials = storedCredentials ? JSON.parse(storedCredentials) : {};

      if (credentials[email.toLowerCase()]) {
        throw new Error('An account with this email already exists');
      }

      // Create user
      const user = createUser(email, sanitizedName);

      // Hash password
      const passwordHash = await hashPassword(password);

      // Store credentials
      credentials[email.toLowerCase()] = {
        passwordHash,
        user,
      };
      localStorage.setItem(STORAGE_KEYS.USER_CREDENTIALS, JSON.stringify(credentials));

      // Create session
      const session = createSession(user.id);
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, 'free');

      dispatch({ type: 'AUTH_SUCCESS', payload: { user, subscription: 'free' } });
    } catch (error: any) {
      dispatch({
        type: 'AUTH_ERROR',
        payload: { error: error.message || 'Signup failed' },
      });
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    clearStorage();
    dispatch({ type: 'LOGOUT' });
  };

  // Update profile function
  const updateProfile = async (updates: Partial<User>): Promise<void> => {
    if (!state.user) {
      throw new Error('No user logged in');
    }

    try {
      const updatedUser: User = { ...state.user };

      // Update display name
      if (updates.displayName !== undefined) {
        const sanitized = sanitizeText(updates.displayName, 100);
        if (!sanitized || sanitized.length === 0) {
          throw new Error('Display name cannot be empty');
        }
        updatedUser.displayName = sanitized;
      }

      // Update email
      if (updates.email !== undefined) {
        if (!validateEmail(updates.email)) {
          throw new Error('Invalid email address');
        }
        updatedUser.email = updates.email.toLowerCase().trim();
      }

      // Save to storage
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));

      // Update credentials if email changed
      if (updates.email && updates.email !== state.user.email) {
        const storedCredentials = localStorage.getItem(STORAGE_KEYS.USER_CREDENTIALS);
        if (storedCredentials) {
          const credentials = JSON.parse(storedCredentials);
          const oldEmail = state.user.email.toLowerCase();
          const newEmail = updates.email.toLowerCase();

          if (credentials[oldEmail]) {
            credentials[newEmail] = credentials[oldEmail];
            credentials[newEmail].user = updatedUser;
            delete credentials[oldEmail];
            localStorage.setItem(
              STORAGE_KEYS.USER_CREDENTIALS,
              JSON.stringify(credentials)
            );
          }
        }
      }

      dispatch({ type: 'UPDATE_PROFILE', payload: { user: updatedUser } });
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update profile');
    }
  };

  // Set API key function
  const setApiKey = (apiKey: string) => {
    try {
      // Validate format
      if (!validateApiKeyFormat(apiKey)) {
        throw new Error('Invalid API key format');
      }

      // Encrypt and store
      const encrypted = encryptApiKey(apiKey);
      localStorage.setItem(STORAGE_KEYS.API_KEY, encrypted);

      dispatch({ type: 'SET_API_KEY', payload: { apiKey } });
    } catch (error: any) {
      throw new Error(error.message || 'Failed to save API key');
    }
  };

  // Remove API key function
  const removeApiKey = () => {
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
    dispatch({ type: 'REMOVE_API_KEY' });
  };

  // Upgrade to Pro function (placeholder for MVP)
  const upgradeToPro = async (): Promise<void> => {
    // For MVP, just update the subscription tier locally
    // In production, this would integrate with payment processor
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, 'pro');
    dispatch({ type: 'UPGRADE_SUBSCRIPTION', payload: { subscription: 'pro' } });
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: AuthContextValue = {
    state,
    login,
    logout,
    signup,
    updateProfile,
    setApiKey,
    removeApiKey,
    upgradeToPro,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom Hook
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export types
export type { User, AuthSession, SubscriptionTier };
