import { GoogleGenAI, Type } from "@google/genai";
import { CraftCategory, DissectionResponse } from "../types";
import { imageGenerationLimiter, dissectionLimiter, trackApiUsage } from "../utils/rateLimiter";
import { decryptApiKey } from "../utils/encryption";

// Application API key (fallback)
const appApiKey = process.env.API_KEY || '';

/**
 * Gets the API key to use for requests
 * Prioritizes user's personal API key over application key
 */
const getApiKey = (): string => {
  try {
    // Check for user's personal API key in LocalStorage
    const encryptedKey = localStorage.getItem('craftus_user_api_key');
    if (encryptedKey) {
      try {
        const userKey = decryptApiKey(encryptedKey);
        if (userKey) {
          console.log('Using personal API key');
          return userKey;
        }
      } catch (error) {
        console.warn('Failed to decrypt user API key, falling back to app key');
        // Remove invalid key
        localStorage.removeItem('craftus_user_api_key');
      }
    }
  } catch (error) {
    console.warn('Error accessing user API key:', error);
  }

  // Fall back to application API key
  console.log('Using application API key');
  return appApiKey;
};

const getAiClient = () => new GoogleGenAI({ apiKey: getApiKey() });

/**
 * Helper to wait for a specified duration.
 */
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry wrapper for API calls to handle 503/429 Overloaded errors.
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 2000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isOverloaded = error?.status === 503 || error?.code === 503 || error?.message?.includes('overloaded');
    
    if (retries > 0 && isOverloaded) {
      console.warn(`Model overloaded. Retrying in ${delay}ms... (${retries} attempts left)`);
      await wait(delay);
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Generates a realistic image of the craft concept.
 */
export const generateCraftImage = async (
  prompt: string,
  category: CraftCategory
): Promise<string> => {
  // Check rate limit before making request
  if (!imageGenerationLimiter.canMakeRequest()) {
    const waitTime = imageGenerationLimiter.getTimeUntilNextRequest();
    const waitSeconds = Math.ceil(waitTime / 1000);
    throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds before generating another image.`);
  }

  const ai = getAiClient();
  
  const fullPrompt = `
    Create a photorealistic studio photograph of a DIY craft project: ${prompt}.
    Category: ${category}.
    Style: Neutral background, even studio lighting, highly detailed textures showing materials like fabric grain, paper fibers, wood grain, or metal. 
    The object should look tangible, handmade, and finished.
    View: Isometric or front-facing, centered.
  `;

  return retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: fullPrompt }],
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
        trackApiUsage('generateCraftImage', true);
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    trackApiUsage('generateCraftImage', false);
    throw new Error("Failed to generate image");
  }).catch((error) => {
    trackApiUsage('generateCraftImage', false);
    throw error;
  });
};

/**
 * Generates a craft-style image from an uploaded image.
 * Transforms the uploaded image into a studio-quality craft reference image.
 */
export const generateCraftFromImage = async (
  imageBase64: string,
  category: CraftCategory
): Promise<string> => {
  // Check rate limit before making request
  if (!imageGenerationLimiter.canMakeRequest()) {
    const waitTime = imageGenerationLimiter.getTimeUntilNextRequest();
    const waitSeconds = Math.ceil(waitTime / 1000);
    throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds before generating another image.`);
  }

  const ai = getAiClient();
  const cleanBase64 = imageBase64.split(',')[1] || imageBase64;

  const prompt = `
    Transform this image into a photorealistic studio photograph of a DIY craft project.
    
    Target Category: ${category}
    
    Style Requirements:
    - Recreate the subject/object from the image as a handmade craft in the ${category} style
    - Neutral background with even studio lighting
    - Highly detailed textures showing craft materials (paper fibers, clay texture, fabric weave, wood grain, etc.)
    - The object should look tangible, handmade, and finished
    - Match the general form and colors of the original image
    - View: Isometric or front-facing, centered
    
    Material Guidelines by Category:
    - Papercraft: Paper, cardstock, glue, scissors - show paper texture and fold lines
    - Clay: Polymer clay, sculpting tools - show matte clay texture and sculpted details
    - Fabric/Sewing: Fabric, thread, stuffing - show fabric weave and stitching
    - Costume & Props: Foam, thermoplastic, paint - show foam texture and painted surfaces
    - Woodcraft: Wood, dowels, joints - show wood grain and joinery
    - Jewelry: Beads, wire, metal findings - show metal shine and bead clarity
    - Kids Crafts: Simple materials, bright colors - show playful, safe materials
    - Tabletop Figures: Miniature parts, primer, paint - show miniature scale and paint details
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

/**
 * Get category-specific visual rules for step image generation.
 * Simplified rules focusing on essential multi-panel format per category.
 */
const getCategorySpecificRules = (category: CraftCategory): string => {
  const categoryRules: Record<string, string> = {
    'Papercraft': `
PAPERCRAFT MULTI-PANEL FORMAT (2-4 PANELS):

⚠️ CHARACTER/OBJECT LIMIT: Maximum 2 characters or objects per craft project.
If the reference shows more than 2, focus on the main 1-2 characters only.

PANEL 1 - PATTERN SHEETS (KNOLLING LAYOUT):
- Show flat pattern pieces laid out side-by-side (never stacked)
- Include: Cut lines (solid), Fold lines (dashed), Glue tabs
- Label each piece with numbers/letters
- Use LOW-POLY geometric style for 3D forms
- 100% PAPER only - no foam, wire, or fabric
- Match EXACT colors from reference image

PANEL 2 - ASSEMBLY:
- Show hands folding/gluing pieces
- BOLD ARROWS showing fold direction
- Text labels: "FOLD", "GLUE TAB", "ALIGN"

PANEL 3 - DETAILS (if needed):
- Show adding decorative elements
- Arrows pointing to attachment points

PANEL 4 - RESULT:
- Show completed component for this step only
- Match reference image appearance exactly

BACKGROUND: White with subtle grid
MATERIALS: Paper only, no electronics`,

    'Clay': `
CLAY MULTI-PANEL FORMAT (2-4 PANELS):

⚠️ CHARACTER/OBJECT LIMIT: Maximum 2 characters or objects per craft project.
If the reference shows more than 2, focus on the main 1-2 characters only.

PANEL 1 - CLAY PIECES (KNOLLING):
- Show clay pieces organized flat
- Include size references: "pea-sized", "walnut-sized"
- Label: "Body", "Arms (x2)", "Head"
- Match EXACT colors from reference image

PANEL 2 - SHAPING:
- Show hands sculpting clay
- ARROWS showing pinch/roll directions
- Text: "ROLL", "PINCH", "SMOOTH"

PANEL 3 - ATTACHMENT:
- Show hands connecting pieces
- Arrows to connection points
- Text: "BLEND SEAM", "PRESS FIRMLY"

PANEL 4 - RESULT:
- Show completed component
- Matte clay texture (not glossy)

BACKGROUND: White, soft lighting
MATERIALS: Clay only, no electronics`,

    'Fabric/Sewing': `
FABRIC MULTI-PANEL FORMAT (2-4 PANELS):

PANEL 1 - PATTERN PIECES (KNOLLING):
- Show fabric pieces laid flat
- Label: "Front", "Back", "Sleeve (x2)"
- Include seam allowance markings
- Match fabric color/texture from reference

PANEL 2 - SEWING:
- Show hands positioning/sewing
- ARROWS showing stitch direction
- Text: "SEW SEAM", "PIN HERE"

PANEL 3 - ASSEMBLY:
- Show pieces being joined/stuffed
- Arrows to connection points

PANEL 4 - RESULT:
- Show completed component

BACKGROUND: White
MATERIALS: Fabric, thread only`,

    'Costume & Props': `
COSTUME/PROPS MULTI-PANEL FORMAT (2-4 PANELS):

PANEL 1 - FOAM PIECES (KNOLLING):
- Show foam/thermoplastic pieces laid out
- Label with thickness: "10mm base", "2mm detail"
- Show bevel angles (45°)
- Match colors from reference

PANEL 2 - SHAPING:
- Show cutting/heating/beveling
- ARROWS showing cut lines
- Text: "BEVEL EDGE", "HEAT FORM"

PANEL 3 - ASSEMBLY:
- Show gluing pieces together
- Arrows to connection points

PANEL 4 - RESULT:
- Show completed component

BACKGROUND: White
MATERIALS: EVA foam, no electronics`,

    'Woodcraft': `
WOODCRAFT MULTI-PANEL FORMAT (2-4 PANELS):

⚠️ CHARACTER/OBJECT LIMIT: Maximum 2 characters or objects per craft project.
If the reference shows more than 2, focus on the main 1-2 characters only.

PANEL 1 - WOOD PIECES (KNOLLING):
- Show cut boards, dowels laid out
- Label with measurements
- Show grain direction
- Match wood type from reference

PANEL 2 - JOINING:
- Show hands working wood
- ARROWS showing joint alignment
- Text: "ALIGN GRAIN", "SAND SMOOTH"

PANEL 3 - ASSEMBLY:
- Show attaching pieces
- Arrows to joints

PANEL 4 - RESULT:
- Show completed component

BACKGROUND: White
MATERIALS: Wood only, no power tools visible`,

    'Jewelry': `
JEWELRY MULTI-PANEL FORMAT (2-4 PANELS):

PANEL 1 - COMPONENTS (KNOLLING):
- Show beads, wire, findings laid out
- Label with quantities
- Match metal color, bead clarity from reference

PANEL 2 - TECHNIQUE:
- Show hands forming loops/connections
- ARROWS showing wire bending
- Text: "BEND WIRE", "OPEN RING"

PANEL 3 - CONNECTION:
- Show attaching components
- Arrows to connection points

PANEL 4 - RESULT:
- Show completed section

BACKGROUND: White, soft lighting
MATERIALS: Beads, wire, findings only`,

    'Kids Crafts': `
KIDS CRAFTS MULTI-PANEL FORMAT (2-4 PANELS):

⚠️ CHARACTER/OBJECT LIMIT: Maximum 2 characters or objects per craft project.
If the reference shows more than 2, focus on the main 1-2 characters only.

PANEL 1 - MATERIALS (KNOLLING):
- Show felt, foam, paper shapes laid out
- Label: "Red circle", "Blue star"
- Bright, playful colors
- Match colors from reference

PANEL 2 - ASSEMBLY:
- Show hands assembling
- BIG BOLD ARROWS showing where to glue
- Simple text: "GLUE HERE", "FOLD"

PANEL 3 - DECORATE:
- Show adding eyes, details
- Arrows showing placement

PANEL 4 - RESULT:
- Show finished craft

BACKGROUND: White
MATERIALS: Safe, kid-friendly only`,

    'Tabletop Figures': `
MINIATURE MULTI-PANEL FORMAT (2-4 PANELS):

⚠️ CHARACTER/OBJECT LIMIT: Maximum 2 figures per craft project.
If the reference shows more than 2, focus on the main 1-2 figures only.

PANEL 1 - PARTS (KNOLLING):
- Show miniature parts laid out
- Label: "Torso", "Arms (x2)", "Base"
- Show scale reference (28mm)
- Match primer/paint colors from reference

PANEL 2 - ASSEMBLY:
- Show hands gluing parts
- ARROWS to connection points
- Text: "GLUE JOINT", "ALIGN PIN"

PANEL 3 - SUB-ASSEMBLY:
- Show partial assembly
- Arrows for next attachments

PANEL 4 - RESULT:
- Show completed assembly step

BACKGROUND: White
MATERIALS: Miniature parts, glue only`,
  };

  return categoryRules[category] || `
MULTI-PANEL FORMAT (2-4 PANELS):

⚠️ CHARACTER/OBJECT LIMIT: Maximum 2 characters or objects per craft project.
If the reference shows more than 2, focus on the main 1-2 characters only.

PANEL 1 - MATERIALS: Show components in knolling layout, labeled
PANEL 2 - TECHNIQUE: Show hands demonstrating, with arrows and text
PANEL 3 - ASSEMBLY: Show connecting parts
PANEL 4 - RESULT: Show completed component

Match EXACT colors from reference image.
WHITE BACKGROUND, no electronics.`;
};

/**
 * Generates a visualization for a specific step using the master image as reference.
 *
 * OPTIMIZED PROMPT STRUCTURE (based on Turn Table success):
 * 1. Reference image comes FIRST in the parts array
 * 2. Consistency requirements are stated FIRST and repeatedly
 * 3. Physical metaphor helps AI understand the task
 * 4. Explicit negative constraints prevent common mistakes
 */
export const generateStepImage = async (
  originalImageBase64: string,
  stepDescription: string,
  category: CraftCategory,
  targetObjectLabel?: string,
  stepNumber?: number // Optional step number to determine if this is step 1
): Promise<string> => {
  const ai = getAiClient();
  const cleanBase64 = originalImageBase64.split(',')[1] || originalImageBase64;

  const categoryRules = getCategorySpecificRules(category);

  // Use default 1K resolution for all steps (no special handling)
  console.log(`🖼️ Generating image for: ${stepDescription}`);
  console.log(`   Step Number: ${stepNumber || 'N/A'}`);
  console.log(`   Resolution: 1K (default)`);

  // Build the prompt with Turn Table's successful pattern:
  // 1. CONSISTENCY FIRST - Reference image matching is THE PRIMARY GOAL
  // 2. Physical metaphor - "photographing a craft kit"
  // 3. Then the multi-panel format requirements
  // 4. Explicit DO NOT constraints at the end

  const prompt = `
🎯 YOUR TASK: Generate a MULTI-PANEL INSTRUCTION IMAGE for building this EXACT craft.

📷 REFERENCE IMAGE: This is the FINISHED craft you are creating instructions for.
${targetObjectLabel ? `🎨 CRAFT: ${targetObjectLabel}` : ''}
📦 CATEGORY: ${category}

═══════════════════════════════════════════════════════════════
🔒 CONSISTENCY REQUIREMENTS (CRITICAL - READ FIRST)
═══════════════════════════════════════════════════════════════

You MUST preserve EXACT visual consistency with the reference image:

1. ✅ SAME CHARACTER/OBJECT - This is the EXACT craft being built, not a similar one
2. ✅ SAME COLORS - Match colors EXACTLY (sample RGB values from reference)
3. ✅ SAME STYLE - Match the art style, materials, and textures precisely
4. ✅ SAME PROPORTIONS - Keep all size ratios identical
5. ✅ SAME UNIQUE FEATURES - Every detail matters (spots, patches, accessories, facial features)

IMAGINE: You have a craft kit in front of you with pre-made pieces that will assemble into THIS EXACT craft from the reference image. You're photographing the assembly process step-by-step. The pieces in your photos MUST match what's in the finished reference.

🔴 CRITICAL - PARTS MUST MATCH REFERENCE:
The arms, legs, head, body pieces you show MUST be parts of THIS EXACT character.
- If the reference shows a RED strawberry bear → show RED arm pieces, RED leg pieces
- If the reference has LOW-POLY faceted style → show LOW-POLY faceted arm/leg pieces
- If the reference has spotted texture → the pieces must have that SAME spotted texture
- The pieces are NOT generic - they are pre-cut/pre-made to become THIS character

CONSISTENCY RULES (REPEAT FOR EMPHASIS):
- All colors MUST match the reference EXACTLY
- All materials (paper, clay, fabric, etc.) MUST be the same
- All unique details MUST be preserved (leaf on head, belly patch, ear shape, etc.)
- Every component shown MUST look like it belongs to the reference character
- Construction style MUST match (flat/layered vs 3D/folded vs rounded)

${targetObjectLabel ? `
🎯 FOCUS ON: "${targetObjectLabel}" ONLY
- If reference shows multiple objects, create instructions for "${targetObjectLabel}" only
- Match "${targetObjectLabel}"'s exact colors and features
` : ''}

═══════════════════════════════════════════════════════════════
📋 STEP TO ILLUSTRATE
═══════════════════════════════════════════════════════════════

CURRENT STEP: "${stepDescription}"

Show ONLY the components mentioned in this step.
Do NOT include parts from other steps.

═══════════════════════════════════════════════════════════════
📐 MULTI-PANEL FORMAT (2-4 PANELS)
═══════════════════════════════════════════════════════════════

┌─────────────┬─────────────┐
│  PANEL 1    │  PANEL 2    │
│  MATERIALS  │  ASSEMBLY   │
├─────────────┼─────────────┤
│  PANEL 3    │  PANEL 4    │
│  DETAILS    │  RESULT     │
└─────────────┴─────────────┘

PANEL 1 - MATERIALS: Show components in knolling layout, labeled
PANEL 2 - ASSEMBLY: Show hands working with BOLD ARROWS and text labels
PANEL 3 - DETAILS: Show finishing touches (combine with Panel 2 if simple)
PANEL 4 - RESULT: Show completed component - MUST match reference exactly

MANDATORY ELEMENTS:
✓ Clear panel divisions with labels
✓ BOLD ARROWS (→ ➜ ⬇) showing direction
✓ TEXT ANNOTATIONS: "FOLD", "GLUE", "ATTACH"
✓ HANDS demonstrating technique
✓ WHITE BACKGROUND - clean, no grid patterns

${categoryRules}

═══════════════════════════════════════════════════════════════
🚫 DO NOT
═══════════════════════════════════════════════════════════════

- Change the character/craft appearance in ANY way
- Use different colors than shown in reference
- Simplify or modify unique features
- Create a "generic" version instead of THIS EXACT craft
- Add or remove features not in the reference
- Include parts from other steps
- Use electronics or power tools
  `;

  return retryWithBackoff(async () => {
    const imageConfig: any = {
      aspectRatio: "16:9",
      // Use default 1K resolution for all steps
    };

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
        imageConfig,
        thinkingConfig: {
          includeThoughts: true, // Enable thinking mode for better image planning
        }
      },
    });

    // Extract thinking process - part.thought is a boolean flag
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    // Collect all thinking parts (where part.thought === true)
    const thinkingTexts: string[] = [];

    for (const part of parts) {
      const partAny = part as any;
      if (partAny.text && partAny.thought === true) {
        thinkingTexts.push(partAny.text);
      }
    }

    if (thinkingTexts.length > 0) {
      console.log('\n💭 === AI THINKING PROCESS (Image Generation) ===');
      console.log('Step:', stepDescription.substring(0, 60) + '...');
      console.log('\nThinking:');
      console.log(thinkingTexts.join('\n'));
      console.log('=== END THINKING ===\n');
    }

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Failed to generate step image");
  });
};

/**
 * Generates a comprehensive pattern sheet showing all components
 * of the craft organized by element (hair, head, dress, props, etc.)
 *
 * This generates different types of pattern sheets based on the category:
 * - Papercraft: 3D unwrapped patterns with fold lines
 * - Fabric/Sewing: Fabric pattern pieces with seam allowances
 * - Costume/Props: EVA foam pieces with beveling guides
 * - Woodcraft: Wood cutting templates with grain direction
 * - Kids Crafts: Simple cutting templates
 * - Clay/Jewelry/Tabletop: Not applicable (no cutting templates needed)
 */
export const generateSVGPatternSheet = async (
  originalImageBase64: string,
  category: CraftCategory,
  craftLabel?: string
): Promise<string> => {
  console.log('🔍 [generateSVGPatternSheet] Function called');
  console.log('📊 Parameters:', { category, craftLabel, imageBase64Length: originalImageBase64?.length });

  // Check rate limit before making request
  if (!imageGenerationLimiter.canMakeRequest()) {
    const waitTime = imageGenerationLimiter.getTimeUntilNextRequest();
    const waitSeconds = Math.ceil(waitTime / 1000);
    console.error('⚠️ Rate limit exceeded');
    throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds before generating another image.`);
  }

  console.log('✅ Rate limit check passed');

  const ai = getAiClient();
  console.log('✅ AI client obtained');

  const cleanBase64 = originalImageBase64.split(',')[1] || originalImageBase64;
  console.log('✅ Base64 cleaned, length:', cleanBase64.length);

  // Category-specific pattern type
  const getCategoryPatternType = (cat: CraftCategory): string => {
    switch (cat) {
      case CraftCategory.PAPERCRAFT:
        return 'papercraft pattern template with 3D unwrapped patterns (UV-mapped like 3D modeling)';
      case CraftCategory.CLAY:
        return 'clay sculpting reference sheet showing required clay pieces, colors, and assembly guide';
      case CraftCategory.COSTUME_PROPS:
        return 'foam armor/prop pattern template showing EVA foam pieces, beveled edges, and heat-forming guides';
      case CraftCategory.WOODCRAFT:
        return 'woodworking pattern sheet with cut pieces, grain direction, and assembly order';
      case CraftCategory.JEWELRY:
        return 'jewelry assembly diagram showing beads, wire wrapping steps, and component layout';
      case CraftCategory.KIDS_CRAFTS:
        return 'simple craft template with easy-to-cut shapes and minimal assembly';
      case CraftCategory.COLORING_BOOK:
        return 'detailed black and white line art coloring page with clean outlines and no fills';
      default:
        return 'craft pattern template';
    }
  };

  const patternType = getCategoryPatternType(category);

  // Build the prompt with Turn Table's successful pattern:
  // 1. CONSISTENCY FIRST - Reference image matching is THE PRIMARY GOAL
  // 2. Per-part analysis - AI must analyze EACH part's 3D shape
  // 3. Physical metaphor - "unwrapping/unfolding the actual craft"
  // 4. Explicit DO NOT constraints at the end

  const prompt = `
🎯 YOUR TASK: Create a ${patternType} for THIS EXACT craft from the reference image.

📷 REFERENCE IMAGE: This is the FINISHED 3D craft you are creating patterns for.
${craftLabel ? `🎨 CRAFT: ${craftLabel}` : ''}
📦 CATEGORY: ${category}

═══════════════════════════════════════════════════════════════
🔒 CONSISTENCY REQUIREMENTS (CRITICAL - READ FIRST)
═══════════════════════════════════════════════════════════════

You MUST preserve EXACT visual consistency with the reference image:

1. ✅ SAME COLORS - Every pattern piece MUST use the EXACT colors from the reference
2. ✅ SAME PROPORTIONS - Size ratios between parts MUST match the reference
3. ✅ SAME DETAILS - Spots, stripes, patches, facial features MUST be on the pattern pieces
4. ✅ SAME STYLE - If reference is low-poly/faceted, patterns should create that style
5. ✅ SAME CHARACTER - These patterns will recreate THIS EXACT craft, not a generic version

IMAGINE: You are carefully unwrapping/unfolding the ACTUAL physical craft from the reference image. Each piece you draw is literally peeled off THIS craft. The colors and details on your patterns come directly from what you see in the reference.

🔴 CRITICAL - COLORS MUST MATCH:
- If the reference shows a RED strawberry bear → ALL body pieces are RED
- If the reference has GREEN leaves → leaf patterns are that EXACT GREEN
- If the reference has spotted texture → spots appear ON the pattern pieces
- Sample the actual RGB values from the reference image

CONSISTENCY RULES (REPEAT FOR EMPHASIS):
- Pattern colors MUST match the reference EXACTLY
- Pattern proportions MUST create the same sized result
- All unique details MUST appear on the relevant pattern pieces
- The assembled result MUST look identical to the reference

${craftLabel ? `
🎯 FOCUS ON: "${craftLabel}" ONLY
- Create patterns specifically for "${craftLabel}"
- Match "${craftLabel}"'s exact colors and features
` : ''}

═══════════════════════════════════════════════════════════════
🧠 PART-BY-PART ANALYSIS (THINK FOR EACH PART)
═══════════════════════════════════════════════════════════════

Before drawing ANY patterns, you MUST analyze EACH part of the craft:

For EVERY visible component, ask yourself:
1. What is this part? (head, body, arm, leg, ear, tail, accessory, etc.)
2. What 3D SHAPE is it? (sphere, cylinder, cube, cone, oval, etc.)
3. What COLOR is it in the reference?
4. What DETAILS does it have? (spots, stripes, face, texture)
5. How should this 3D shape UNWRAP into flat pieces?

${category === CraftCategory.PAPERCRAFT ? `
═══════════════════════════════════════════════════════════════
📐 3D SHAPE → 2D PATTERN UNWRAPPING GUIDE
═══════════════════════════════════════════════════════════════

