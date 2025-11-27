# Skeleton Crew Submission Plan

## Overview

This document outlines how Craftus fits the **Skeleton Crew** hackathon category by demonstrating a reusable skeleton code template that powers two distinct applications.

**Hackathon Categories We're Targeting:**
1. **Resurrection** - Craftus alone (bringing back paper craft manuals)
2. **Skeleton Crew** - Craftus + GameCraft (same skeleton, two apps)

---

## Hackathon Requirements Checklist

### Skeleton Crew Rules (from hackathon):
> "Your repo must contain 2 separate repo folders for the 2 separate applications"
> "The skeleton code isn't tested, the apps you build with it are."
> "Your mission is to explain how you used skeleton code to streamline developing the apps"

### Our Compliance:
- [ ] `/.kiro/` folder at repo root
- [ ] `/craftus/` folder - App 1
- [ ] `/gamecraft/` folder - App 2
- [ ] Two separate deployments (two URLs)
- [ ] README explaining skeleton approach
- [ ] Demo showing same skeleton, different outputs

---

## Final Repository Structure

```
CraftusMonorepo/                    ← Root of hackathon repo
├── .kiro/                          ← Required hackathon folder
│   └── specs/
│       └── skeleton-overview.md    ← Explains our skeleton approach
│
├── craftus/                        ← APP 1: Craft Instructions
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   ├── public/
│   ├── src/
│   │   └── ...
│   ├── pages/
│   │   └── CanvasWorkspace.tsx     ← Same skeleton component
│   ├── components/
│   │   ├── CustomNodes.tsx         ← Same skeleton component
│   │   ├── MasterNodeActionsMenu.tsx
│   │   └── ...
│   ├── services/
│   │   └── geminiService.ts        ← CRAFT-SPECIFIC PROMPTS
│   ├── contexts/
│   │   └── ProjectsContext.tsx     ← Same skeleton component
│   └── utils/
│       └── ...
│
├── gamecraft/                      ← APP 2: Game Assets
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   ├── public/
│   ├── src/
│   │   └── ...
│   ├── pages/
│   │   └── CanvasWorkspace.tsx     ← Same skeleton component
│   ├── components/
│   │   ├── CustomNodes.tsx         ← Same skeleton component
│   │   ├── MasterNodeActionsMenu.tsx
│   │   └── ...
│   ├── services/
│   │   └── geminiService.ts        ← GAME-ASSET-SPECIFIC PROMPTS
│   ├── contexts/
│   │   └── ProjectsContext.tsx     ← Same skeleton component
│   └── utils/
│       └── ...
│
├── README.md                       ← Main readme explaining both apps
├── SKELETON.md                     ← Documents shared skeleton components
└── package.json                    ← Root scripts for convenience
```

### Root package.json (convenience scripts)
```json
{
  "name": "craftus-gamecraft-monorepo",
  "private": true,
  "scripts": {
    "dev:craftus": "cd craftus && npm run dev",
    "dev:gamecraft": "cd gamecraft && npm run dev",
    "build:craftus": "cd craftus && npm run build",
    "build:gamecraft": "cd gamecraft && npm run build",
    "install:all": "cd craftus && npm install && cd ../gamecraft && npm install"
  }
}
```

---

## What is Our Skeleton?

The **skeleton** is our core canvas-based AI image generation framework. It's the foundation that both apps share:

### Skeleton Components (Shared Code)

| Component | Description | Files |
|-----------|-------------|-------|
| **React Flow Canvas** | Infinite canvas with pan/zoom, node system | `pages/CanvasWorkspace.tsx` |
| **Node System** | MasterNode, ImageNode, InstructionNode, MaterialNode | `components/CustomNodes.tsx` |
| **Gemini AI Pipeline** | Image generation wrapper, retry logic, rate limiting | `services/geminiService.ts` |
| **Menu System** | Floating toolbar, context menus, action menus | `components/*.tsx` |
| **State Management** | Projects context, canvas state persistence | `contexts/ProjectsContext.tsx` |
| **Image Processing** | Base64 handling, file upload, download | `utils/fileUpload.ts` |

