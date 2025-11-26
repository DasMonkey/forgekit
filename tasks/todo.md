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
- [ ] Add quota check before writing to localStorage
- [ ] Clear old data if quota is exceeded
- [ ] Make tracking optional/graceful failure

### Fix 2: Fix the images storage problem in ProjectsContext.tsx
- [ ] Option A: Don't store images in localStorage at all (use IndexedDB for large data)
- [ ] Option B: Store images as URLs (if they're from a CDN) instead of base64
- [ ] Option C: Clear old projects when quota is exceeded
- [ ] Add graceful quota handling in saveToStorage

### Fix 3: Fix setState during render in CanvasWorkspace.tsx
- [ ] Move `saveProject()` call outside of the `setNodes()` callback
- [ ] Use `useEffect` to save project after state update completes

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

*To be filled after implementation*
