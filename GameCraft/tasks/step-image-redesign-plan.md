# Step Image Generation Redesign Plan
**Date:** 2024-11-24
**Status:** Planning Phase

## Overview
Redesign the step image generation system to create professional composite instruction images that combine 4 steps into a single image, reducing API costs while maintaining high-quality photorealistic aesthetics with clear arrows and text annotations.

### Design Decision Summary

**Original Plan**: Two-section composite (retro diagrams top + photos bottom)
**After Testing**: Single-style composite with photorealistic images + instructional overlays

**Why This Approach**:
- ✅ **Cost Efficient**: 4 steps in one image = 75% fewer API calls
- ✅ **High Quality**: Maintains photorealistic aesthetic you like
- ✅ **Clear Instructions**: Arrows and text labels guide assembly
- ✅ **Professional**: Similar to IKEA, woodworking magazines, maker guides
- ✅ **Flexible**: Works across all 8 craft categories
- ✅ **Printable**: Single image can be printed as reference sheet

## Current Issues

1. **Generic Step Images**: Each step generates a separate, generic image
2. **Character/Object Confusion**: Multiple characters/objects get mixed up in the same step
3. **Missing Cut-Out Templates**: No printable template images for cutting out parts
4. **Object Repetition**: Same parts appearing multiple times (e.g., Princess Peach hair duplicated)
5. **Redundant Final Step**: "Touches and arrangement" step duplicates the hero image

## Proposed Solution

### Design Choice: Single Composite Image Style

Based on testing, we're adopting a **single-style composite image** approach that combines the cost-efficiency of grouping with high-quality photorealistic aesthetics:

#### **Composite Step Image (Full 16:9 format)**
- **Layout**: 4 steps arranged in 2x2 grid
- **Style**: Photorealistic craft photography with clear instructional overlays
- **Each Step Panel Contains**:
  - Large, bold numbered circle (①②③④) in top-left corner
  - Clear title text below number (e.g., "Materials & Tools", "Base Assembly")
  - Photorealistic image showing exact parts/assembly for that step
  - **Arrows with labels** showing assembly direction and connections
  - **Text annotations** pointing to important parts (e.g., "Hand crank", "Central gearbox")
  - Clean white or neutral background
  - High detail showing textures, materials, grain

#### **Visual Elements Per Step**:
- Numbered circles: Large, bold, contrasting color (black on white or white on dark)
- Step titles: Bold sans-serif font, easily readable
- **Directional arrows**: Thick, clear arrows showing "attach here", "connect to", "glue tab"
- **Part labels**: Small text with leader lines pointing to specific components
- **Action indicators**: Curved arrows for rotation, straight arrows for insertion/connection
- Consistent lighting and perspective across all 4 panels

#### **Critical Rules**:
- Keep each character/object separated - no mixing in same panel
- Show ONLY parts needed for that specific step
- Maintain visual consistency with reference image
- Use arrows and text to clarify assembly sequence
- Keep background clean and uncluttered

### 2. Cut-Out Template Images

Separate printable template sheets for each character/object:

**Features**:
- All parts laid out flat in organized grid
- Black outlines (2-3px thick) on white background
- Solid lines for cutting edges
- Dashed lines for fold marks
- Gray shading for glue tabs
- Clear labels for each part
- Retro border design with title header
- "CUT OUT" instructions
- Printer-friendly vector-style output

## Implementation Plan

### Phase 1: Update Type Definitions

**File**: `types.ts`

```typescript
interface Project {
  // ... existing fields
  compositeStepImages: Map<number, string>; // groupNumber -> imageUrl
  cutoutTemplates: Map<string, string>; // objectName -> imageUrl
}

interface DissectionResponse {
  complexity: string;
  complexityScore: number;
  materials: string[];
  steps: CraftStep[];
  characters?: string[]; // New: List of distinct characters/objects
}
```

### Phase 2: Modify Dissection Function

**File**: `services/geminiService.ts` - Lines 223-302

