# Design Document

## Overview

Gamecraft is a separate application that shares the foundational architecture with Craftus but focuses on game asset generation instead of craft instructions. Rather than building two completely independent apps, we use a "skeleton approach" where both applications share common components, utilities, and infrastructure while maintaining separate entry points and domain-specific code.

The key differences between Craftus and Gamecraft:

1. **Category System**: Game asset categories (3D Model, 2D Pixel Art, Low Poly, etc.) instead of craft categories
2. **AI Prompts**: Game asset generation prompts instead of craft material prompts
3. **Variation System**: Design variations (poses, equipment, states) instead of step-by-step instructions
4. **Terminology**: Game-focused UI labels instead of craft-focused labels

This design creates two separate applications that share ~80% of their codebase through a common skeleton.

## Architecture

### Repository Structure

```
Root/
├── .kiro/                    # Kiro specs and configuration
│   └── specs/
│       ├── craftus-infinite-workbench/
│       └── gamecraft-mode/
├── craftus/                  # App 1: Craft Instructions (copy of current codebase)
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── App.tsx
│   ├── components/           # All existing components
│   │   ├── ChatInterface.tsx
│   │   ├── CustomNodes.tsx
│   │   ├── MasterNodeActionsMenu.tsx
│   │   └── ...
│   ├── services/
│   │   └── geminiService.ts  # CRAFT-SPECIFIC PROMPTS
│   ├── contexts/
│   │   ├── ProjectsContext.tsx
│   │   └── AIContext.tsx
│   ├── pages/
│   │   ├── CanvasWorkspace.tsx
│   │   ├── LandingPage.tsx
│   │   └── ...
│   ├── utils/
│   │   ├── security.ts
│   │   ├── validation.ts
│   │   └── ...
│   └── types.ts              # CraftCategory enum
├── gamecraft/                # App 2: Game Assets (copy of craftus with modified prompts)
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── App.tsx
│   ├── components/           # Same components, different labels
│   │   ├── ChatInterface.tsx
│   │   ├── CustomNodes.tsx
│   │   ├── MasterNodeActionsMenu.tsx
│   │   └── ...
│   ├── services/
│   │   └── geminiService.ts  # GAME ASSET PROMPTS (modified)
│   ├── contexts/
│   │   ├── ProjectsContext.tsx
│   │   └── AIContext.tsx
│   ├── pages/
│   │   ├── CanvasWorkspace.tsx
│   │   ├── LandingPage.tsx
│   │   └── ...
│   ├── utils/
│   │   ├── security.ts
│   │   ├── validation.ts
│   │   └── ...
│   └── types.ts              # AssetCategory enum (modified)
├── README.md                 # Explains skeleton approach
├── SKELETON.md               # Documents shared skeleton components
└── package.json              # Root scripts for convenience
```

**Key Insight**: Both applications are complete copies of the same codebase. The skeleton is the entire application architecture - only the prompts and category enums differ.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Craftus Application                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Skeleton Infrastructure                  │  │
│  │  • React Flow Canvas                                  │  │
│  │  • Node System (Master, Instruction, Material)       │  │
│  │  • Gemini AI Pipeline                                 │  │
│  │  • Project Management                                 │  │
│  │  • Security & Validation                              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Craft-Specific Customization                │  │
│  │  • CraftCategory enum                                 │  │
│  │  • Craft instruction prompts                          │  │
│  │  • "Dissect" terminology                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

                    COPY + MODIFY PROMPTS
                              ↓

┌─────────────────────────────────────────────────────────────┐
│                   Gamecraft Application                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Skeleton Infrastructure                  │  │
│  │  • React Flow Canvas (same)                           │  │
│  │  • Node System (same)                                 │  │
│  │  • Gemini AI Pipeline (same)                          │  │
│  │  • Project Management (same)                          │  │
│  │  • Security & Validation (same)                       │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Asset-Specific Customization                 │  │
│  │  • AssetCategory enum (modified)                      │  │
│  │  • Game asset prompts (modified)                      │  │
│  │  • "Generate Variations" terminology (modified)       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Skeleton Components (Shared by Copy)

The skeleton is the entire application architecture. Both apps contain identical copies of:

