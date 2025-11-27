# Design Document: AI-Guided Object Dissection

## Overview

This design document outlines the implementation of AI-guided object dissection, which allows users to select specific objects within images using MediaPipe segmentation and generate focused craft instructions for those objects. The system addresses two critical challenges:

1. **Focused AI Analysis**: Using segmentation data to guide the AI to analyze only the selected object
2. **Complete Object Context**: Ensuring the AI sees the full object even when segmentation masks miss small parts

The solution uses bounding box calculation with intelligent context padding to crop the relevant image region, then sends this cropped image with targeted prompts to the Gemini Vision API.

## Architecture

### High-Level Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    CanvasWorkspace                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Image Nodes (Master/Upload) with Segmentation        │  │
│  │  ┌────────────────────────────────────────────────┐   │  │
│  │  │  User clicks object → Segmentation Mask        │   │  │
│  │  │  User clicks "Dissect Selected" button         │   │  │
│  │  └────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              ObjectDissectionService                        │
│  • Calculate bounding box from mask                         │
│  • Add context padding                                      │
│  • Crop image to padded region                             │
│  • Generate object-focused prompt                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              GeminiService (Enhanced)                       │
│  • Send cropped image + focused prompt                      │
│  • Parse object-specific instructions                       │
│  • Generate step images for selected object                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              AIContext (Enhanced)                           │
│  • dissectSelectedObject() method                           │
│  • Manage object dissection state                           │
│  • Create nodes for object instructions                     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Selection Phase**:
   - User selects object → MediaPipe generates segmentation mask
   - System calculates bounding box from mask
   - System displays preview with context padding

2. **Preparation Phase**:
   - User clicks "Dissect Selected" → Extract selection data
   - Calculate padded bounding box
   - Crop image to padded region
   - Generate object-focused AI prompt

3. **AI Processing Phase**:
   - Send cropped image + prompt to Gemini Vision API
   - AI analyzes selected object and generates instructions
   - Parse materials list and step descriptions

4. **Visualization Phase**:
   - Create MaterialsNode with object-specific materials
   - Create StepNodes with object-specific steps
   - Generate step images using existing pipeline
   - Position nodes on canvas with visual connections


## Components and Interfaces

### 1. ObjectDissectionService

A new service that handles bounding box calculation, context padding, and image cropping.

```typescript
interface BoundingBox {
  x: number;      // Top-left X coordinate (pixels)
  y: number;      // Top-left Y coordinate (pixels)
  width: number;  // Box width (pixels)
  height: number; // Box height (pixels)
}

interface PaddedRegion extends BoundingBox {
  paddingPercent: number;  // Applied padding percentage
  originalBox: BoundingBox; // Original box before padding
}

interface ObjectDissectionRequest {
  imageElement: HTMLImageElement;
  segmentationMask: SegmentationMask;
  paddingPercent?: number; // Default: 20%
  category?: string;
  objectDescription?: string;
}

interface CroppedImageData {
  dataUrl: string;           // Base64 data URL of cropped image
  region: PaddedRegion;      // Region information
  originalDimensions: {      // Original image size
    width: number;
    height: number;
  };
}

class ObjectDissectionService {
  /**
   * Calculate bounding box from segmentation mask
   */
  static calculateBoundingBox(mask: SegmentationMask): BoundingBox;
  
  /**
   * Add context padding to bounding box
   */
  static addContextPadding(
    box: BoundingBox,
    imageDimensions: { width: number; height: number },
    paddingPercent: number
  ): PaddedRegion;
  
  /**
   * Crop image to padded region
   */
  static cropImageToRegion(
    imageElement: HTMLImageElement,
    region: PaddedRegion
  ): Promise<CroppedImageData>;
  
  /**
   * Generate object-focused dissection prompt
   */
  static generateObjectPrompt(
    category: string,
    objectDescription?: string
  ): string;
  
  /**
   * Validate selection size
   */
  static validateSelectionSize(
    mask: SegmentationMask,
    imageDimensions: { width: number; height: number }
  ): { valid: boolean; warning?: string };
}
```

