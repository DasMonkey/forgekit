# Implementation Plan: Image-to-Craft Conversion

## Task List

- [x] 1. Create CraftStyleMenu component



  - Create new file `components/CraftStyleMenu.tsx`
  - Implement component with all 8 craft category buttons in grid layout
  - Add "Turn Image into Craft" action button
  - Implement category selection state (single selection)
  - Add hover states and visual feedback for buttons
  - Style with dark mode theme (slate-900 background, indigo accents)
  - Add loading state for conversion button
  - Position menu using absolute positioning with provided x/y coordinates
  - Add close on outside click functionality
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Enhance ImageNode with selection state


  - Modify `ImageNode` component in `components/CustomNodes.tsx`
  - Add `isSelected` and `onSelect` props to `ImageNodeData` interface in `types.ts`
  - Add visual indicator (border glow) when node is selected
  - Implement click handler to trigger selection callback
  - Ensure selection doesn't interfere with existing segmentation functionality
  - _Requirements: 1.1, 1.2_

- [x] 3. Implement menu positioning logic


  - Create utility function `calculateCraftMenuPosition` in `utils/contextMenuPosition.ts`
  - Calculate position below selected ImageNode
  - Handle viewport boundary constraints (keep menu visible)
  - Account for menu dimensions and node dimensions
  - Return adjusted x/y coordinates
  - _Requirements: 1.3, 1.4_

- [x] 4. Add state management to CanvasWorkspace



  - Add `craftStyleMenu` state object in `pages/CanvasWorkspace.tsx`
  - Add `isConvertingImage` state flag
  - Implement `handleImageNodeSelect` handler
  - Implement `handleCraftCategorySelect` handler
  - Implement `handleCloseCraftStyleMenu` handler
  - Update ImageNode data to include selection callbacks when creating nodes
  - Handle menu close on canvas click (deselection)
  - Handle menu close on node deletion
  - _Requirements: 1.1, 1.2, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. Implement Gemini API integration


  - Create `generateCraftFromImage` function in `services/geminiService.ts`
  - Accept imageBase64 and category parameters
  - Construct multimodal prompt with image + text instructions
  - Call Gemini API with `gemini-3-pro-image-preview` model
  - Apply rate limiting using existing `imageGenerationLimiter`
  - Implement retry logic with exponential backoff for 503 errors
  - Return base64 data URL of generated craft image
  - Track API usage for monitoring
  - _Requirements: 3.1, 3.2, 3.3, 4.3, 4.4_

- [x] 6. Implement image-to-craft conversion handler



  - Create `handleImageToCraftConvert` function in `pages/CanvasWorkspace.tsx`
  - Validate category selection (show error if none selected)
  - Get image data from selected ImageNode
  - Set loading state (`isConvertingImage = true`)
  - Call `generateCraftFromImage` with image and category
  - Create MasterNode with generated craft image using existing `handleGenerate` logic
  - Position new MasterNode near original ImageNode
  - Close CraftStyleMenu on success
  - Clear loading state
  - Switch to select tool
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 5.5_

- [x] 7. Implement error handling

  - Add error state to CraftStyleMenu component
  - Display inline error message for "no category selected"
  - Handle rate limit errors with countdown timer
  - Handle API errors with user-friendly messages
  - Add "Try Again" functionality for failed conversions
  - Log errors for debugging without exposing sensitive data
  - Keep menu open on error to allow retry
  - Clear error state when category changes or menu closes
  - _Requirements: 3.5, 4.3, 6.2, 6.3, 6.4, 6.5_

- [ ] 8. Add input validation and security
  - Validate ImageNode exists and has valid imageUrl before showing menu
  - Validate category is one of 8 supported CraftCategory enum values
  - Sanitize imageUrl using existing `sanitizeImageUrl` before API call
  - Validate generated image response contains valid base64 data
  - Apply rate limiting to prevent abuse
  - Ensure readonly mode prevents menu from appearing
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9. Add loading states and visual feedback

  - Show loading spinner in "Turn Image into Craft" button during conversion
  - Disable category buttons during conversion
  - Add loading overlay to selected ImageNode during conversion
  - Show progress indicator if conversion takes longer than 2 seconds
  - Display success feedback when MasterNode is created
  - _Requirements: 3.3, 3.4_

- [x] 10. Integrate with existing canvas workflow


  - Ensure CraftStyleMenu closes when user pans/zooms canvas
  - Handle menu positioning when canvas viewport changes
  - Ensure menu doesn't interfere with existing tools (select, pencil, shapes)
  - Verify generated MasterNode can be dissected using existing workflow
  - Test that keyboard shortcuts don't conflict with menu
  - Ensure menu respects readonly mode
  - _Requirements: 1.4, 1.5, 4.1, 4.2, 5.1, 5.2, 5.3, 5.4_

- [ ]* 11. Write unit tests
  - Test CraftStyleMenu component rendering
  - Test category selection logic
  - Test convert button enable/disable logic
  - Test menu positioning calculations
  - Test ImageNode selection state
  - Test error handling scenarios
  - _Requirements: All_

- [ ]* 12. Write integration tests
  - Test full image-to-craft conversion flow
  - Test menu interaction with canvas
  - Test rate limiting behavior
  - Test error recovery
  - Test readonly mode restrictions
  - _Requirements: All_

- [ ]* 13. Add accessibility features
  - Implement keyboard navigation for menu (Tab, Enter, Escape)
  - Add ARIA labels to all buttons
  - Add screen reader announcements for state changes
  - Ensure focus management when menu opens/closes
  - Test with keyboard-only navigation
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5_
