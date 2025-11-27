# Implementation Plan

- [x] 1. Create authentication utilities and helpers


  - Create `utils/auth.ts` with authentication helper functions (email validation, password strength checking, session management)
  - Create `utils/encryption.ts` with API key encryption/decryption functions using base64 encoding for MVP
  - Add authentication-specific validation functions to handle user input sanitization
  - _Requirements: 2.2, 9.1, 9.2_

- [x] 2. Implement AuthContext for state management



  - Create `contexts/AuthContext.tsx` with state interface (user, isAuthenticated, isLoading, error, apiKey, subscription)
  - Implement reducer for authentication actions (login, logout, signup, updateProfile, setApiKey, removeApiKey)
  - Add LocalStorage integration for session persistence with keys: `craftus_auth_session`, `craftus_user_api_key`, `craftus_user_profile`
  - Implement rate limiting for authentication attempts (5 attempts per 15 minutes)
  - Add data validation for stored session data on restoration
  - _Requirements: 2.1, 2.2, 2.3, 7.2, 7.3, 8.1, 8.2, 8.3, 8.4, 9.3, 9.4_

- [x] 3. Create GuestProfileView component


  - Create `components/GuestProfileView.tsx` with login/signup form toggle
  - Implement form validation for email and password fields
  - Add error message display with user-friendly messages
  - Style with TailwindCSS following Craftus design system (slate/indigo/emerald gradient, dark mode)
  - Add Pro features showcase section listing premium benefits
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.4_

- [x] 4. Create AuthenticatedProfileView component


  - Create `components/AuthenticatedProfileView.tsx` with profile settings sections
  - Implement account information section with editable display name and email fields
  - Add API key management section with masked display, show/hide toggle, and remove button
  - Implement subscription tier display showing current plan (Free/Pro) and available features
  - Add logout button with confirmation
  - Style consistently with Craftus design system
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2_

- [x] 5. Create main ProfilePage component


  - Create `pages/ProfilePage.tsx` that conditionally renders GuestProfileView or AuthenticatedProfileView
  - Add loading state display while checking authentication
  - Integrate with AuthContext to access authentication state
  - Handle routing and navigation to profile page
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 6. Update Navigation component


  - Modify `components/Navigation.tsx` to add Profile link with User icon
  - Add visual indicator for authenticated state (avatar or icon change)
  - Ensure profile link is visible on all pages except canvas workspace
  - Style profile link consistently with other navigation items
  - _Requirements: 1.1_

- [x] 7. Integrate AuthContext into App component


  - Wrap application with AuthProvider in `App.tsx` (outermost context)
  - Add profile route: `/profile` → `<ProfilePage />`
  - Ensure AuthContext is available to all child components
  - _Requirements: 1.1, 1.2_

- [x] 8. Modify Gemini service for personal API key support


  - Update `services/geminiService.ts` to check for user's personal API key in LocalStorage
  - Implement `getApiKey()` function that prioritizes user key over application key
  - Add decryption logic for stored API key
  - Update `getAiClient()` to use the new `getApiKey()` function
  - Ensure fallback to application key when user key is not available
  - _Requirements: 4.3, 4.4, 7.5_

- [x] 9. Implement API key validation and testing

  - Add API key format validation before storage (check for valid Gemini API key pattern)
  - Implement test API call to verify key works before saving
  - Add error handling for invalid or expired API keys
  - Display clear error messages when API key validation fails
  - _Requirements: 4.2, 9.2_

- [x] 10. Add session persistence and restoration

  - Implement session restoration on app load in AuthContext
  - Validate stored session data before restoring (check expiration, data integrity)
  - Clear corrupted data and prompt for re-authentication if validation fails
  - Ensure user remains logged in across page reloads
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 11. Implement profile update functionality

  - Add profile update logic in AuthContext (updateProfile action)
  - Validate all profile fields before saving (display name max 100 chars, valid email format)
  - Update LocalStorage with new profile data
  - Display success confirmation message after save
  - Handle update errors gracefully
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 9.1, 9.5_

- [x] 12. Implement logout functionality

  - Add logout logic in AuthContext that clears session data
  - Remove authentication token and user profile from LocalStorage
  - Preserve user's API key unless explicitly removed
  - Redirect to landing page after logout
  - Revert AI service to use application API key
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 13. Add upgrade to Pro UI (non-functional for MVP)


  - Create upgrade button in AuthenticatedProfileView (visible only for free tier users)
  - Display Pro tier benefits and pricing information
  - Show feature comparison between Free and Pro tiers
  - Add placeholder for future payment integration
  - Hide upgrade button for Pro users
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 14. Write unit tests for authentication utilities
  - Test email validation function with valid and invalid emails
  - Test password strength validation with various password patterns
  - Test API key encryption and decryption functions
  - Test session validation logic
  - _Requirements: 2.2, 9.1, 9.2_

- [ ]* 15. Write unit tests for AuthContext
  - Test login flow with valid and invalid credentials
  - Test signup flow with validation
  - Test logout flow and session cleanup
  - Test API key storage and retrieval
  - Test profile update with validation
  - Test rate limiting enforcement
  - Test error handling for all actions
  - _Requirements: 2.1, 2.2, 2.3, 7.2, 9.3, 9.4_

- [ ]* 16. Write component tests
  - Test GuestProfileView rendering and form validation
  - Test AuthenticatedProfileView rendering and settings updates
  - Test ProfilePage conditional rendering based on auth state
  - Test Navigation component with profile link
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 4.1_

- [ ]* 17. Perform integration testing
  - Test complete signup → login → profile update → logout flow
  - Test API key setup → AI generation with personal key → key removal flow
  - Test session persistence across page reloads
  - Test storage quota handling and corrupted data recovery
  - _Requirements: 2.1, 2.2, 3.1, 4.1, 7.1, 8.1, 8.2, 8.3, 8.4_