**Key Algorithms**:

1. **Bounding Box Calculation**:
```typescript
static calculateBoundingBox(mask: SegmentationMask): BoundingBox {
  let minX = mask.width;
  let minY = mask.height;
  let maxX = 0;
  let maxY = 0;
  
  // Scan mask to find bounds
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      const index = y * mask.width + x;
      if (mask.data[index] > 128) { // Threshold for selected pixels
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}
```

2. **Context Padding**:
```typescript
static addContextPadding(
  box: BoundingBox,
  imageDimensions: { width: number; height: number },
  paddingPercent: number = 20
): PaddedRegion {
  // Calculate padding in pixels
  const paddingX = Math.floor(box.width * (paddingPercent / 100));
  const paddingY = Math.floor(box.height * (paddingPercent / 100));
  
  // Apply padding and clamp to image boundaries
  const paddedBox = {
    x: Math.max(0, box.x - paddingX),
    y: Math.max(0, box.y - paddingY),
    width: Math.min(
      imageDimensions.width - Math.max(0, box.x - paddingX),
      box.width + 2 * paddingX
    ),
    height: Math.min(
      imageDimensions.height - Math.max(0, box.y - paddingY),
      box.height + 2 * paddingY
    ),
  };
  
  return {
    ...paddedBox,
    paddingPercent,
    originalBox: box,
  };
}
```

3. **Image Cropping**:
```typescript
static async cropImageToRegion(
  imageElement: HTMLImageElement,
  region: PaddedRegion
): Promise<CroppedImageData> {
  // Create canvas for cropping
  const canvas = document.createElement('canvas');
  canvas.width = region.width;
  canvas.height = region.height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  
  // Draw cropped region
  ctx.drawImage(
    imageElement,
    region.x, region.y, region.width, region.height,  // Source
    0, 0, region.width, region.height                  // Destination
  );
  
  // Convert to data URL
  const dataUrl = canvas.toDataURL('image/png');
  
  return {
    dataUrl,
    region,
    originalDimensions: {
      width: imageElement.width,
      height: imageElement.height,
    },
  };
}
```


### 2. Enhanced AIContext

Extend the existing AIContext with object-focused dissection capabilities.

```typescript
interface ObjectDissectionState {
  isProcessing: boolean;
  currentObject?: {
    nodeId: string;
    description?: string;
    region: PaddedRegion;
  };
  error?: string;
  progress?: string;
}

// Add to AIContext
interface AIContextValue {
  // ... existing properties
  objectDissection: ObjectDissectionState;
  
  /**
   * Dissect a selected object from an image
   */
  dissectSelectedObject: (params: {
    nodeId: string;
    imageUrl: string;
    segmentationMask: SegmentationMask;
    category: string;
    objectDescription?: string;
    paddingPercent?: number;
  }) => Promise<void>;
  
  /**
   * Cancel ongoing object dissection
   */
  cancelObjectDissection: () => void;
}
```

**Implementation**:

```typescript
const dissectSelectedObject = async (params: {
  nodeId: string;
  imageUrl: string;
  segmentationMask: SegmentationMask;
  category: string;
  objectDescription?: string;
  paddingPercent?: number;
}) => {
  try {
    // Update state
    dispatch({
      type: 'OBJECT_DISSECTION_START',
      payload: { nodeId: params.nodeId, description: params.objectDescription },
    });
    
    // Load image element
    const imageElement = await loadImage(params.imageUrl);
    
    // Validate selection size
    const validation = ObjectDissectionService.validateSelectionSize(
      params.segmentationMask,
      { width: imageElement.width, height: imageElement.height }
    );
    
    if (!validation.valid) {
      throw new Error(validation.warning || 'Invalid selection');
    }
    
    // Crop image to selected region
    const croppedData = await ObjectDissectionService.cropImageToRegion(
      imageElement,
      ObjectDissectionService.addContextPadding(
        ObjectDissectionService.calculateBoundingBox(params.segmentationMask),
        { width: imageElement.width, height: imageElement.height },
        params.paddingPercent || 20
      )
    );
    
    // Generate object-focused prompt
    const prompt = ObjectDissectionService.generateObjectPrompt(
      params.category,
      params.objectDescription
    );
    
    // Call Gemini API with cropped image
    dispatch({ type: 'OBJECT_DISSECTION_PROGRESS', payload: 'Analyzing selected object...' });
    
    const dissectionResult = await geminiService.dissectImage(
      croppedData.dataUrl,
      params.category,
      prompt
    );
    
    // Create nodes for results
    const materialsNodeId = `materials-${Date.now()}`;
    const stepNodeIds: string[] = [];
    
    // Position nodes relative to source
    const sourceNode = nodes.find(n => n.id === params.nodeId);
    const baseX = sourceNode ? sourceNode.position.x + 400 : 100;
    const baseY = sourceNode ? sourceNode.position.y : 100;
    
    // Create materials node
    const materialsNode = {
      id: materialsNodeId,
      type: 'materials',
      position: { x: baseX, y: baseY },
      data: {
        label: params.objectDescription || 'Selected Object',
        materials: dissectionResult.materials,
      },
    };
    
    // Create step nodes
    const stepNodes = dissectionResult.steps.map((step, index) => {
      const nodeId = `step-${Date.now()}-${index}`;
      stepNodeIds.push(nodeId);
      
      return {
        id: nodeId,
        type: 'step',
        position: { x: baseX, y: baseY + 200 + index * 250 },
        data: {
          stepNumber: index + 1,
          description: step.description,
          imageUrl: null, // Will be generated
          isGenerating: true,
        },
      };
    });
    
    // Add nodes to canvas
    setNodes(prev => [...prev, materialsNode, ...stepNodes]);
    
    // Add edges
    const newEdges = [
      {
        id: `edge-${params.nodeId}-${materialsNodeId}`,
        source: params.nodeId,
        target: materialsNodeId,
        type: 'smoothstep',
      },
      ...stepNodeIds.map(stepId => ({
        id: `edge-${materialsNodeId}-${stepId}`,
        source: materialsNodeId,
        target: stepId,
        type: 'smoothstep',
      })),
    ];
    
    setEdges(prev => [...prev, ...newEdges]);
    
    // Generate step images
    dispatch({ type: 'OBJECT_DISSECTION_PROGRESS', payload: 'Generating step images...' });
    
    await generateStepImages(
      stepNodeIds,
      dissectionResult.steps,
      params.category,
      croppedData.dataUrl // Use cropped image as reference
    );
    
    dispatch({ type: 'OBJECT_DISSECTION_SUCCESS' });
    
  } catch (error) {
    console.error('Object dissection failed:', error);
    dispatch({
      type: 'OBJECT_DISSECTION_ERROR',
      payload: error instanceof Error ? error.message : 'Dissection failed',
    });
  }
};
```


### 3. Enhanced GeminiService

Update the Gemini service to support object-focused prompts.

```typescript
// Add to geminiService.ts

interface DissectionOptions {
  isObjectFocused?: boolean;
  objectContext?: string;
}

/**
 * Generate object-focused dissection prompt
 */
function generateObjectDissectionPrompt(
  category: string,
  objectDescription?: string
): string {
  const basePrompt = `You are analyzing a cropped image showing a specific object that will be crafted.

IMPORTANT CONTEXT:
- The image shows a selected object with some surrounding context
- The object may extend slightly beyond any visible highlights
- Small parts (like ears, tails, appendages) are included in the surrounding area
- Focus your analysis on the main object and its immediate components

CRAFT CATEGORY: ${category}

${objectDescription ? `OBJECT DESCRIPTION: ${objectDescription}\n` : ''}

Please provide:
1. A complete materials list for crafting THIS SPECIFIC OBJECT
2. Step-by-step instructions for creating THIS OBJECT ONLY
3. Each step should focus on building this particular element