A flat circle CANNOT become a 3D ball! Use proper unwrapping:

┌─────────────────┬────────────────────────────────────────────┐
│ 3D SHAPE        │ CORRECT 2D UNWRAP PATTERN                  │
├─────────────────┼────────────────────────────────────────────┤
│ SPHERE/BALL     │ 4-8 PETAL/GORE SEGMENTS (like orange peel) │
│                 │ Pointed ovals that join at top and bottom  │
├─────────────────┼────────────────────────────────────────────┤
│ CYLINDER/TUBE   │ RECTANGLE (body) + 2 CIRCLES (caps)        │
│                 │ Width = circumference, Height = length     │
├─────────────────┼────────────────────────────────────────────┤
│ CONE            │ PIE/FAN WEDGE (partial circle)             │
│                 │ Rolls into cone when edges meet            │
├─────────────────┼────────────────────────────────────────────┤
│ CUBE/BOX        │ CROSS-SHAPED NET (6 connected faces)       │
│                 │ Classic cube unfolding with glue tabs      │
├─────────────────┼────────────────────────────────────────────┤
│ HALF-SPHERE     │ 4-6 HALF-PETAL segments + circular base    │
├─────────────────┼────────────────────────────────────────────┤
│ OVAL/EGG        │ TAPERED PETALS (wider at middle)           │
├─────────────────┼────────────────────────────────────────────┤
│ PYRAMID         │ TRIANGLE PANELS + base polygon             │
└─────────────────┴────────────────────────────────────────────┘