**Core Infrastructure (95% identical)**:
- `pages/CanvasWorkspace.tsx` - Infinite canvas with React Flow
- `components/CustomNodes.tsx` - MasterNode, InstructionNode, MaterialNode
- `components/FloatingMenuBar.tsx` - Tool selection
- `components/MasterNodeActionsMenu.tsx` - Node action menus
- `contexts/ProjectsContext.tsx` - Project CRUD and LocalStorage
- `contexts/AIContext.tsx` - AI generation state management
- `utils/security.ts` - Validation and sanitization
- `utils/rateLimiter.ts` - API rate limiting
- `utils/storage.ts` - LocalStorage abstraction
- All drawing tools, keyboard shortcuts, and UI components

**Application-Specific (5% modified)**:
- `services/geminiService.ts` - AI prompts (completely different)
- `types.ts` - Category enum (CraftCategory vs AssetCategory)
- `components/ChatInterface.tsx` - Category dropdown options
- `pages/LandingPage.tsx` - Marketing copy
- LocalStorage key (`craftus_projects` vs `gamecraft_projects`)

## Components and Interfaces

### Skeleton Components (Identical in Both Apps)

These components are copied as-is from Craftus to Gamecraft:

**Canvas & Nodes**:
- `pages/CanvasWorkspace.tsx` - React Flow canvas with pan/zoom
- `components/CustomNodes.tsx` - MasterNode, InstructionNode, MaterialNode
- `components/FloatingMenuBar.tsx` - Tool selection toolbar
- `components/MasterNodeActionsMenu.tsx` - Context menu for nodes

**State Management**:
- `contexts/ProjectsContext.tsx` - Project CRUD operations
- `contexts/AIContext.tsx` - AI generation state

**Utilities**:
- `utils/security.ts` - Input validation and sanitization
- `utils/rateLimiter.ts` - API rate limiting
- `utils/storage.ts` - LocalStorage abstraction
- `utils/validation.ts` - Input validation rules

### Modified Components

### 1. Category Enum

**Craftus** (`craftus/types.ts`):
```typescript
export enum CraftCategory {
  PAPERCRAFT = 'Papercraft',
  CLAY = 'Clay',
  FABRIC_SEWING = 'Fabric/Sewing',
  COSTUME_PROPS = 'Costume & Props',
  WOODCRAFT = 'Woodcraft',
  JEWELRY = 'Jewelry',
  KIDS_CRAFTS = 'Kids Crafts',
  TABLETOP_FIGURES = 'Tabletop Figures'
}
```

**Gamecraft** (`gamecraft/types.ts`):
```typescript
export enum AssetCategory {
  PIXEL_ART = 'Pixel Art (16x16, 32x32, 64x64)',
  HD_SPRITE = 'HD Sprite (256x256+)',
  CHIBI_STYLE = 'Chibi Style',
  ANIME_STYLE = 'Anime Style',
  REALISTIC = 'Realistic',
  LOW_POLY_3D = 'Low Poly 3D',
  VOXEL_ART = 'Voxel Art',
  HAND_DRAWN = 'Hand-Drawn'
}
```

### 2. Chat Interface

**Craftus** (`craftus/components/ChatInterface.tsx`):
```typescript
// Placeholder text
placeholder="Describe a craft you want to build..."

// Category dropdown renders CraftCategory enum
{Object.values(CraftCategory).map((cat) => (
  <button key={cat} onClick={() => setCategory(cat)}>
    {cat}
  </button>
))}
```

**Gamecraft** (`gamecraft/components/ChatInterface.tsx`):
```typescript
// Placeholder text (MODIFIED)
placeholder="Describe a game character or asset..."

// Category dropdown renders AssetCategory enum (MODIFIED)
{Object.values(AssetCategory).map((cat) => (
  <button key={cat} onClick={() => setCategory(cat)}>
    {cat}
  </button>
))}
```

### 3. AI Service (Most Important Changes)