Return your response in JSON format:
{
  "materials": ["material 1", "material 2", ...],
  "steps": [
    {"stepNumber": 1, "description": "step description"},
    ...
  ]
}`;

  return basePrompt;
}

/**
 * Enhanced dissect method with object focus support
 */
async function dissectImage(
  imageDataUrl: string,
  category: string,
  customPrompt?: string
): Promise<DissectionResult> {
  const prompt = customPrompt || generateStandardDissectionPrompt(category);
  
  // Convert data URL to Gemini format
  const imagePart = {
    inlineData: {
      data: imageDataUrl.split(',')[1], // Remove data:image/png;base64, prefix
      mimeType: 'image/png',
    },
  };
  
  // Call Gemini API
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  const result = await model.generateContent([prompt, imagePart]);
  const response = await result.response;
  const text = response.text();
  
  // Parse JSON response
  const parsed = parseJSONResponse(text);
  
  return {
    materials: parsed.materials || [],
    steps: parsed.steps || [],
  };
}
```

### 4. UI Components

#### DissectSelectedButton Component

A new button component that appears when an object is selected.

```typescript
interface DissectSelectedButtonProps {
  nodeId: string;
  imageUrl: string;
  segmentationMask: SegmentationMask | null;
  category: string;
  onDissect: () => void;
}

const DissectSelectedButton: React.FC<DissectSelectedButtonProps> = ({
  nodeId,
  imageUrl,
  segmentationMask,
  category,
  onDissect,
}) => {
  const { dissectSelectedObject, objectDissection } = useAI();
  const [showOptions, setShowOptions] = useState(false);
  const [objectDescription, setObjectDescription] = useState('');
  const [paddingPercent, setPaddingPercent] = useState(20);
  
  const handleDissect = async () => {
    if (!segmentationMask) {
      alert('Please select an object first');
      return;
    }
    
    await dissectSelectedObject({
      nodeId,
      imageUrl,
      segmentationMask,
      category,
      objectDescription: objectDescription || undefined,
      paddingPercent,
    });
    
    setShowOptions(false);
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        disabled={!segmentationMask || objectDissection.isProcessing}
        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {objectDissection.isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
            {objectDissection.progress || 'Processing...'}
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 inline mr-2" />
            Dissect Selected
          </>
        )}
      </button>
      
      {showOptions && (
        <div className="absolute top-full mt-2 left-0 bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-xl z-50 w-80">
          <h4 className="text-white font-medium mb-3">Dissection Options</h4>
          
          {/* Object Description */}
          <div className="mb-3">
            <label className="text-slate-300 text-sm mb-1 block">
              Object Description (optional)
            </label>
            <input
              type="text"
              value={objectDescription}
              onChange={(e) => setObjectDescription(e.target.value)}
              maxLength={200}
              placeholder="e.g., 'paper crane', 'clay pot'"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm"
            />
          </div>
          
          {/* Context Padding Slider */}
          <div className="mb-4">
            <label className="text-slate-300 text-sm mb-1 block">
              Context Padding: {paddingPercent}%
            </label>
            <input
              type="range"
              min="0"
              max="50"
              value={paddingPercent}
              onChange={(e) => setPaddingPercent(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-slate-400 text-xs mt-1">
              Adds extra area around selection to capture small parts
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleDissect}
              className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium"
            >
              Start Dissection
            </button>
            <button
              onClick={() => setShowOptions(false)}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
```


#### BoundingBoxPreview Component

Visual preview of the region that will be sent to the AI.

```typescript
interface BoundingBoxPreviewProps {
  imageElement: HTMLImageElement;
  region: PaddedRegion;
  visible: boolean;
}

const BoundingBoxPreview: React.FC<BoundingBoxPreviewProps> = ({
  imageElement,
  region,
  visible,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!visible || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw dashed rectangle for padded region
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)'; // Amber color
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(region.x, region.y, region.width, region.height);
    
    // Draw solid rectangle for original bounding box
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)'; // Emerald color
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(
      region.originalBox.x,
      region.originalBox.y,
      region.originalBox.width,
      region.originalBox.height
    );
    
    // Add labels
    ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
    ctx.font = '12px sans-serif';
    ctx.fillText('AI will see this area', region.x + 5, region.y - 5);
    
  }, [visible, region]);
  
  if (!visible) return null;
  
  return (
    <canvas
      ref={canvasRef}
      width={imageElement.width}
      height={imageElement.height}
      className="absolute inset-0 pointer-events-none"
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  );
};
```

