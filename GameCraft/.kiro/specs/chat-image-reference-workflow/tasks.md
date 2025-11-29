# Implementation Plan

- [ ] 1. Set up CanvasWorkspace integration for chat reference images
  - Create ChatInterface ref in CanvasWorkspace component
  - Implement handleAddToChat function to extract node images
  - Wire up menu callbacks to pass images to ChatInterface
  - _Requirements: 3.1, 3.2, 3.5_

- [ ] 1.1 Create ChatInterface ref in CanvasWorkspace
  - Import ChatInterfaceRef type from ChatInterface component
  - Create ref using useRef<ChatInterfaceRef>(null)
  - Pass ref to ChatInterface component via ref prop
  - _Requirements: 3.5_

- [ ] 1.2 Implement handleAddToChat function
  - Find node by ID from nodes array
  - Extract imageUrl from node.data
  - Create ReferenceImage object with url, fileName, and nodeId
  - Call chatInterfaceRef.current.addReferenceImage()
  - Handle missing node or missing imageUrl gracefully
  - _Requirements: 3.1, 3.2_

- [ ] 1.3 Wire up MasterNodeActionsMenu callback
  - Pass handleAddToChat to MasterNodeActionsMenu via onAddToChat prop
  - Ensure callback receives correct node ID
  - Test "Add to Chat" button functionality
  - _Requirements: 3.1, 7.1, 7.3_

- [ ] 1.4 Wire up ImageNodeUnifiedMenu callback
  - Pass handleAddToChat to ImageNodeUnifiedMenu via onAddToChat prop
  - Ensure callback receives correct node ID
  - Test "Add to Chat" button functionality
  - _Requirements: 3.2, 7.2, 7.3_

- [ ]* 1.5 Write property test for reference image addition
  - **Property 1: Reference image attachment preserves image data**
  - **Validates: Requirements 1.1, 1.2**
  - Generate random valid image data URLs
  - Test that addReferenceImage adds to array without data loss
  - Verify URL, fileName, and nodeId are preserved

- [ ]* 1.6 Write property test for duplicate detection
  - **Property 2: Duplicate reference images are rejected**
  - **Validates: Requirements 3.3**
  - Generate random reference image arrays
  - Attempt to add duplicate images (same URL)
  - Verify array length remains unchanged

- [ ] 2. Verify and test existing ChatInterface functionality
  - Confirm file picker opens on "+" button click
  - Verify thumbnail preview displays correctly
  - Test remove functionality for reference images
  - Ensure images clear after successful generation
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.3_

- [ ] 2.1 Test file upload workflow
  - Click "+" button and verify file picker opens
  - Select single image file and verify thumbnail appears
  - Select multiple image files and verify all thumbnails appear
  - Test with various image formats (PNG, JPEG, GIF, WEBP)
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2.2 Test reference image removal
  - Add multiple reference images
  - Click X button on each thumbnail
  - Verify correct image is removed
  - Verify other images remain in correct order
  - _Requirements: 2.1_

- [ ] 2.3 Test reference image clearing after generation
  - Add reference images
  - Submit prompt and wait for successful generation
  - Verify reference images array is empty
  - Verify thumbnails are hidden
  - _Requirements: 2.3_

- [ ]* 2.4 Write property test for reference image removal
  - **Property 3: Reference image removal maintains array integrity**
  - **Validates: Requirements 2.1**
  - Generate random reference image arrays of various lengths
  - Remove images at random indices
  - Verify array length decreases by 1 and order is preserved

- [ ]* 2.5 Write property test for generation function selection
  - **Property 4: Generation with references uses correct API function**
  - **Validates: Requirements 4.1, 4.2, 4.3**
  - Generate random reference array lengths (0 to 5)
  - Mock generateCraftImage and generateWithImageReferences
  - Verify correct function called based on array length

- [ ] 3. Test generation with reference images end-to-end
  - Test generation with single reference image
  - Test generation with multiple reference images
  - Verify placeholder node creation and update
  - Test error handling and recovery
  - _Requirements: 4.1, 4.2, 4.4, 6.1, 6.3, 6.4_

- [ ] 3.1 Test single reference image generation
  - Add one reference image via file picker
  - Enter prompt describing desired variation
  - Submit and verify generateWithImageReferences is called
  - Verify placeholder node created immediately
  - Verify node updated with generated image on success
  - _Requirements: 4.1, 4.4, 6.1, 6.3_

