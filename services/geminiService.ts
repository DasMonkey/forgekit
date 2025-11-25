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

PANEL 1 - MATERIALS: Show components in knolling layout, labeled
PANEL 2 - TECHNIQUE: Show hands demonstrating, with arrows and text
PANEL 3 - ASSEMBLY: Show connecting parts
PANEL 4 - RESULT: Show completed component

Match EXACT colors from reference image.
WHITE BACKGROUND, no electronics.`;
};

/**
 * Generates a visualization for a specific step using the master image as reference.
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

  // If target object is specified, add focus instructions
  const focusInstructions = targetObjectLabel
    ? `
🎯 CRITICAL FOCUS RULE:
- The reference image may show MULTIPLE objects or characters
- You MUST generate a step image for ONLY: "${targetObjectLabel}"
- IGNORE all other objects, characters, or accessories in the reference image
- Generate materials/components that match "${targetObjectLabel}"'s style and color scheme ONLY
- Do NOT include elements from other characters or objects
`
    : '';

  // Use default 1K resolution for all steps (no special handling)
  console.log(`🖼️ Generating image for: ${stepDescription}`);
  console.log(`   Step Number: ${stepNumber || 'N/A'}`);
  console.log(`   Resolution: 1K (default)`);

  const prompt = `
🚨 CRITICAL: MATCH THE EXACT CRAFT CONSTRUCTION STYLE 🚨

Look at the reference image VERY CAREFULLY and identify the construction style:
- Is it FLAT/LAYERED (2D pieces stacked/layered together)?
- Is it 3D BOX/CUBE style (folded into 3D shapes)?
- Is it PIXEL ART style (blocky, square pixels)?
- Is it SMOOTH/ROUNDED (curved surfaces)?

YOU MUST MATCH THE EXACT SAME CONSTRUCTION METHOD.

WRONG EXAMPLES (DO NOT DO):
❌ Reference shows FLAT layered pixel art → You generate 3D cube boxes
❌ Reference shows SMOOTH clay figure → You generate blocky pixel art
❌ Reference shows 2D stacked paper → You generate 3D folded boxes

CORRECT EXAMPLES:
✓ Reference shows FLAT layered pixel art → Generate FLAT layered pieces
✓ Reference shows 3D cube papercraft → Generate 3D folded cube pieces
✓ Reference shows smooth clay → Generate smooth rounded shapes

📷 REFERENCE IMAGE MATCHING (MANDATORY):
The attached image is your ONLY style guide. You MUST:
✓ Match EXACT construction method - If reference is flat/layered, generate flat/layered. If 3D, generate 3D.
✓ Match EXACT colors - Sample RGB values directly from the reference
✓ Match EXACT textures - Paper grain, clay matte, fabric weave as shown
✓ Match EXACT proportions - Character features match reference exactly
✓ Match EXACT style - Same artistic approach, same level of detail

DO NOT:
✗ Convert flat layered crafts into 3D box crafts
✗ Convert 2D pixel art into 3D cubes
✗ Invent new colors not in the reference image
✗ Change the art style or aesthetic
✗ Add elements not visible in the reference
✗ Use different materials than shown

${focusInstructions}

🎯 TASK: Create a MULTI-PANEL instruction image for this step:
STEP: "${stepDescription}"

This step focuses on ONE body part group. Show ONLY the components mentioned above.
Do NOT include parts from other steps (no head parts in body step, no clothing in limbs step, etc.)

📐 MULTI-PANEL FORMAT (2-4 PANELS):
┌─────────────┬─────────────┐
│  PANEL 1    │  PANEL 2    │
│  MATERIALS  │  ASSEMBLY   │
├─────────────┼─────────────┤
│  PANEL 3    │  PANEL 4    │
│  DETAILS    │  RESULT     │
└─────────────┴─────────────┘

PANEL REQUIREMENTS:
1. PANEL 1 - MATERIALS/PATTERN: Show components in knolling layout, labeled. Use the SAME construction style as reference.
2. PANEL 2 - ASSEMBLY: Show hands working, BOLD ARROWS, text labels
3. PANEL 3 - DETAILS: Show adding finishing touches (if needed)
4. PANEL 4 - RESULT: Show completed component matching reference EXACTLY in style and construction method

MANDATORY ELEMENTS:
✓ Clear panel divisions with labels at top
✓ BOLD ARROWS (→ ➜ ⬇) showing direction/movement
✓ TEXT ANNOTATIONS: "FOLD", "GLUE", "ATTACH", "ALIGN"
✓ HANDS/FINGERS demonstrating technique
✓ WHITE BACKGROUND with subtle grid

${categoryRules}

