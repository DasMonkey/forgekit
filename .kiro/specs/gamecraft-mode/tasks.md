# Implementation Plan

## Overview

This implementation plan assumes the user has manually duplicated the Craftus project into a `gamecraft/` folder. The tasks focus on modifying only the necessary files to transform Craftus into Gamecraft - a game asset generator instead of a craft instruction generator.

**Core Strategy**: Modify only ~5% of the codebase (prompts, enums, labels, storage keys) while keeping the skeleton infrastructure identical.

---

## Tasks

- [ ] 1. Update type definitions and enums
  - Modify `types.ts` to replace `CraftCategory` with `AssetCategory`
  - Update category enum values to game asset types (Pixel Art, HD Sprite, Chibi Style, etc.)
  - Rename `DissectionResponse` to `AssetAnalysis` with appropriate field names
  - Update all type references throughout the codebase
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Replace AI prompts in geminiService.ts
  - [ ] 2.1 Update generateCraftImage to generateAssetImage
    - Replace craft-focused prompt with game asset prompt
    - Add category-specific style rules function
    - Update function name and parameters
    - _Requirements: 2.1, 2.2, 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ] 2.2 Update dissectCraft to analyzeAsset
    - Replace craft dissection prompt with asset variation analysis prompt
    - Change from "4 body-part steps" to "variation suggestions" (pose, equipment, state, expression)
    - Update response schema to match AssetAnalysis type
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ] 2.3 Update generateStepImage to generateVariationImage
    - Replace craft instruction prompt with game asset variation prompt
    - Add variation type parameter (pose, equipment, state, expression, color)
    - Emphasize maintaining character identity while changing only the specified aspect
    - Remove craft-specific multi-panel format instructions
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ] 2.4 Add sprite sheet generation function (optional)
    - Create generateSpriteSheet function for animation frames
    - Support animation types: idle, walk, run, jump, attack
    - Generate grid layout with consistent frame dimensions
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ] 2.5 Keep generateTurnTableView unchanged
    - This function already works perfectly for game assets
    - No modifications needed - it's already game-asset-ready
    - _Requirements: 4.1_

- [ ] 3. Update ChatInterface component
  - Change placeholder text from "Describe a craft you want to build..." to "Describe a game character or asset..."
  - Update category dropdown to render AssetCategory enum values
  - Update loading messages to be game-asset-focused
  - _Requirements: 1.1, 2.1_

- [ ] 4. Update UI terminology and labels
  - [ ] 4.1 Update CustomNodes component
    - Change "Dissect" button to "Generate Variations"
    - Change "Materials" node title to "Asset Metadata"
    - Change "Step X" labels to "Variation X"
    - Update node descriptions and tooltips
    - _Requirements: 3.1, 4.1_
  
  - [ ] 4.2 Update MasterNodeActionsMenu
    - Change "Pattern Sheet" to "Sprite Sheet"
    - Change "Instructions" to "Variations"
    - Keep "Turn Table" label (works for both apps)
    - _Requirements: 4.1, 5.1_
  
  - [ ] 4.3 Update CanvasWorkspace page
    - Update any craft-specific terminology in UI
    - Update tooltips and help text
    - _Requirements: 1.1_

- [ ] 5. Update storage configuration
  - Change LocalStorage key from `craftus_projects` to `gamecraft_projects`
  - Update storage utility references
  - Ensure data isolation from Craftus projects
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 6. Update landing page and branding
  - [ ] 6.1 Update LandingPage component
    - Change title from "Craftus" to "GameCraft"
    - Update tagline to focus on game asset generation
    - Update feature descriptions for game development use cases
    - Update example prompts to game characters/assets
    - _Requirements: 1.1, 2.1_
  
  - [ ] 6.2 Update package.json
    - Change app name to "gamecraft"
    - Update description to game asset generator
    - Update any craft-specific metadata
    - _Requirements: 6.1_
  
  - [ ] 6.3 Update index.html
    - Change page title to "GameCraft"
    - Update meta description for game asset generation
    - _Requirements: 6.1_

- [ ] 7. Update metadata export functionality
  - Ensure exported projects include variation type information
  - Update export format to include asset-specific metadata (color palette, design elements)
  - Update clipboard copy to include variation relationships
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 8. Test core workflows
  - [ ] 8.1 Test asset generation
    - Generate assets in each AssetCategory
    - Verify style rules are applied correctly
    - Verify images match category conventions
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ] 8.2 Test variation generation
    - Generate pose variations
    - Generate equipment variations
    - Generate state variations
    - Generate expression variations
    - Verify visual consistency across variations
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ] 8.3 Test project management
    - Save and load GameCraft projects
    - Verify storage isolation from Craftus
    - Test project export/import
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ] 8.4 Test Turn Table feature
    - Verify left/right/back views work for game characters
    - Verify style consistency across views
    - _Requirements: 4.1, 10.1, 10.2, 10.3_