EXAMPLE ANALYSIS - If reference shows a bear character:
• HEAD: Sphere shape → 6 petal segments in [HEAD COLOR from reference]
• EARS: Half-spheres → 3 half-petals each in [EAR COLOR from reference]
• BODY: Oval/egg → 6 tapered petals in [BODY COLOR from reference]
• ARMS: Cylinders → rectangles + circles in [ARM COLOR from reference]
• LEGS: Cylinders → rectangles + circles in [LEG COLOR from reference]
• SNOUT: Half-sphere → 3 half-petals in [SNOUT COLOR from reference]

❌ WRONG: Flat circle for a 3D ball part
✅ RIGHT: Petal segments that fold into a ball` : ''}

${category === CraftCategory.COSTUME_PROPS ? `
═══════════════════════════════════════════════════════════════
📐 3D SHAPE → EVA FOAM PATTERN GUIDE
═══════════════════════════════════════════════════════════════

CURVED SURFACES → Multiple flat foam pieces, heat-formed
SPHERE → Segmented panels or half-shells
CYLINDER → Flat rectangle, heat-curved

For EACH part, analyze: What shape? What foam thickness? What bevel angles?
Show heat-forming zones.` : ''}

${category === CraftCategory.CLAY ? `
═══════════════════════════════════════════════════════════════
📐 CLAY COMPONENT ANALYSIS GUIDE
═══════════════════════════════════════════════════════════════

