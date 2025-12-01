# Implementation Plan: Animation Sprite Sheet Generator

- [ ] 1. Set up core types and interfaces
  - Create TypeScript interfaces for sprite sheet data structures
  - Add SpriteSheetMetadata, GridLayout, FrameData, and SpriteSheetConfig types to types.ts
  - Define error types for validation failures
  - _Requirements: 1.1, 2.1, 7.1_

- [ ] 2. Implement sprite sheet service core functions
  - [ ] 2.1 Implement frame validation function
    - Create validateFrames() function that checks dimension consistency
    - Return validation result with error details for mismatched dimensions
    - _Requirements: 2.2, 2.3_

  - [ ]* 2.2 Write property test for frame validation
    - **Property 3: Frame dimension validation**
    - **Validates: Requirements 2.2, 2.3**

  - [ ] 2.3 Implement grid layout calculation
    - Create calculateGridLayout() function for 4, 6, and 8 frame counts
    - Calculate rows, columns, cell dimensions, and padding for 1:1 ratio
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 3.2, 3.3_

  - [ ]* 2.4 Write property test for grid layout
    - **Property 2: Output maintains 1:1 aspect ratio with correct grid layout**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 3.1**

  - [ ] 2.5 Implement sprite sheet composition function
    - Create generateSpriteSheet() function that renders frames to canvas
    - Use nearest-neighbor sampling (imageSmoothingEnabled = false)
    - Preserve exact pixel values without interpolation
    - Add transparent padding for non-square grids
    - _Requirements: 2.4, 3.4, 3.5, 4.1, 4.2, 4.4_

  - [ ]* 2.6 Write property test for pixel preservation
    - **Property 8: Pixel values are preserved exactly**
    - **Validates: Requirements 4.2, 4.4**

  - [ ]* 2.7 Write property test for frame ordering
    - **Property 4: Frame ordering preservation**
    - **Validates: Requirements 2.4**

  - [ ]* 2.8 Write property test for dimension preservation
    - **Property 7: Frame dimensions are preserved**
    - **Validates: Requirements 3.4**

  - [ ]* 2.9 Write property test for padding
    - **Property 6: Padding is transparent and centered**
    - **Validates: Requirements 3.2, 3.3, 3.5**

  - [ ] 2.10 Implement PNG export function
    - Create exportToPNG() function that converts canvas to data URL
    - Validate output is valid PNG format
    - _Requirements: 2.5_

  - [ ]* 2.11 Write property test for PNG output
    - **Property 5: Output format is valid PNG**
    - **Validates: Requirements 2.5**

  - [ ] 2.12 Implement metadata generation
    - Create generateMetadata() function that calculates frame positions
    - Include all required fields: frameCount, frameWidth, frameHeight, gridLayout, canvasSize, frames
    - Export as JSON string
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [ ]* 2.13 Write property test for metadata completeness
    - **Property 10: Metadata is complete and valid**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.5**

  - [ ] 2.14 Implement error handling
    - Add comprehensive error messages for all validation failures
    - Ensure error messages are descriptive and actionable
    - _Requirements: 6.2, 6.5_

  - [ ]* 2.15 Write property test for error messages
    - **Property 9: Error messages are descriptive**
    - **Validates: Requirements 6.2, 6.5**

- [ ] 3. Create SpriteSheetGeneratorModal component
  - [ ] 3.1 Implement modal component structure
    - Create modal with open/close functionality
    - Add frame count selector (4, 6, 8 frames)
    - Add file upload interface for frames
    - _Requirements: 5.1, 5.2_

  - [ ] 3.2 Implement frame upload handling
    - Handle file input and validate image files
    - Load images and extract dimensions
    - Display upload progress and validation errors
    - _Requirements: 2.1, 6.1, 6.2_

  - [ ] 3.3 Implement preview generation
    - Generate preview canvas when frames are uploaded
    - Update preview when frame count changes
    - Display grid layout visually
    - _Requirements: 5.2, 5.3_

  - [ ] 3.4 Implement sprite sheet generation
    - Wire up generate button to spriteSheetService
    - Display processing status during generation
    - Handle generation errors with user-friendly messages
    - _Requirements: 5.4, 6.3, 6.4_

  - [ ] 3.5 Implement download functionality
    - Add download button for sprite sheet PNG
    - Add download button for metadata JSON
    - Trigger browser downloads with appropriate filenames
    - _Requirements: 5.5, 7.4_

  - [ ]* 3.6 Write unit tests for component
    - Test component renders correctly
    - Test frame upload UI
    - Test preview generation
    - Test download functionality

- [ ] 4. Integrate with CanvasWorkspace
  - [ ] 4.1 Add sprite sheet generator button to toolbar
    - Add button to LeftToolbar or FloatingMenuBar
    - Wire up button to open SpriteSheetGeneratorModal
    - _Requirements: 5.1_

  - [ ] 4.2 Handle generated sprite sheet output
    - Add generated sprite sheet to canvas as ImageNode
    - Set isPixelSnapped flag for pixel art sprite sheets
    - Store metadata with the node
    - _Requirements: 2.5, 5.4_

  - [ ]* 4.3 Write integration tests
    - Test end-to-end sprite sheet generation workflow
    - Test integration with CanvasWorkspace
    - Test file upload and download

- [ ] 5. Add property-based test infrastructure
  - [ ] 5.1 Install fast-check library
    - Add fast-check as dev dependency
    - Configure test runner for property tests
    - _Requirements: All_

  - [ ] 5.2 Create test generators
    - Create generator for valid frame counts (4, 6, 8)
    - Create generator for frame dimensions (16-512 pixels)
    - Create generator for frame image data (random RGBA arrays)
    - Create generator for invalid inputs
    - _Requirements: All_

  - [ ]* 5.3 Write property test for valid frame counts
    - **Property 1: Valid frame counts are accepted**
    - **Validates: Requirements 1.1**

- [ ] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
