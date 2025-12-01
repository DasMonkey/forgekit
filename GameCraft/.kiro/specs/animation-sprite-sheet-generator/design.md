# Design Document: Animation Sprite Sheet Generator

## Overview

The Animation Sprite Sheet Generator is a feature that enables users to create properly formatted sprite sheets for flat image style game assets (pixel art, HD 2D). The system accepts individual animation frames as input and arranges them in a square grid layout with a 1:1 aspect ratio, making the output compatible with game engines and animation tools.

The generator supports 4, 6, or 8 frames per animation cycle, automatically calculating the optimal grid layout and adding transparent padding as needed to maintain the square aspect ratio. The system preserves pixel-perfect quality for flat image styles by using nearest-neighbor sampling and lossless formats.

## Architecture

The sprite sheet generator follows GameCraft's existing service-based architecture pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SpriteSheetGeneratorModal Component                 │  │
│  │  - Frame upload interface                            │  │
│  │  - Configuration controls (frame count selection)    │  │
│  │  │  - Preview canvas                                  │  │
│  │  - Download button                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  spriteSheetService.ts                               │  │
│  │  - Frame validation                                  │  │
│  │  - Grid layout calculation                           │  │
│  │  - Sprite sheet composition                          │  │
│  │  - Metadata generation                               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Canvas API (Browser)                      │
│  - Image loading and manipulation                            │
│  - Pixel-perfect rendering                                   │
│  - PNG export                                                │
└─────────────────────────────────────────────────────────────┘
```

### Integration Points

The sprite sheet generator integrates with existing GameCraft components:

1. **CanvasWorkspace**: Add a new toolbar button to open the sprite sheet generator modal
2. **FloatingMenuBar**: Optionally add sprite sheet generation as a menu item
3. **ImageNode**: Generated sprite sheets can be added to the canvas as ImageNode instances
4. **Types**: Extend with sprite sheet-specific type definitions

## Components and Interfaces

### 1. SpriteSheetGeneratorModal Component

A modal dialog component that provides the user interface for sprite sheet generation.

**Props:**
```typescript
interface SpriteSheetGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (spriteSheetUrl: string, metadata: SpriteSheetMetadata) => void;
}
```

**State:**
```typescript
interface SpriteSheetGeneratorState {
  frames: FrameData[];
  frameCount: 4 | 6 | 8;
  previewUrl: string | null;
  isGenerating: boolean;
  error: string | null;
  metadata: SpriteSheetMetadata | null;
}

interface FrameData {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  file: File;
}
```

**Key Methods:**
- `handleFrameUpload(files: FileList)`: Validates and loads frame images
- `handleFrameCountChange(count: 4 | 6 | 8)`: Updates frame count configuration
- `generatePreview()`: Creates a preview of the sprite sheet layout
- `generateSpriteSheet()`: Produces the final sprite sheet and metadata
- `downloadSpriteSheet()`: Triggers download of the generated sprite sheet
- `downloadMetadata()`: Triggers download of the metadata JSON file

### 2. spriteSheetService.ts

Core service module that handles sprite sheet generation logic.

**Interfaces:**
```typescript
interface SpriteSheetConfig {
  frameCount: 4 | 6 | 8;
  frames: HTMLImageElement[];
  backgroundColor: string; // Default: 'transparent'
}

interface GridLayout {
  rows: number;
  columns: number;
  cellWidth: number;
  cellHeight: number;
  canvasSize: number; // Square dimension
  paddingTop: number;
  paddingLeft: number;
}

interface SpriteSheetMetadata {
  version: string; // e.g., "1.0"
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  gridLayout: {
    rows: number;
    columns: number;
  };
  canvasSize: number;
  frames: FrameMetadata[];
}

