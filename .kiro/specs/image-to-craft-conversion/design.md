# Design Document: Image-to-Craft Conversion

## Overview

This feature extends the existing image upload functionality to enable users to convert uploaded images into craft projects. When a user uploads an image to the canvas, they can select it and choose a craft style from a contextual popup menu. The system will then use Gemini's multimodal image generation API to transform the uploaded image into a studio-quality craft reference image in the selected style, which can then be dissected into step-by-step instructions using the existing dissection workflow.

## Architecture

### High-Level Flow

```
User uploads image → ImageNode created on canvas
    ↓
User clicks ImageNode → Node becomes selected
    ↓
CraftStyleMenu appears below ImageNode
    ↓
User selects craft category → Category highlighted
    ↓
User clicks "Turn Image into Craft" → API call to Gemini
    ↓
MasterNode created with generated craft image
    ↓
User can dissect using existing workflow
```

### Component Architecture

```
CanvasWorkspace (Parent)
    ├── ImageNode (existing, enhanced with selection state)
    ├── CraftStyleMenu (new component)
    └── MasterNode (existing, receives generated image)
```

## Components and Interfaces

### 1. CraftStyleMenu Component (NEW)

**Location**: `components/CraftStyleMenu.tsx`

**Purpose**: Display a popup menu below selected ImageNode with craft category options and conversion button.

**Props**:
```typescript
interface CraftStyleMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  selectedCategory: CraftCategory | null;
  onSelectCategory: (category: CraftCategory) => void;
  onConvert: () => void;
  onClose: () => void;
  isConverting: boolean;
}
```

**UI Layout**:
```
┌─────────────────────────────────────┐
│  Craft Style Selection              │
├─────────────────────────────────────┤
│  [Papercraft] [Clay] [Fabric]       │
│  [Costume]    [Wood] [Jewelry]      │
│  [Kids]       [Tabletop]            │
├─────────────────────────────────────┤
│  [Turn Image into Craft →]          │
└─────────────────────────────────────┘
```

**Styling**:
- Dark mode theme matching existing UI (slate-900 background)
- Indigo accent for selected category
- Orange-yellow for primary action button
- Smooth transitions and hover states
- Positioned absolutely using provided x/y coordinates
- Z-index: 50 (above canvas, below modals)

### 2. Enhanced ImageNode (MODIFIED)

**Location**: `components/CustomNodes.tsx`

**Changes Required**:
- Add selection state handling
- Add visual indicator when selected (border glow)
- Pass selection state to parent component
- No changes to existing segmentation functionality

**Updated Data Interface**:
```typescript
interface ImageNodeData {
  imageUrl: string;
  fileName: string;
  width: number;
  height: number;
  isSelected?: boolean; // NEW
  onSelect?: (nodeId: string) => void; // NEW
}
```

### 3. Enhanced CanvasWorkspace (MODIFIED)

**Location**: `pages/CanvasWorkspace.tsx`

**New State Variables**:
```typescript
const [craftStyleMenu, setCraftStyleMenu] = useState<{
  visible: boolean;
  position: { x: number; y: number };
  nodeId: string | null;
  selectedCategory: CraftCategory | null;
}>({
  visible: false,
  position: { x: 0, y: 0 },
  nodeId: null,
  selectedCategory: null,
});

const [isConvertingImage, setIsConvertingImage] = useState(false);
```

**New Handler Functions**:

1. `handleImageNodeSelect(nodeId: string, element: HTMLElement)`
   - Calculate menu position below the selected image node
   - Show CraftStyleMenu
   - Set selected node ID

2. `handleCraftCategorySelect(category: CraftCategory)`
   - Update selectedCategory in state
   - Keep menu open

3. `handleImageToCraftConvert()`
   - Validate category selection
   - Get image data from selected node
   - Call Gemini API with image + category
   - Create MasterNode with generated image
   - Close menu
   - Switch to select tool

4. `handleCloseCraftStyleMenu()`
   - Hide menu
   - Clear selected node
   - Clear selected category

**Integration Points**:
- Hook into existing node selection mechanism
- Reuse existing `handleGenerate` logic for MasterNode creation
- Leverage existing rate limiting and error handling

## Data Models

### CraftStyleMenuState

```typescript
interface CraftStyleMenuState {
  visible: boolean;
  position: { x: number; y: number };
  nodeId: string | null;
  selectedCategory: CraftCategory | null;
}
```

### ImageToCraftRequest

