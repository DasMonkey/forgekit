# Design Document

## Overview

The User Profile and Authentication system provides account management, settings customization, and API key storage for Craftus users. The system follows the existing React Context pattern used in the application and integrates seamlessly with the current navigation structure. It supports both guest and authenticated user experiences with a focus on security and user privacy.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Navigation Bar                          │
│  [Home] [Canvas] [My Projects] [Community] [Profile] 👤     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Profile Page   │
                    └──────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
         ┌──────▼──────┐           ┌───────▼────────┐
         │ Guest View  │           │ Authenticated  │
         │  - Login    │           │     View       │
         │  - Sign Up  │           │  - Settings    │
         │  - Pro Info │           │  - API Key     │
         └─────────────┘           │  - Subscription│
                                   │  - Logout      │
                                   └────────────────┘
```

### Context Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    App Component                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │              AuthProvider                          │  │
│  │  ┌──────────────────────────────────────────────┐ │  │
│  │  │           AIProvider                         │ │  │
│  │  │  ┌────────────────────────────────────────┐  │ │  │
│  │  │  │        ProjectsProvider               │  │ │  │
│  │  │  │  ┌──────────────────────────────────┐ │  │ │  │
│  │  │  │  │      Application Routes          │ │  │ │  │
│  │  │  │  └──────────────────────────────────┘ │  │ │  │
│  │  │  └────────────────────────────────────────┘  │ │  │
│  │  └──────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. AuthContext (New Context Provider)

**Purpose**: Manages authentication state, user profile data, and API key storage.

**State Interface**:
```typescript
interface AuthContextState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  apiKey: string | null; // User's personal Gemini API key
  subscription: SubscriptionTier;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
  lastLogin: Date;
}

type SubscriptionTier = 'free' | 'pro';
```

**Actions**:
```typescript
interface AuthContextValue {
  state: AuthContextState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  setApiKey: (apiKey: string) => void;
  removeApiKey: () => void;
  upgradeToP ro: () => Promise<void>;
  clearError: () => void;
}
```

**Storage Strategy**:
- User session: LocalStorage with key `craftus_auth_session`
- API key: LocalStorage with key `craftus_user_api_key` (encrypted)
- Profile data: LocalStorage with key `craftus_user_profile`

### 2. ProfilePage Component

**Purpose**: Main profile page that renders different views based on authentication state.

**Component Structure**:
```typescript
interface ProfilePageProps {}

const ProfilePage: React.FC<ProfilePageProps> = () => {
  const { state, logout } = useAuth();
  
  if (state.isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!state.isAuthenticated) {
    return <GuestProfileView />;
  }
  
  return <AuthenticatedProfileView />;
};
```

### 3. GuestProfileView Component

**Purpose**: Displays login/signup interface for unauthenticated users.

**Features**:
- Login form (email + password)
- Sign up form (email + password + display name)
- Toggle between login/signup modes
- Pro tier feature showcase
- Error message display

**UI Layout**:
```
┌─────────────────────────────────────────┐
│          Welcome to Craftus             │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  [Login] / [Sign Up]              │ │
│  │                                   │ │
│  │  Email: [________________]        │ │
│  │  Password: [________________]     │ │
│  │  [Display Name if signup]         │ │
│  │                                   │ │
│  │  [Login/Sign Up Button]           │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  ✨ Pro Features                  │ │
│  │  • Unlimited projects             │ │
│  │  • Priority AI generation         │ │
│  │  • Advanced export options        │ │
│  │  • Community publishing           │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 4. AuthenticatedProfileView Component

**Purpose**: Displays profile settings, API key management, and subscription info for logged-in users.

**Features**:
- Profile information display and editing
- Personal API key input and management
- Subscription tier display
- Upgrade to Pro button (if free tier)
- Logout button

**UI Layout**:
```
┌─────────────────────────────────────────────────────┐
│  Profile Settings                                   │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │  Account Information                          │ │
│  │  Display Name: [________________] [Save]      │ │
│  │  Email: [________________] [Save]             │ │
│  │  Member since: Jan 1, 2024                    │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │  API Key Settings                             │ │
│  │  Use your own Gemini API key for unlimited   │ │
│  │  generations without rate limits.             │ │
│  │                                               │ │
│  │  API Key: [••••••••••••••••] [Show] [Remove] │ │
│  │  [Save API Key]                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │  Subscription                                 │ │
│  │  Current Plan: Free / Pro                     │ │
│  │  [Upgrade to Pro] (if free)                   │ │
│  │  Features: • Feature 1 • Feature 2            │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  [Logout]                                           │
└─────────────────────────────────────────────────────┘
```

### 5. Navigation Component Updates