🚨 FINAL CHECK - ASK YOURSELF:
1. Does my generated image use the SAME construction method as the reference? (flat vs 3D, layered vs folded)
2. If reference is flat pixel art, am I generating flat layered pieces (NOT 3D cubes)?
3. Colors match reference image exactly?
4. Show ONLY components for this step: "${stepDescription}"
5. Professional instruction manual quality
6. No electronics, no power tools
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
      case CraftCategory.FABRIC_SEWING:
        return 'sewing pattern template with fabric pieces, seam allowances, and stitch guides';
      case CraftCategory.COSTUME_PROPS:
        return 'foam armor/prop pattern template showing EVA foam pieces, beveled edges, and heat-forming guides';
      case CraftCategory.WOODCRAFT:
        return 'woodworking pattern sheet with cut pieces, grain direction, and assembly order';
      case CraftCategory.JEWELRY:
        return 'jewelry assembly diagram showing beads, wire wrapping steps, and component layout';
      case CraftCategory.KIDS_CRAFTS:
        return 'simple craft template with easy-to-cut shapes and minimal assembly';
      case CraftCategory.TABLETOP_FIGURES:
        return 'miniature figure pattern with base, pose guide, and painting reference';
      default:
        return 'craft pattern template';
    }
  };

  const patternType = getCategoryPatternType(category);

  const prompt = `
🎯 YOUR TASK: Create a ${patternType} for the craft shown in the reference image.

📷 REFERENCE IMAGE: Study this completed 3D craft carefully.

${craftLabel ? `🎨 CRAFT: ${craftLabel}` : ''}
📦 CATEGORY: ${category}

${category === CraftCategory.PAPERCRAFT ? `
═══════════════════════════════════════════════════════════════
🚨 CRITICAL: 3D SHAPE → 2D PATTERN UNWRAPPING RULES
═══════════════════════════════════════════════════════════════

You MUST think about HOW each 3D shape unfolds into flat paper.
A flat circle CANNOT become a 3D ball! You need proper unwrapping.

STEP 1: IDENTIFY EACH PART'S 3D SHAPE
For each component, determine its basic 3D geometry:

STEP 2: APPLY CORRECT UNWRAPPING METHOD

┌─────────────────┬────────────────────────────────────────────┐
│ 3D SHAPE        │ CORRECT 2D PATTERN (NOT just outline!)     │
├─────────────────┼────────────────────────────────────────────┤
│ SPHERE/BALL     │ 4-8 PETAL SEGMENTS (like orange peel)      │
│ (hands, feet,   │ Each petal is a pointed oval/leaf shape    │
│  head, eyes)    │ When glued together, they form a ball      │
│                 │ Example: ◠◡◠◡◠◡ (6 petals around)          │
├─────────────────┼────────────────────────────────────────────┤
│ CYLINDER/TUBE   │ RECTANGLE + 2 CIRCLES (or faceted polygon) │
│ (arms, legs,    │ Rectangle wraps around, circles cap ends   │
│  neck, fingers) │ Height = cylinder length                   │
│                 │ Width = circumference (π × diameter)       │
├─────────────────┼────────────────────────────────────────────┤
│ CONE            │ PIE/FAN SHAPE (partial circle)             │
│ (hats, skirts,  │ Larger cone = larger arc angle             │
│  dress bottom)  │ Rolls into cone shape when edges meet      │
├─────────────────┼────────────────────────────────────────────┤
│ CUBE/BOX        │ CROSS-SHAPED NET (6 connected squares)     │
│ (torso, base,   │ Classic cube unfolding pattern             │
│  head if boxy)  │ With fold lines and glue tabs              │
├─────────────────┼────────────────────────────────────────────┤
│ HALF-SPHERE     │ 4-6 HALF-PETALS + circular base            │
│ (dome, bowl)    │ Like sphere but cut in half                │
├─────────────────┼────────────────────────────────────────────┤
│ OVAL/EGG        │ TAPERED PETAL SEGMENTS (wider at middle)   │
│ (body, head)    │ Like sphere petals but asymmetric          │
├─────────────────┼────────────────────────────────────────────┤
│ PYRAMID         │ TRIANGLE PANELS from apex + base square    │
│                 │ 4 triangles connected to square base       │
└─────────────────┴────────────────────────────────────────────┘

STEP 3: EXAMPLE - DORAEMON CHARACTER BREAKDOWN

For Doraemon (round robot cat):
• HEAD (sphere) → 6-8 petal segments in BLUE, forms round head
• FACE (half-sphere) → 4 half-petals in WHITE
• BODY (oval/egg) → 6-8 tapered segments in BLUE
• BELLY (half-sphere) → 4 half-petals in WHITE
• HANDS (spheres) → 4-6 petal segments each in TAN/BEIGE
• FEET (oval spheres) → 4-6 segments each in TAN/BEIGE
• COLLAR (ring/cylinder) → rectangle that wraps, in RED
• BELL (small sphere) → 4 tiny segments in YELLOW
• NOSE (small sphere) → 4 tiny segments in RED
• EARS (none for Doraemon - he lost them!)
• TAIL (small sphere) → 4 tiny segments in RED
• POCKET (half-circle) → semicircle flat piece in WHITE

