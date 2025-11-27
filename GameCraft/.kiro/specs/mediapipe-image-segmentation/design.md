# Design Document: MediaPipe Interactive Segmenter Integration

## Overview

This design document outlines the integration of Google's MediaPipe Interactive Segmenter into the Craftus application. The feature enables users to perform point-and-click object selection on AI-generated craft images using the "magic touch" model. When a user clicks on an object within an image, the system will detect the object boundaries and highlight the selected region with a visual overlay.

The integration will be client-side only, processing all images locally in the browser without external API calls. This approach maintains the application's privacy-first philosophy and eliminates additional latency.

## Architecture

### High-Level Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    CanvasWorkspace                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              React Flow Canvas                        │  │
│  │  ┌──────────────────────────────────────────────┐    │  │
│  │  │  Image Nodes (Master/Step/Material/Upload)   │    │  │
│  │  │  ┌────────────────────────────────────────┐  │    │  │
│  │  │  │  SegmentableImage Component            │  │    │  │
│  │  │  │  ┌──────────────────────────────────┐  │  │    │  │
│  │  │  │  │  <img> + Overlay Canvas          │  │    │  │
│  │  │  │  └──────────────────────────────────┘  │  │    │  │
│  │  │  └────────────────────────────────────────┘  │    │  │
│  │  └──────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              MediaPipeSegmenter Service                     │
│  • Model Loading & Initialization                           │
│  • Segmentation Processing                                  │
│  • Mask Generation                                          │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              MediaPipe Interactive Segmenter                │
│              (Loaded from CDN)                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Initialization Phase**:
   - Application loads → MediaPipe model downloads asynchronously
   - Model cached in memory for subsequent use
   - UI shows loading state if model not ready

2. **Selection Phase**:
   - User enables selection mode (toolbar button or keyboard shortcut)
   - User clicks on image → Click coordinates captured
   - Coordinates passed to MediaPipeSegmenter service
   - Service processes image + coordinates → Returns segmentation mask
   - Mask rendered as overlay on canvas

3. **Deselection Phase**:
   - User clicks elsewhere → Previous mask cleared
   - New segmentation generated for new location
   - Or user presses ESC/clicks outside → All selections cleared

## Components and Interfaces

### 1. SegmentableImage Component

A new React component that wraps image nodes with segmentation capabilities.

```typescript
interface SegmentableImageProps {
  imageUrl: string;
  alt: string;
  width: number;
  height: number;
  selectionEnabled: boolean;
  onSegmentationChange?: (mask: SegmentationMask | null) => void;
}

interface SegmentationMask {
  width: number;
  height: number;
  data: Uint8Array; // Binary mask data
  confidenceScores?: Float32Array;
}

const SegmentableImage: React.FC<SegmentableImageProps> = ({
  imageUrl,
  alt,
  width,
  height,
  selectionEnabled,
  onSegmentationChange
}) => {
  // Component implementation
};
```

**Responsibilities**:
- Render the base image
- Handle click events when selection mode is active
- Manage overlay canvas for highlighting
- Coordinate with MediaPipeSegmenter service
- Display loading states during segmentation

**Key Features**:
- Dual-canvas approach: base image + overlay canvas
- Click event handling with coordinate normalization
- Mask-to-visual-overlay conversion
- Performance optimization with canvas caching

### 2. MediaPipeSegmenter Service

A singleton service that manages the MediaPipe model lifecycle and segmentation operations.

```typescript
interface SegmentationRequest {
  imageElement: HTMLImageElement;
  clickX: number; // Normalized 0-1
  clickY: number; // Normalized 0-1
}

interface SegmentationResult {
  mask: SegmentationMask;
  processingTime: number;
}

class MediaPipeSegmenter {
  private static instance: MediaPipeSegmenter;
  private segmenter: ImageSegmenter | null = null;
  private isLoading: boolean = false;
  private isReady: boolean = false;
  private loadPromise: Promise<void> | null = null;

  static getInstance(): MediaPipeSegmenter;
  
  async initialize(): Promise<void>;
  
  async segment(request: SegmentationRequest): Promise<SegmentationResult>;
  
  isModelReady(): boolean;
  
  dispose(): void;
}
```

**Responsibilities**:
- Lazy-load MediaPipe model on first use
- Manage model lifecycle (initialization, disposal)
- Process segmentation requests
- Handle errors and retries
- Provide status information

**Key Features**:
- Singleton pattern for single model instance
- Async initialization with promise caching
- Request queuing to prevent concurrent processing
- Automatic retry with exponential backoff
- Memory management and cleanup

### 3. Selection Mode Context

A React context to manage global selection mode state across the application.