**Changes Required**:
- Add "Profile" link to navigation items
- Add user avatar/icon when authenticated
- Show login indicator in navigation

**Updated Navigation Items**:
```typescript
const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/canvas', label: 'Canvas', icon: Layout },
  { path: '/projects', label: 'My Projects', icon: Sparkles },
  { path: '/community', label: 'Community', icon: Users },
  { path: '/profile', label: 'Profile', icon: User }, // NEW
];
```

### 6. Gemini Service Integration

**Purpose**: Modify geminiService.ts to use user's personal API key when available.

**Changes**:
```typescript
// Current implementation
const apiKey = process.env.API_KEY || '';
const getAiClient = () => new GoogleGenAI({ apiKey });

// New implementation
const getApiKey = (): string => {
  // Check for user's personal API key first
  const userApiKey = localStorage.getItem('craftus_user_api_key');
  if (userApiKey) {
    return decryptApiKey(userApiKey); // Decrypt stored key
  }
  // Fall back to application API key
  return process.env.API_KEY || '';
};

const getAiClient = () => new GoogleGenAI({ apiKey: getApiKey() });
```

## Data Models

### User Model
```typescript
interface User {
  id: string;                // Unique identifier (UUID)
  email: string;             // User email (validated)
  displayName: string;       // Display name (max 100 chars)
  createdAt: Date;          // Account creation timestamp
  lastLogin: Date;          // Last login timestamp
}
```

### Auth Session Model
```typescript
interface AuthSession {
  userId: string;
  token: string;            // Session token (for future backend)
  expiresAt: Date;         // Session expiration
  createdAt: Date;
}
```

### API Key Storage Model
```typescript
interface ApiKeyStorage {
  encryptedKey: string;     // Encrypted API key
  createdAt: Date;
  lastUsed: Date;
}
```

## Error Handling

### Error Types

```typescript
enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_EXISTS = 'USER_EXISTS',
  INVALID_EMAIL = 'INVALID_EMAIL',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_API_KEY = 'INVALID_API_KEY',
  STORAGE_ERROR = 'STORAGE_ERROR',
}

interface AuthError {
  type: AuthErrorType;
  message: string;
  details?: any;
}
```

### Error Handling Strategy

1. **Authentication Errors**:
   - Display user-friendly error messages
   - Do not expose detailed system information
   - Log errors for debugging (without sensitive data)

2. **API Key Errors**:
   - Validate format before storage
   - Test key with a simple API call before saving
   - Fall back to application key if user key fails

3. **Storage Errors**:
   - Handle quota exceeded gracefully
   - Clear corrupted data and prompt re-entry
   - Validate data before restoration

### Rate Limiting

```typescript
// Authentication rate limiter
const authRateLimiter = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  attempts: new Map<string, number>(),
  
  canAttempt(identifier: string): boolean {
    const attempts = this.attempts.get(identifier) || 0;
    return attempts < this.maxAttempts;
  },
  
  recordAttempt(identifier: string): void {
    const attempts = this.attempts.get(identifier) || 0;
    this.attempts.set(identifier, attempts + 1);
    
    // Clear after window
    setTimeout(() => {
      this.attempts.delete(identifier);
    }, this.windowMs);
  },
};
```

## Testing Strategy

### Unit Tests

1. **AuthContext Tests**:
   - Login/logout flow
   - Session persistence and restoration
   - API key storage and retrieval
   - Profile update validation
   - Error handling for invalid inputs

2. **Component Tests**:
   - ProfilePage rendering for guest/authenticated states
   - Form validation in GuestProfileView
   - Settings updates in AuthenticatedProfileView
   - Navigation integration

3. **Security Tests**:
   - Input sanitization
   - API key encryption/decryption
   - Rate limiting enforcement
   - Storage validation

### Integration Tests

1. **End-to-End User Flows**:
   - Complete signup → login → profile update → logout flow
   - API key setup → AI generation with personal key
   - Subscription upgrade flow (UI only for MVP)

2. **Storage Integration**:
   - Data persistence across page reloads
   - Corrupted data recovery
   - Storage quota handling

### Manual Testing Checklist

- [ ] Guest user can view profile page
- [ ] Guest user can sign up with valid credentials
- [ ] Guest user can log in with existing credentials
- [ ] Authenticated user can update display name
- [ ] Authenticated user can update email
- [ ] Authenticated user can add API key
- [ ] Authenticated user can remove API key
- [ ] AI generation uses personal API key when available
- [ ] AI generation falls back to app key when personal key removed
- [ ] Authenticated user can log out
- [ ] Session persists across page reloads
- [ ] Profile link appears in navigation
- [ ] Rate limiting prevents brute force attempts
- [ ] Error messages are user-friendly and secure