For EACH part, determine:
• Basic shape needed (ball, coil, slab, teardrop)
• Size reference (pea, marble, walnut, egg)
• Exact color from reference image
• Assembly order` : ''}

${category === CraftCategory.COLORING_BOOK ? `
═══════════════════════════════════════════════════════════════
📐 COLORING BOOK LINE ART GUIDE
═══════════════════════════════════════════════════════════════

Create a HIGH-QUALITY coloring page with these requirements:

LINE ART STYLE:
• Clean, crisp BLACK outlines only (no gray, no colors)
• Varying line weights: thicker for main outlines, thinner for details
• Smooth, professional curves and lines
• Clear separation between different areas to color

DETAIL LEVEL:
• Include all important features and textures from the reference
• Add decorative patterns where appropriate (scales, fur texture, feathers, etc.)
• Create interesting areas of varying sizes for coloring
• Include background elements if present in reference

COLORING-FRIENDLY DESIGN:
• All areas must be fully enclosed (no gaps in lines)
• Avoid areas that are too tiny to color
• Create clear boundaries between different sections
• NO shading, NO gradients, NO fills - pure line art only

OUTPUT:
• Pure BLACK lines on WHITE background
• High contrast for easy printing
• Suitable for both children and adults to color
• Ready to download and print` : ''}

${[CraftCategory.WOODCRAFT, CraftCategory.JEWELRY, CraftCategory.KIDS_CRAFTS].includes(category) ? `
═══════════════════════════════════════════════════════════════
📐 PATTERN ANALYSIS GUIDE
═══════════════════════════════════════════════════════════════

