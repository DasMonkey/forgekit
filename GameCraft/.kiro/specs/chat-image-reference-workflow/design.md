# Design Document

## Overview

The Chat Image Reference Workflow feature enables users to attach images to chat prompts for AI-referenced generation. This transforms the animation workflow from preset actions to a flexible, conversational system where users can iterate on game assets by providing visual references. The feature integrates seamlessly with the existing ChatInterface, node menus, and Gemini API service layer.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CanvasWorkspace                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  React Flow Canvas                                      │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │ │
│  │  │MasterNode│  │ImageNode │  │ImageNode │            │ │
│  │  │  [Menu]  │  │  [Menu]  │  │  [Menu]  │            │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘            │ │
│  │       │             │              │                    │ │
│  │       └─────────────┴──────────────┘                    │ │
│  │                     │                                    │ │
│  │              "Add to Chat" clicks                       │ │
│  └─────────────────────┼────────────────────────────────────┘ │
│                        │                                      │
│                        ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ChatInterface (via ref)                                 │ │
│  │  - addReferenceImage(image)                             │ │
│  │  - setPromptText(text)                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  ChatInterface Component                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Reference Images Preview Row                             ││
│  │ [🖼️ img1.png ✕] [🖼️ img2.png ✕]                        ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [+] [Category ▾] [___prompt___] [Send]                  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼ (on submit)
┌─────────────────────────────────────────────────────────────┐
│              geminiService.ts                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ if (referenceImages.length > 0)                          ││
│  │   → generateWithImageReferences()                        ││
│  │ else                                                     ││
│  │   → generateCraftImage()                                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Gemini 3 Pro API                            │
│  - Multimodal input (images + text)                         │
│  - Category-specific style rules                            │
│  - Returns base64 image                                     │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. **User adds reference image** (two paths):
   - Path A: Click "+" button → File picker → Upload files
   - Path B: Click "Add to Chat" on node menu → Image added via ref

2. **ChatInterface manages state**:
   - Stores reference images in local state array
   - Displays thumbnails above input bar
   - Handles remove operations

3. **User submits prompt**:
   - ChatInterface validates prompt
   - Creates placeholder MasterNode
   - Calls appropriate generation function based on reference images
   - Clears reference images on success

4. **Generation completes**:
   - Updates placeholder node with generated image
   - Or removes placeholder on error

## Components and Interfaces

### ChatInterface Component

**Existing State** (already implemented):
```typescript
const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
```

**Existing Ref Interface** (already implemented):
```typescript
export interface ChatInterfaceRef {
  addReferenceImage: (image: ReferenceImage) => void;
  setPromptText: (text: string) => void;
}
```

**Reference Image Type** (already implemented):
```typescript
export interface ReferenceImage {
  url: string;        // base64 data URL
  fileName: string;   // display name
  nodeId?: string;    // optional node ID if from canvas
}
```

**Key Methods**:
- `handleFileSelect(e: React.ChangeEvent<HTMLInputElement>)` - Already implemented
- `removeReferenceImage(index: number)` - Already implemented
- `handleSubmit(e: React.FormEvent)` - Already implemented with reference image support

### MasterNodeActionsMenu Component

**New Props**:
```typescript
interface MasterNodeActionsMenuProps {
  // ... existing props
  onAddToChat: () => void;  // NEW
}
```

**UI Changes**:
- Add "Add to Chat" button as first action
- Position: Before "Animations" button
- Icon: `MessageSquarePlus` from lucide-react
- Label: "Add to Chat"
- Tooltip: "Add to chat as reference"

### ImageNodeUnifiedMenu Component

**New Props**:
```typescript
interface ImageNodeUnifiedMenuProps {
  // ... existing props
  onAddToChat: () => void;  // NEW
}
```

**UI Changes**:
- Add "Add to Chat" button as first action
- Position: Before "Download" button
- Icon: `MessageSquarePlus` from lucide-react
- Label: "Add to Chat"
- Tooltip: "Add to chat as reference"

### CanvasWorkspace Integration

**New Handler**:
```typescript
const handleAddToChat = (nodeId: string) => {
  // 1. Find node by ID
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return;

  // 2. Extract image URL from node data
  const imageUrl = node.data.imageUrl;
  if (!imageUrl) return;

  // 3. Create ReferenceImage object
  const referenceImage: ReferenceImage = {
    url: imageUrl,
    fileName: node.data.label || 'Canvas Image',
    nodeId: nodeId
  };

  // 4. Call ChatInterface ref method
  if (chatInterfaceRef.current) {
    chatInterfaceRef.current.addReferenceImage(referenceImage);
  }
};
```