## Security Considerations

### 1. Input Validation

All user inputs must be validated and sanitized:

```typescript
import { sanitizeText } from '../utils/security';
import { validateEmail, validatePassword } from '../utils/validation';

// Email validation
const isValidEmail = (email: string): boolean => {
  return validateEmail(email);
};

// Password strength validation
const isValidPassword = (password: string): boolean => {
  return validatePassword(password);
};

// Sanitize display name
const sanitizeDisplayName = (name: string): string => {
  return sanitizeText(name, 100);
};
```

### 2. API Key Storage

API keys must be encrypted before storage:

```typescript
// Simple encryption for MVP (use proper encryption in production)
const encryptApiKey = (apiKey: string): string => {
  // Use Web Crypto API for encryption
  // For MVP, use base64 encoding with obfuscation
  const obfuscated = btoa(apiKey + ':' + Date.now());
  return obfuscated;
};

const decryptApiKey = (encrypted: string): string => {
  try {
    const decoded = atob(encrypted);
    return decoded.split(':')[0];
  } catch {
    return '';
  }
};
```

### 3. Session Management

```typescript
// Session validation
const isSessionValid = (session: AuthSession): boolean => {
  return new Date() < session.expiresAt;
};

// Session cleanup on logout
const clearSession = (): void => {
  localStorage.removeItem('craftus_auth_session');
  localStorage.removeItem('craftus_user_profile');
  // Keep API key unless explicitly removed by user
};
```

### 4. Rate Limiting

Implement rate limiting for authentication attempts:

```typescript
// Use existing rateLimiter utility
import { createRateLimiter } from '../utils/rateLimiter';

const authRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
});
```

## Implementation Notes

### Phase 1: MVP Implementation (Current Scope)

1. **Client-Side Only Authentication**:
   - No backend server required
   - LocalStorage-based session management
   - Simple email/password validation (no actual authentication)
   - Mock user creation and storage

2. **API Key Management**:
   - Store user's Gemini API key locally
   - Modify geminiService to check for user key first
   - Fall back to application key if not available

3. **Subscription Display**:
   - Show subscription tier (free/pro)
   - Display upgrade button (non-functional for MVP)
   - List feature differences

### Phase 2: Backend Integration (Future)

1. **Real Authentication**:
   - Backend API for user registration/login
   - JWT token-based authentication
   - Password hashing and secure storage
   - Email verification

2. **API Key Security**:
   - Store API keys on backend (encrypted)
   - Never expose keys to client
   - Backend proxy for AI API calls

3. **Subscription Management**:
   - Payment integration (Stripe/PayPal)
   - Subscription status tracking
   - Feature gating based on tier

### Styling Guidelines

Follow existing Craftus design system:

- **Color Palette**: Slate → Indigo → Emerald gradient
- **Primary Actions**: Orange-yellow buttons
- **Dark Mode**: Slate-950 background with slate-800 borders
- **Typography**: Font-black for headings, font-medium for body
- **Spacing**: Consistent padding (px-4, py-2, gap-4)
- **Transitions**: smooth-transition class for hover effects

### Accessibility

- All form inputs must have labels
- Error messages must be announced to screen readers
- Keyboard navigation support for all interactive elements
- Focus indicators on all focusable elements
- ARIA labels for icon-only buttons

## Dependencies

### New Dependencies

None required - use existing dependencies:
- React Router (already installed)
- Lucide React for icons (already installed)
- TailwindCSS for styling (already installed)

### Utility Functions to Create

1. `utils/auth.ts` - Authentication helpers
2. `utils/encryption.ts` - API key encryption/decryption
3. `contexts/AuthContext.tsx` - Authentication context provider
4. `components/ProfilePage.tsx` - Main profile page
5. `components/GuestProfileView.tsx` - Guest user view
6. `components/AuthenticatedProfileView.tsx` - Authenticated user view

## Migration Strategy

### Existing Users

For users who already have projects saved:

1. On first visit to profile page, prompt to create account
2. Offer to "claim" existing projects by associating with new account
3. Maintain backward compatibility with existing LocalStorage structure

### API Key Migration

For users currently using the application API key:

1. Continue using application key by default
2. Provide clear instructions on how to add personal API key
3. Show benefits of using personal key (no rate limits)

## Future Enhancements

1. **Social Authentication**: Google, GitHub OAuth
2. **Password Reset**: Email-based password recovery
3. **Two-Factor Authentication**: Enhanced security option
4. **Profile Pictures**: Avatar upload and display
5. **Usage Analytics**: Track AI generation usage per user
6. **Team Accounts**: Shared projects and collaboration
7. **API Key Rotation**: Automatic key rotation for security
8. **Export/Import**: Profile and settings backup
