# Implementation Plan

- [x] 1. Set up MediaPipe dependencies and configuration

  - Install @mediapipe/tasks-vision package via npm
  - Create configuration file for MediaPipe model paths and settings
  - Add TypeScript type definitions for MediaPipe interfaces
  - _Requirements: 1.1, 1.2, 6.1_

- [x] 2. Implement MediaPipeSegmenter service

- [ ] 2.1 Create core service class with singleton pattern
  - Write MediaPipeSegmenter class in `services/mediaPipeSegmenter.ts`
  - Implement singleton getInstance() method
  - Add private constructor and instance management
  - Define SegmentationRequest and SegmentationResult interfaces
  - _Requirements: 1.1, 1.2, 4.1, 4.2_


- [ ] 2.2 Implement model initialization logic
  - Write async initialize() method to load MediaPipe model from CDN
  - Add loading state management (isLoading, isReady flags)
  - Implement promise caching to prevent duplicate loads
  - Configure model with GPU delegate and magic touch settings
  - Add error handling for model load failures with retry logic

  - _Requirements: 1.1, 1.2, 4.1, 4.4_

- [ ] 2.3 Implement segmentation processing
  - Write segment() method to process image and click coordinates
  - Add input validation for image dimensions and coordinates
  - Implement request queuing to limit concurrent processing
  - Add timeout handling (5 second max)
  - Convert MediaPipe output to SegmentationMask format
  - _Requirements: 1.1, 1.3, 4.3, 6.3, 6.4_

- [ ] 2.4 Add error handling and cleanup
  - Create SegmentationError class with error codes
  - Implement dispose() method for cleanup
  - Add isModelReady() status check method
  - Handle browser compatibility checks (WebGL, WebAssembly)
  - _Requirements: 1.3, 4.4, 6.5_

- [ ]* 2.5 Write unit tests for MediaPipeSegmenter service
  - Test singleton pattern enforcement
  - Test model initialization and caching
  - Test error handling and retries
  - Test request validation
  - _Requirements: 1.1, 1.3, 4.4_

- [ ] 3. Create SelectionModeContext for state management
- [ ] 3.1 Implement selection mode context
  - Create `contexts/SelectionModeContext.tsx` file
  - Define SelectionModeContextValue interface
  - Implement context provider with useReducer for state management
  - Add enableSelectionMode, disableSelectionMode, toggleSelectionMode actions
  - Add currentSelection state to track active selection
  - _Requirements: 3.1, 3.2, 3.5_

- [ ] 3.2 Create custom hook for selection mode
  - Write useSelectionMode() hook
  - Add error handling for usage outside provider
  - Export SelectionState interface
  - _Requirements: 3.1, 3.5_

- [ ]* 3.3 Write tests for SelectionModeContext
  - Test state transitions
  - Test selection persistence
  - Test mode toggling
  - _Requirements: 3.1, 3.5_

- [ ] 4. Implement SegmentableImage component
- [ ] 4.1 Create base component structure
  - Create `components/SegmentableImage.tsx` file
  - Define SegmentableImageProps interface
  - Set up dual-canvas structure (base image + overlay)
  - Add refs for image and canvas elements
  - _Requirements: 1.1, 2.1, 2.2_

- [ ] 4.2 Implement click handling and coordinate normalization
  - Add onClick handler for image clicks
  - Write normalizeClickCoordinates() function
  - Validate click is within image bounds
  - Add cursor style changes based on selection mode
  - _Requirements: 1.1, 2.2, 3.2, 6.4_

- [ ] 4.3 Implement segmentation request flow
  - Call MediaPipeSegmenter.segment() on click
  - Add loading state during processing
  - Handle segmentation errors gracefully
  - Emit onSegmentationChange callback with result
  - _Requirements: 1.1, 1.3, 2.1, 4.3_

- [ ] 4.4 Implement mask rendering on overlay canvas
  - Write renderMask() function to draw mask on overlay canvas
  - Implement highlight color application (emerald with 40% opacity)
  - Add edge detection for outline rendering
  - Implement drawMaskOutline() for border effect
  - Add canvas caching for performance
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 4.5 Add loading and error states UI
  - Display loading spinner during segmentation
  - Show error messages for failed segmentation
  - Add timeout indicator for long processing
  - Implement graceful fallback when model unavailable
  - _Requirements: 1.3, 4.3_

- [ ]* 4.6 Write tests for SegmentableImage component
  - Test click coordinate normalization
  - Test mask rendering
  - Test loading states
  - Test error handling

  - _Requirements: 1.1, 2.1, 2.2_

- [ ] 5. Update existing node components with segmentation
- [ ] 5.1 Update MasterNode component
  - Import SegmentableImage and useSelectionMode
  - Replace <img> with <SegmentableImage> component
  - Pass selectionEnabled prop from context
  - Handle onSegmentationChange callback
  - Maintain existing node functionality (dissect, context menu)
  - _Requirements: 1.4, 3.1, 3.3_