**Craftus** (`craftus/services/geminiService.ts`):
```typescript
export const generateCraftImage = async (
  prompt: string,
  category: CraftCategory
): Promise<string> => {
  const fullPrompt = `
    Create a photorealistic studio photograph of a DIY craft project: ${prompt}.
    Category: ${category}.
    Style: Neutral background, even studio lighting, highly detailed textures 
    showing materials like fabric grain, paper fibers, wood grain, or metal.
    The object should look tangible, handmade, and finished.
  `;
  // ... Gemini API call
};

export const dissectCraft = async (
  imageBase64: string,
  userPrompt: string
): Promise<DissectionResponse> => {
  const prompt = `
    Analyze this craft project and break it down into 4 steps grouped by body parts:
    Step 1 - HEAD GROUP (head, face, hair, head accessories)
    Step 2 - BODY GROUP (torso, chest, main body structure)
    Step 3 - CLOTHING/SURFACE GROUP (clothing, surface details, patterns)
    Step 4 - LIMBS & PROPS GROUP (arms, legs, props, base)
  `;
  // ... Gemini API call
};
```

**Gamecraft** (`gamecraft/services/geminiService.ts`):
```typescript
export const generateAssetImage = async (
  prompt: string,
  category: AssetCategory
): Promise<string> => {
  const fullPrompt = `
    Create a ${category} game character asset: ${prompt}.
    Style: ${getCategoryStyleRules(category)}
    Clean background, suitable for game development.
    The character should be game-ready with clear silhouette.
  `;
  // ... Gemini API call
};

export const analyzeAsset = async (
  imageBase64: string,
  userPrompt: string
): Promise<AssetAnalysis> => {
  const prompt = `
    Analyze this game character and suggest variations:
    - Pose variations (idle, walk, run, jump, attack)
    - Equipment variations (different weapons, armor)
    - State variations (normal, damaged, powered-up)
    - Expression variations (happy, angry, surprised)
    Extract color palette and design elements.
  `;
  // ... Gemini API call
};

export const generateVariationImage = async (
  originalImageBase64: string,
  variationDescription: string,
  category: AssetCategory,
  variationType: 'pose' | 'equipment' | 'state' | 'expression'
): Promise<string> => {
  const prompt = `
    Generate a ${variationType} variation of this game character.
    Original: [reference image]
    Variation: ${variationDescription}
    Maintain: Same character identity, same art style, same colors
    Change: Only the ${variationType}
  `;
  // ... Gemini API call
};

const getCategoryStyleRules = (category: AssetCategory): string => {
  const rules: Record<AssetCategory, string> = {
    [AssetCategory.PIXEL_ART]: 'Pixel-perfect art with limited color palette, retro game aesthetic',
    [AssetCategory.HD_SPRITE]: 'High-resolution 2D sprite with detailed shading',
    [AssetCategory.CHIBI_STYLE]: 'Cute chibi proportions (2-3 heads tall), large eyes',
    [AssetCategory.ANIME_STYLE]: 'Anime art style with cel shading',
    [AssetCategory.REALISTIC]: 'Realistic proportions and rendering',
    [AssetCategory.LOW_POLY_3D]: 'Low-poly 3D with visible facets, flat shading',
    [AssetCategory.VOXEL_ART]: 'Voxel-based 3D with cubic blocks (Minecraft-style)',
    [AssetCategory.HAND_DRAWN]: 'Hand-drawn illustration style with visible brush strokes'
  };
  return rules[category];
};
```

### 4. Storage Keys

**Craftus** (`craftus/utils/storage.ts`):
```typescript
const STORAGE_KEY = 'craftus_projects';
```

**Gamecraft** (`gamecraft/utils/storage.ts`):
```typescript
const STORAGE_KEY = 'gamecraft_projects';  // MODIFIED
```

### 5. Landing Page

**Craftus** (`craftus/pages/LandingPage.tsx`):
```typescript
<h1>Craftus: AI-Powered Craft Instructions</h1>
<p>Transform craft ideas into step-by-step visual guides</p>
```

**Gamecraft** (`gamecraft/pages/LandingPage.tsx`):
```typescript
<h1>GameCraft: AI-Powered Game Asset Generator</h1>  {/* MODIFIED */}
<p>Transform character ideas into game-ready sprite sheets</p>  {/* MODIFIED */}
```

## Data Models

### Storage Isolation

Both applications use LocalStorage with separate keys to prevent cross-contamination:
- Craftus: `craftus_projects`
- Gamecraft: `gamecraft_projects`

The storage utility code is identical in both apps, only the key constant differs.