```typescript
interface SelectionModeContextValue {
  isSelectionMode: boolean;
  enableSelectionMode: () => void;
  disableSelectionMode: () => void;
  toggleSelectionMode: () => void;
  currentSelection: {
    nodeId: string;
    mask: SegmentationMask;
  } | null;
  setCurrentSelection: (selection: { nodeId: string; mask: SegmentationMask } | null) => void;
}

const SelectionModeContext = createContext<SelectionModeContextValue | undefined>(undefined);

export const useSelectionMode = (): SelectionModeContextValue;
```

**Responsibilities**:
- Track global selection mode state
- Store current selection across nodes
- Provide mode toggle functions
- Notify components of mode changes

### 4. Updated Node Components

Modify existing image node components to integrate segmentation:

```typescript
// MasterNode, InstructionNode, ImageNode updates
export const MasterNode = memo(({ data, id }: NodeProps<any>) => {
  const { selectionMode } = useSelectionMode();
  const { label, imageUrl, isDissecting, isDissected, onContextMenu } = data as MasterNodeData;

  return (
    <div className="...">
      <SegmentableImage
        imageUrl={imageUrl}
        alt={label}
        width={280}
        height={280}
        selectionEnabled={selectionMode}
        onSegmentationChange={(mask) => {
          // Handle segmentation result
        }}
      />
      {/* Rest of node UI */}
    </div>
  );
});
```

### 5. Toolbar Integration

Add selection mode toggle to the existing LeftToolbar component:

```typescript
// Add to ToolType union
type ToolType = 'select' | 'text' | 'shapes' | 'upload' | 'pencil' | 'segment';

// Add toolbar button
<ToolButton
  icon={Sparkles}
  label="Magic Select"
  isActive={activeTool === 'segment'}
  onClick={() => handleToolChange('segment')}
  shortcut="M"
/>
```

## Data Models

### SegmentationMask

```typescript
interface SegmentationMask {
  width: number;          // Mask width in pixels
  height: number;         // Mask height in pixels
  data: Uint8Array;       // Binary mask (0 = background, 255 = selected)
  confidenceScores?: Float32Array; // Optional confidence per pixel
  boundingBox?: {         // Optional bounding box for optimization
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
```

### SelectionState

```typescript
interface SelectionState {
  nodeId: string;         // ID of the node containing the selection
  mask: SegmentationMask; // The segmentation mask
  timestamp: number;      // When selection was made
  clickPoint: {           // Original click coordinates
    x: number;
    y: number;
  };
}
```

## Error Handling

### Error Types

1. **Model Loading Errors**
   - Network failure during CDN download
   - Incompatible browser/WebGL support
   - Memory allocation failure

2. **Segmentation Errors**
   - Invalid image format
   - Image too large
   - Processing timeout
   - Model inference failure

3. **User Input Errors**
   - Click outside image bounds
   - Invalid coordinates

### Error Handling Strategy

```typescript
class SegmentationError extends Error {
  constructor(
    message: string,
    public code: SegmentationErrorCode,
    public recoverable: boolean
  ) {
    super(message);
  }
}

enum SegmentationErrorCode {
  MODEL_LOAD_FAILED = 'MODEL_LOAD_FAILED',
  MODEL_NOT_READY = 'MODEL_NOT_READY',
  INVALID_IMAGE = 'INVALID_IMAGE',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  TIMEOUT = 'TIMEOUT',
  UNSUPPORTED_BROWSER = 'UNSUPPORTED_BROWSER',
}

// Error handling in service
async segment(request: SegmentationRequest): Promise<SegmentationResult> {
  try {
    // Validation
    if (!this.isReady) {
      throw new SegmentationError(
        'Model not ready',
        SegmentationErrorCode.MODEL_NOT_READY,
        true
      );
    }

    // Processing with timeout
    const result = await Promise.race([
      this.processSegmentation(request),
      this.timeout(5000)
    ]);

    return result;
  } catch (error) {
    if (error instanceof SegmentationError) {
      throw error;
    }
    throw new SegmentationError(
      'Segmentation failed',
      SegmentationErrorCode.PROCESSING_FAILED,
      true
    );
  }
}
```

### User-Facing Error Messages

- **Model Loading**: "Loading selection tool... Please wait."
- **Model Load Failed**: "Object selection unavailable. Please refresh the page."
- **Processing Failed**: "Could not select object. Please try again."
- **Timeout**: "Selection is taking too long. Please try a different area."
- **Unsupported Browser**: "Your browser doesn't support object selection. Please use Chrome, Edge, or Firefox."

## Testing Strategy

### Unit Tests

1. **MediaPipeSegmenter Service**
   - Model initialization
   - Singleton pattern enforcement
   - Error handling and retries
   - Request queuing
   - Memory cleanup