For EACH part, analyze:
• What is the 3D shape?
• How does it flatten/cut?
• What color from reference?
• Connection points to other pieces` : ''}

═══════════════════════════════════════════════════════════════
📋 OUTPUT FORMAT
═══════════════════════════════════════════════════════════════

Create ONE organized pattern sheet image with:

┌─────────────────────────────────────────────┐
│  PATTERN SHEET - [CRAFT NAME]               │
├─────────────────────────────────────────────┤
│                                             │
│  [HEAD patterns]    [BODY patterns]         │
│  - Labeled pieces   - Labeled pieces        │
│                                             │
│  [LIMBS patterns]   [ACCESSORIES]           │
│  - Arms/Legs        - Details/Features      │
│                                             │
└─────────────────────────────────────────────┘

MANDATORY ELEMENTS:
✓ Each piece labeled (e.g., "HEAD - Petal 1 of 6")
✓ Colors filled matching reference EXACTLY
✓ Cut lines (solid), Fold lines (dashed), Glue tabs (gray)
✓ Left/Right pairs clearly marked
✓ PLAIN WHITE background (NO grid, NO texture)

═══════════════════════════════════════════════════════════════
🚫 DO NOT
═══════════════════════════════════════════════════════════════

- Use different colors than shown in reference
- Create generic patterns instead of THIS EXACT character
- Draw flat circles for spherical parts (use petal segments!)
- Simplify or omit unique details from the reference
- Add patterns for parts not visible in the reference
- Use grid or textured backgrounds
- Forget to label pieces with part name and piece number
`;

  console.log('🚀 Starting retryWithBackoff...');

  return retryWithBackoff(async () => {
    console.log('📡 Making API call to Gemini...');
    console.log('🔧 Model: gemini-3-pro-image-preview');
    console.log('🔧 Config: 2K, 16:9, thinking enabled');

    try {
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
            aspectRatio: "16:9", // Wide format for pattern sheet layout
            imageSize: "2K", // 2K resolution for good detail with faster generation
          },
          thinkingConfig: {
            includeThoughts: true, // Enable thinking for thorough analysis
          }
        },
      });

      console.log('✅ API response received');

      // Log thinking process
      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      const thinkingTexts: string[] = [];

      for (const part of parts) {
        const partAny = part as any;
        if (partAny.text && partAny.thought === true) {
          thinkingTexts.push(partAny.text);
        }
      }

      if (thinkingTexts.length > 0) {
        console.log('\n💭 === AI THINKING PROCESS (SVG Pattern Sheet) ===');
        console.log('Craft:', craftLabel || 'Unknown');
        console.log('\nThinking:');
        console.log(thinkingTexts.join('\n'));
        console.log('=== END THINKING ===\n');
      }

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          trackApiUsage('generateSVGPatternSheet', true);
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      trackApiUsage('generateSVGPatternSheet', false);
      throw new Error("Failed to generate SVG pattern sheet");
    } catch (error) {
      console.error('❌ API call failed:', error);
      throw error;
    }
  }).catch((error) => {
    trackApiUsage('generateSVGPatternSheet', false);
    throw error;
  });
};