### Project Data Structures

Both apps use nearly identical project structures. The only differences are field names and types:

**Craftus**:
```typescript
interface Project {
  id: string;
  name: string;
  category: CraftCategory;           // Craft categories
  prompt: string;
  masterImageUrl: string;
  dissection: DissectionResponse | null;  // "dissection"
  stepImages: Map<number, string>;        // "stepImages"
  createdAt: Date;
  lastModified: Date;
}

interface DissectionResponse {
  complexity: 'Simple' | 'Moderate' | 'Complex';
  complexityScore: number;
  materials: string[];                    // "materials"
  steps: {                                // "steps"
    stepNumber: number;
    title: string;
    description: string;
    safetyWarning?: string;
  }[];
}
```

**Gamecraft** (same structure, different field names):
```typescript
interface Project {
  id: string;
  name: string;
  category: AssetCategory;           // Asset categories (MODIFIED)
  prompt: string;
  masterImageUrl: string;
  analysis: AssetAnalysis | null;    // "analysis" instead of "dissection" (MODIFIED)
  variationImages: Map<number, string>;  // "variationImages" instead of "stepImages" (MODIFIED)
  createdAt: Date;
  lastModified: Date;
}

interface AssetAnalysis {
  style: string;                     // "style" instead of "complexity" (MODIFIED)
  colorPalette: string[];            // "colorPalette" instead of "materials" (MODIFIED)
  designElements: string[];          // NEW FIELD
  variations: {                      // "variations" instead of "steps" (MODIFIED)
    variationNumber: number;
    type: 'pose' | 'equipment' | 'state' | 'expression';  // NEW FIELD
    title: string;
    description: string;
  }[];
}
```

**Key Insight**: The data structures are conceptually identical. "Steps" in Craftus become "Variations" in Gamecraft. "Materials" become "Color Palette". The storage and retrieval logic is the same.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Storage isolation
*For any* combination of Craftus and Gamecraft projects, saving and loading projects should never mix data between the two applications
**Validates: Requirements 6.4**

### Property 2: Category-prompt consistency
*For any* asset category selection, the generated image should match the visual style conventions of that category (3D should look 3D, pixel art should have pixel-perfect edges, etc.)
**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

### Property 3: Variation visual consistency
*For any* master asset and its variations, all variations should maintain the same color palette (within tolerance), art style, and character identity as the master
**Validates: Requirements 10.1, 10.2, 10.3, 10.4**

### Property 4: Variation type correctness
*For any* variation request of type "pose", the generated variation should show the same character in a different pose without changing equipment or state
**Validates: Requirements 4.2, 4.3**

### Property 5: Sprite sheet frame consistency
*For any* sprite sheet generation, all frames should have identical dimensions and consistent spacing
**Validates: Requirements 5.2, 5.3, 5.4**

### Property 6: Project persistence
*For any* saved Gamecraft project, loading it should restore all asset data, variations, and metadata correctly
**Validates: Requirements 6.3, 6.5**

### Property 7: Metadata preservation
*For any* generated asset, the original prompt and category should be preserved and retrievable
**Validates: Requirements 7.1, 7.2, 7.3**

### Property 8: Equipment variation isolation
*For any* equipment variation request, only the specified equipment should change while preserving character identity, pose, and other attributes
**Validates: Requirements 9.1, 9.4**

### Property 9: State variation visual effects
*For any* state variation (damaged, powered-up, etc.), appropriate visual effects should be applied while maintaining character recognizability
**Validates: Requirements 9.2, 9.5**

### Property 10: Category validation
*For any* user input, Gamecraft should only accept valid categories from the AssetCategory enum
**Validates: Requirements 1.1, 1.2**

## Error Handling

### Application-Specific Errors

**Craftus**:
1. **Invalid Craft Category**
   - Detection: Category not in CraftCategory enum
   - Handling: Default to PAPERCRAFT
   - User feedback: "Invalid category, defaulting to Papercraft"

2. **Dissection Failure**
   - Detection: API error during craft dissection
   - Handling: Show error state on master node with retry button
   - User feedback: "Failed to dissect craft. Click to retry."

3. **Step Image Generation Failure**
   - Detection: API error during step image generation
   - Handling: Show error state on step node with retry button
   - User feedback: "Failed to generate step image. Click to retry."