2. **SegmentableImage Component**
   - Click coordinate normalization
   - Mask rendering
   - Mode toggling
   - Loading states

3. **SelectionModeContext**
   - State management
   - Mode transitions
   - Selection persistence

### Integration Tests

1. **End-to-End Selection Flow**
   - Enable selection mode
   - Click on image
   - Verify mask generation
   - Verify visual highlight
   - Deselect and verify cleanup

2. **Multi-Node Selection**
   - Select object in Node A
   - Switch to Node B
   - Verify Node A selection persists
   - Select object in Node B
   - Verify both selections maintained

3. **Error Recovery**
   - Simulate model load failure
   - Verify graceful degradation
   - Retry and verify recovery

### Performance Tests

1. **Model Load Time**
   - Measure initial download time
   - Verify async loading doesn't block UI

2. **Segmentation Latency**
   - Measure time from click to mask display
   - Target: < 2 seconds for 95th percentile

3. **Memory Usage**
   - Monitor memory during multiple selections
   - Verify no memory leaks
   - Test with large images (up to 2048x2048)

### Browser Compatibility Tests

- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+ (if WebGL support available)

## Implementation Details

### MediaPipe Model Configuration

```typescript
const MEDIAPIPE_CONFIG = {
  modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/magic_touch/float32/latest/magic_touch.tflite',
  delegate: 'GPU', // Use GPU acceleration if available
  runningMode: 'IMAGE', // Single image mode (not video)
  outputCategoryMask: true,
  outputConfidenceMasks: false, // Disable for performance
};
```

### Mask Rendering Algorithm

```typescript
function renderMask(
  canvas: HTMLCanvasElement,
  mask: SegmentationMask,
  highlightColor: string = 'rgba(16, 185, 129, 0.4)' // Emerald with 40% opacity
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Create ImageData from mask
  const imageData = ctx.createImageData(mask.width, mask.height);
  
  // Parse highlight color
  const [r, g, b, a] = parseRGBA(highlightColor);
  
  // Apply mask with highlight color
  for (let i = 0; i < mask.data.length; i++) {
    const pixelIndex = i * 4;
    if (mask.data[i] > 128) { // Threshold for selection
      imageData.data[pixelIndex] = r;
      imageData.data[pixelIndex + 1] = g;
      imageData.data[pixelIndex + 2] = b;
      imageData.data[pixelIndex + 3] = a * 255;
    }
  }
  
  // Draw to canvas
  ctx.putImageData(imageData, 0, 0);
  
  // Add border outline
  drawMaskOutline(ctx, mask, `rgba(${r}, ${g}, ${b}, 1)`);
}

function drawMaskOutline(
  ctx: CanvasRenderingContext2D,
  mask: SegmentationMask,
  strokeColor: string
): void {
  // Edge detection on mask to find boundaries
  const edges = detectEdges(mask);
  
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  // Trace edges
  for (const edge of edges) {
    ctx.moveTo(edge.start.x, edge.start.y);
    ctx.lineTo(edge.end.x, edge.end.y);
  }
  
  ctx.stroke();
}
```

### Coordinate Normalization

```typescript
function normalizeClickCoordinates(
  event: React.MouseEvent,
  imageElement: HTMLImageElement
): { x: number; y: number } {
  const rect = imageElement.getBoundingClientRect();
  
  // Get click position relative to image
  const relativeX = event.clientX - rect.left;
  const relativeY = event.clientY - rect.top;
  
  // Normalize to 0-1 range
  const normalizedX = relativeX / rect.width;
  const normalizedY = relativeY / rect.height;
  
  // Clamp to valid range
  return {
    x: Math.max(0, Math.min(1, normalizedX)),
    y: Math.max(0, Math.min(1, normalizedY)),
  };
}
```

### Performance Optimizations

1. **Canvas Caching**
   - Cache rendered masks to avoid re-rendering
   - Invalidate cache only when mask changes

2. **Request Debouncing**
   - Debounce rapid clicks (300ms threshold)
   - Cancel in-flight requests when new click occurs

3. **Lazy Model Loading**
   - Load model only when selection mode first activated
   - Show loading indicator during download

4. **Memory Management**
   - Dispose of old masks when new selection made
   - Limit stored selections to 5 most recent
   - Clear all selections when leaving canvas

5. **WebGL Acceleration**
   - Use GPU delegate for faster inference
   - Fallback to CPU if WebGL unavailable

## Security Considerations

### Input Validation