### 5. Updated Node Components

Integrate the dissection button into existing image nodes.

```typescript
// Update MasterNode
export const MasterNode = memo(({ data, id }: NodeProps<any>) => {
  const { currentSelection } = useSelectionMode();
  const { label, imageUrl, category, isDissecting, isDissected } = data as MasterNodeData;
  
  const hasSelection = currentSelection?.nodeId === id && currentSelection?.mask;
  
  return (
    <div className="bg-slate-800 rounded-lg border-2 border-slate-700 p-4 min-w-[320px]">
      <h3 className="text-white font-semibold mb-2">{label}</h3>
      
      <SegmentableImage
        imageUrl={imageUrl}
        alt={label}
        width={280}
        height={280}
        selectionEnabled={true}
        onSegmentationChange={(mask) => {
          // Handle segmentation
        }}
      />
      
      <div className="mt-3 flex gap-2">
        {/* Standard dissect button */}
        <button
          onClick={onDissect}
          disabled={isDissecting || isDissected}
          className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
        >
          {isDissecting ? 'Dissecting...' : 'Dissect All'}
        </button>
        
        {/* Object-focused dissect button */}
        {hasSelection && (
          <DissectSelectedButton
            nodeId={id}
            imageUrl={imageUrl}
            segmentationMask={currentSelection.mask}
            category={category}
            onDissect={() => {}}
          />
        )}
      </div>
    </div>
  );
});
```

## Data Models

### ObjectDissectionState

```typescript
interface ObjectDissectionState {
  isProcessing: boolean;
  currentObject?: {
    nodeId: string;
    description?: string;
    region: PaddedRegion;
    timestamp: number;
  };
  error?: string;
  progress?: string;
  history: Array<{
    nodeId: string;
    description?: string;
    timestamp: number;
    resultNodeIds: string[]; // IDs of created materials/step nodes
  }>;
}
```

### CroppedImageData

```typescript
interface CroppedImageData {
  dataUrl: string;           // Base64 data URL
  region: PaddedRegion;      // Region information
  originalDimensions: {
    width: number;
    height: number;
  };
  metadata: {
    croppedAt: number;       // Timestamp
    category: string;
    objectDescription?: string;
  };
}
```

## Error Handling

### Validation Errors

```typescript
enum ObjectDissectionErrorCode {
  NO_SELECTION = 'NO_SELECTION',
  SELECTION_TOO_SMALL = 'SELECTION_TOO_SMALL',
  SELECTION_TOO_LARGE = 'SELECTION_TOO_LARGE',
  IMAGE_LOAD_FAILED = 'IMAGE_LOAD_FAILED',
  CROP_FAILED = 'CROP_FAILED',
  AI_REQUEST_FAILED = 'AI_REQUEST_FAILED',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
}

class ObjectDissectionError extends Error {
  constructor(
    message: string,
    public code: ObjectDissectionErrorCode,
    public recoverable: boolean
  ) {
    super(message);
  }
}
```

### Error Messages

```typescript
const ERROR_MESSAGES = {
  [ObjectDissectionErrorCode.NO_SELECTION]: 
    'Please select an object first using the Magic Select tool',
  [ObjectDissectionErrorCode.SELECTION_TOO_SMALL]: 
    'Selection may be too small for detailed instructions. Try selecting a larger area.',
  [ObjectDissectionErrorCode.SELECTION_TOO_LARGE]: 
    'Selection covers most of the image. Consider using standard dissection instead.',
  [ObjectDissectionErrorCode.IMAGE_LOAD_FAILED]: 
    'Failed to load image. Please try again.',
  [ObjectDissectionErrorCode.CROP_FAILED]: 
    'Failed to process selected region. Please try again.',
  [ObjectDissectionErrorCode.AI_REQUEST_FAILED]: 
    'AI analysis failed. Please check your connection and try again.',
  [ObjectDissectionErrorCode.INVALID_RESPONSE]: 
    'AI returned unexpected results. Please try again or adjust your selection.',
};
```