/**
 * Identifies what object was selected by analyzing the extracted image
 */
export const identifySelectedObject = async (
  selectedObjectBase64: string,
  fullImageBase64: string
): Promise<string> => {
  const ai = getAiClient();
  const cleanSelectedObject = selectedObjectBase64.split(',')[1] || selectedObjectBase64;
  const cleanFullImage = fullImageBase64.split(',')[1] || fullImageBase64;

  const prompt = `
You are analyzing an object that was selected from a larger image.

IMAGE 1 (Selected Object): Shows the object that was clicked/selected with transparent background
IMAGE 2 (Full Context): Shows the complete scene for reference

YOUR TASK: Identify what specific object was selected in IMAGE 1.

RULES:
- Give a SHORT, SPECIFIC name (2-5 words max)
- If it's a character, include the character name (e.g., "Mario figure", "Hamm the pig", "Link from Zelda")
- If it's an object, be specific (e.g., "Hylian Shield", "Mushroom power-up", "Wooden chair")
- Do NOT describe the full scene, ONLY the selected object
- Do NOT include surrounding objects or background elements

EXAMPLES:
- Good: "Mario figure"
- Bad: "Mario and friends diorama"
- Good: "Hamm the pig"
- Bad: "Toy Story character set"
- Good: "Hylian Shield"
- Bad: "Link's equipment and accessories"

Return ONLY the object name, nothing else.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanSelectedObject,
            },
          },
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanFullImage,
            },
          },
          { text: prompt },
        ],
      },
    });

    // Extract thinking process - part.thought is a boolean flag
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    // Collect all thinking parts (where part.thought === true)
    const thinkingTexts: string[] = [];
    const answerTexts: string[] = [];

    for (const part of parts) {
      const partAny = part as any;
      if (partAny.text) {
        if (partAny.thought === true) {
          thinkingTexts.push(partAny.text);
        } else {
          answerTexts.push(partAny.text);
        }
      }
    }

    if (thinkingTexts.length > 0) {
      console.log('\n💭 === AI THINKING PROCESS (Object Identification) ===');
      console.log(thinkingTexts.join('\n'));
      console.log('=== END THINKING ===\n');
    }

    const objectName = response.text?.trim() || 'Unknown Object';
    console.log('🤖 AI Identified Object:', objectName);
    return objectName;
  } catch (error) {
    console.error('Failed to identify object:', error);
    return 'Selected Object'; // Fallback name
  }
};

/**
 * Dissects only the selected object from an image
 * Uses both the extracted object and full image for context
 */
export const dissectSelectedObject = async (
  selectedObjectBase64: string,
  fullImageBase64: string,
  objectLabel: string
): Promise<DissectionResponse> => {
  // Check rate limit before making request
  if (!dissectionLimiter.canMakeRequest()) {
    const waitTime = dissectionLimiter.getTimeUntilNextRequest();
    const waitSeconds = Math.ceil(waitTime / 1000);
    throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds before dissecting.`);
  }

  const ai = getAiClient();
  const cleanSelectedObject = selectedObjectBase64.split(',')[1] || selectedObjectBase64;
  const cleanFullImage = fullImageBase64.split(',')[1] || fullImageBase64;

  const prompt = `
    You are an expert maker. I have SELECTED A SPECIFIC SINGLE OBJECT from a larger craft project.

    CONTEXT IMAGE (Full Project): The second image shows the complete project for reference.
    TARGET OBJECT (What to Analyze): The first image shows ONLY ONE OBJECT I want instructions for: "${objectLabel}"

    🚨 CRITICAL SINGLE-OBJECT RULE 🚨
    - YOU MUST CREATE INSTRUCTIONS FOR EXACTLY ONE OBJECT: "${objectLabel}"
    - If you see multiple characters or objects in the images, create instructions ONLY for "${objectLabel}"
    - DO NOT create instructions for other characters, objects, accessories, or display elements
    - The first image may contain some background elements due to imperfect selection - IGNORE them
    - Focus EXCLUSIVELY on: "${objectLabel}"

    YOUR TASK: Create step-by-step instructions to build THIS ONE OBJECT ONLY: "${objectLabel}"

    1. Determine the complexity (Simple, Moderate, Complex) and a score 1-10 FOR "${objectLabel}" ONLY.
    2. List the essential materials needed FOR "${objectLabel}" ONLY.
    3. Break down the construction into EXACTLY 4 STEPS grouped by body parts.

    🚨 MANDATORY 4-STEP BODY PART GROUPING 🚨
    You MUST create EXACTLY 4 steps, each focusing on a specific body part group:

    STEP 1 - HEAD GROUP:
    - Head shape, face, facial features (eyes, nose, mouth)
    - Hair (all hair pieces, bangs, ponytail, curls)
    - Head accessories (crown, hat, earrings, glasses, headband, horns)
    - Title format: "Create head, face, and hair" or similar

    STEP 2 - BODY GROUP:
    - Torso/chest/main body structure
    - Back piece, neck connection
    - Core body shape and form
    - Title format: "Assemble body and torso" or similar

    STEP 3 - CLOTHING/SURFACE GROUP:
    - All clothing items (dress, shirt, pants, jacket, armor, cape)
    - Surface details, patterns, textures on body
    - Belts, buttons, collars, pockets
    - Title format: "Add clothing and surface details" or similar

    STEP 4 - LIMBS & PROPS GROUP:
    - Arms and hands (both left and right)
    - Legs and feet/shoes
    - Props (weapons, tools, bags, items held)
    - Base/stand/platform
    - Title format: "Attach limbs, props, and base" or similar

    GROUPING RULES:
    - If the craft doesn't have all parts (e.g., no clothing on an animal), combine related groups
    - Each step's image will show ONLY that group's components
    - Keep related items together (e.g., head + hair + crown = Step 1)
    - Props held in hands go with Step 4 (limbs), not with the body part they're near

    EXAMPLES:
    - Princess character: Step 1 (head+hair+tiara), Step 2 (body), Step 3 (dress+jewelry), Step 4 (arms+legs+wand)
    - Animal (no clothes): Step 1 (head+ears+face), Step 2 (body), Step 3 (fur texture+markings), Step 4 (legs+tail+base)
    - Robot: Step 1 (head+sensors+antenna), Step 2 (torso+core), Step 3 (armor plates+lights), Step 4 (arms+legs+weapons)

    Return strict JSON matching this schema.
  `;

  return retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanSelectedObject,
            },
          },
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanFullImage,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        thinkingConfig: {
          includeThoughts: true, // Enable thinking for better step planning
        },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            complexity: { type: Type.STRING, enum: ["Simple", "Moderate", "Complex"] },
            complexityScore: { type: Type.NUMBER },
            materials: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.NUMBER },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  safetyWarning: { type: Type.STRING, nullable: true },
                },
                required: ["stepNumber", "title", "description"],
              },
            },
          },
          required: ["complexity", "complexityScore", "materials", "steps"],
        },
      },
    });

    // Extract thinking process - part.thought is a boolean flag
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    // Collect all thinking parts (where part.thought === true)
    const thinkingTexts: string[] = [];

    for (const part of parts) {
      const partAny = part as any;
      if (partAny.text && partAny.thought === true) {
        thinkingTexts.push(partAny.text);
      }
    }

    if (thinkingTexts.length > 0) {
      console.log('\n💭 === AI THINKING PROCESS (Instruction Generation) ===');
      console.log(thinkingTexts.join('\n'));
      console.log('=== END THINKING ===\n');
    }

    const text = response.text;
    if (!text) {
      trackApiUsage('dissectSelectedObject', false);
      throw new Error("No text returned from dissection model");
    }
    trackApiUsage('dissectSelectedObject', true);
    return JSON.parse(text) as DissectionResponse;
  }).catch((error) => {
    trackApiUsage('dissectSelectedObject', false);
    throw error;
  });
};