- [ ] 3.2 Test multiple reference image generation
  - Add 2-3 reference images via file picker
  - Enter prompt combining reference styles
  - Submit and verify generateWithImageReferences is called with all URLs
  - Verify generated image reflects multiple references
  - _Requirements: 4.2, 4.4_

- [ ] 3.3 Test generation without reference images
  - Ensure no reference images attached
  - Enter prompt for new asset
  - Submit and verify generateCraftImage is called (not generateWithImageReferences)
  - Verify standard generation flow works
  - _Requirements: 4.3_

- [ ] 3.4 Test error handling during generation
  - Add reference images
  - Trigger generation error (disconnect network or invalid prompt)
  - Verify error message displayed
  - Verify placeholder node removed
  - Verify reference images preserved for retry
  - _Requirements: 2.4, 6.4_

- [ ]* 3.5 Write property test for reference image persistence on failure
  - **Property 6: Reference images persist after generation failure**
  - **Validates: Requirements 2.4**
  - Generate random reference image arrays
  - Mock generation failure
  - Verify reference array unchanged after error

- [ ]* 3.6 Write property test for multimodal prompt construction
  - **Property 7: Multimodal prompt construction matches reference count**
  - **Validates: Requirements 5.3**
  - Generate random reference counts (1 to 5)
  - Mock Gemini API call
  - Verify N inline image parts + 1 text part in request

- [ ] 4. Test canvas node "Add to Chat" integration
  - Create MasterNode on canvas
  - Click "Add to Chat" in menu
  - Verify image added to ChatInterface
  - Test with ImageNode as well
  - _Requirements: 3.1, 3.2, 3.4, 7.1, 7.2_

- [ ] 4.1 Test MasterNode "Add to Chat"
  - Generate a MasterNode on canvas
  - Open MasterNodeActionsMenu
  - Click "Add to Chat" button
  - Verify image appears in ChatInterface thumbnails
  - Verify fileName matches node label
  - _Requirements: 3.1, 3.4, 7.1_

- [ ] 4.2 Test ImageNode "Add to Chat"
  - Upload or convert an ImageNode on canvas
  - Open ImageNodeUnifiedMenu
  - Click "Add to Chat" button
  - Verify image appears in ChatInterface thumbnails
  - _Requirements: 3.2, 3.4, 7.2_

- [ ] 4.3 Test duplicate prevention from canvas
  - Add image from canvas node to chat
  - Click "Add to Chat" again on same node
  - Verify duplicate is not added
  - Verify array length remains unchanged
  - _Requirements: 3.3_

- [ ] 4.4 Test "Add to Chat" button disabled state
  - Start converting or snapping a node
  - Verify "Add to Chat" button is disabled
  - Wait for operation to complete
  - Verify button is enabled again
  - _Requirements: 7.5_

- [ ]* 4.5 Write property test for UI state consistency
  - **Property 11: Chat interface visual state reflects reference presence**
  - **Validates: Requirements 8.1, 8.2, 8.3**
  - Generate random reference array states (empty vs populated)
  - Verify border color changes (indigo ring when references present)
  - Verify placeholder text changes based on reference presence

- [ ] 5. Verify prompt construction and API integration
  - Verify prompt description matches reference count
  - Verify category-specific style rules included
  - Verify pixel size included for Pixel Art category
  - Test rate limiting with reference images
  - _Requirements: 5.1, 5.2, 5.4, 5.5, 6.5_

- [ ] 5.1 Test prompt description for single reference
  - Add one reference image
  - Submit prompt
  - Inspect API call (via console logs or network tab)
  - Verify prompt contains "Use this reference image as visual guidance"
  - _Requirements: 5.1_

- [ ] 5.2 Test prompt description for multiple references
  - Add 3 reference images
  - Submit prompt
  - Inspect API call
  - Verify prompt contains "Use these 3 reference images as visual guidance"
  - _Requirements: 5.2_

- [ ] 5.3 Test category-specific style rules
  - Add reference image
  - Select different categories (Pixel Art, AAA, Low Poly 3D, Voxel Art)
  - Submit prompts for each category
  - Verify style rules match category in API call
  - _Requirements: 5.4_