- [ ] 5.2 Update InstructionNode component
  - Import SegmentableImage and useSelectionMode
  - Replace <img> with <SegmentableImage> component
  - Pass selectionEnabled prop from context

  - Handle onSegmentationChange callback
  - Preserve step number badge and loading states
  - _Requirements: 1.4, 3.1, 3.3_

- [ ] 5.3 Update ImageNode component
  - Import SegmentableImage and useSelectionMode
  - Replace <img> with <SegmentableImage> component
  - Pass selectionEnabled prop from context
  - Handle onSegmentationChange callback
  - Maintain resizable dimensions
  - _Requirements: 1.4, 3.1, 3.3_

- [ ]* 5.4 Write integration tests for updated nodes
  - Test segmentation in MasterNode
  - Test segmentation in InstructionNode
  - Test segmentation in ImageNode
  - Test that existing node features still work
  - _Requirements: 1.4, 3.3_

- [ ] 6. Add selection mode to toolbar
- [ ] 6.1 Update LeftToolbar component
  - Add 'segment' to ToolType union in `components/LeftToolbar.tsx`
  - Import Sparkles icon from lucide-react
  - Add new ToolButton for "Magic Select" with 'M' keyboard shortcut
  - Update handleToolChange to support segment tool
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 6.2 Integrate SelectionModeContext with toolbar
  - Import useSelectionMode hook in CanvasWorkspace
  - Connect activeTool state to selection mode context
  - Enable selection mode when 'segment' tool is active
  - Disable selection mode when switching to other tools
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 6.3 Add keyboard shortcut handling
  - Update useToolKeyboardShortcuts to include 'M' key for segment tool
  - Add ESC key handler to clear selection and exit mode
  - Ensure shortcuts work when not in text editing mode
  - _Requirements: 3.2, 5.3_

- [ ]* 6.4 Write tests for toolbar integration
  - Test tool switching to segment mode
  - Test keyboard shortcuts
  - Test mode persistence
  - _Requirements: 3.1, 3.2_

- [ ] 7. Implement selection mode UI indicators
- [ ] 7.1 Add cursor style changes
  - Create cursor utility function in `utils/toolCursors.ts` for segment mode
  - Apply crosshair cursor when selection mode is active
  - Apply wait cursor during segmentation processing
  - Restore default cursor when mode is disabled
  - _Requirements: 3.2_

- [x] 7.2 Add floating selection mode indicator
  - Create floating banner component to show "Click on any object to select"
  - Position at top center of canvas

  - Show only when selection mode is active
  - Add Sparkles icon and emerald styling
  - Implement fade in/out transitions
  - _Requirements: 3.2_

- [x] 7.3 Add model loading indicator
  - Show loading overlay when MediaPipe model is downloading
  - Display "Loading selection tool..." message
  - Position in center of canvas or as toast notification
  - Auto-dismiss when model is ready
  - _Requirements: 4.1, 4.3_

- [ ]* 7.4 Write tests for UI indicators
  - Test cursor changes
  - Test floating banner visibility
  - Test loading indicator
  - _Requirements: 3.2, 4.3_

- [x] 8. Add deselection and selection management
- [x] 8.1 Implement click-outside deselection
  - Add click handler to canvas pane in CanvasWorkspace
  - Clear selection when clicking outside any image
  - Update SelectionModeContext to clear currentSelection
  - Remove highlight overlay from SegmentableImage
  - _Requirements: 5.1, 5.2_

- [x] 8.2 Implement ESC key deselection

  - Add global keydown listener for ESC key
  - Clear current selection on ESC press
  - Optionally exit selection mode on ESC
  - Ensure ESC doesn't interfere with other features (text editing, drawing)
  - _Requirements: 5.3_

- [ ] 8.3 Implement selection switching between nodes
  - Store selection state per node ID in context
  - Preserve previous selections when switching nodes
  - Clear old selection when making new selection in same node
  - Limit stored selections to 5 most recent for memory management
  - _Requirements: 5.4, 5.5_

- [ ]* 8.4 Write tests for selection management
  - Test click-outside deselection
  - Test ESC key deselection
  - Test multi-node selection persistence
  - Test selection limit enforcement
  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [ ] 9. Implement performance optimizations
- [ ] 9.1 Add canvas caching for rendered masks
  - Cache rendered overlay canvas to avoid re-rendering
  - Invalidate cache only when mask changes
  - Implement cache key based on mask data hash
  - _Requirements: 4.3_

- [ ] 9.2 Add request debouncing
  - Debounce rapid clicks with 300ms threshold
  - Cancel in-flight segmentation requests when new click occurs
  - Show appropriate loading state during debounce
  - _Requirements: 4.3_