**Gamecraft**:
1. **Invalid Asset Category**
   - Detection: Category not in AssetCategory enum
   - Handling: Default to MODEL_3D
   - User feedback: "Invalid category, defaulting to 3D Model"

2. **Analysis Failure**
   - Detection: API error during asset analysis
   - Handling: Show error state on master node with retry button
   - User feedback: "Failed to analyze asset. Click to retry."

3. **Variation Generation Failure**
   - Detection: API error during variation image generation
   - Handling: Show error state on variation node with retry button
   - User feedback: "Failed to generate variation. Click to retry."

### Shared Error Handling

Both applications use the same error handling utilities from `shared/utils/errorHandler.ts`:
- Rate limiting (429 errors)
- API overload (503 errors with exponential backoff)
- Network failures
- LocalStorage quota exceeded
- Invalid image data
- Security validation failures

## Testing Strategy

### Shared Component Tests

**File**: `shared/__tests__/storage.test.ts`
- Test storage manager creation
- Test save/load operations
- Test data isolation between keys
- Test quota handling

**File**: `shared/__tests__/security.test.ts`
- Test input validation
- Test sanitization functions
- Test rate limiting

**File**: `shared/__tests__/errorHandler.test.ts`
- Test retry logic
- Test exponential backoff
- Test error message sanitization

### Gamecraft Unit Tests

**File**: `gamecraft/src/__tests__/assetCategories.test.ts`
- Test AssetCategory enum values
- Test category validation
- Test default category selection

**File**: `gamecraft/src/__tests__/assetPrompts.test.ts`
- Test prompt generation for each asset category
- Test variation type prompt construction
- Test sprite sheet prompt formatting
- Test style rules for each category

**File**: `gamecraft/src/__tests__/assetStorage.test.ts`
- Test AssetProject save/load
- Test storage key isolation from Craftus
- Test project data validation

### Property-Based Tests

**File**: `gamecraft/src/__tests__/assetGeneration.property.test.ts`

**Property Test 1: Storage isolation**
- Generate random Craftus and Gamecraft projects
- Save both types
- Verify no cross-contamination
- **Validates: Property 1**

**Property Test 2: Category-prompt consistency**
- Generate random asset descriptions
- For each AssetCategory, generate an asset
- Verify generated images match category conventions
- **Validates: Property 2**

**Property Test 3: Variation visual consistency**
- Generate random master assets
- Generate multiple variations
- Verify color palette similarity (extract colors, compare)
- **Validates: Property 3**

**Property Test 4: Variation type correctness**
- Generate random master assets
- Request "pose" variations
- Verify only pose changes (compare image regions)
- **Validates: Property 4**

**Property Test 5: Sprite sheet frame consistency**
- Generate random sprite sheets
- Extract frame dimensions
- Verify all frames have identical dimensions
- **Validates: Property 5**

**Property Test 6: Project persistence**
- Create random Gamecraft projects
- Save and reload each project
- Verify all data is correctly restored
- **Validates: Property 6**

**Property Test 7: Metadata preservation**
- Generate random assets with various prompts
- Save projects
- Reload and verify prompt/category match
- **Validates: Property 7**

**Property Test 8: Equipment variation isolation**
- Generate random characters
- Request equipment variations
- Verify only equipment changes (image diff analysis)
- **Validates: Property 8**

**Property Test 9: State variation visual effects**
- Generate random characters
- Request state variations (damaged, powered-up)
- Verify appropriate effects are present
- **Validates: Property 9**

**Property Test 10: Category validation**
- Generate random category strings
- Attempt to use invalid categories
- Verify system rejects invalid categories
- **Validates: Property 10**

### Integration Tests

**File**: `gamecraft/e2e/__tests__/gamecraftWorkflow.test.ts`
- Test complete workflow: select category → generate asset → analyze → generate variations
- Test project save/load in Gamecraft
- Test sprite sheet generation end-to-end
- Test error recovery and retry

### Testing Framework

- **Unit Tests**: Vitest
- **Property-Based Tests**: fast-check
- **Integration Tests**: Playwright

### Test Configuration

