# Optimize Step Instructions Prompt

## Problem Analysis

The step instructions image generation (`generateStepImage`) was producing inconsistent results where the craft/character in the generated instruction panels didn't match the reference image exactly. The Turn Table feature had much better consistency.

### Why Turn Table Works Better

Analyzed `generateTurnTableView` (lines 1297-1402) and found these success patterns:
1. **Consistency requirements come FIRST** - not buried in the middle
2. **Physical metaphor** - "turntable/lazy susan" helps AI understand the task
3. **Focused task** - ~40 lines, one clear goal
4. **Repetition** - Consistency rules stated multiple times in different ways
5. **Explicit negative constraints** - "DO NOT change colors/materials/design"

### Problems with Old Step Instructions

1. **Task overload** - ~110 lines trying to do too much at once
2. **Consistency buried** - Important matching requirements scattered throughout
3. **No physical metaphor** - AI doesn't understand it's building the SAME craft
4. **Formatting first** - Panel layout prioritized over character consistency

---

## Fix Plan

- [x] Restructure `generateStepImage` prompt based on Turn Table pattern
- [x] Put CONSISTENCY REQUIREMENTS FIRST (before panel format)
- [x] Add physical metaphor: "craft kit with pre-made pieces"
- [x] Simplify prompt while keeping multi-panel requirements
- [x] Move DO NOT constraints to the end (like Turn Table)

---

## Review

### Changes Made

**geminiService.ts - generateStepImage (lines 413-525)**

Restructured the entire prompt to follow Turn Table's successful pattern:

1. **Header with context** (like Turn Table)
   - Clear task definition: "Generate a MULTI-PANEL INSTRUCTION IMAGE"
   - Reference image context: "This is the FINISHED craft"
   - Craft label and category info

2. **CONSISTENCY REQUIREMENTS FIRST** (the key change)
   - 5 numbered requirements with checkmarks
   - Physical metaphor: "You have a craft kit in front of you with pre-made pieces that will assemble into THIS EXACT craft"
   - Repeated emphasis: "CONSISTENCY RULES (REPEAT FOR EMPHASIS)"

3. **Step description** (middle section)
   - Clear current step info
   - Simple instruction to show only this step's components

4. **Multi-panel format** (kept but simplified)
   - Same 2x2 panel layout
   - Simplified mandatory elements list
   - Category-specific rules still included

5. **DO NOT section at the end** (like Turn Table)
   - Clean bulleted list of what to avoid
   - No electronics/power tools reminder

### Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| Prompt structure | Consistency buried | Consistency FIRST |
| Physical metaphor | None | "Craft kit assembly" |
| Prompt length | ~110 lines verbose | ~80 lines focused |
| Primary goal | Panel formatting | Reference matching |
| DO NOT constraints | Scattered | Clean section at end |

### Expected Results

The optimized prompt should produce step instruction images where:
- Colors match the reference image exactly
- Unique features (spots, patches, accessories) are preserved
- Construction style matches (flat vs 3D vs rounded)
- The RESULT panel looks identical to the reference craft

---

## Additional Optimization: Parallel Step Generation

### Change Made

**CanvasWorkspace.tsx - handleDissectSelected (lines 1681-1746)**

Changed from sequential `for` loop to parallel `Promise.all()`:

| Before | After |
|--------|-------|
| Sequential `for` loop with `await` | Parallel `Promise.all()` with `.map()` |
| Steps generated one-by-one | All 4 steps start simultaneously |
| ~40+ seconds total (10s × 4) | ~10-15 seconds total |

**Code change:**
```typescript
// BEFORE: Sequential (slow)
for (const step of dissection.steps) {
  const imageUrl = await generateStepImage(...);
}

// AFTER: Parallel (fast)
const stepPromises = dissection.steps.map(async (step) => {
  return await generateStepImage(...);
});
await Promise.all(stepPromises);
```

### Benefits
- **4x faster** - All API calls run simultaneously instead of waiting
- **Better UX** - User sees all step images appear around the same time
- **Individual error handling** - One failed step doesn't block others

---

## Pattern Sheet Optimization (Turn Table Pattern Applied)

### Problem
Pattern sheet prompt was missing consistency emphasis - focused on technical unwrapping rules but didn't emphasize matching the reference image's exact colors/style.

### Changes Made

**geminiService.ts - generateSVGPatternSheet (lines 654-835)**

Restructured the prompt to follow Turn Table's successful pattern:

1. **CONSISTENCY REQUIREMENTS FIRST** (new section)
   - 5 numbered requirements with checkmarks
   - Physical metaphor: "unwrapping/unfolding the ACTUAL physical craft"
   - Repeated emphasis: "CONSISTENCY RULES (REPEAT FOR EMPHASIS)"
   - Explicit color matching: "Sample the actual RGB values from the reference image"

2. **PART-BY-PART ANALYSIS** (new section)
   - Forces AI to analyze EACH part before drawing
   - 5 questions for every component:
     1. What is this part?
     2. What 3D SHAPE is it?
     3. What COLOR is it in the reference?
     4. What DETAILS does it have?
     5. How should it UNWRAP?

3. **Simplified unwrapping guide** (kept but streamlined)
   - Same 3D→2D shape table but cleaner
   - Example analysis showing color placeholders from reference

4. **DO NOT section at the end** (new)
   - Clean bulleted list of what to avoid
   - Emphasis on matching reference colors

### Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| Consistency | Not emphasized | FIRST section |
| Per-part analysis | None | Required for EACH part |
| Physical metaphor | None | "Unwrapping actual craft" |
| Color matching | Mentioned once | Repeated throughout |
| DO NOT constraints | None | Clean section at end |

### Expected Results
- Pattern piece colors match reference EXACTLY
- AI analyzes each part's 3D shape before unwrapping
- Unique details (spots, stripes) appear on pattern pieces
- Assembled result looks identical to reference craft