### What Makes It a "Skeleton"

The skeleton is **prompt-agnostic**. The same canvas + AI pipeline can generate ANY type of image by changing the prompts:

```
Skeleton (Infrastructure)     →  App-Specific (Prompts)
─────────────────────────────    ────────────────────────
React Flow canvas             →  Craft instruction prompts
Gemini API integration        →  Game asset prompts
Node-based workflow           →  Output format rules
Image generation pipeline     →  Category-specific rules
```

---

## Two Applications from One Skeleton

### App 1: Craftus (Craft Instruction Generator)

**Purpose**: Resurrect paper-based craft instruction manuals using AI

**Skeleton Usage**:
- Canvas displays craft master image + generated instruction steps
- Nodes: MasterNode (craft) → InstructionNodes (steps) + MaterialNode (supplies)
- AI generates multi-panel instruction images

**App-Specific Prompts**:
- `dissectCraft()` - Break craft into 4 body-part-based steps
- `generateStepImage()` - Multi-panel instruction format
- `generateSVGPatternSheet()` - Printable pattern sheets
- `getCategorySpecificRules()` - 8 craft categories (Papercraft, Clay, Fabric, etc.)

**Output**: Professional craft instruction manuals with step-by-step visual guides

---

### App 2: GameCraft (Game Asset Generator)

**Purpose**: Generate game-ready character assets from a single reference image

**Skeleton Usage**:
- Same canvas displays character + generated views/sprites
- Nodes: MasterNode (character) → ImageNodes (rotations, sprites)
- AI generates consistent character views

**App-Specific Prompts** (to be created):
- `generateTurnTableView()` - Already built! Left/Right/Back views
- `generateSpriteSheet()` - Walk cycle, idle, attack animations
- `generateIsometricViews()` - 8-direction top-down views
- `generateExpressionSheet()` - Emotion variations

**Output**: Game-ready sprite sheets, character turntables, animation frames

---

## Feature Comparison

| Feature | Craftus | GameCraft |
|---------|---------|-----------|
| **Input** | Craft reference image | Character reference image |
| **Canvas** | ✅ Same skeleton | ✅ Same skeleton |
| **Node System** | ✅ Same skeleton | ✅ Same skeleton |
| **AI Pipeline** | ✅ Same skeleton | ✅ Same skeleton |
| **Prompts** | Craft instructions | Game assets |
| **Output** | Instruction manuals | Sprite sheets |
| **Categories** | 8 craft types | Game asset types |

---

## Implementation Plan

### Phase 1: Finalize Craftus (Current)
- [x] Fix instruction image generation prompts
- [x] Add body-part grouping (4 steps)
- [x] Simplify category rules
- [x] Add reference image anchoring
- [x] Add Turn Table feature (already game-asset-ready!)
- [ ] Test with sample crafts

### Phase 2: Create GameCraft (Copy + Modify)

**Step 1: Copy Project**
```bash
# From repo root
cp -r Craftus craftus/
cp -r Craftus gamecraft/
```

**Step 2: Modify GameCraft Prompts**

Replace craft-specific prompts with game asset prompts:

```typescript
// gamecraft/services/geminiService.ts

// Replace dissectCraft with:
export const analyzeCharacter = async (imageBase64: string) => {
  // Analyze character for game asset generation
  // Returns: character name, colors, features, animation suggestions
};

// Replace generateStepImage with:
export const generateSpriteSheet = async (
  imageBase64: string,
  animationType: 'walk' | 'idle' | 'attack' | 'jump'
) => {
  // Generate sprite sheet animation frames
};

// Keep generateTurnTableView - already perfect for game assets!

// Add new:
export const generateIsometricView = async (
  imageBase64: string,
  direction: '0' | '45' | '90' | '135' | '180' | '225' | '270' | '315'
) => {
  // Generate 8-direction isometric sprite
};
```

**Step 3: Update UI Labels**
- Change "Craft" to "Character"
- Change "Pattern Sheet" to "Sprite Sheet"
- Change "Instructions" to "Animation Frames"
- Change categories from craft types to asset types