### Retry Strategy

```typescript
async function dissectWithRetry(
  params: ObjectDissectionRequest,
  maxRetries: number = 2
): Promise<DissectionResult> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await dissectSelectedObject(params);
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry validation errors
      if (error instanceof ObjectDissectionError && !error.recoverable) {
        throw error;
      }
      
      // Exponential backoff
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError!;
}
```


## Testing Strategy

### Unit Tests

1. **ObjectDissectionService**
   - Test bounding box calculation with various mask shapes
   - Test context padding with different percentages
   - Test padding clamping at image boundaries
   - Test image cropping accuracy
   - Test selection size validation
   - Test prompt generation with/without object description

2. **AIContext Object Dissection**
   - Test dissectSelectedObject flow
   - Test error handling for invalid selections
   - Test node creation and positioning
   - Test edge creation between nodes
   - Test cancellation handling

3. **UI Components**
   - Test DissectSelectedButton state management
   - Test options panel interactions
   - Test BoundingBoxPreview rendering
   - Test validation messages

### Integration Tests

1. **End-to-End Object Dissection**
   - Select object → Click dissect → Verify nodes created
   - Test with various padding percentages
   - Test with object descriptions
   - Test multiple dissections from same image

2. **Error Scenarios**
   - Test dissection without selection
   - Test with too-small selection
   - Test with too-large selection
   - Test AI request failure handling
   - Test invalid AI response handling

3. **Visual Regression**
   - Test bounding box preview rendering
   - Test button states and positioning
   - Test options panel layout

### Performance Tests

1. **Cropping Performance**
   - Measure time to crop various image sizes
   - Target: < 500ms for images up to 2048x2048

2. **Bounding Box Calculation**
   - Measure time to calculate box from various mask sizes
   - Target: < 100ms for typical masks

3. **Memory Usage**
   - Monitor memory during multiple dissections
   - Verify cropped images are garbage collected

## Security Considerations

### Input Validation

```typescript
function validateObjectDissectionInput(params: ObjectDissectionRequest): void {
  // Validate mask
  if (!params.segmentationMask || !params.segmentationMask.data) {
    throw new ObjectDissectionError(
      'Invalid segmentation mask',
      ObjectDissectionErrorCode.NO_SELECTION,
      false
    );
  }
  
  // Validate image dimensions
  if (
    params.imageElement.width > 4096 ||
    params.imageElement.height > 4096
  ) {
    throw new ObjectDissectionError(
      'Image too large',
      ObjectDissectionErrorCode.IMAGE_LOAD_FAILED,
      false
    );
  }
  
  // Validate padding
  if (
    params.paddingPercent !== undefined &&
    (params.paddingPercent < 0 || params.paddingPercent > 50)
  ) {
    throw new ObjectDissectionError(
      'Invalid padding percentage',
      ObjectDissectionErrorCode.CROP_FAILED,
      false
    );
  }
  
  // Sanitize object description
  if (params.objectDescription) {
    params.objectDescription = sanitizeText(params.objectDescription, 200);
  }
  
  // Validate category
  const validCategories = [
    'papercraft', 'clay', 'fabric', 'costume',
    'woodcraft', 'jewelry', 'kids', 'tabletop'
  ];
  
  if (params.category && !validCategories.includes(params.category)) {
    params.category = 'general';
  }
}
```

### Data URL Security

```typescript
function validateCroppedImage(dataUrl: string): boolean {
  // Verify it's a valid data URL
  if (!dataUrl.startsWith('data:image/')) {
    return false;
  }
  
  // Check size (max 10MB for cropped images)
  const base64Length = dataUrl.split(',')[1]?.length || 0;
  const sizeInBytes = (base64Length * 3) / 4;
  
  if (sizeInBytes > 10 * 1024 * 1024) {
    return false;
  }
  
  return true;
}
```

## UI/UX Design

### Visual Hierarchy