**Changes to `dissectCraft` prompt**:
```typescript
const prompt = `
  You are an expert maker. Analyze this image of a craft project: "${userPrompt}".

  1. Determine the complexity (Simple, Moderate, Complex) and a score 1-10.
  2. List the essential materials visible or implied.
  3. List all distinct characters/objects that need to be created separately.
  4. Break down the construction into logical, step-by-step instructions.
  5. EXCLUDE the final "touches and arrangement" or "final assembly" step.
  6. Ensure each character/object has dedicated steps that don't mix with others.

  Return strict JSON matching this schema.
`;
```

**Update response schema**:
- Add `characters` array to schema
- Ensure steps clearly indicate which character/object they belong to

### Phase 3: Create Composite Step Image Generator

**File**: `services/geminiService.ts`

**New Function**: `generateCompositeStepImage`

```typescript
export const generateCompositeStepImage = async (
  originalImageBase64: string,
  steps: CraftStep[], // Array of 2-4 steps to combine
  category: CraftCategory,
  groupNumber: number
): Promise<string> => {
  const ai = getAiClient();
  const cleanBase64 = originalImageBase64.split(',')[1] || originalImageBase64;

  // Build step descriptions
  const stepDescriptions = steps.map((step, index) =>
    `${index + 1}. ${step.title}: ${step.description}`
  ).join('\n');

  const prompt = `
REFERENCE IMAGE: This is the finished craft.
TASK: Create a professional composite instruction image for steps ${groupNumber * 4 - 3} to ${groupNumber * 4}.

LAYOUT: 2x2 grid (4 panels total), 16:9 aspect ratio

EACH PANEL MUST CONTAIN:

1. **NUMBER & TITLE** (Top-left corner):
   - Large, bold numbered circle: ① ② ③ ④
   - Step title text below number (e.g., "Materials & Tools", "Base Assembly")
   - High contrast (black text on light background OR white text on dark background)

2. **PHOTOREALISTIC IMAGE**:
   - Studio-quality photography
   - Clean white or light gray background
   - Even, soft lighting with no harsh shadows
   - Shows ONLY parts/materials for THIS specific step
   - High detail: visible textures, grain, material properties
   - Proper perspective (isometric, 3/4 view, or front-facing as appropriate)
   - Match exact colors and textures from reference image

3. **ARROWS & ANNOTATIONS** (CRITICAL - DO NOT SKIP):
   - **Thick, clear arrows** showing:
     * Assembly direction (where parts connect)
     * Movement direction (rotation, insertion)
     * Connection points between components
   - **Arrow styles**:
     * Straight arrows with solid heads for "attach", "connect", "insert"
     * Curved arrows for "rotate", "turn", "flip"
     * Dotted lines for "align with" or "position here"
   - **Arrow colors**: Use high contrast (black, dark gray, or orange/red)

4. **TEXT LABELS** (CRITICAL - DO NOT SKIP):
   - Short, clear labels pointing to key components
   - Examples: "Hand crank", "Central gearbox", "Base", "Connecting rod", "Glue here"
   - Use leader lines (thin lines) connecting text to parts
   - Font: Clean sans-serif, easily readable
   - Label ALL important parts visible in the image

5. **CONSISTENCY**:
   - All 4 panels use same background color/style
   - All 4 panels use same arrow and text styling
   - Maintain same visual quality across panels
   - Keep same color scheme for annotations

STEPS TO ILLUSTRATE:
${stepDescriptions}

CRITICAL RULES:
1. **MUST include arrows and text labels in EVERY panel** - this is essential for instruction clarity
2. Keep each character/object SEPARATE - do NOT mix multiple characters in same panel
3. Show ONLY parts needed for THIS specific step, nothing extra
4. Maintain visual consistency with reference image colors/textures
5. Use clear, instructional photography similar to IKEA assembly guides or craft instruction books
6. Make it look professional and educational, not decorative
7. Category-specific materials: ${category}

${getCategorySpecificRules(category)}