❌ WRONG: Drawing a flat circle for hands/feet
✅ RIGHT: Drawing 4-6 petal segments that fold into a ball

STEP 4: PATTERN SHEET REQUIREMENTS

Include for EACH piece:
• Correct unwrapped shape (NOT just the 2D silhouette!)
• Solid BLACK lines = CUT lines
• Dashed BLUE lines = FOLD lines (mountain/valley)
• Gray tabs = GLUE tabs on edges
• Color fill matching reference image
• Label: "HAND L - Petal 1 of 6" etc.
• Match left + right pieces` : ''}

${category === CraftCategory.FABRIC_SEWING ? `
═══════════════════════════════════════════════════════════════
🚨 CRITICAL: 3D SHAPE → 2D FABRIC PATTERN RULES
═══════════════════════════════════════════════════════════════

SPHERE/BALL (stuffed) → 4-6 FABRIC GORES with seam allowance
CYLINDER → Rectangle panel + circular ends
CONE → Pie-shaped panel
BODY → Multiple curved panels with darts for shaping

Include seam allowances, grain lines, and notch marks.` : ''}

${category === CraftCategory.COSTUME_PROPS ? `
═══════════════════════════════════════════════════════════════
🚨 CRITICAL: 3D SHAPE → EVA FOAM PATTERN RULES
═══════════════════════════════════════════════════════════════

CURVED SURFACES → Multiple flat foam pieces, heat-formed to curve
SPHERE → Segmented panels (like soccer ball) or half-shells
CYLINDER → Flat rectangle, heat-curved around form
Show foam thickness, bevel angles, and heat-forming zones.` : ''}

${category === CraftCategory.CLAY ? `
═══════════════════════════════════════════════════════════════
CLAY COMPONENT GUIDE
═══════════════════════════════════════════════════════════════

Show basic clay shapes needed:
• Ball sizes (pea, marble, walnut, egg)
• Coil/rope lengths and thickness
• Slab sizes for flat parts
• Color mixing ratios
• Assembly order` : ''}

${[CraftCategory.WOODCRAFT, CraftCategory.JEWELRY, CraftCategory.KIDS_CRAFTS, CraftCategory.TABLETOP_FIGURES].includes(category) ? `
═══════════════════════════════════════════════════════════════
PATTERN REQUIREMENTS
═══════════════════════════════════════════════════════════════

Show flat pattern pieces with:
• Cut lines and material specifications
• Assembly connection points
• Scale indicators` : ''}

═══════════════════════════════════════════════════════════════
📋 OUTPUT FORMAT
═══════════════════════════════════════════════════════════════

Create ONE organized pattern sheet image with:

┌─────────────────────────────────────────────┐
│  PATTERN SHEET - [CRAFT NAME]               │
├─────────────────────────────────────────────┤
│                                             │
│  [HEAD patterns]    [BODY patterns]         │
│  - Petal 1-6        - Petal 1-6             │
│                                             │
│  [LIMBS patterns]   [ACCESSORIES]           │
│  - Arm cylinders    - Details               │
│  - Hand petals                              │
│                                             │
│  [FEET patterns]    [BASE/STAND]            │
│  - Foot petals      - Platform              │
│                                             │
└─────────────────────────────────────────────┘

VISUAL STYLE:
• PLAIN WHITE background (NO grid, NO cross pattern, NO texture)
• Clean technical drawing style
• All pieces labeled clearly
• Colors matching reference image
• Professional, printable layout

Remember: The pattern pieces must actually fold/assemble into the 3D shape!
A circle stays flat - use PETAL SEGMENTS to make spheres!
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

  // View-specific rotation descriptions
  const viewDescriptions: Record<TurnTableView, string> = {
    left: 'LEFT SIDE VIEW (90° rotation to the left) - Show the left profile of the object as if you rotated it 90 degrees counter-clockwise',
    right: 'RIGHT SIDE VIEW (90° rotation to the right) - Show the right profile of the object as if you rotated it 90 degrees clockwise',
    back: 'BACK VIEW (180° rotation) - Show the back/rear of the object as if you rotated it 180 degrees to see what\'s behind it',
  };

  const viewAngles: Record<TurnTableView, string> = {
    left: 'left side profile, showing the left ear/arm/side details',
    right: 'right side profile, showing the right ear/arm/side details',
    back: 'back view, showing the back of head, back details, any tail or rear features',
  };

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