# Fix LocalStorage Quota and React State Errors

## Problem Analysis

There are 3 console errors occurring:

### Error 1: LocalStorage Quota Exceeded (rateLimiter.ts:96)
```
QuotaExceededError: Failed to execute 'setItem' on 'Storage': Setting the value of 'craftus_api_usage' exceeded the quota.
```
**Cause:** The `trackApiUsage` function tries to save API usage data to localStorage, but storage is full (likely from base64 image data being stored in projects).

### Error 2: LocalStorage Quota Exceeded (ProjectsContext.tsx:123)
```
QuotaExceededError: Failed to execute 'setItem' on 'Storage': Setting the value of 'craftus_projects' exceeded the quota.
```
**Cause:** Projects are storing base64 image URLs directly in localStorage. Base64 images are ~1.37x larger than binary, so a few images quickly exceed the ~5-10MB localStorage limit.

### Error 3: setState During Render (ProjectsContext.tsx:242)
```
Cannot update a component (`ProjectsProvider`) while rendering a different component (`CanvasWorkspaceContent`).
```
**Cause:** In `handleGenerationComplete`, we call `saveProject()` inside the `setNodes()` callback, which is during render. This violates React's rules.

---

## Fix Plan

### Fix 1: Handle localStorage quota gracefully in rateLimiter.ts
- [x] Add quota check before writing to localStorage
- [x] Clear old data if quota is exceeded
- [x] Make tracking optional/graceful failure

### Fix 2: Fix the images storage problem in ProjectsContext.tsx
- [x] Add graceful quota handling in saveToStorage (multi-tier fallback strategy)
- [x] Clear old projects when quota is exceeded

### Fix 3: Fix setState during render in CanvasWorkspace.tsx
- [x] Move `saveProject()` call outside of the `setNodes()` callback
- [x] Use `setTimeout` to save project after state update completes

---

## Implementation Steps

### Step 1: Fix rateLimiter.ts (quick fix)
Make `trackApiUsage` silently fail if quota exceeded, and clear old data.

### Step 2: Fix handleGenerationComplete in CanvasWorkspace.tsx
Move `saveProject()` to after the setNodes completes using a ref or separate effect.

### Step 3: Add quota handling to ProjectsContext.tsx
- Add graceful quota exceeded handling
- Consider clearing oldest projects or warn user
- For long-term: migrate to IndexedDB for image storage

---

## Review

### Changes Made

**1. rateLimiter.ts (lines 80-114)**
- Wrapped `localStorage.setItem` in try-catch specifically for QuotaExceededError
- If quota exceeded: clears old data and retries with minimal entries (10)
- Reduced max entries from 100 to 50 to save space
- Silently fails if all recovery attempts fail (tracking is non-critical)

**2. CanvasWorkspace.tsx (handleGenerationComplete, lines 1978-2027)**
- Moved `saveProject()` call outside of the `setNodes()` callback
- Used `setTimeout(..., 0)` to schedule project save after render completes
- This fixes the "Cannot update component while rendering different component" React error

**3. ProjectsContext.tsx (saveToStorage, lines 112-185)**
- Added multi-tier quota handling fallback strategy:
  - First try: Save all projects normally
  - If quota exceeded: Keep only 10 most recent projects
  - If still exceeded: Keep only 5 most recent projects
  - Final fallback: Clear all storage and save only the current project
- This prevents complete data loss while managing storage limits