EXAMPLE PANEL LAYOUT:
┌────────────────────────┐
│ ① Materials & Tools    │← Number & Title
│                        │
│   [Photo of parts]     │← Photorealistic image
│    ↓ ← Arrows          │
│   "Base" ← Labels      │← Text annotations
└────────────────────────┘

STYLE REFERENCE: Professional craft instruction photography with clear annotations, similar to fine woodworking magazines or maker guides.
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
          aspectRatio: "16:9",
        }
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Failed to generate composite step image");
  });
};
```

### Phase 4: Create Cut-Out Template Generator

**File**: `services/geminiService.ts`

**New Function**: `generateCutoutTemplate`

```typescript
export const generateCutoutTemplate = async (
  originalImageBase64: string,
  characterName: string,
  category: CraftCategory,
  relevantSteps: CraftStep[]
): Promise<string> => {
  const ai = getAiClient();
  const cleanBase64 = originalImageBase64.split(',')[1] || originalImageBase64;

  // Extract all parts mentioned in relevant steps
  const partsDescription = relevantSteps
    .map(step => step.description)
    .join(' ');

  const prompt = `
REFERENCE IMAGE: This is the finished craft showing: ${characterName}
TASK: Create a printable cut-out template sheet for all parts of "${characterName}"

RETRO CRAFT TEMPLATE STYLE (1970s-1990s):
- Pure white background
- Black outlines (2-3px thick, clean and sharp)
- All parts laid out flat in organized grid
- Each part clearly separated with spacing

LINE STYLES:
- Solid black lines: Cutting edges
- Dashed lines (- - -): Fold lines
- Dotted lines (· · ·): Score lines
- Light gray shading: Glue tabs

LABELS:
- Clear part names (e.g., "Head", "Body", "Arm x2")
- Small numbers indicating assembly order
- Simple annotations for "Fold here", "Glue here"

HEADER DESIGN:
- Retro border around entire template
- Title: "${characterName} - Cut-Out Template"
- Simple instruction: "CUT ALONG SOLID LINES"

LAYOUT:
- Largest parts first (head, body)
- Smaller parts grouped together
- Symmetric parts shown once with "x2" notation
- Efficient use of space for printing

PARTS TO INCLUDE:
Based on the reference image and these construction steps:
${partsDescription}

Extract all visible component parts for ${characterName}:
- Head/face pieces
- Body parts
- Limbs and appendages
- Accessories and details
- Tabs and connectors

CRITICAL RULES:
1. Clean vector-style outlines (NOT photographs)
2. Printer-friendly (black on white only)
3. Show ALL parts needed to construct ${characterName}
4. Include cutting guides and fold marks
5. Must match proportions and shapes from reference image
6. Category: ${category}

OUTPUT: A complete, print-ready template sheet in the style of vintage craft instruction books.
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
          imageSize: "2K", // Higher resolution for printing
        }
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Failed to generate cutout template");
  });
};
```

### Phase 5: Update AIContext

**File**: `contexts/AIContext.tsx`

**Changes**:

1. Update `Project` interface (lines 13-23):
```typescript
interface Project {
  id: string;
  name: string;
  category: CraftCategory;
  prompt: string;
  masterImageUrl: string;
  dissection: DissectionResponse | null;
  stepImages: Map<number, string>; // DEPRECATED - keep for backwards compatibility
  compositeStepImages: Map<number, string>; // groupNumber -> imageUrl
  cutoutTemplates: Map<string, string>; // characterName -> imageUrl
  createdAt: Date;
  lastModified: Date;
}
```

2. Add new action types:
```typescript
type AIAction =
  | { type: 'UPDATE_COMPOSITE_IMAGE'; payload: { groupNumber: number; imageUrl: string } }
  | { type: 'UPDATE_CUTOUT_TEMPLATE'; payload: { characterName: string; imageUrl: string } }
  // ... existing actions
```

3. Update reducer to handle new actions

4. Replace `generateStepImagesAction` (lines 181-210):
```typescript
const generateStepImagesAction = async (projectId: string) => {
  if (!state.currentProject || state.currentProject.id !== projectId) {
    throw new Error('Project not found');
  }

  if (!state.currentProject.dissection) {
    throw new Error('Project must be dissected first');
  }

  const { dissection, masterImageUrl, category } = state.currentProject;
  const steps = dissection.steps;

  // Group steps into sets of 4
  const stepGroups: CraftStep[][] = [];
  for (let i = 0; i < steps.length; i += 4) {
    stepGroups.push(steps.slice(i, Math.min(i + 4, steps.length)));
  }

  // Generate composite images for each group
  for (let i = 0; i < stepGroups.length; i++) {
    try {
      const groupNumber = i + 1;
      const compositeImageUrl = await generateCompositeStepImage(
        masterImageUrl,
        stepGroups[i],
        category,
        groupNumber
      );

      dispatch({
        type: 'UPDATE_COMPOSITE_IMAGE',
        payload: { groupNumber, imageUrl: compositeImageUrl },
      });
    } catch (error) {
      console.error(`Failed to generate composite image for group ${i + 1}:`, error);
    }
  }

  // Generate cutout templates for each character
  if (dissection.characters && dissection.characters.length > 0) {
    for (const character of dissection.characters) {
      try {
        // Get steps relevant to this character
        const relevantSteps = steps.filter(step =>
          step.description.toLowerCase().includes(character.toLowerCase())
        );

        const templateUrl = await generateCutoutTemplate(
          masterImageUrl,
          character,
          category,
          relevantSteps
        );

        dispatch({
          type: 'UPDATE_CUTOUT_TEMPLATE',
          payload: { characterName: character, imageUrl: templateUrl },
        });
      } catch (error) {
        console.error(`Failed to generate cutout template for ${character}:`, error);
      }
    }
  }
};
```

### Phase 6: Update UI Components

**Files to Update**:
- `pages/CanvasWorkspace.tsx` - Display composite images instead of individual step images
- Update dissection display to show grouped steps
- Add cutout template nodes to canvas

## Step Grouping Logic

```typescript
function groupSteps(steps: CraftStep[]): CraftStep[][] {
  const groups: CraftStep[][] = [];

  for (let i = 0; i < steps.length; i += 4) {
    const group = steps.slice(i, Math.min(i + 4, steps.length));
    groups.push(group);
  }

  return groups;
}

// Example:
// 10 steps → Groups: [1-4], [5-8], [9-10]
// 8 steps → Groups: [1-4], [5-8]
// 6 steps → Groups: [1-4], [5-6]
```

## Enhanced Prompt Suggestions

### Key Improvements for Arrow & Text Generation

1. **Be Explicit**: Tell the model "CRITICAL - DO NOT SKIP" for arrows and labels
2. **Provide Examples**: Give specific examples of what text should say
3. **Specify Arrow Types**: Different arrow styles for different actions
4. **Reference Known Styles**: Mention IKEA instructions, woodworking magazines, maker guides
5. **Use High Contrast**: Ensure arrows and text stand out from image

### Alternative Prompt Additions

If generation still lacks arrows/text, try adding:

```
ANNOTATION REQUIREMENTS (MANDATORY):
- Minimum 3-5 text labels per panel pointing to key components
- Minimum 2-3 arrows per panel showing assembly direction
- Use leader lines connecting labels to parts (thin lines ending at component)
- Arrow thickness: 3-4px, with solid filled arrowheads
- Text size: Large enough to read clearly (14-16pt equivalent)
- Text placement: Outside main image area when possible, or on solid background overlay
```

### Testing Iteration Notes

If first generation doesn't include enough annotations:
1. Add "ANNOTATE HEAVILY - Show MORE labels and arrows than seems necessary"
2. Increase specificity: "Label EVERY visible component with its name"
3. Add examples: "Example labels: 'Wooden base (bottom)', 'Metal gear (center)', 'Hand crank (right side)'"
4. Reference specific style: "Style: Technical manual with detailed callouts like automotive repair guides"

## Expected Output Examples

### Composite Step Image (Your Test Image Style)
```
┌───────────────────────────────────────────────────────────────┐
│  ┌──────────────────────┬──────────────────────┐             │
│  │ ① Materials & Tools  │ ② Base & Gearbox    │             │
│  │                      │     Assembly         │             │
│  │  [Photo: All parts]  │  [Photo: Assembly]   │  16:9      │
│  │   ↓ Label examples:  │   ← Arrow showing    │  Format    │
│  │  "Wood pieces"       │    "Base"→           │            │
│  │  "Screws"            │    "Gearbox"→        │            │
│  │  "Glue"              │    ↓"Connect here"   │            │
│  ├──────────────────────┼──────────────────────┤            │
│  │ ③ Wing Preparation   │ ④ Final Assembly     │            │
│  │                      │                      │             │
│  │  [Photo: Wing parts] │  [Photo: Complete]   │            │
│  │   "Shape"→           │    ↻ "Test movement" │            │
│  │   "Detail"→          │    "Secure wings"→   │            │
│  │   ↓"Attach hinges"   │    ↓"Check gearbox"  │            │
│  └──────────────────────┴──────────────────────┘            │
└───────────────────────────────────────────────────────────────┘

Each panel has:
✓ Bold numbered circle + title
✓ Photorealistic image
✓ Arrows showing connections/actions
✓ Text labels identifying parts
✓ Clean, consistent styling
```

### Cut-Out Template
```
┌─────────────────────────────────────────┐
│  ╔═══════════════════════════════════╗  │
│  ║  PRINCESS PEACH - CUT-OUT TEMPLATE║  │
│  ╚═══════════════════════════════════╝  │
│                                         │
│  ┌─────┐    ┌──────┐    ┌─────────┐   │
│  │Head │    │Body  │    │Dress    │   │
│  └─────┘    └──────┘    └─────────┘   │
│                                         │
│  ┌───┐ ┌───┐  ┌─────┐   ┌──────┐     │
│  │Arm│ │Arm│  │Crown│   │Hair  │     │
│  │x2 │ │x2 │  └─────┘   └──────┘     │
│  └───┘ └───┘                          │
│                                         │
│  - - - - = Fold line                   │
│  ─────── = Cut line                    │
│  [gray] = Glue tab                     │
└─────────────────────────────────────────┘
```

## Testing Strategy

1. **Test with Simple Craft** (4 steps total)
   - Verify single composite image generated
   - Check retro style in top section
   - Verify photo quality in bottom section

2. **Test with Complex Craft** (10+ steps)
   - Verify proper step grouping (4, 4, 2+)
   - Check consistency across multiple composite images

3. **Test with Multiple Characters**
   - Verify character separation in steps
   - Ensure each character gets own cutout template
   - Check no object mixing in photos

4. **Test Across Categories**
   - Papercraft: Check fold lines, tabs
   - Clay: Check sculpting steps
   - Fabric: Check seam/stitch details
   - Etc.

## Migration Strategy

**Backwards Compatibility**:
- Keep `stepImages` field in Project type
- Old projects continue to work with individual step images
- New projects use `compositeStepImages` + `cutoutTemplates`
- UI checks which fields are populated and displays accordingly

## Success Criteria

- ✅ Composite images have authentic 1970s-1990s retro aesthetic
- ✅ No character/object mixing in detail photos
- ✅ Cut-out templates are printer-friendly and clear
- ✅ Each character/object has complete template
- ✅ Final "arrangement" step is excluded
- ✅ No object repetition issues
- ✅ Step grouping works correctly for various total step counts
- ✅ Maintains visual consistency with master reference image

## Next Steps

1. ✅ Create this planning document
2. ⏳ Review plan with user
3. ⏳ Begin implementation starting with Phase 1 (Type Definitions)
4. ⏳ Test each phase incrementally
5. ⏳ Iterate based on generated image quality
6. ⏳ Update UI to display new image format

---

**Notes**:
- Gemini 3 Pro Image Preview model is capable of complex composite image generation
- Prompt engineering will be critical for achieving retro aesthetic
- May need to iterate on prompts based on initial results
- Consider adding examples/reference images to prompts if quality isn't sufficient
