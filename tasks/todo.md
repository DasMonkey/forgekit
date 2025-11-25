# Craftus - Instruction Image Generation Fix Plan

## Requirements Summary

### What We Want
1. **Multi-Panel Layout** ✓ - Keep the 2-4 panel format per step image
2. **Maximum 4 Steps** - Break character into logical body part groups
3. **Category-Specific Rules** - Only send selected category rules, not all 8
4. **Body Part Grouping** - Intelligent grouping (Head+Hair+Accessories, Body, Clothing, Props/Base)
5. **Visual Consistency** - EVERY step image must reference and match the master image exactly

### Current Issues
1. Prompts send ALL category rules instead of just the selected one
2. Dissection doesn't enforce body-part-based step grouping
3. Reference image matching not emphasized enough
4. Step descriptions are generic instead of body-part focused

---

## Implementation Plan

### Task 1: Fix Dissection Prompt for Body-Part Grouping
**File**: `services/geminiService.ts` - `dissectCraft()` and `dissectSelectedObject()`

Update the dissection prompt to:
- Enforce MAXIMUM 4 STEPS
- Group by body parts: Head/Hair/Face, Body/Torso, Clothing/Outfit, Props/Base
- Be explicit about what each step should contain

### Task 2: Send Only Selected Category Rules
**File**: `services/geminiService.ts` - `generateStepImage()`

Change:
- Currently: `getCategorySpecificRules(category)` returns 100+ lines
- After: Create smaller, focused rules and only include the selected category

### Task 3: Strengthen Reference Image Anchoring
**File**: `services/geminiService.ts` - `generateStepImage()`

Add at the TOP of the prompt:
```
🎨 MANDATORY REFERENCE IMAGE MATCHING:
The attached image is your ONLY reference. You MUST:
- Match EXACT colors (sample RGB values from reference)
- Match EXACT textures and materials
- Match EXACT style and design aesthetic
- DO NOT invent new colors or styles
```

### Task 4: Refine Category Rules (Smaller, Focused)
**File**: `services/geminiService.ts` - `getCategorySpecificRules()`

Reduce from 100+ lines per category to ~20-30 focused lines that emphasize:
- Material appearance
- Panel layout for that category
- Key visual elements

---

## Todo Checklist

- [ ] Task 1: Update dissection prompts for body-part grouping (4 steps max)
- [ ] Task 2: Refactor to send only selected category rules
- [ ] Task 3: Add reference image anchoring at prompt start
- [ ] Task 4: Simplify category rules (keep multi-panel, remove excess)
- [ ] Task 5: Test with sample crafts

---

## Detailed Changes

### Change 1: Dissection Prompt Update

**Location**: `dissectCraft()` line ~1468 and `dissectSelectedObject()` line ~1318

**New Step Grouping Instructions**:
```
STEP GROUPING BY BODY PARTS (MANDATORY):
You MUST create EXACTLY 4 steps grouped by body parts:

Step 1 - HEAD GROUP: Head, face, hair, facial features, head accessories (crown, hat, earrings, glasses)
Step 2 - BODY GROUP: Torso, chest, back, neck connection
Step 3 - CLOTHING GROUP: All clothing items (dress, shirt, pants, armor, cape)
Step 4 - LIMBS & PROPS GROUP: Arms, hands, legs, feet, shoes, weapons, tools, base/stand

If the craft doesn't have all parts (e.g., no clothing), combine groups logically.
Each step's multi-panel image will show ONLY that group's components.
```

### Change 2: Category-Specific Rules Only

**Current Code** (line ~675):
```typescript
const categoryRules = getCategorySpecificRules(category);
```

This already only gets the selected category. BUT the rules themselves are too long.

**Solution**: Simplify `getCategorySpecificRules()` to return shorter, focused rules.

### Change 3: Reference Image Anchor

**Add at TOP of prompt** (before any other instructions):
```
📷 REFERENCE IMAGE (ATTACHED):
This is your ONLY style guide. You MUST match:
✓ EXACT colors - Sample the RGB values directly
✓ EXACT textures - Paper grain, clay matte, fabric weave as shown
✓ EXACT proportions - Character features match reference
✓ EXACT style - Same artistic approach

DO NOT:
✗ Invent new colors not in the reference
✗ Change the art style
✗ Add elements not visible in reference
```

### Change 4: Simplified Category Rules

**Example - Papercraft (reduced from 150 lines to 30)**:
```
PAPERCRAFT MULTI-PANEL FORMAT:

PANEL 1 - PATTERN SHEETS:
- Show flat pattern pieces laid out (knolling style)
- Include cut lines (solid) and fold lines (dashed)
- Add glue tabs where pieces connect
- Match EXACT colors from reference image

PANEL 2 - ASSEMBLY:
- Show hands folding/gluing pieces
- Use arrows showing fold direction
- Add text labels: "FOLD", "GLUE TAB"

PANEL 3 - RESULT:
- Show completed component for this step
- Match reference image appearance exactly

BACKGROUND: White with subtle grid
STYLE: Clean, professional instruction manual
```

---

## Review Section

### Changes Summary

**File Modified**: `services/geminiService.ts`

#### Change 1: Dissection Prompts - Body Part Grouping
- Updated `dissectSelectedObject()` (line ~1318) with mandatory 4-step body part grouping
- Updated `dissectCraft()` (line ~1482) with same body part grouping
- Steps are now enforced as:
  - Step 1: HEAD GROUP (head, face, hair, head accessories)
  - Step 2: BODY GROUP (torso, chest, neck)
  - Step 3: CLOTHING/SURFACE GROUP (clothes, patterns, textures)
  - Step 4: LIMBS & PROPS GROUP (arms, legs, props, base)

#### Change 2: Simplified Category Rules
- Reduced `getCategorySpecificRules()` from ~450 lines to ~120 lines
- Each category now has ~15-25 focused lines instead of 50-100
- Kept essential multi-panel format instructions
- Removed redundant examples and overly detailed instructions

#### Change 3: Reference Image Anchoring
- Moved reference image matching to the TOP of `generateStepImage` prompt
- Added explicit "MUST match" and "DO NOT" rules for colors, textures, style
- Reference image emphasis is now the first thing AI sees

#### Change 4: Restructured Step Image Prompt
- Reduced from ~200 lines to ~50 lines
- Clear flow: Reference Anchor → Task → Format → Category Rules → Critical Rules
- Removed complex "analysis before generation" section
- Removed 3D unwrapping/UV mapping technical details (too complex)
- Simplified panel layout description

### Key Improvements
1. **Clearer prompts** - AI now sees the most important instruction first (match reference)
2. **Consistent steps** - All crafts now use 4 body-part-based steps
3. **Focused rules** - Category rules are shorter and more actionable
4. **Better scope** - Each step explicitly shows ONLY its body part group

### Testing Needed
- [ ] Test with human character (e.g., "Princess Peach papercraft")
- [ ] Test with animal (e.g., "Clay turtle")
- [ ] Test with object (e.g., "Papercraft house")
- [ ] Verify colors match reference image
- [ ] Verify multi-panel format is generated
- [ ] Verify step images only show relevant body parts