```typescript
interface ImageToCraftRequest {
  imageBase64: string;
  category: CraftCategory;
}
```

### ImageToCraftResponse

```typescript
interface ImageToCraftResponse {
  craftImageUrl: string; // Base64 data URL
}
```

## API Integration

### New Gemini Service Function

**Location**: `services/geminiService.ts`

**Function**: `generateCraftFromImage`

```typescript
export const generateCraftFromImage = async (
  imageBase64: string,
  category: CraftCategory
): Promise<string> => {
  // Check rate limit
  if (!imageGenerationLimiter.canMakeRequest()) {
    const waitTime = imageGenerationLimiter.getTimeUntilNextRequest();
    const waitSeconds = Math.ceil(waitTime / 1000);
    throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds.`);
  }

  const ai = getAiClient();
  const cleanBase64 = imageBase64.split(',')[1] || imageBase64;

  const prompt = `
    Transform this image into a photorealistic studio photograph of a DIY craft project.
    
    Target Category: ${category}
    
    Style Requirements:
    - Recreate the subject/object from the image as a handmade craft in the ${category} style
    - Neutral background with even studio lighting
    - Highly detailed textures showing craft materials (paper fibers, clay texture, fabric weave, etc.)
    - The object should look tangible, handmade, and finished
    - Match the general form and colors of the original image
    - View: Isometric or front-facing, centered
    
    Material Guidelines by Category:
    - Papercraft: Paper, cardstock, glue, scissors
    - Clay: Polymer clay, sculpting tools
    - Fabric/Sewing: Fabric, thread, stuffing
    - Costume & Props: Foam, thermoplastic, paint
    - Woodcraft: Wood, dowels, joints
    - Jewelry: Beads, wire, metal findings
    - Kids Crafts: Simple materials, bright colors
    - Tabletop Figures: Miniature parts, primer, paint
  `;

  return retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        trackApiUsage('generateCraftFromImage', true);
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    trackApiUsage('generateCraftFromImage', false);
    throw new Error("Failed to generate craft image from uploaded image");
  }).catch((error) => {
    trackApiUsage('generateCraftFromImage', false);
    throw error;
  });
};
```

**Key Differences from Text-Based Generation**:
- Accepts image input instead of text prompt
- Uses multimodal API with both image and text parts
- Prompt focuses on transformation rather than creation
- Maintains same rate limiting and retry logic

## Error Handling

### Validation Errors

1. **No Category Selected**
   - Display inline error message in menu
   - Disable "Turn Image into Craft" button until category selected

2. **Invalid Image Node**
   - Validate node exists and has valid imageUrl
   - Show error toast if validation fails

3. **Rate Limit Exceeded**
   - Display wait time in error message
   - Disable convert button temporarily
   - Show countdown timer

### API Errors

1. **503 Service Overloaded**
   - Use existing retry logic with exponential backoff
   - Show "Retrying..." status in UI

2. **Generation Failed**
   - Display user-friendly error message
   - Provide "Try Again" button
   - Log detailed error for debugging

3. **Network Errors**
   - Show connection error message
   - Suggest checking internet connection

### Error Display Strategy

- Use existing error handling patterns from `geminiService.ts`
- Display errors as toast notifications (non-blocking)
- Keep menu open on error to allow retry
- Clear error state when user changes category or closes menu

## Security Considerations

### Input Validation

1. **Image Data Validation**
   - Reuse existing `validateFile` from `utils/fileUpload.ts`
   - Verify image is already validated before conversion
   - Sanitize imageUrl before API call

2. **Category Validation**
   - Validate category is one of the 8 supported types
   - Use TypeScript enum for type safety

3. **Rate Limiting**
   - Apply same rate limits as text-based generation
   - Track image-to-craft conversions separately in rate limiter
   - Prevent abuse through client-side throttling

### Data Sanitization

1. **Image URL Sanitization**
   - Use existing `sanitizeImageUrl` from `utils/security.ts`
   - Validate base64 format before API call

2. **Generated Image Validation**
   - Validate response contains valid base64 image data
   - Check image size doesn't exceed limits
   - Sanitize before storing in node data

## Testing Strategy

### Unit Tests

**File**: `utils/__tests__/imageToCraft.test.ts`

Test Cases:
1. CraftStyleMenu renders with all 8 categories
2. Category selection updates state correctly
3. Convert button disabled when no category selected
4. Menu closes on outside click
5. Menu positions correctly below image node

### Integration Tests

**File**: `pages/__tests__/CanvasWorkspace.imageToCraft.test.tsx`

Test Cases:
1. Selecting ImageNode shows CraftStyleMenu
2. Selecting category and converting creates MasterNode
3. Rate limiting prevents rapid conversions
4. Error handling displays appropriate messages
5. Menu closes after successful conversion

### API Tests

**File**: `services/__tests__/geminiService.imageToCraft.test.ts`

Test Cases:
1. `generateCraftFromImage` calls Gemini API with correct parameters
2. Retry logic works for 503 errors
3. Rate limiting prevents excessive API calls
4. Invalid image data throws appropriate error
5. Response validation catches malformed responses

### Manual Testing Checklist

- [ ] Upload image to canvas
- [ ] Click image to show menu
- [ ] Select each craft category
- [ ] Convert image to craft
- [ ] Verify generated image matches category style
- [ ] Dissect generated craft image
- [ ] Test with various image types (photos, drawings, etc.)
- [ ] Test rate limiting behavior
- [ ] Test error scenarios (network failure, API error)
- [ ] Test menu positioning at canvas edges
- [ ] Test keyboard shortcuts don't interfere
- [ ] Test in readonly mode (menu should not appear)

## Performance Considerations

### Optimization Strategies

1. **Menu Rendering**
   - Use React.memo for CraftStyleMenu component
   - Lazy load menu only when needed
   - Debounce position calculations

2. **Image Processing**
   - Reuse existing image data (no re-encoding)
   - Compress large images before API call
   - Cache generated craft images in node data

3. **API Calls**
   - Sequential processing (one conversion at a time)
   - Reuse existing rate limiter
   - Cancel pending requests on menu close

4. **State Management**
   - Minimize re-renders with selective state updates
   - Use useCallback for handler functions
   - Batch state updates where possible

### Resource Management

1. **Memory**
   - Clean up menu state on unmount
   - Release image references after conversion
   - Limit number of concurrent conversions

2. **Network**
   - Respect rate limits (same as text generation)
   - Use existing retry logic
   - Cancel requests on component unmount

## Accessibility

### Keyboard Navigation

- Tab through category buttons
- Enter/Space to select category
- Enter to trigger conversion
- Escape to close menu

### Screen Reader Support

- Announce menu opening
- Label all buttons clearly
- Announce category selection
- Announce conversion progress
- Announce errors

### Visual Indicators

- High contrast for selected category
- Loading spinner during conversion
- Clear focus states
- Error messages with icons

## Future Enhancements

### Phase 2 Possibilities

1. **Style Transfer Options**
   - Add intensity slider (subtle to extreme transformation)
   - Preview before conversion
   - Multiple style variations

2. **Batch Conversion**
   - Convert multiple images at once
   - Queue management
   - Progress tracking

3. **Custom Prompts**
   - Allow users to add text description alongside image
   - Combine image + text for better results
   - Save prompt templates

4. **History & Favorites**
   - Save conversion history
   - Favorite craft styles
   - Quick re-convert with different style

## Implementation Notes

### Development Order

1. Create CraftStyleMenu component (UI only)
2. Add selection state to ImageNode
3. Implement menu positioning logic
4. Add state management to CanvasWorkspace
5. Implement `generateCraftFromImage` API function
6. Wire up conversion handler
7. Add error handling
8. Add loading states
9. Write tests
10. Polish UI/UX

### Dependencies

- No new external dependencies required
- Leverages existing Gemini SDK
- Uses existing utility functions
- Follows existing patterns

### Backward Compatibility

- No breaking changes to existing features
- ImageNode remains fully functional without selection
- Existing image upload workflow unchanged
- Existing dissection workflow unchanged

## Design Decisions & Rationale

### Why Popup Menu Instead of Toolbar?

- Contextual: Appears only when relevant (image selected)
- Spatial: Close to the image being converted
- Clean: Doesn't clutter the toolbar
- Familiar: Similar to existing context menu pattern

### Why Separate API Function?

- Clear separation of concerns
- Different prompt engineering requirements
- Easier to test and maintain
- Allows for future customization

### Why Reuse MasterNode?

- Consistent user experience
- Leverages existing dissection workflow
- No need to duplicate functionality
- Reduces code complexity

### Why Client-Side Rate Limiting?

- MVP phase (no backend yet)
- Consistent with existing approach
- Prevents accidental abuse
- Easy to migrate to server-side later