- [ ] 9. Update documentation
  - Create SKELETON.md documenting shared components
  - Update README.md to explain both Craftus and GameCraft
  - Document the skeleton approach for hackathon submission
  - Add deployment instructions for both apps
  - _Requirements: 6.1_

- [ ] 10. Final verification
  - Run both Craftus and GameCraft side-by-side
  - Verify no cross-contamination in LocalStorage
  - Verify both apps work independently
  - Test all core features in GameCraft
  - Prepare demo showing same skeleton, different outputs

---

## Implementation Notes

### Files to Modify (Priority Order)

1. **High Priority** (Core functionality):
   - `types.ts` - Category enum and type definitions
   - `services/geminiService.ts` - All AI prompts
   - `utils/storage.ts` - Storage key

2. **Medium Priority** (UI/UX):
   - `components/ChatInterface.tsx` - Input placeholder and categories
   - `components/CustomNodes.tsx` - Node labels and buttons
   - `components/MasterNodeActionsMenu.tsx` - Menu labels
   - `pages/LandingPage.tsx` - Marketing copy

3. **Low Priority** (Metadata):
   - `package.json` - App name and description
   - `index.html` - Page title and meta tags
   - Documentation files

### Files to Keep Unchanged

These files are part of the skeleton and should NOT be modified:
- `pages/CanvasWorkspace.tsx` - Canvas infrastructure
- `contexts/ProjectsContext.tsx` - Project management
- `contexts/AIContext.tsx` - AI state management
- `utils/security.ts` - Validation and sanitization
- `utils/rateLimiter.ts` - Rate limiting
- `utils/validation.ts` - Input validation
- All drawing tool components
- All keyboard shortcut handlers
- All React Flow node infrastructure

### Testing Strategy

**Manual Testing Checklist**:
- [ ] Generate asset in each category (8 categories)
- [ ] Generate at least 2 variations per type (pose, equipment, state, expression)
- [ ] Test Turn Table views
- [ ] Save and reload a project
- [ ] Export project metadata
- [ ] Verify Craftus still works (no interference)

**Property-Based Testing** (Optional):
- Test variation visual consistency (color palette matching)
- Test storage isolation (no cross-contamination)
- Test category validation (reject invalid categories)

### Deployment Checklist

- [ ] Build GameCraft: `npm run build`
- [ ] Test production build locally: `npm run preview`
- [ ] Deploy to Vercel: `vercel deploy`
- [ ] Verify deployment URL works
- [ ] Test all features on deployed version
- [ ] Update README with both deployment URLs

---

## Success Criteria

- [ ] GameCraft generates game assets in all 8 categories
- [ ] Variations maintain character identity while changing specified aspects
- [ ] Turn Table views work for game characters
- [ ] Projects save/load without interfering with Craftus
- [ ] Both apps can run simultaneously on different ports
- [ ] Documentation clearly explains the skeleton approach
- [ ] Demo video shows same infrastructure, different outputs

---

## Estimated Time

| Task | Estimated Time |
|------|----------------|
| Update types and enums | 30 minutes |
| Replace AI prompts | 2-3 hours |
| Update UI labels | 1 hour |
| Update storage keys | 15 minutes |
| Update branding | 30 minutes |
| Testing | 1-2 hours |
| Documentation | 1 hour |
| **Total** | **6-8 hours** |

---

## Quick Reference: Key Changes

| File | Change | From | To |
|------|--------|------|-----|
| `types.ts` | Enum | `CraftCategory` | `AssetCategory` |
| `types.ts` | Type | `DissectionResponse` | `AssetAnalysis` |
| `geminiService.ts` | Function | `generateCraftImage()` | `generateAssetImage()` |
| `geminiService.ts` | Function | `dissectCraft()` | `analyzeAsset()` |
| `geminiService.ts` | Function | `generateStepImage()` | `generateVariationImage()` |
| `ChatInterface.tsx` | Text | "Describe a craft..." | "Describe a game character..." |
| `CustomNodes.tsx` | Label | "Dissect" | "Generate Variations" |
| `CustomNodes.tsx` | Label | "Materials" | "Asset Metadata" |
| `CustomNodes.tsx` | Label | "Step X" | "Variation X" |
| `storage.ts` | Key | `craftus_projects` | `gamecraft_projects` |
| `LandingPage.tsx` | Title | "Craftus" | "GameCraft" |
| `package.json` | Name | "craftus" | "gamecraft" |