### Phase 3: Repository Structure

```
Root/
├── .kiro/                    # Required hackathon folder
│   └── specs/
├── craftus/                  # App 1: Craft Instructions
│   ├── package.json
│   ├── services/
│   │   └── geminiService.ts  # Craft prompts
│   └── ...
├── gamecraft/                # App 2: Game Assets
│   ├── package.json
│   ├── services/
│   │   └── geminiService.ts  # Game asset prompts
│   └── ...
├── README.md                 # Explains skeleton approach
└── SKELETON.md               # Documents shared components
```

### Phase 4: Deployments

- **Craftus**: Deploy to `craftus.vercel.app`
- **GameCraft**: Deploy to `gamecraft.vercel.app`

---

## GameCraft Feature Ideas

### Core Features (Skeleton-powered)

1. **Turn Table Views** ✅ Already Built in Craftus!
   - Front (original), Left (90°), Right (90°), Back (180°) views
   - Perfect for character reference sheets and game asset pipelines
   - Uses same `generateTurnTableView()` function - just different context

   **Current Implementation** (from `geminiService.ts`):
   ```typescript
   export type TurnTableView = 'left' | 'right' | 'back';

   export const generateTurnTableView = async (
     originalImageBase64: string,
     view: TurnTableView,
     craftLabel?: string
   ): Promise<string> => {
     // Generates rotated views maintaining exact style/colors
     // Already works for game characters!
   };
   ```

   **What it does**:
   - Takes a front-facing character image
   - Generates left side (90° counter-clockwise)
   - Generates right side (90° clockwise)
   - Generates back view (180° rotation)
   - Maintains exact colors, proportions, art style

   **Why it's game-asset-ready**:
   - Game developers need character reference sheets
   - 2D games need directional sprites
   - The prompt already emphasizes consistency across views

2. **Sprite Sheet Generator** (To Build)
   - Input: Single character image
   - Output: Walk cycle (8 frames), Idle (4 frames), Attack (6 frames)
   - Format: Horizontal strip or grid layout

3. **Isometric Views** (To Build)
   - 8-direction character sprites for top-down games
   - Consistent style across all angles
   - Extensions of Turn Table: 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°

4. **Expression Sheet** (To Build)
   - Generate facial expressions: Happy, Sad, Angry, Surprised
   - Same character, different emotions

5. **Color Palette Variations** (To Build)
   - Generate recolored versions (enemies, team colors)
   - Maintain same pose/design

---

## Turn Table Feature Deep Dive

### How Turn Table Works (Already Implemented!)

The Turn Table feature is the **bridge** between Craftus and GameCraft. It's already in the codebase and works for both craft reference sheets AND game character assets.

**File Location**: `services/geminiService.ts` (lines ~1579-1693)

**UI Location**: MasterNode hover menu → "Turn Table" button

**What Happens When User Clicks Turn Table**:
1. User hovers over MasterNode → Menu appears
2. User clicks "Turn Table" button
3. Three placeholder ImageNodes appear below the MasterNode
4. Three API calls fire in parallel to Gemini
5. Each generates a rotated view (left, right, back)
6. Images populate the nodes when ready

**Prompt Strategy**:
```
🎯 YOUR TASK: Generate a [LEFT/RIGHT/BACK] VIEW of this exact same craft object.

CRITICAL REQUIREMENTS:
1. ✅ SAME OBJECT - Generate the EXACT SAME craft object
2. ✅ SAME STYLE - Match exact art style, materials, textures, colors
3. ✅ SAME SCALE - Keep same size and proportions
4. ✅ SAME LIGHTING - Similar studio lighting, neutral background
5. ✅ ROTATED VIEW - Show the [left profile/right profile/back view]

IMAGINE: You have the physical object on a turntable/lazy susan.
You spin it [90° counter-clockwise/90° clockwise/180°] and take another photo.
Generate THAT view.
```

### Why This Proves Skeleton Crew

The Turn Table feature demonstrates the skeleton's versatility:

| In Craftus | In GameCraft |
|------------|--------------|
| "Rotate this papercraft" | "Rotate this game character" |
| Reference sheet for crafters | Reference sheet for game devs |
| Same prompt, same function | Same prompt, same function |
| Different label in UI | Different label in UI |

**The code is 100% reusable** - only the app context changes!

### UI Changes for GameCraft

**MasterNode Menu Changes**:
```
Craftus Menu:                GameCraft Menu:
├── Pattern Sheet            ├── Sprite Sheet
├── Instructions             ├── Animation Frames
├── Turn Table               ├── Turn Table (same!)
├── Magic Select             ├── Color Variants
├── Download                 ├── Download
└── Share                    └── Export to Game Engine
```

**Category Changes**:
```
Craftus Categories:          GameCraft Categories:
├── Papercraft               ├── Pixel Art (16x16, 32x32, 64x64)
├── Clay                     ├── HD Sprite (256x256+)
├── Fabric/Sewing            ├── Chibi Style
├── Costume & Props          ├── Anime Style
├── Woodcraft                ├── Realistic
├── Jewelry                  ├── Low Poly 3D
├── Kids Crafts              ├── Voxel Art
└── Tabletop Figures         └── Hand-Drawn
```

---

## Submission Narrative

### How to Explain Skeleton Crew Fit

> "We built a **skeleton code template** consisting of:
>
> 1. **React Flow Infinite Canvas** - A node-based workspace for visual AI workflows
> 2. **Gemini AI Integration Layer** - Image generation pipeline with retry logic and rate limiting
> 3. **Node Component System** - Reusable MasterNode, ImageNode architecture
> 4. **State Management** - Project persistence and canvas state handling
>
> This skeleton enabled us to rapidly build **two distinct applications**:
>
> **Craftus** uses the skeleton to generate craft instruction manuals - analyzing a craft image and producing step-by-step building guides with multi-panel instruction images.
>
> **GameCraft** uses the same skeleton to generate game assets - taking a character image and producing sprite sheets, turntable views, and animation frames.
>
> The skeleton code handles all the infrastructure (canvas, AI calls, state), while each app only needs to provide domain-specific prompts. This demonstrates how a well-designed skeleton can support diverse use cases with minimal code changes."

---

## Effort Estimate

| Task | Complexity | Time |
|------|------------|------|
| Finalize Craftus testing | Low | 1 day |
| Copy project structure | Low | 1 hour |
| Create GameCraft prompts | Medium | 2-3 days |
| Update UI labels/categories | Low | 1 day |
| Add sprite sheet generation | Medium | 2 days |
| Add isometric views | Medium | 1-2 days |
| Deploy both apps | Low | 1 day |
| Documentation | Low | 1 day |
| **Total** | | **~8-10 days** |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Gemini rate limits with two apps | Share same API key, sequential testing |
| Sprite generation quality | Iterative prompt refinement |
| Time constraints | Focus on Turn Table + Sprite Sheet only |
| Deployment issues | Test deployments early |

---

## Success Criteria

- [ ] Both apps deployed to separate URLs
- [ ] Same canvas/node system visible in both
- [ ] Different prompts produce different outputs
- [ ] README clearly explains skeleton approach
- [ ] .kiro folder at repo root
- [ ] Video/demo shows skeleton versatility

---

## Quick Start Commands

```bash
# After restructuring repo:

# Run Craftus
cd craftus
npm install
npm run dev  # localhost:5173

# Run GameCraft (different terminal)
cd gamecraft
npm install
npm run dev  # localhost:5174

# Deploy
cd craftus && vercel
cd gamecraft && vercel
```

---

## Conclusion

The Skeleton Crew category is a perfect fit because:

1. **Clear skeleton**: Canvas + AI pipeline + Node system
2. **Two distinct apps**: Craft instructions vs Game assets
3. **Same foundation**: 90% shared code
4. **Different outputs**: Prompts determine the app's purpose
5. **Already started**: Turn Table feature is already game-asset-ready!

With 10 days remaining, this is achievable by focusing on prompt changes rather than rebuilding infrastructure.