**shared/vitest.config.ts**:
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      include: [
        'shared/**/*.ts',
        'shared/**/*.tsx'
      ]
    }
  }
});
```

**gamecraft/vitest.config.ts**:
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      include: [
        'src/**/*.ts',
        'src/**/*.tsx'
      ],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx'
      ]
    }
  }
});
```

## Implementation Notes

### Copy-and-Modify Approach

The implementation strategy is simple:
1. Copy the entire Craftus codebase to a new `gamecraft/` folder
2. Modify only 5% of the code (prompts, enums, labels)
3. Deploy as two separate applications

This demonstrates the "skeleton" concept: the same infrastructure powers two completely different applications just by changing the prompts.

### What Makes This a "Skeleton"

The skeleton is the entire application architecture:
- **React Flow Canvas**: Node-based infinite workspace
- **Gemini AI Pipeline**: Image generation with retry logic
- **Project Management**: LocalStorage CRUD operations
- **Security Layer**: Validation, sanitization, rate limiting
- **Node System**: MasterNode, InstructionNode, MaterialNode components

The skeleton is **prompt-agnostic**. It doesn't care whether it's generating craft instructions or game assets - it just generates images based on prompts.

### Files to Modify (Only 5%)

When copying Craftus to create Gamecraft, modify these files:

1. **`types.ts`**: Change `CraftCategory` enum to `AssetCategory` enum
2. **`services/geminiService.ts`**: Replace all AI prompts
3. **`components/ChatInterface.tsx`**: Update placeholder text and category dropdown
4. **`pages/LandingPage.tsx`**: Update marketing copy
5. **`utils/storage.ts`**: Change storage key from `craftus_projects` to `gamecraft_projects`
6. **`package.json`**: Update app name and description

Everything else stays identical.

### Prompt Engineering Focus

The core differentiation is in AI prompts:

**Craftus Prompts** (craft instructions):
```typescript
// Generate master craft image
"Create a photorealistic studio photograph of a DIY craft project..."

// Dissect into steps
"Break down this craft into 4 steps grouped by body parts..."

// Generate step images
"Create a multi-panel instruction image showing materials and assembly..."
```

**Gamecraft Prompts** (game assets):
```typescript
// Generate master character image
"Create a [Pixel Art/HD Sprite/Chibi] game character asset..."

// Analyze for variations
"Analyze this character and suggest pose, equipment, and state variations..."

// Generate variation images
"Generate a [pose/equipment/state] variation maintaining character identity..."
```

### Development Workflow

**Step 1: Copy Project**
```bash
# From repo root
cp -r . craftus/
cp -r . gamecraft/
```

**Step 2: Modify Gamecraft**
- Update `types.ts` with AssetCategory enum
- Replace all prompts in `geminiService.ts`
- Update UI labels in `ChatInterface.tsx`
- Change storage key in `utils/storage.ts`
- Update `LandingPage.tsx` marketing copy

**Step 3: Test Both Apps**
```bash
# Terminal 1
cd craftus && npm run dev  # localhost:5173

# Terminal 2
cd gamecraft && npm run dev  # localhost:5174
```

**Step 4: Deploy Separately**
```bash
cd craftus && vercel deploy
cd gamecraft && vercel deploy
```

### Reusing Existing Features

Gamecraft can immediately reuse these Craftus features:
- **Turn Table Views**: Already generates left/right/back views (perfect for game assets!)
- **Magic Select**: Extract individual characters from group images
- **Pattern Sheet**: Can be adapted to sprite sheet generation
- **Drawing Tools**: Annotate sprites with notes
- **Project Management**: Save/load game asset projects

### Performance Considerations

- No additional API calls (same 3-stage pipeline)
- Separate LocalStorage keys prevent cross-contamination
- Same React Flow performance characteristics
- Independent deployments (no shared infrastructure)
- Each app is ~2-3MB bundle size

## Future Enhancements

### Phase 2 (Post-MVP)
- Animation preview for sprite sheets
- Color palette extraction and editing
- Batch variation generation
- Asset export in game engine formats (Unity, Unreal, Godot)

### Phase 3 (Advanced)
- 3D model generation (if Gemini adds 3D support)
- Texture map generation (normal maps, roughness, etc.)
- Character customization UI (mix and match variations)
- Community asset marketplace
