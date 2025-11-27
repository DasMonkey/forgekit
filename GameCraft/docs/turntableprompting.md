# Turn Table Prompting - How to Preserve Exact Style in Image Generation

This document explains how the Turn Table feature in Craftus achieves consistent style preservation when generating different views of the same object.

## Overview

The Turn Table feature generates left, right, and back views of a craft object while maintaining **exact consistency** with the original front view - same colors, materials, proportions, and style.

## Key Technique: Reference Image + Explicit Consistency Prompt

### 1. Passing the Reference Image

The most critical part is sending the original image as inline data to the model:

```typescript
contents: {
  parts: [
    {
      inlineData: {
        mimeType: 'image/png',
        data: cleanBase64,  // Original master image as base64
      },
    },
    { text: prompt },  // Text instructions follow the image
  ],
},
```

**Important:** The image comes FIRST in the parts array, then the text prompt. This tells the AI "here's what I'm referring to, now follow these instructions."

### 2. Model & Configuration

```typescript
model: 'gemini-3-pro-image-preview',
config: {
  imageConfig: {
    aspectRatio: "1:1",  // Square for consistency
    imageSize: "1K",     // 1024px resolution
  },
},
```

### 3. Prompt Structure

The prompt follows a specific pattern designed to maximize consistency:

#### A. Clear Task Definition
```
🎯 YOUR TASK: Generate a LEFT/RIGHT/BACK VIEW of this exact same craft object.
```

#### B. Reference Context
```
📷 REFERENCE IMAGE: This shows the FRONT VIEW of a craft/figure.
🎨 OBJECT: ${craftLabel}  // User's original prompt for context
```

#### C. View-Specific Instructions
```typescript
const viewDescriptions = {
  left: 'LEFT SIDE VIEW (90° rotation to the left) - Show the left profile...',
  right: 'RIGHT SIDE VIEW (90° rotation to the right) - Show the right profile...',
  back: 'BACK VIEW (180° rotation) - Show the back/rear of the object...',
};

const viewAngles = {
  left: 'left side profile, showing the left ear/arm/side details',
  right: 'right side profile, showing the right ear/arm/side details',
  back: 'back view, showing the back of head, back details, any tail or rear features',
};
```

#### D. Critical Requirements (Explicit Consistency Rules)
```
CRITICAL REQUIREMENTS:
1. ✅ SAME OBJECT - Generate the EXACT SAME craft object, not a different one
2. ✅ SAME STYLE - Match the exact same art style, materials, textures, and colors
3. ✅ SAME SCALE - Keep the same size and proportions
4. ✅ SAME LIGHTING - Use similar studio lighting and neutral background
5. ✅ ROTATED VIEW - Show the [specific view angle]
```

#### E. Consistency Rules (Repetition for Emphasis)
```
CONSISTENCY RULES:
- All colors MUST match the reference exactly
- All materials (paper, clay, fabric, etc.) MUST be the same
- All proportions and details MUST be consistent
- The style (photorealistic craft) MUST be maintained
- Background should be similar neutral studio setting
```

#### F. Physical Metaphor (Helps AI Understand the Task)
```
IMAGINE: You have the physical craft object on a turntable/lazy susan.
You spin it 90°/180° and take another photo.
Generate THAT view.
```

#### G. Negative Instructions (What NOT to Do)
```
DO NOT:
- Change the character/object design
- Add or remove features
- Change colors or materials
- Use a different art style
- Show a different craft entirely
```

## Complete Prompt Template

```typescript
const prompt = `
🎯 YOUR TASK: Generate a ${view.toUpperCase()} VIEW of this exact same craft object.

📷 REFERENCE IMAGE: This shows the FRONT VIEW of a craft/figure.
${craftLabel ? `🎨 OBJECT: ${craftLabel}` : ''}

═══════════════════════════════════════════════════════════════
🔄 TURN TABLE VIEW GENERATION
═══════════════════════════════════════════════════════════════

You are creating a ${viewDescriptions[view]}.

CRITICAL REQUIREMENTS:
1. ✅ SAME OBJECT - Generate the EXACT SAME craft object, not a different one
2. ✅ SAME STYLE - Match the exact same art style, materials, textures, and colors
3. ✅ SAME SCALE - Keep the same size and proportions
4. ✅ SAME LIGHTING - Use similar studio lighting and neutral background
5. ✅ ROTATED VIEW - Show the ${viewAngles[view]}

WHAT TO SHOW:
- ${view === 'left' ? 'Left side profile - what you\'d see standing to the left of the object' : ''}
- ${view === 'right' ? 'Right side profile - what you\'d see standing to the right of the object' : ''}
- ${view === 'back' ? 'Back/rear view - what you\'d see standing behind the object' : ''}

CONSISTENCY RULES:
- All colors MUST match the reference exactly
- All materials (paper, clay, fabric, etc.) MUST be the same
- All proportions and details MUST be consistent
- The style (photorealistic craft) MUST be maintained
- Background should be similar neutral studio setting

IMAGINE: You have the physical craft object on a turntable/lazy susan.
You spin it ${view === 'left' ? '90° counter-clockwise' : view === 'right' ? '90° clockwise' : '180°'} and take another photo.
Generate THAT view.

DO NOT:
- Change the character/object design
- Add or remove features
- Change colors or materials
- Use a different art style
- Show a different craft entirely
`;
```

## Why This Works

1. **Visual Reference**: The AI has the actual image to analyze, not just a text description
2. **Explicit Task**: Clear statement of what needs to be done (rotate, not recreate)
3. **Repetition**: Consistency requirements are stated multiple times in different ways
4. **Physical Metaphor**: The turntable analogy helps the AI understand it's the same object from a different angle
5. **Negative Constraints**: Explicitly telling the AI what NOT to do prevents common mistakes
6. **Specific Details**: Mentioning exact attributes (colors, materials, proportions) focuses the AI on preservation

## Applying This to Other Use Cases

### For Style Transfer
```
Reference Image + "Apply this EXACT style to [new subject]"
- List specific style elements to preserve
- Use "MUST match" language
```

### For Character Consistency
```
Reference Image + "Generate this EXACT character doing [action]"
- Emphasize: same face, same outfit, same proportions
- Use negative constraints: "DO NOT change appearance"
```

### For Product Variations
```
Reference Image + "Show this EXACT product in [color/setting]"
- Only allow ONE thing to change
- Lock down everything else explicitly
```

## Key Takeaways

1. **Always include the reference image as inline data**
2. **State consistency requirements multiple times**
3. **Use physical metaphors when helpful**
4. **Include explicit negative constraints**
5. **Be specific about what should stay the same**
6. **Use emphatic language: "EXACT", "MUST", "SAME"**