/**
 * Analyzes the image and breaks it down into steps (Dissection).
 */
export const dissectCraft = async (
  imageBase64: string,
  userPrompt: string
): Promise<DissectionResponse> => {
  // Check rate limit before making request
  if (!dissectionLimiter.canMakeRequest()) {
    const waitTime = dissectionLimiter.getTimeUntilNextRequest();
    const waitSeconds = Math.ceil(waitTime / 1000);
    throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds before dissecting.`);
  }

  const ai = getAiClient();
  const cleanBase64 = imageBase64.split(',')[1] || imageBase64;

  const prompt = `
    You are an expert maker. Analyze this image of a craft project: "${userPrompt}".

    YOUR TASK: Create step-by-step instructions to build THIS craft.

    1. Determine the complexity (Simple, Moderate, Complex) and a score 1-10.
    2. List the essential materials visible or implied.
    3. Break down the construction into EXACTLY 4 STEPS grouped by body parts.

    🚨 MANDATORY 4-STEP BODY PART GROUPING 🚨
    You MUST create EXACTLY 4 steps, each focusing on a specific body part group:

    STEP 1 - HEAD GROUP:
    - Head shape, face, facial features (eyes, nose, mouth)
    - Hair (all hair pieces, bangs, ponytail, curls)
    - Head accessories (crown, hat, earrings, glasses, headband, horns)
    - Title format: "Create head, face, and hair" or similar

    STEP 2 - BODY GROUP:
    - Torso/chest/main body structure
    - Back piece, neck connection
    - Core body shape and form
    - Title format: "Assemble body and torso" or similar

    STEP 3 - CLOTHING/SURFACE GROUP:
    - All clothing items (dress, shirt, pants, jacket, armor, cape)
    - Surface details, patterns, textures on body
    - Belts, buttons, collars, pockets
    - Title format: "Add clothing and surface details" or similar

    STEP 4 - LIMBS & PROPS GROUP:
    - Arms and hands (both left and right)
    - Legs and feet/shoes
    - Props (weapons, tools, bags, items held)
    - Base/stand/platform
    - Title format: "Attach limbs, props, and base" or similar

    GROUPING RULES:
    - If the craft doesn't have all parts (e.g., no clothing on an animal), combine related groups
    - Each step's image will show ONLY that group's components
    - Keep related items together (e.g., head + hair + crown = Step 1)
    - Props held in hands go with Step 4 (limbs), not with the body part they're near
    - Do NOT create a "gather materials" step - materials list is captured separately

    EXAMPLES:
    - Princess character: Step 1 (head+hair+tiara), Step 2 (body), Step 3 (dress+jewelry), Step 4 (arms+legs+wand)
    - Animal (no clothes): Step 1 (head+ears+face), Step 2 (body), Step 3 (fur texture+markings), Step 4 (legs+tail+base)
    - Robot: Step 1 (head+sensors+antenna), Step 2 (torso+core), Step 3 (armor plates+lights), Step 4 (arms+legs+weapons)
    - Plant (Piranha Plant): Step 1 (head+mouth+teeth), Step 2 (stem+leaves), Step 3 (spots+details), Step 4 (pot+base)

    Return strict JSON matching this schema.
  `;

  return retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
        responseMimeType: "application/json",
        thinkingConfig: {
          includeThoughts: true, // Enable thinking for better step planning
        },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            complexity: { type: Type.STRING, enum: ["Simple", "Moderate", "Complex"] },
            complexityScore: { type: Type.NUMBER },
            materials: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.NUMBER },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  safetyWarning: { type: Type.STRING, nullable: true },
                },
                required: ["stepNumber", "title", "description"],
              },
            },
          },
          required: ["complexity", "complexityScore", "materials", "steps"],
        },
      },
    });

    // Extract thinking process - part.thought is a boolean flag
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    // Collect all thinking parts (where part.thought === true)
    const thinkingTexts: string[] = [];

    for (const part of parts) {
      const partAny = part as any;
      if (partAny.text && partAny.thought === true) {
        thinkingTexts.push(partAny.text);
      }
    }

    if (thinkingTexts.length > 0) {
      console.log('\n💭 === AI THINKING PROCESS (Craft Breakdown) ===');
      console.log(thinkingTexts.join('\n'));
      console.log('=== END THINKING ===\n');
    }

    const text = response.text;
    if (!text) {
      trackApiUsage('dissectCraft', false);
      throw new Error("No text returned from dissection model");
    }
    trackApiUsage('dissectCraft', true);
    return JSON.parse(text) as DissectionResponse;
  }).catch((error) => {
    trackApiUsage('dissectCraft', false);
    throw error;
  });
};

/**
 * Turn Table view types
 */
export type TurnTableView = 'left' | 'right' | 'back';

/**
 * Generates a turn table view (left, right, or back) of the craft object
 * Takes the original front-facing image and generates the specified view angle
 */
export const generateTurnTableView = async (
  originalImageBase64: string,
  view: TurnTableView,
  craftLabel?: string
): Promise<string> => {
  // Check rate limit before making request
  if (!imageGenerationLimiter.canMakeRequest()) {
    const waitTime = imageGenerationLimiter.getTimeUntilNextRequest();
    const waitSeconds = Math.ceil(waitTime / 1000);
    throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds before generating another image.`);
  }

  const ai = getAiClient();
  const cleanBase64 = originalImageBase64.split(',')[1] || originalImageBase64;

  // View-specific rotation descriptions - TRUE ORTHOGRAPHIC VIEWS matching the reference pose
  const viewDescriptions: Record<TurnTableView, string> = {
    left: 'TRUE LEFT PROFILE - The character rotated 90° so we see their LEFT side in the EXACT SAME POSE as the reference',
    right: 'TRUE RIGHT PROFILE - The character rotated 90° so we see their RIGHT side in the EXACT SAME POSE as the reference',
    back: 'TRUE BACK VIEW - The character rotated 180° so we see their BACK in the EXACT SAME POSE as the reference',
  };

  const viewAngles: Record<TurnTableView, string> = {
    left: 'Character facing screen-left, showing LEFT profile with LEFT ear visible, nose pointing LEFT',
    right: 'Character facing screen-right, showing RIGHT profile with RIGHT ear visible, nose pointing RIGHT',
    back: 'Character facing away from camera, showing the back of head, back of body, NO face visible',
  };

  const prompt = `
Generate a ${view.toUpperCase()} side view of this craft character by rotating the camera around it.

${craftLabel ? `CHARACTER: ${craftLabel}` : ''}

CAMERA POSITION:
${view === 'left' ? '- Move camera 90° to the LEFT of the character' : ''}
${view === 'right' ? '- Move camera 90° to the RIGHT of the character' : ''}
${view === 'back' ? '- Move camera 180° behind the character' : ''}
- Character stays in the same pose
- Only the camera viewing angle changes

${view === 'left' ? `
LEFT SIDE VIEW REQUIREMENTS:

What you MUST show:
• LEFT ear visible (right ear hidden)
• Profile of face with nose pointing LEFT
• LEFT arm fully visible
• LEFT leg fully visible  
• LEFT side of body/torso
• Character facing toward the LEFT edge of the image

What you MUST NOT show:
• Both eyes visible (only left eye or profile)
• Right ear
• Front-facing view
• Right arm (it's behind the body)
` : ''}
${view === 'right' ? `
RIGHT SIDE VIEW REQUIREMENTS:

What you MUST show:
• RIGHT ear visible (left ear hidden)
• Profile of face with nose pointing RIGHT
• RIGHT arm fully visible
• RIGHT leg fully visible
• RIGHT side of body/torso
• Character facing toward the RIGHT edge of the image

What you MUST NOT show:
• Both eyes visible (only right eye or profile)
• Left ear
• Front-facing view
• Left arm (it's behind the body)
` : ''}
${view === 'back' ? `
BACK VIEW REQUIREMENTS:

What you MUST show:
• Back of head (hair/hat from behind)
• Back of body/torso
• Both arms from behind
• Both legs from behind
• Any back details (tail, cape, etc.)

What you MUST NOT show:
• Face or eyes
• Front of body
• Chest or belly
` : ''}

CRITICAL: Left and right views MUST be mirror opposites:
- LEFT view: nose points LEFT, left ear visible
- RIGHT view: nose points RIGHT, right ear visible
- They should look completely different, not the same angle!

STYLE CONSISTENCY:
- Match all colors from the reference image exactly
- Keep the same craft material style (paper/clay/fabric/etc)
- Maintain the same proportions and details
- Use the same neutral studio background
- Keep the same lighting and shadows

Think of this like photographing a physical craft model from different angles - the model doesn't change, only where you're standing to take the photo.
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
        trackApiUsage('generateTurnTableView', true);
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    trackApiUsage('generateTurnTableView', false);
    throw new Error(`Failed to generate ${view} view`);
  }).catch((error) => {
    trackApiUsage('generateTurnTableView', false);
    throw error;
  });
};