- [ ] 5.4 Test pixel size inclusion for Pixel Art
  - Add reference image
  - Select Pixel Art category with 64x64 pixel size
  - Submit prompt
  - Verify pixel size included in style rules
  - _Requirements: 5.5_

- [ ] 5.5 Test rate limiting with references
  - Add reference images
  - Submit multiple prompts rapidly
  - Verify rate limit error shows wait time
  - Wait for rate limit to reset
  - Verify generation works again
  - _Requirements: 6.5_

- [ ]* 5.6 Write property test for prompt description matching
  - **Property 8: Prompt description reflects reference count**
  - **Validates: Requirements 5.1, 5.2**
  - Generate random reference counts (1 to 5)
  - Verify prompt contains "this reference image" for N=1
  - Verify prompt contains "these N reference images" for N>1

- [ ] 6. Test UI visual feedback and state management
  - Verify loading state during generation
  - Verify indigo ring border with references
  - Verify placeholder text changes
  - Test thumbnail hover tooltips
  - _Requirements: 6.2, 8.1, 8.2, 8.3, 1.4_

- [ ] 6.1 Test loading state visual feedback
  - Add reference images
  - Submit prompt
  - Verify loading spinner appears in send button
  - Verify loading message cycles in input placeholder
  - Verify "Running Gemini 3 Pro" text appears
  - _Requirements: 6.2_

- [ ] 6.2 Test reference presence visual indicators
  - Start with no references (verify no indigo ring)
  - Add one reference image
  - Verify indigo ring appears on input bar border
  - Verify placeholder text changes to "based on the reference..."
  - Remove reference and verify indicators disappear
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 6.3 Test thumbnail hover tooltips
  - Add reference images with various filenames
  - Hover over each thumbnail
  - Verify full filename appears as tooltip
  - Test with long filenames
  - _Requirements: 1.4_

- [ ] 6.4 Test horizontal scroll with many references
  - Add 5-6 reference images
  - Verify thumbnails arrange in horizontal row
  - Verify horizontal scroll appears
  - Test scrolling left and right
  - _Requirements: 1.5_

- [ ]* 6.5 Write property test for placeholder node lifecycle
  - **Property 10: Placeholder node lifecycle matches generation state**
  - **Validates: Requirements 6.1, 6.3, 6.4**
  - Generate random generation outcomes (success vs failure)
  - Verify placeholder created before API call
  - Verify placeholder updated on success or removed on failure

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 8. Write integration tests for complete workflows
  - Test file upload → generation → success flow
  - Test canvas node → add to chat → generation flow
  - Test error recovery flow
  - Test multiple iterations with same references

- [ ]* 8.1 Write integration test for file upload workflow
  - Simulate file selection via file picker
  - Verify thumbnail appears
  - Submit prompt with reference
  - Verify generation completes
  - Verify references cleared

- [ ]* 8.2 Write integration test for canvas workflow
  - Create MasterNode on canvas
  - Click "Add to Chat"
  - Verify image added to chat
  - Submit prompt
  - Verify new node created with generated image

- [ ]* 8.3 Write integration test for error recovery
  - Add reference images
  - Trigger generation error
  - Verify references preserved
  - Retry generation
  - Verify success clears references

- [ ] 9. Final testing and polish
  - Run through manual testing checklist
  - Test on different screen sizes (mobile, tablet, desktop)
  - Verify accessibility (keyboard navigation, screen readers)
  - Check for console errors or warnings
  - _Requirements: All_

- [ ] 9.1 Complete manual testing checklist
  - Go through all items in design document manual testing checklist
  - Document any issues found
  - Fix critical issues
  - Create tickets for non-critical issues

- [ ] 9.2 Test responsive design
  - Test on mobile viewport (320px, 375px, 414px)
  - Test on tablet viewport (768px, 1024px)
  - Test on desktop viewport (1280px, 1920px)
  - Verify thumbnails scale appropriately
  - Verify buttons remain accessible

- [ ] 9.3 Test accessibility
  - Test keyboard navigation (Tab, Enter, Escape)
  - Test screen reader announcements
  - Verify ARIA labels on buttons
  - Check color contrast ratios
  - Test with keyboard-only navigation

- [ ] 9.4 Performance and error checking
  - Check browser console for errors
  - Check browser console for warnings
  - Test with large images (2-3MB)
  - Test with many references (5-6 images)
  - Verify no memory leaks during repeated use

- [ ] 10. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