```typescript
function validateSegmentationRequest(request: SegmentationRequest): void {
  // Validate image dimensions
  if (request.imageElement.width > 4096 || request.imageElement.height > 4096) {
    throw new SegmentationError(
      'Image too large',
      SegmentationErrorCode.INVALID_IMAGE,
      false
    );
  }
  
  // Validate coordinates
  if (
    request.clickX < 0 || request.clickX > 1 ||
    request.clickY < 0 || request.clickY > 1
  ) {
    throw new SegmentationError(
      'Invalid coordinates',
      SegmentationErrorCode.INVALID_IMAGE,
      false
    );
  }
  
  // Validate image source
  const validSources = [
    'data:', // Data URLs from our generation
    'blob:', // Blob URLs from uploads
    window.location.origin, // Same-origin images
  ];
  
  const imageUrl = request.imageElement.src;
  const isValidSource = validSources.some(prefix => imageUrl.startsWith(prefix));
  
  if (!isValidSource) {
    throw new SegmentationError(
      'Invalid image source',
      SegmentationErrorCode.INVALID_IMAGE,
      false
    );
  }
}
```

### CDN Security

- Load MediaPipe from official Google CDN only
- Use Subresource Integrity (SRI) hashes if available
- Implement CSP headers to restrict script sources

### Privacy

- All processing happens client-side
- No image data sent to external servers
- Model downloaded once and cached locally
- No telemetry or analytics on selections

## UI/UX Design

### Selection Mode Indicator

```typescript
// Cursor changes
const cursorStyles = {
  select: 'default',
  segment: 'crosshair',
  segmentProcessing: 'wait',
};

// Visual feedback
<div className={`
  fixed top-20 left-1/2 transform -translate-x-1/2
  px-4 py-2 rounded-full
  bg-emerald-600 text-white text-sm font-medium
  shadow-lg
  transition-opacity duration-200
  ${isSelectionMode ? 'opacity-100' : 'opacity-0 pointer-events-none'}
`}>
  <Sparkles className="w-4 h-4 inline mr-2" />
  Click on any object to select
</div>
```

### Highlight Styling

- **Color**: Emerald (#10b981) with 40% opacity
- **Border**: 2px solid emerald at full opacity
- **Animation**: Subtle pulse effect on initial selection
- **Transition**: 200ms fade in/out

### Loading States

```typescript
// During model loading
<div className="absolute inset-0 bg-black/60 flex items-center justify-center">
  <div className="flex items-center gap-2 text-white">
    <Loader2 className="w-5 h-5 animate-spin" />
    <span className="text-sm">Loading selection tool...</span>
  </div>
</div>

// During segmentation processing
<div className="absolute top-2 right-2 bg-emerald-600 rounded-full p-2">
  <Loader2 className="w-4 h-4 animate-spin text-white" />
</div>
```

### Keyboard Shortcuts

- **M**: Toggle selection mode
- **ESC**: Clear current selection / Exit selection mode
- **Delete**: Remove selected object (future enhancement)

## Future Enhancements

1. **Multi-Object Selection**
   - Select multiple objects simultaneously
   - Combine/subtract selections

2. **Selection Actions**
   - Extract selected object to new node
   - Delete selected object from image
   - Apply effects to selected region

3. **Smart Selection**
   - Auto-detect all similar objects
   - Select by color/texture

4. **Selection History**
   - Undo/redo selections
   - Save selections with project

5. **Advanced Visualization**
   - Adjustable highlight opacity
   - Different highlight colors
   - Outline-only mode

## Dependencies

### New Dependencies

```json
{
  "@mediapipe/tasks-vision": "^0.10.8"
}
```

### CDN Resources

- MediaPipe WASM files: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm`
- Magic Touch model: `https://storage.googleapis.com/mediapipe-models/image_segmenter/magic_touch/float32/latest/magic_touch.tflite`

### Browser Requirements

- WebGL 2.0 support
- WebAssembly support
- Modern JavaScript (ES2020+)
- Minimum 2GB RAM recommended

## Migration Strategy

### Phase 1: Core Integration (Week 1)
- Implement MediaPipeSegmenter service
- Create SegmentableImage component
- Add selection mode context
- Basic toolbar integration

### Phase 2: Node Integration (Week 1)
- Update MasterNode with segmentation
- Update InstructionNode with segmentation
- Update ImageNode with segmentation
- Testing and bug fixes

### Phase 3: Polish & Optimization (Week 2)
- Performance optimization
- Error handling refinement
- UI/UX improvements
- Documentation

### Phase 4: Testing & Release (Week 2)
- Comprehensive testing
- Browser compatibility verification
- Security audit
- Production deployment

## Rollback Plan

If critical issues arise:
1. Feature flag to disable segmentation
2. Graceful degradation to normal image display
3. Remove toolbar button
4. Keep code in codebase for future fixes

```typescript
const FEATURE_FLAGS = {
  enableSegmentation: false, // Toggle to disable
};
```