interface FrameMetadata {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

**Key Functions:**

```typescript
/**
 * Validates that all frames have identical dimensions
 */
function validateFrames(frames: HTMLImageElement[]): {
  valid: boolean;
  error?: string;
  width?: number;
  height?: number;
}

/**
 * Calculates the optimal grid layout for the given frame count
 * Returns grid dimensions and padding needed for 1:1 ratio
 */
function calculateGridLayout(
  frameCount: number,
  frameWidth: number,
  frameHeight: number
): GridLayout

/**
 * Generates the sprite sheet on a canvas
 */
function generateSpriteSheet(
  config: SpriteSheetConfig
): Promise<{
  canvas: HTMLCanvasElement;
  metadata: SpriteSheetMetadata;
}>

/**
 * Exports canvas to PNG data URL
 */
function exportToPNG(canvas: HTMLCanvasElement): string

/**
 * Exports metadata to JSON string
 */
function exportMetadata(metadata: SpriteSheetMetadata): string
```

### 3. Type Extensions

Add to `GameCraft/types.ts`:

```typescript
export interface SpriteSheetNodeData extends ImageNodeData {
  isSpriteSheet: true;
  metadata: SpriteSheetMetadata;
}
```

## Data Models

### Frame Data Model

Represents a single animation frame before composition:

```typescript
interface FrameData {
  id: string;              // Unique identifier
  imageUrl: string;        // Data URL or blob URL
  width: number;           // Frame width in pixels
  height: number;          // Frame height in pixels
  file: File;              // Original file reference
}
```

### Grid Layout Model

Defines how frames are arranged in the sprite sheet:

```typescript
interface GridLayout {
  rows: number;            // Number of grid rows
  columns: number;         // Number of grid columns
  cellWidth: number;       // Width of each grid cell
  cellHeight: number;      // Height of each grid cell
  canvasSize: number;      // Total canvas dimension (square)
  paddingTop: number;      // Top padding for centering
  paddingLeft: number;     // Left padding for centering
}
```

**Grid Layout Rules:**
- 4 frames → 2×2 grid (no padding needed, naturally square)
- 6 frames → 3×2 grid (add vertical padding to make square)
- 8 frames → 4×2 grid (add vertical padding to make square)

### Sprite Sheet Metadata Model

Provides information about the generated sprite sheet for game engine integration:

```typescript
interface SpriteSheetMetadata {
  version: string;         // Metadata format version
  frameCount: number;      // Total number of frames
  frameWidth: number;      // Width of each frame
  frameHeight: number;     // Height of each frame
  gridLayout: {
    rows: number;
    columns: number;
  };
  canvasSize: number;      // Square canvas dimension
  frames: FrameMetadata[]; // Per-frame position data
}

interface FrameMetadata {
  index: number;           // Frame number (0-based)
  x: number;               // X position in sprite sheet
  y: number;               // Y position in sprite sheet
  width: number;           // Frame width
  height: number;          // Frame height
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After reviewing the prework analysis, the following redundancies were identified:

- **Property 1.2 and 3.1** are identical (both test 1:1 aspect ratio) - Property 3.1 will be removed
- **Properties 1.3, 1.4, 1.5** can be combined with **1.2** into a single comprehensive property that validates grid layout for all frame counts
- **Properties 6.2 and 6.5** both test error message quality - these can be combined into one property
- **Properties 7.2 and 7.5** both test metadata completeness - these can be combined

After consolidation, we have the following unique properties:

### Correctness Properties

Property 1: Valid frame counts are accepted
*For any* frame count value, if it is 4, 6, or 8, the system should accept it and process the sprite sheet generation without error
**Validates: Requirements 1.1**

Property 2: Output maintains 1:1 aspect ratio with correct grid layout
*For any* generated sprite sheet, the output width should equal the output height, and the grid layout should match the frame count: 4 frames → 2×2 grid, 6 frames → 3×2 grid, 8 frames → 4×2 grid
**Validates: Requirements 1.2, 1.3, 1.4, 1.5, 3.1**

Property 3: Frame dimension validation
*For any* set of input frames, if all frames have identical dimensions, validation should pass; if any frame has different dimensions, validation should fail with an error message
**Validates: Requirements 2.2, 2.3**

Property 4: Frame ordering preservation
*For any* set of valid input frames, the frames in the generated sprite sheet should appear in the same sequential order as the input, reading left-to-right, top-to-bottom
**Validates: Requirements 2.4**

Property 5: Output format is valid PNG
*For any* generated sprite sheet, the output should be a valid PNG image that can be decoded by standard image libraries
**Validates: Requirements 2.5**

Property 6: Padding is transparent and centered
*For any* sprite sheet with non-square grid layout (6 or 8 frames), transparent padding should be added, and the frame grid should be centered with equal padding on opposite sides
**Validates: Requirements 3.2, 3.3, 3.5**

Property 7: Frame dimensions are preserved
*For any* input frame, the frame's dimensions in the output sprite sheet should exactly match the input frame's dimensions (no scaling or distortion)
**Validates: Requirements 3.4**

Property 8: Pixel values are preserved exactly
*For any* input frame, every pixel in the output sprite sheet should have identical RGBA values to the corresponding pixel in the input frame (no interpolation or color changes)
**Validates: Requirements 4.2, 4.4**

Property 9: Error messages are descriptive
*For any* validation failure or error condition, the system should return a non-empty error message that describes the specific problem
**Validates: Requirements 6.2, 6.5**

Property 10: Metadata is complete and valid
*For any* generated sprite sheet, the metadata should be valid JSON and include all required fields: frameCount, frameWidth, frameHeight, gridLayout (rows, columns), canvasSize, and frame positions for each frame
**Validates: Requirements 7.1, 7.2, 7.3, 7.5**

## Error Handling

The sprite sheet generator implements comprehensive error handling at multiple levels:

### Input Validation Errors

1. **Empty Frame List**
   - Error: "No frames provided. Please upload at least one frame."
   - Recovery: User must upload frames

2. **Insufficient Frames**
   - Error: "Not enough frames. Expected {frameCount} frames, but only {actualCount} provided."
   - Recovery: User must upload additional frames

3. **Excess Frames**
   - Error: "Too many frames. Expected {frameCount} frames, but {actualCount} provided."
   - Recovery: User must remove extra frames or change frame count setting

4. **Mismatched Dimensions**
   - Error: "Frame dimensions do not match. All frames must have identical dimensions. Frame 1: {width1}×{height1}, Frame {n}: {widthN}×{heightN}"
   - Recovery: User must provide frames with matching dimensions

5. **Invalid Image Format**
   - Error: "Frame {n} is not a valid image file. Supported formats: PNG, JPEG, WebP"
   - Recovery: User must provide valid image files

6. **Image Load Failure**
   - Error: "Failed to load frame {n}. The file may be corrupted."
   - Recovery: User must provide a valid image file

### Generation Errors

1. **Canvas Creation Failure**
   - Error: "Failed to create sprite sheet canvas. Canvas size may be too large."
   - Recovery: User should try smaller frame dimensions

2. **Frame Rendering Failure**
   - Error: "Failed to render frame {n} to sprite sheet."
   - Recovery: System should retry or user should re-upload frame

3. **Export Failure**
   - Error: "Failed to export sprite sheet to PNG format."
   - Recovery: User should try again or check browser compatibility

### Error Handling Strategy

- All errors are caught and converted to user-friendly messages
- Errors include specific details (frame numbers, dimensions, etc.)
- The UI displays errors prominently with clear recovery actions
- Failed operations do not leave the system in an inconsistent state
- Users can retry operations after fixing issues

## Testing Strategy

The sprite sheet generator will be tested using a dual approach: unit tests for specific functionality and property-based tests for universal correctness properties.

### Unit Testing

Unit tests will cover:

1. **Grid Layout Calculation**
   - Test calculateGridLayout() with 4, 6, and 8 frames
   - Verify correct rows, columns, and padding values
   - Test with various frame dimensions

2. **Frame Validation**
   - Test validateFrames() with matching dimensions (should pass)
   - Test with mismatched dimensions (should fail)
   - Test with empty frame list (should fail)
   - Test error message content

3. **Metadata Generation**
   - Test that metadata includes all required fields
   - Test that frame positions are calculated correctly
   - Test JSON serialization

4. **Component Rendering**
   - Test that SpriteSheetGeneratorModal renders correctly
   - Test frame upload UI
   - Test preview generation
   - Test download functionality

### Property-Based Testing

Property-based tests will verify universal correctness properties across many randomly generated inputs. We will use **fast-check** as the property-based testing library for TypeScript/JavaScript.

**Configuration:**
- Each property test will run a minimum of 100 iterations
- Tests will use random frame counts (4, 6, or 8)
- Tests will generate random frame dimensions
- Tests will create random pixel data for frames

**Property Test Implementation:**

Each property-based test will be tagged with a comment referencing the design document:

```typescript
// Feature: animation-sprite-sheet-generator, Property 2: Output maintains 1:1 aspect ratio with correct grid layout
```

**Test Generators:**

Custom generators will be created for:
- Valid frame counts (4, 6, 8)
- Frame dimensions (width and height between 16 and 512 pixels)
- Frame image data (random RGBA pixel arrays)
- Invalid inputs (for error testing)

**Property Tests to Implement:**

1. Property 1: Valid frame counts (4, 6, 8) are accepted
2. Property 2: Output maintains 1:1 aspect ratio with correct grid layout
3. Property 3: Frame dimension validation (matching vs mismatched)
4. Property 4: Frame ordering preservation
5. Property 5: Output format is valid PNG
6. Property 6: Padding is transparent and centered
7. Property 7: Frame dimensions are preserved
8. Property 8: Pixel values are preserved exactly
9. Property 9: Error messages are descriptive
10. Property 10: Metadata is complete and valid

### Integration Testing

Integration tests will verify:
- End-to-end sprite sheet generation workflow
- Integration with CanvasWorkspace
- File upload and download functionality
- Preview generation and updates

### Test Coverage Goals

- Unit test coverage: >80% of service functions
- Property test coverage: All 10 correctness properties
- Integration test coverage: All user workflows

## Implementation Notes

### Canvas Rendering Strategy

The sprite sheet generator uses the HTML5 Canvas API for image composition:

1. **Create Square Canvas**: Calculate canvas size based on grid layout and frame dimensions
2. **Set Rendering Context**: Use 2D context with `imageSmoothingEnabled = false` for pixel-perfect rendering
3. **Draw Frames**: Iterate through frames and draw each to its calculated position
4. **Export**: Convert canvas to PNG data URL using `toDataURL('image/png')`

### Performance Considerations

- **Large Frame Dimensions**: Canvas size is limited by browser (typically 4096×4096 or 8192×8192). Validate that calculated canvas size is within limits.
- **Memory Usage**: Loading multiple high-resolution frames can consume significant memory. Consider implementing frame streaming for very large inputs.
- **Preview Generation**: Generate preview at reduced resolution for faster updates, then render full resolution for final output.

### Browser Compatibility

- Canvas API: Supported in all modern browsers
- File API: Supported in all modern browsers
- PNG Export: Supported in all modern browsers
- Recommended: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Future Enhancements

Potential future improvements:
- Support for additional frame counts (12, 16, etc.)
- Automatic frame extraction from video files
- Animation preview playback
- Batch processing of multiple sprite sheets
- Export to additional formats (GIF, WebP animation)
- Integration with AI-generated animation frames