**Pass to Menus**:
```typescript
<MasterNodeActionsMenu
  // ... existing props
  onAddToChat={() => handleAddToChat(selectedNodeId)}
/>

<ImageNodeUnifiedMenu
  // ... existing props
  onAddToChat={() => handleAddToChat(selectedNodeId)}
/>
```

## Data Models

### ReferenceImage Model

```typescript
export interface ReferenceImage {
  url: string;        // base64 data URL (e.g., "data:image/png;base64,...")
  fileName: string;   // display name for UI
  nodeId?: string;    // optional canvas node ID for tracking source
}
```

**Usage**:
- Stored in ChatInterface state array
- Passed to `generateWithImageReferences` as URL array
- Displayed as thumbnails in UI
- Cleared after successful generation

### Generation Request Flow

```typescript
// Single reference image
generateWithImageReferences(
  prompt: "Create a jumping pose",
  category: CraftCategory.PIXEL_ART,
  referenceImageUrls: ["data:image/png;base64,..."],
  pixelSize: 32
)

// Multiple reference images
generateWithImageReferences(
  prompt: "Combine these character styles",
  category: CraftCategory.AAA,
  referenceImageUrls: [
    "data:image/png;base64,...",
    "data:image/png;base64,...",
    "data:image/png;base64,..."
  ],
  pixelSize: undefined
)
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Reference image attachment preserves image data

*For any* valid image file selected through the file picker, the system should successfully convert it to a base64 data URL and add it to the reference images array without data loss.

**Validates: Requirements 1.1, 1.2**

### Property 2: Duplicate reference images are rejected

*For any* reference image already in the reference array, attempting to add the same image (by URL comparison) should result in no change to the reference array.

**Validates: Requirements 3.3**

### Property 3: Reference image removal maintains array integrity

*For any* reference image at index N in an array of length L, removing that image should result in an array of length L-1 with all other images preserved in their relative order.

**Validates: Requirements 2.1**

### Property 4: Generation with references uses correct API function

*For any* prompt submission, if the reference images array length is greater than zero, the system should call `generateWithImageReferences`, otherwise it should call `generateCraftImage`.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 5: Reference images clear after successful generation

*For any* successful image generation with reference images, the reference images array should be empty after the generation completes.

**Validates: Requirements 2.3**

### Property 6: Reference images persist after generation failure

*For any* failed image generation with reference images, the reference images array should remain unchanged to allow retry.

**Validates: Requirements 2.4**

### Property 7: Multimodal prompt construction matches reference count

*For any* call to `generateWithImageReferences` with N reference images, the Gemini API request should contain exactly N inline image data parts followed by one text part.

**Validates: Requirements 5.3**

### Property 8: Prompt description reflects reference count

*For any* call to `generateWithImageReferences`, if N equals 1, the prompt should contain "Use this reference image", otherwise it should contain "Use these N reference images".

**Validates: Requirements 5.1, 5.2**

### Property 9: Category-specific style rules are preserved

*For any* generation with reference images and category C, the generated prompt should include the same style rules as a standard generation with category C.

**Validates: Requirements 5.4**

### Property 10: Placeholder node lifecycle matches generation state

*For any* generation request, a placeholder node should be created before API call, updated with image on success, or removed on failure.

**Validates: Requirements 6.1, 6.3, 6.4**

### Property 11: Chat interface visual state reflects reference presence

*For any* chat interface state, if reference images array length is greater than zero, the input bar should display an indigo ring border and the placeholder text should mention "based on the reference".

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 12: Add to Chat button availability matches node state

*For any* node menu, if the node is currently being converted or snapped, the "Add to Chat" button should be disabled.

**Validates: Requirements 7.5**

## Error Handling

### File Upload Errors

**Scenario**: User selects invalid file type or corrupted image

**Handling**:
```typescript
try {
  const { dataUrl, fileName } = await handleFileUpload(file);
  setReferenceImages(prev => [...prev, { url: dataUrl, fileName }]);
} catch (error) {
  console.error('File upload error:', error);
  alert(error instanceof Error ? error.message : 'Failed to upload file');
}
```

**User Feedback**: Alert dialog with error message

### Rate Limit Errors

**Scenario**: User exceeds Gemini API rate limits

**Handling**:
```typescript
if (!imageGenerationLimiter.canMakeRequest()) {
  const waitTime = imageGenerationLimiter.getTimeUntilNextRequest();
  const waitSeconds = Math.ceil(waitTime / 1000);
  throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds...`);
}
```

**User Feedback**: Alert with specific wait time

### Generation Errors

**Scenario**: Gemini API fails to generate image

**Handling**:
```typescript
try {
  imageUrl = await generateWithImageReferences(...);
  onGenerationComplete(nodeId, imageUrl);
} catch (error) {
  console.error("Generation failed:", error);
  if (onGenerationError) {
    onGenerationError(nodeId);  // Removes placeholder
  }
  alert("Failed to generate craft. Please check your connection and try again.");
}
```

**User Feedback**: 
- Alert dialog with error message
- Placeholder node removed from canvas
- Reference images preserved for retry

### Duplicate Image Detection

**Scenario**: User attempts to add same image twice

**Handling**:
```typescript
const isAlreadyAttached = referenceImages.some(img => img.url === image.url);
if (isAlreadyAttached) {
  // Skip silently or show toast
  return;
}
```

**User Feedback**: Silent skip (could be enhanced with toast notification)

### Missing Node Data

**Scenario**: "Add to Chat" clicked but node has no image

**Handling**:
```typescript
const imageUrl = node.data.imageUrl;
if (!imageUrl) {
  console.warn('Node has no image URL');
  return;
}
```

**User Feedback**: Silent fail with console warning

## Testing Strategy

### Unit Testing

**ChatInterface Component**:
- Test `addReferenceImage` adds image to array
- Test `addReferenceImage` rejects duplicates
- Test `removeReferenceImage` removes correct image
- Test `handleSubmit` clears images on success
- Test `handleSubmit` preserves images on failure
- Test `handleFileSelect` processes valid files
- Test `handleFileSelect` handles invalid files

**CanvasWorkspace Integration**:
- Test `handleAddToChat` finds correct node
- Test `handleAddToChat` extracts image URL
- Test `handleAddToChat` calls ChatInterface ref
- Test `handleAddToChat` handles missing node
- Test `handleAddToChat` handles missing image URL

**Menu Components**:
- Test "Add to Chat" button renders
- Test "Add to Chat" button calls callback
- Test "Add to Chat" button disabled state
- Test button positioning in menu

### Property-Based Testing

**Property 1: Reference array operations**
- Generate random arrays of reference images
- Test add/remove operations maintain array integrity
- Verify no data corruption during operations

**Property 2: Generation function selection**
- Generate random reference array lengths (0 to 10)
- Verify correct function called based on array length
- Test with various categories and pixel sizes

**Property 3: Prompt construction**
- Generate random reference counts (1 to 5)
- Verify prompt description matches count
- Verify all images included in API request

**Property 4: UI state consistency**
- Generate random reference arrays
- Verify UI reflects correct state (border, placeholder, thumbnails)
- Test state transitions during generation

### Integration Testing

**End-to-End Flow**:
1. Upload reference image via file picker
2. Verify thumbnail appears
3. Enter prompt and submit
4. Verify correct API function called
5. Verify placeholder node created
6. Verify node updated with generated image
7. Verify reference images cleared

**Canvas Integration**:
1. Create MasterNode on canvas
2. Click "Add to Chat" in menu
3. Verify image added to ChatInterface
4. Submit prompt with reference
5. Verify new node created with generated image

**Error Recovery**:
1. Add reference images
2. Trigger generation error (disconnect network)
3. Verify reference images preserved
4. Retry generation
5. Verify success clears images

### Manual Testing Checklist

- [ ] File picker opens on "+" button click
- [ ] Multiple files can be selected
- [ ] Thumbnails display correctly
- [ ] Hover shows full filename
- [ ] X button removes correct image
- [ ] Horizontal scroll works with many images
- [ ] "Add to Chat" button appears in both menus
- [ ] "Add to Chat" adds image to chat
- [ ] Duplicate images are rejected
- [ ] Chat border shows indigo ring with references
- [ ] Placeholder text changes with references
- [ ] Generation works with single reference
- [ ] Generation works with multiple references
- [ ] Images clear after successful generation
- [ ] Images persist after failed generation
- [ ] Rate limit errors show wait time
- [ ] Invalid files show error message

## Performance Considerations

### Image Data Handling

**Challenge**: Base64 images can be large (1-2MB each)

**Optimization**:
- Store only URLs in state (already base64, no re-encoding)
- Clear images immediately after submission
- Limit to reasonable number of references (no hard limit, but UI scrolls)

### API Request Size

**Challenge**: Multiple reference images increase request size

**Mitigation**:
- Gemini API supports multimodal input efficiently
- Images already compressed as PNG
- Rate limiter prevents excessive requests

### UI Responsiveness

**Challenge**: Rendering multiple thumbnails

**Optimization**:
- Use CSS `object-fit: cover` for consistent sizing
- Horizontal scroll prevents layout shift
- Thumbnails are small (40x40px or 48x48px)

### Memory Management

**Challenge**: Holding multiple base64 images in memory

**Mitigation**:
- Images cleared after generation
- No persistent storage of reference images
- Browser handles base64 data URL memory

## Future Enhancements

### Drag and Drop

Allow users to drag images from desktop directly onto chat interface:
```typescript
const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files);
  // Process files same as file picker
};
```

### Reference Image Reordering

Allow users to reorder reference images to control priority:
- Add drag handles to thumbnails
- Use react-beautiful-dnd or similar library
- Update array order on drag end

### Reference Image Annotations

Allow users to add text annotations to reference images:
```typescript
interface ReferenceImage {
  url: string;
  fileName: string;
  nodeId?: string;
  annotation?: string;  // NEW: "Use this color palette", "Match this pose"
}
```

### Persistent Reference Library

Save frequently used reference images for quick access:
- Store in localStorage or IndexedDB
- Show library panel above chat
- Quick-add from library

### Reference Image Comparison View

Show reference images side-by-side with generated result:
- Split view in canvas
- Overlay mode for comparison
- Difference highlighting

### Batch Generation with References

Generate multiple variations from same references:
- "Generate 4 variations" button
- Creates multiple nodes at once
- Useful for exploring options

### Reference Image Cropping

Allow users to crop reference images before adding:
- Show crop modal on file select
- Focus on specific parts of image
- Reduce API request size

### Smart Duplicate Detection

Detect similar (not just identical) images:
- Use perceptual hashing
- Warn about very similar references
- Suggest removing duplicates

## Implementation Notes

### Existing Code Leverage

The following features are **already implemented** in the codebase:

1. **ChatInterface reference image support**:
   - `referenceImages` state exists
   - `ReferenceImage` interface defined
   - `addReferenceImage` ref method implemented
   - `setPromptText` ref method implemented
   - File upload handling exists
   - Thumbnail preview UI exists
   - Remove functionality exists
   - Submit logic handles references

2. **geminiService.ts multimodal support**:
   - `generateWithImageReferences` function exists
   - Handles single and multiple references
   - Constructs proper multimodal prompts
   - Includes category-specific style rules
   - Rate limiting integrated

3. **Menu components structure**:
   - Both menus already have "Add to Chat" buttons
   - `onAddToChat` props exist
   - Icons and styling in place

### What Needs Implementation

The **primary work** is in **CanvasWorkspace.tsx**:

1. Create `chatInterfaceRef` using `useRef<ChatInterfaceRef>(null)`
2. Pass ref to ChatInterface component
3. Implement `handleAddToChat` function
4. Wire up menu callbacks to `handleAddToChat`

**Estimated effort**: 50-100 lines of code in CanvasWorkspace.tsx

### Code Locations

**Files to modify**:
- `GameCraft/pages/CanvasWorkspace.tsx` - Add ref and handler (PRIMARY)
- No changes needed to ChatInterface.tsx (already complete)
- No changes needed to geminiService.ts (already complete)
- No changes needed to menu components (already complete)

**Files to review**:
- `GameCraft/utils/fileUpload.ts` - Understand file handling
- `GameCraft/utils/validation.ts` - Understand prompt validation
- `GameCraft/utils/rateLimiter.ts` - Understand rate limiting

### Testing Priorities

1. **High Priority**:
   - CanvasWorkspace ref integration
   - "Add to Chat" button functionality
   - Generation with references end-to-end

2. **Medium Priority**:
   - Duplicate detection
   - Error handling
   - UI state consistency

3. **Low Priority**:
   - Performance with many images
   - Edge cases (missing data, etc.)
   - Visual polish

## Deployment Considerations

### No Breaking Changes

This feature is **additive only**:
- Existing generation flow unchanged
- No database schema changes
- No API contract changes
- Backward compatible

### Feature Flags

Consider adding feature flag for gradual rollout:
```typescript
const ENABLE_REFERENCE_IMAGES = process.env.ENABLE_REFERENCE_IMAGES === 'true';
```

### Monitoring

Track usage metrics:
- Number of generations with references
- Average reference count per generation
- Success rate with vs without references
- Most common reference sources (file vs canvas)

### Documentation

Update user-facing documentation:
- Add tutorial for reference image workflow
- Show example use cases
- Explain best practices
- Document limitations (file types, sizes)