1. **Selection State**:
   - Emerald highlight (40% opacity) for segmentation mask
   - Amber dashed border for AI analysis region
   - Emerald solid border for original bounding box

2. **Button States**:
   - Enabled: Emerald background with Sparkles icon
   - Disabled: Gray with 50% opacity
   - Processing: Spinner with progress text
   - Hover: Darker emerald with preview outline

3. **Options Panel**:
   - Dark slate background with border
   - Positioned below button
   - Smooth fade-in animation
   - Clear visual separation from canvas

### User Feedback

```typescript
// Progress messages during dissection
const PROGRESS_MESSAGES = {
  VALIDATING: 'Validating selection...',
  CROPPING: 'Preparing image region...',
  ANALYZING: 'Analyzing selected object...',
  GENERATING_STEPS: 'Generating step images...',
  CREATING_NODES: 'Creating instruction nodes...',
  COMPLETE: 'Dissection complete!',
};

// Update progress in real-time
dispatch({
  type: 'OBJECT_DISSECTION_PROGRESS',
  payload: PROGRESS_MESSAGES.ANALYZING,
});
```

### Keyboard Shortcuts

- **Ctrl/Cmd + D**: Dissect selected object (when selection active)
- **Ctrl/Cmd + Shift + D**: Show dissection options
- **ESC**: Close options panel

## Performance Optimizations

### 1. Canvas Reuse

```typescript
// Reuse canvas for multiple crops
class CanvasPool {
  private static canvas: HTMLCanvasElement | null = null;
  
  static getCanvas(): HTMLCanvasElement {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
    }
    return this.canvas;
  }
  
  static releaseCanvas(): void {
    if (this.canvas) {
      const ctx = this.canvas.getContext('2d');
      ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}
```

### 2. Lazy Bounding Box Calculation

```typescript
// Cache bounding box with mask
interface CachedMask extends SegmentationMask {
  _boundingBox?: BoundingBox;
}

function getBoundingBox(mask: CachedMask): BoundingBox {
  if (!mask._boundingBox) {
    mask._boundingBox = ObjectDissectionService.calculateBoundingBox(mask);
  }
  return mask._boundingBox;
}
```

### 3. Debounced Preview Updates

```typescript
// Debounce padding slider updates
const [paddingPercent, setPaddingPercent] = useState(20);
const [debouncedPadding, setDebouncedPadding] = useState(20);

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedPadding(paddingPercent);
  }, 300);
  
  return () => clearTimeout(timer);
}, [paddingPercent]);

// Use debouncedPadding for preview rendering
```

## Future Enhancements

1. **Smart Padding**:
   - Automatically detect optimal padding based on object shape
   - Use edge detection to find natural boundaries

2. **Multi-Object Batch Dissection**:
   - Select multiple objects at once
   - Generate instructions for all in parallel

3. **Object Comparison**:
   - Compare instructions for similar objects
   - Suggest material reuse across objects

4. **Selection Refinement**:
   - Allow manual adjustment of bounding box
   - Brush tool to add/remove areas from selection

5. **Template Matching**:
   - Detect similar objects in other images
   - Auto-apply successful dissection patterns

## Migration Strategy

### Phase 1: Core Service (Week 1)
- Implement ObjectDissectionService
- Add bounding box calculation and cropping
- Unit tests for service methods

### Phase 2: AI Integration (Week 1)
- Enhance GeminiService with object prompts
- Update AIContext with dissectSelectedObject
- Integration tests for AI flow

### Phase 3: UI Components (Week 2)
- Create DissectSelectedButton component
- Create BoundingBoxPreview component
- Update node components
- UI/UX polish

### Phase 4: Testing & Release (Week 2)
- End-to-end testing
- Performance optimization
- Security audit
- Documentation
- Production deployment

## Dependencies

No new external dependencies required. Uses existing:
- React and React Flow
- MediaPipe (already integrated)
- Gemini API (already integrated)
- Existing utility functions (sanitization, validation)

## Backward Compatibility

- Standard dissection (without selection) remains unchanged
- New object dissection is additive feature
- No breaking changes to existing APIs
- Feature can be disabled via feature flag if needed