- [ ] 9.3 Implement memory management
  - Dispose of old masks when new selection is made
  - Clear all selections when leaving canvas
  - Add cleanup in component unmount
  - Monitor and limit total memory usage
  - _Requirements: 4.3, 6.3_

- [ ]* 9.4 Write performance tests
  - Test segmentation latency (target < 2 seconds)
  - Test memory usage with multiple selections
  - Test canvas rendering performance
  - _Requirements: 4.3_

- [ ] 10. Add comprehensive error handling
- [ ] 10.1 Implement user-facing error messages
  - Add error message display in SegmentableImage component
  - Show "Object selection unavailable" for model load failures
  - Show "Could not select object" for processing failures
  - Show "Selection is taking too long" for timeouts
  - Add "Unsupported browser" message for compatibility issues
  - _Requirements: 1.3, 6.5_

- [ ] 10.2 Add error recovery mechanisms
  - Implement automatic retry for transient failures
  - Add manual retry button for failed selections
  - Gracefully degrade to normal image display on critical errors
  - Log errors for debugging without exposing sensitive info
  - _Requirements: 1.3, 4.4, 6.5_

- [ ] 10.3 Implement browser compatibility checks
  - Check for WebGL 2.0 support on initialization
  - Check for WebAssembly support
  - Display appropriate error message for unsupported browsers
  - Disable segmentation feature if requirements not met
  - _Requirements: 6.1, 6.5_

- [ ]* 10.4 Write error handling tests
  - Test model load failure scenarios
  - Test processing error handling
  - Test timeout handling
  - Test browser compatibility checks
  - _Requirements: 1.3, 4.4, 6.5_

- [ ] 11. Security hardening and validation
- [ ] 11.1 Implement input validation
  - Validate image dimensions (max 4096x4096) before processing
  - Validate click coordinates are within 0-1 range
  - Validate image source URLs (data:, blob:, same-origin only)
  - Sanitize all user inputs before passing to MediaPipe
  - _Requirements: 6.2, 6.3, 6.4_

- [x] 11.2 Add CDN security measures

  - Verify MediaPipe loads from official Google CDN only
  - Add Subresource Integrity (SRI) hashes if available
  - Implement Content Security Policy headers for script sources
  - Add fallback for CDN failures
  - _Requirements: 6.1_

- [x] 11.3 Ensure client-side privacy


  - Verify all processing happens client-side
  - Ensure no image data is sent to external servers
  - Confirm model is cached locally after first download
  - Document privacy guarantees in code comments
  - _Requirements: 6.2_

- [ ]* 11.4 Conduct security audit
  - Review all input validation
  - Test for XSS vulnerabilities
  - Verify CSP compliance
  - Test privacy guarantees
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 12. Integration and end-to-end testing
- [ ] 12.1 Wire up all components in CanvasWorkspace
  - Wrap CanvasWorkspace with SelectionModeContext provider
  - Ensure MediaPipeSegmenter initializes on app load
  - Verify all node types support segmentation
  - Test toolbar integration works correctly
  - _Requirements: 3.1, 3.3, 3.4_

- [ ] 12.2 Test complete selection workflow
  - Test enabling selection mode from toolbar
  - Test clicking on object in master image
  - Test mask generation and highlight display
  - Test deselection by clicking elsewhere
  - Test switching between different nodes
  - _Requirements: 1.1, 2.1, 2.2, 3.1, 5.1, 5.4_

- [ ] 12.3 Test error scenarios end-to-end
  - Test behavior when model fails to load
  - Test behavior when segmentation times out
  - Test behavior with invalid images
  - Test graceful degradation
  - _Requirements: 1.3, 4.4_

- [ ]* 12.4 Perform browser compatibility testing
  - Test on Chrome 90+
  - Test on Firefox 88+
  - Test on Edge 90+
  - Test on Safari 14+ (if WebGL available)
  - Document any browser-specific issues
  - _Requirements: 6.1_

- [ ] 13. Documentation and polish
- [ ] 13.1 Add code documentation
  - Add JSDoc comments to MediaPipeSegmenter service
  - Add JSDoc comments to SegmentableImage component
  - Document SelectionModeContext usage
  - Add inline comments for complex algorithms (mask rendering, edge detection)
  - _Requirements: All_

- [ ] 13.2 Update user-facing documentation
  - Add selection feature to README
  - Document keyboard shortcuts (M for select, ESC for deselect)
  - Add usage examples with screenshots
  - Document browser requirements
  - _Requirements: 3.2, 5.3_

- [ ] 13.3 Add feature flag for rollback
  - Create FEATURE_FLAGS configuration
  - Add enableSegmentation flag (default: true)
  - Implement conditional rendering based on flag
  - Document rollback procedure
  - _Requirements: All_

- [ ]* 13.4 Create demo video or GIF
  - Record demo of selection feature in action
  - Show enabling selection mode
  - Show selecting objects
  - Show deselection
  - Add to documentation
  - _Requirements: All_
