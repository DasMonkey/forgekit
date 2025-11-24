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
 * All 8 categories now use multi-panel format for detailed instructions.
 */
const getCategorySpecificRules = (category: CraftCategory): string => {
  const categoryRules: Record<string, string> = {
    'Papercraft': `
🎨 MULTI-PANEL INSTRUCTION FORMAT (2-4 PANELS PER IMAGE):
The image MUST be divided into 2-4 clear panels showing detailed sub-steps:

PANEL LAYOUT OPTIONS:
OPTION 1 (4 panels for complex steps):
┌─────────────┬─────────────┐
│   PANEL 1   │   PANEL 2   │
│  CUTOUTS    │  ASSEMBLY   │
├─────────────┼─────────────┤
│   PANEL 3   │   PANEL 4   │
│ ADD DETAILS │  FINISHED   │
└─────────────┴─────────────┘

OPTION 2 (2-3 panels for simpler steps):
┌─────────────┬─────────────┐
│   PANEL 1   │   PANEL 2   │
│  PREPARE    │  ASSEMBLE   │
└─────────────┴─────────────┘

PANEL CONTENT REQUIREMENTS:

PANEL 1 - COMPLETE PATTERN SHEETS (FLAT KNOLLING LAYOUT):
🎯 THIS IS THE MOST IMPORTANT PANEL - FULL BUILDABLE 3D PATTERN TEMPLATES:
- Show COMPLETE, FULL-DETAIL pattern sheets that can be printed and used to build the craft
- These must be ACTUAL TEMPLATES, not sketches or simplified versions
- Layout: ALL sheets laid FLAT side-by-side in organized knolling arrangement (NEVER stacked)
- View: Perfect top-down view as if looking at sheets on a cutting mat with grid background

🚨 CRITICAL PATTERN TYPE DETECTION:
There are TWO types of papercraft patterns - choose the appropriate type based on the reference image:

TYPE 1 - 3D FOLDED PAPERCRAFT (for objects with curved/dimensional forms):
✓ Patterns must be properly UNWRAPPED like UV maps in 3D modeling
✓ ROUNDED/CURVED shapes (heads, bodies, limbs) unwrap into flattened geometric patterns
✓ A spherical head unwraps into petal-like segments or gores (like a globe map)
✓ A cylindrical body unwraps into a curved rectangle that wraps around to form a tube
✓ Curved limbs unwrap into elongated shapes with proper curvature to fold into 3D tubes
✓ Fold lines (dashed) show where the flat pattern folds to create the 3D form
✓ The unwrapped pattern geometry must be mathematically correct to assemble into the 3D shape

🚨 CRITICAL MATERIAL REQUIREMENT - PAPER ONLY (100% PAPER):
✓ EVERY SINGLE COMPONENT must be made from PAPER - no foam, fabric, wire, pipe cleaners, clay, terracotta, or soft materials
✓ Use LOW-POLY STYLE geometric folding for curved shapes (like origami/low-poly 3D models)
✓ Curves are achieved through strategic folds and facets, NOT soft rounded materials
✓ Example: A round mouth/lips should be angular paper facets that create the illusion of curves
✓ Stems/supports = rolled paper tubes, NOT pipe cleaners or wire
✓ Pots/containers = folded/rolled paper, NOT clay or terracotta
✓ Base filler = paper strips or crumpled paper, NOT fabric or fuzzy material
✓ Use paper thickness and layering to create depth, NOT soft padding materials
✓ This is PURE PAPERCRAFT - 100% paper construction, everything folds/rolls from flat paper sheets

TYPE 2 - 2D LAYERED PAPERCRAFT (for flat shapes with stacked layers):
✓ Patterns are flat 2D shapes that stack on top of each other
✓ Multiple layers create depth and "body" through thickness
✓ Each layer is a complete flat outline (no folding required)
✓ Layers are glued/stacked to build up dimension (like a 3D relief)
✓ Show ALL layers separately: base layer, middle layers, detail layers, top layer
✓ Each layer should be clearly labeled (Layer 1, Layer 2, etc.) with thickness indication
✓ Layers may be slightly offset or sized differently to create contours

EACH PATTERN SHEET MUST INCLUDE (based on type):
FOR 3D FOLDED PAPERCRAFT:
✓ Complete outlines with proper 3D unwrapping geometry
✓ Cut lines (solid black lines) showing where to cut
✓ Fold lines (dashed lines) showing where the flat pattern folds to create 3D curves
✓ Glue tabs clearly marked (small flaps extending from edges for assembly)
✓ Piece labels/numbers (1, 2, 3, A, B, C) on each component
✓ Small assembly arrows or symbols showing how pieces connect

FOR 2D LAYERED PAPERCRAFT:
✓ Complete flat outlines for EACH layer (no fold lines needed)
✓ Cut lines (solid black lines) showing where to cut
✓ Layer numbers clearly marked (Layer 1, Layer 2, Layer 3, etc.)
✓ Indication of stacking order or which side faces up
✓ Small registration marks showing how layers align
✓ Optional: foam spacer indicators between layers for extra depth

BOTH TYPES:
✓ Scale indicators or measurements for size reference
✓ Colors matching EXACT colors from Reference craft object

VISUAL REQUIREMENTS:
- MAXIMUM PRECISION: Lines must be clean, clear, and accurate
- Colors: Match EXACT colors from the Reference craft object
- Background: White paper with subtle grid lines (like cutting mat)
- Spacing: Sheets arranged neatly with small gaps between them
- Text label at top: "PATTERN SHEETS" or "TEMPLATES"

CRITICAL: Someone should be able to print Panel 1, cut out the pieces, and successfully assemble them into the craft matching the reference image. The patterns must be geometrically correct for the appropriate type (3D folded OR 2D layered).

PANEL 2 - ASSEMBLY PROCESS:
- Show hands/fingers actively assembling pieces
- Use LARGE BOLD ARROWS (→ ➜ ⬇) showing direction of movement
- Add text annotations explaining what to do: "FOLD HERE", "GLUE TAB", "ALIGN EDGES"
- Show partially assembled state
- Include small numbered steps (①②③) if multiple actions
- Add text label: "ASSEMBLY" or "HOW TO ATTACH"

PANEL 3 - ADD DETAILS (if 4-panel layout):
- Show hands adding decorative elements, layers, or final pieces
- Use arrows pointing to where details should be placed
- Show close-up of attachment points
- Include text: "ADD LAYER", "ATTACH HERE", "GLUE POINT"
- Add text label: "DETAILS" or "FINAL TOUCHES"

PANEL 4 - FINISHED COMPONENT (if 4-panel layout):
- Show the completed component from this step
- Display from best viewing angle
- Include scale reference if needed
- Show how it looks when properly assembled
- Add text label: "FINISHED" or "RESULT"

🚨 CRITICAL VISUAL REQUIREMENTS:
✓ Each panel MUST have a clear label/heading at the top
✓ Use BOLD ARROWS (not thin lines) showing movement/direction
✓ Add TEXT ANNOTATIONS explaining actions ("fold", "glue", "attach", "align")
✓ Show HANDS/FINGERS in assembly panels to demonstrate technique
✓ Use WHITE BACKGROUND with subtle grid lines (like blueprint paper)
✓ EXACT color matching from Reference Image
✓ Clear visual separation between panels (thin border lines)
✓ NO ELECTRONIC PARTS - only handcraft materials (paper, glue, scissors)

EXAMPLE WITH ANALYSIS - Piranha Plant - Step: "Create and Pot the Plants":
ANALYSIS FIRST:
- Pot: 3D cylinder → unwrap into curved rectangle with base circle
- Needs: Base stability (reinforced bottom), connection tabs for stems
- Surface: Brown paper texture, simple geometric form
THEN CREATE:
Panel 1: Pattern sheets showing pot unwrapped cylinder + circular base + small support tabs for stem insertion points
Panel 2: Hands rolling cylinder and gluing seam, text "FORM CYLINDER"
Panel 3: Hands attaching base circle to bottom of cylinder, arrows showing tab fold
Panel 4: Completed pot with stem holes visible at top

EXAMPLE WITH ANALYSIS - Piranha Plant - Step: "Assemble Stems and Leaves":
ANALYSIS FIRST:
- Stems: Long thin tubes → need internal paper support (rolled tight paper rod inside)
- Leaves: Flat shapes with slight curve → simple cutouts with subtle center fold for 3D effect
- Connection: Stems insert into pot holes, leaves attach to stem sides
THEN CREATE:
Panel 1: Pattern sheets showing ONLY stem rectangles (for rolling), inner support strips, leaf shapes - laid flat
Panel 2: Hands rolling stem around inner support tube, text "ROLL TIGHTLY"
Panel 3: Hands folding leaf center line and gluing to stem, arrows showing attachment
Panel 4: Completed stem with leaves attached, ready to insert into pot

EXAMPLE WITH ANALYSIS - Character - Step: "Assemble body":
ANALYSIS FIRST:
- Body: Cylindrical torso → unwrap into curved rectangle
- Has: Rounded belly (slight curve in pattern), connection points top/bottom for head/legs
- Needs: Glue tabs on vertical seam, neck opening at top
THEN CREATE:
Panel 1: Pattern sheets showing ONLY BODY: torso unwrapped curved rectangle with belly curve, connection tabs - NO head, NO limbs shown
Panel 2: Hands folding body piece along dashed lines, arrows showing fold direction
Panel 3: Hands gluing body tabs to close cylinder, text "GLUE SEAM"
Panel 4: Completed body cylinder only - no other parts attached yet`,

    'Clay': `
🎨 MULTI-PANEL CLAY INSTRUCTION FORMAT (2-4 PANELS):
The image MUST be divided into clear panels showing detailed sculpting sub-steps:

PANEL LAYOUT (choose based on step complexity):
┌─────────────┬─────────────┐
│   PANEL 1   │   PANEL 2   │
│  PREPARE    │  SHAPE      │
├─────────────┼─────────────┤
│   PANEL 3   │   PANEL 4   │
│  ATTACH     │  FINISHED   │
└─────────────┴─────────────┘

PANEL CONTENT:

PANEL 1 - CLAY PIECES (KNOLLING):
- Show ALL clay pieces needed, organized in knolling layout
- Include size references: "pea-sized", "walnut-sized", or ruler measurements
- Display pre-formed shapes: balls, cylinders, slabs, coils
- Label each piece: "Body", "Arms (x2)", "Head", etc.
- Match EXACT colors from Reference Image
- Text label: "MATERIALS" or "CLAY PIECES"

PANEL 2 - SHAPING/TECHNIQUE:
- Show HANDS/FINGERS actively shaping clay
- Use ARROWS showing pinch, roll, or blend directions
- Add text annotations: "ROLL INTO CYLINDER", "PINCH TOP", "SMOOTH EDGES"
- Show tool placement if using sculpting tools
- Include motion arrows (curved arrows for rolling)
- Text label: "SHAPE" or "SCULPT"

PANEL 3 - ASSEMBLY/ATTACHMENT:
- Show hands attaching pieces together
- Large arrows showing where pieces connect
- Text annotations: "PRESS FIRMLY", "BLEND SEAM", "ATTACH HERE"
- Show blending technique with finger marks
- Numbered sequence if multiple attachments (①②③)
- Text label: "ATTACH" or "ASSEMBLE"

PANEL 4 - FINISHED COMPONENT:
- Show completed component from this step
- Display best viewing angle
- Show how it should look when properly assembled
- Include any texture details added
- Text label: "RESULT" or "FINISHED"

🚨 CRITICAL REQUIREMENTS:
✓ Panel labels at top of each section
✓ BOLD ARROWS showing movement and attachment points
✓ TEXT ANNOTATIONS for every action
✓ Show HANDS/FINGERS demonstrating techniques
✓ WHITE BACKGROUND with soft even lighting
✓ Matte polymer clay texture (NOT shiny/glossy)
✓ EXACT color matching from Reference Image
✓ NO ELECTRONIC PARTS - only handcraft clay sculpting

EXAMPLE - Dinosaur "Shape body and legs" step:
Panel 1: Green clay body ball, 4 leg cylinders, tail cylinder (knolling, labeled with sizes)
Panel 2: Hands shaping body into oval, arrows showing pinch direction, text "FORM OVAL BODY"
Panel 3: Hand attaching legs, arrows pointing to connection points, text "ATTACH LEGS ①②③④"
Panel 4: Body with attached legs, front/side view showing proper alignment`,

    'Fabric/Sewing': `
🎨 MULTI-PANEL FABRIC/SEWING FORMAT (2-4 PANELS):
Divide the image into clear instructional panels:

PANEL 1 - PATTERN/MATERIALS:
- Show fabric pieces, pattern templates in knolling layout
- Label each piece: "Front panel", "Back panel", "Sleeve (x2)"
- Include measurements or seam allowances
- Match fabric color/texture from Reference Image
- Text label: "MATERIALS" or "CUT PIECES"

PANEL 2 - TECHNIQUE/SEWING:
- Show hands positioning fabric or sewing
- ARROWS showing stitch direction or fabric alignment
- Text annotations: "SEW SEAM", "1/4 INCH ALLOWANCE", "PIN HERE"
- Show close-up of seam or stitch technique
- Text label: "SEW" or "TECHNIQUE"

PANEL 3 - ASSEMBLY (if needed):
- Show pieces being attached or stuffed
- Arrows pointing to connection points
- Text: "ATTACH PANELS", "STUFF OPENING", "CLOSE SEAM"
- Text label: "ASSEMBLE"

PANEL 4 - RESULT:
- Show completed component
- Display proper shape and form
- Text label: "FINISHED"

🚨 REQUIREMENTS:
✓ Panel labels, BOLD ARROWS, text annotations
✓ Show HANDS/FINGERS demonstrating technique
✓ WHITE BACKGROUND, no tools visible
✓ Match fabric weave, color, stitch density from Reference
✓ NO ELECTRONIC PARTS - handcraft only`,

    'Costume & Props': `
🎨 MULTI-PANEL COSTUME/PROPS FORMAT (2-4 PANELS):

PANEL 1 - MATERIALS (KNOLLING):
- Foam pieces, beveled cuts, thermoplastic sections
- Label each: "Base foam", "Detail layer", "Edge trim"
- Show thickness measurements
- Match colors from Reference Image
- Text label: "MATERIALS"

PANEL 2 - CUTTING/SHAPING:
- Show hands cutting, heating, or beveling
- ARROWS showing cut lines or heat direction
- Text: "BEVEL EDGE", "HEAT TO 300°F", "CUT ALONG LINE"
- Text label: "SHAPE"

PANEL 3 - ASSEMBLY/ATTACHMENT:
- Hands gluing or attaching pieces
- Arrows to connection points
- Text: "GLUE HERE", "PRESS 30 SEC", "ALIGN EDGES"
- Text label: "ATTACH"

PANEL 4 - RESULT:
- Finished component
- Text label: "FINISHED"

🚨 REQUIREMENTS:
✓ Labels, BOLD ARROWS, annotations
✓ Show HANDS demonstrating technique
✓ WHITE BACKGROUND
✓ Match foam density, surface, thickness from Reference
✓ NO ELECTRONIC PARTS - handcraft only`,

    'Woodcraft': `
🎨 MULTI-PANEL WOODCRAFT FORMAT (2-4 PANELS):

PANEL 1 - WOOD PIECES (KNOLLING):
- Cut boards, dowels, joints laid out
- Label pieces with measurements: "12 inch board", "1/2 inch dowel"
- Show wood grain direction
- Match wood type/color from Reference
- Text label: "MATERIALS"

PANEL 2 - CUTTING/JOINING:
- Hands working with wood (no power tools visible)
- ARROWS showing joint alignment or assembly direction
- Text: "ALIGN GRAIN", "DOWEL JOINT", "SAND SMOOTH"
- Text label: "JOIN"

PANEL 3 - ASSEMBLY:
- Hands attaching pieces
- Arrows to connection points
- Text: "INSERT DOWEL", "GLUE JOINT", "CLAMP HERE"
- Text label: "ASSEMBLE"

PANEL 4 - RESULT:
- Finished component showing joinery
- Text label: "FINISHED"

🚨 REQUIREMENTS:
✓ Labels, BOLD ARROWS, annotations
✓ Show HANDS (no power tools visible)
✓ WHITE BACKGROUND, even lighting
✓ Match wood grain, color, thickness from Reference
✓ NO ELECTRONIC PARTS - traditional handcraft`,

    'Jewelry': `
🎨 MULTI-PANEL JEWELRY FORMAT (2-4 PANELS):

PANEL 1 - COMPONENTS (KNOLLING):
- Beads, charms, jump rings, wire cuts, chain segments
- Label each component with quantity
- Organized flat-lay arrangement
- Match metal color, bead clarity from Reference
- Text label: "MATERIALS"

PANEL 2 - WIRE/ASSEMBLY TECHNIQUE:
- Hands forming loops, opening jump rings
- ARROWS showing wire bending direction
- Text: "BEND WIRE", "OPEN RING", "THREAD BEAD"
- Macro close-up of technique
- Text label: "TECHNIQUE"

PANEL 3 - ATTACHMENT:
- Hands connecting components
- Arrows to connection points
- Text: "ATTACH CHARM", "CLOSE RING", "SECURE CLASP"
- Text label: "CONNECT"

PANEL 4 - RESULT:
- Finished component or section
- Text label: "FINISHED"

🚨 REQUIREMENTS:
✓ Labels, BOLD ARROWS, annotations
✓ Show HANDS/FINGERS with tools
✓ WHITE BACKGROUND, soft lighting
✓ Match metal color, bead clarity, shine from Reference
✓ NO ELECTRONIC PARTS - traditional handcraft`,

    'Kids Crafts': `
🎨 MULTI-PANEL KIDS CRAFTS FORMAT (2-4 PANELS):

PANEL 1 - COLORFUL MATERIALS (KNOLLING):
- Felt, foam, pipe cleaners, simple paper shapes
- Label pieces: "Red circle", "Blue star", "Green pipe cleaner"
- Bright, playful arrangement
- Match colors from Reference
- Text label: "MATERIALS"

PANEL 2 - SIMPLE ASSEMBLY:
- Hands (possibly child-sized) assembling pieces
- BIG BOLD ARROWS showing where to glue/attach
- Simple text: "GLUE HERE", "STICK TOGETHER", "FOLD"
- Text label: "MAKE"

PANEL 3 - ADD DETAILS (if needed):
- Hands adding decorations, eyes, features
- Arrows showing placement
- Text: "ADD EYES", "GLUE DECORATION"
- Text label: "DECORATE"

PANEL 4 - RESULT:
- Finished craft, bright and cheerful
- Text label: "DONE!"

🚨 REQUIREMENTS:
✓ Simple labels, BIG ARROWS, easy text
✓ Show HANDS demonstrating
✓ WHITE BACKGROUND
✓ Match playful colors, simple shapes from Reference
✓ NO ELECTRONIC PARTS - safe kid-friendly handcraft`,

    'Tabletop Figures': `
🎨 MULTI-PANEL MINIATURE FORMAT (2-4 PANELS):

PANEL 1 - MINIATURE PARTS (KNOLLING):
- Arms, heads, weapons, torso, legs, base pieces
- Label each: "Torso", "Arms (x2)", "Weapon", "Base"
- Show scale reference: "28mm scale"
- Include primer/paint colors if relevant
- Text label: "PARTS"

PANEL 2 - ASSEMBLY TECHNIQUE:
- Hands positioning/gluing miniature parts
- ARROWS showing connection points
- Text: "GLUE JOINT", "ALIGN PIN", "PRESS 10 SEC"
- Macro close-up of connection
- Text label: "ATTACH"

PANEL 3 - SUB-ASSEMBLY (if needed):
- Show partially assembled section
- Arrows indicating next attachments
- Text: "ADD ARM TO TORSO", "ATTACH BASE"
- Text label: "BUILD"

PANEL 4 - RESULT:
- Completed assembly step
- Show proper miniature pose/alignment
- Text label: "ASSEMBLED"

🚨 REQUIREMENTS:
✓ Labels, BOLD ARROWS, annotations
✓ Show HANDS with parts (macro view)
✓ WHITE BACKGROUND with subtle texture
✓ High-clarity lighting showing sculpt detail
✓ Match primer/paint colors from Reference
✓ NO ELECTRONIC PARTS - traditional miniature assembly`,
  };

  // Return category-specific rules or default generic rules
  return categoryRules[category] || `
🎨 MULTI-PANEL GENERIC FORMAT (2-4 PANELS):

PANEL 1 - MATERIALS (KNOLLING):
- Show all materials/components for this step in organized knolling layout
- Label each component
- Match colors/textures from Reference Image
- Text label: "MATERIALS"

PANEL 2 - TECHNIQUE/PROCESS:
- Show hands demonstrating the technique
- BOLD ARROWS showing movement/direction
- Text annotations explaining actions
- Text label: "PROCESS"

PANEL 3 - ASSEMBLY (if needed):
- Show components being attached
- Arrows to connection points
- Text annotations
- Text label: "ASSEMBLE"

PANEL 4 - RESULT:
- Show finished component
- Text label: "FINISHED"

🚨 REQUIREMENTS:
✓ Panel labels, BOLD ARROWS, text annotations
✓ Show HANDS demonstrating technique
✓ WHITE BACKGROUND, evenly lit
✓ Match exact textures, colors from Reference
✓ NO ELECTRONIC PARTS - handcraft only`;
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
🎯 YOUR TASK: Create a MULTI-PANEL instructional image for this step: "${stepDescription}"

📷 REFERENCE IMAGE PROVIDED: This shows the finished craft (colors, materials, style to match exactly)
${focusInstructions}

🧠 BEFORE GENERATING PATTERNS - ANALYZE THE COMPONENT:
Ask yourself these questions about the component in "${stepDescription}":
1. **Is this a 3D or 2D structure?**
   - Does it have volume/depth (head, body, limbs, pot) = 3D → needs unwrapping
   - Is it flat with stacked layers (shield, badge, sign) = 2D → needs layer sheets

2. **If 3D - What is the base shape?**
   - Sphere/rounded (head, ball) → unwrap into petal gores like a globe
   - Cylinder (body, limbs, tube, pot) → unwrap into curved rectangle
   - Cone (hat, nose) → unwrap into pie-slice fan shape
   - Box (base, platform) → unwrap into cross/net with 6 faces
   - Complex organic → break into geometric segments and unwrap each

3. **Does it need structural support?**
   - Tall/thin parts (stems, legs, necks) → add internal rolled paper tubes for rigidity
   - Heavy parts (pot, base) → reinforce edges with doubled paper
   - Hanging parts (leaves, petals) → add small paper tabs for support

4. **How will it connect to other parts?**
   - Add glue tabs at connection points
   - Ensure tab placement allows proper assembly
   - Match connection size to adjacent component

5. **What's the surface detail?**
   - Spots/patterns → print directly on pattern sheet
   - Teeth/features → separate small pieces to glue on
   - Texture → indicate with fold lines or scored paper

ANALYZE THE REFERENCE IMAGE NOW and determine the answers to these questions before creating the pattern sheets.

🚨 CRITICAL SCOPE REQUIREMENT:
This step image must ONLY show components and actions mentioned in the step description: "${stepDescription}"
- If the step is "Assemble body", show ONLY body pieces (no head, no clothes, no hair, no accessories)
- If the step is "Attach head", show ONLY head pieces and neck connection (no body, no limbs)
- If the step is "Add clothing details", show ONLY clothing pieces being attached (no underlying body)
- DO NOT show components from other steps - stay strictly within this step's scope
- The panels should focus exclusively on the specific parts mentioned in this step

🎨 CRITICAL MULTI-PANEL REQUIREMENTS:
You MUST create an image divided into 2-4 clear panels showing sub-steps within this main step.

MANDATORY ELEMENTS IN YOUR IMAGE:
1️⃣ PANEL DIVISIONS: Clear visual separation between panels (thin border lines or spacing)
2️⃣ PANEL LABELS: Each panel MUST have a text heading at the top ("PATTERN SHEETS", "MATERIALS", "ASSEMBLE", "FINISHED", etc.)
3️⃣ BOLD ARROWS: Use large, clearly visible arrows (→ ➜ ⬇ ↑) showing movement, direction, or connections
4️⃣ TEXT ANNOTATIONS: Add instructional text explaining actions ("FOLD HERE", "GLUE TAB", "ATTACH HERE", "ALIGN EDGES")
5️⃣ HANDS/FINGERS: Show hands demonstrating techniques in assembly/process panels
6️⃣ DETAILED INFORMATION: Pack each panel with visual details - this should look like a professional craft instruction manual

🚨 SPECIAL REQUIREMENT FOR STEP 1 / PATTERN SHEETS PANEL:
FOR PAPERCRAFT CATEGORY - FIRST STEP IMAGE REQUIREMENTS:
- Panel 1 is THE MOST CRITICAL - it must contain COMPLETE, PRECISE 3D pattern sheets for the selected craft object
- Show FULL pattern templates that someone could actually print and use to build this craft

🎯 CRITICAL PATTERN TYPE SELECTION:
Examine the reference image carefully to determine which type of papercraft this is:

TYPE 1 - 3D FOLDED PAPERCRAFT (if object has curved/rounded forms that need folding):
  * Patterns must be properly unwrapped like UV maps in 3D modeling
  * A ROUNDED HEAD unwraps into petal-like segments/gores (like peeling an orange)
  * A CYLINDRICAL BODY unwraps into a curved rectangle that wraps around to form a tube
  * CURVED LIMBS unwrap into elongated curved shapes with fold lines to create 3D tubes
  * SPHERICAL shapes unwrap into geometric patterns with strategic fold lines
  * Include dashed fold lines showing where to fold
  * The unwrapped geometry must be mathematically correct to fold into the 3D shape

  🚨 PAPER-ONLY REQUIREMENT:
  * ALL parts must be made from PAPER - no foam, fabric, wire, or soft materials
  * Use LOW-POLY GEOMETRIC STYLE for curves (like low-poly 3D models)
  * Curves created through angular paper facets and strategic folds, NOT soft materials
  * Example: Round lips/mouth = angular paper segments that approximate the curve
  * This is PURE PAPERCRAFT - everything constructed from flat paper with folds

TYPE 2 - 2D LAYERED PAPERCRAFT (if object uses flat stacked layers for depth):
  * Patterns are flat 2D shapes that stack on top of each other
  * Show MULTIPLE LAYERS separately (base, middle, detail, top layers)
  * Each layer is a complete flat outline with no fold lines
  * Layers stack vertically to create "body" and thickness
  * Label each layer clearly (Layer 1 - Base, Layer 2 - Middle, etc.)
  * Layers may be slightly different sizes/shapes to create contoured depth
  * Include small spacers or foam tape indicators between layers if needed

- Each pattern sheet must display:
  * Complete outlines with proper 3D unwrapping geometry (NOT just simple flat shapes)
  * Cut lines (solid) showing where to cut
  * Fold lines (dashed) showing where flat patterns fold to create 3D curves
  * Glue tabs where pieces connect (flaps extending from edges)
  * Piece numbers or labels (1, 2, 3, A, B, C, etc.)
  * Scale reference or measurements
- Layout: Spread ALL sheets FLAT side-by-side in knolling arrangement (NOT stacked)
- View: Top-down view as if sheets are laid on a cutting mat with grid background
- Detail level: MAXIMUM PRECISION - patterns must be accurate and buildable
- Colors: Match EXACT colors from the reference craft object
- Background: White with subtle grid lines (like blueprint/cutting mat paper)

CRITICAL: These are ACTUAL 3D-UNWRAPPED PATTERN TEMPLATES. Someone should be able to print, cut, score fold lines, and assemble into a 3D craft matching the reference image. The unwrapped geometry must be correct for 3D assembly.

🚨 ABSOLUTE PROHIBITIONS:
❌ NO ELECTRONIC PARTS (no circuits, LEDs, batteries, wires, motors)
❌ NO POWER TOOLS visible in frame
❌ FOR PAPERCRAFT: NO FOAM, NO FABRIC, NO WIRE, NO SOFT MATERIALS - PAPER ONLY
❌ FOR PAPERCRAFT: NO smooth rounded curves - use LOW-POLY GEOMETRIC FACETS instead
✅ PAPERCRAFT must be PURE PAPER with angular/geometric folds (low-poly style)
✅ Simple hand tools are OK (scissors, glue - but focus on the craft, not the tools)

${categoryRules}

FINAL REMINDERS:
1. This MUST be a multi-panel image with labels, arrows, text annotations, and hands demonstrating the technique
2. Reference the original image's colors and style exactly
3. 🚨 MOST IMPORTANT: Show ONLY the components mentioned in this step: "${stepDescription}"
   - Do NOT include components from other steps
   - Focus strictly on the parts needed for THIS specific step
   - If the step is about the body, show ONLY body pieces (no head, limbs, clothes, etc.)
   - If the step is about attaching one part to another, show ONLY those two parts and their connection
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
 * Generates a comprehensive SVG-style pattern sheet showing all components
 * of the craft organized by element (hair, head, dress, props, etc.)
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

  const prompt = `
🎯 YOUR TASK: Create a comprehensive SVG-style papercraft pattern template sheet for the entire craft shown in the reference image.

📷 REFERENCE IMAGE: Study this completed craft to understand all elements and components.

${craftLabel ? `🎨 CRAFT: ${craftLabel}` : ''}

🚨 CRITICAL REQUIREMENTS:

1️⃣ ANALYZE FIRST - Identify ALL Elements:
Before creating patterns, carefully identify EVERY component in the craft:
- Character parts: Head, torso, limbs, hands, feet
- Hair elements: Base, bangs, curls, ponytail, etc.
- Clothing: Dress, shirt, pants, skirt, sleeves, collar, etc.
- Accessories: Crown, hat, jewelry, belt, buttons, etc.
- Props: Weapons, tools, containers, stands, bases, etc.

List them mentally, then create patterns for ALL of them.

2️⃣ SINGLE IMAGE OUTPUT:
Generate ONE comprehensive pattern sheet image containing ALL elements organized by category.

3️⃣ LAYOUT STRUCTURE:
┌─────────────────────────────────────────────┐
│  PATTERN SHEET - [CRAFT NAME]              │
├──────────┬──────────┬──────────┬───────────┤
│  HAIR    │  HEAD    │  BODY    │  CLOTHES  │
│ (pieces) │ (pieces) │ (pieces) │ (pieces)  │
├──────────┼──────────┼──────────┼───────────┤
│  LIMBS   │  HANDS   │  PROPS   │  BASE     │
│ (pieces) │ (pieces) │ (pieces) │ (pieces)  │
└──────────┴──────────┴──────────┴───────────┘

4️⃣ PATTERN REQUIREMENTS:

For EACH component:
✓ Show as 3D unwrapped patterns (UV-mapped like 3D modeling)
✓ ROUNDED shapes (heads, bodies) → unwrap into petal gores or segments
✓ CYLINDRICAL shapes (limbs, tubes) → unwrap into curved rectangles
✓ CURVED surfaces → show how they flatten with fold lines
✓ Include cut lines (solid) and fold lines (dashed)
✓ Add glue tabs for assembly
✓ Label each piece clearly (e.g., "HEAD - Front", "ARM L", "SKIRT - Panel 1")
✓ Match EXACT colors from reference image
✓ Show scale/size indicators

5️⃣ ORGANIZATION BY CATEGORY:

Group patterns by logical categories with clear labels:
- HAIR SECTION: All hair pieces (base, curls, bangs, etc.)
- HEAD SECTION: Face, ears, neck pieces
- BODY SECTION: Torso front/back, belly, chest
- CLOTHING SECTION: Dress panels, sleeves, collar, etc.
- LIMBS SECTION: Arms, legs (left & right)
- HANDS/FEET SECTION: Hand pieces, fingers, shoes
- ACCESSORIES SECTION: Crown, jewelry, decorative elements
- PROPS SECTION: Weapons, containers, tools
- BASE/STAND SECTION: Platform, support pieces

6️⃣ VISUAL STYLE:

✓ Clean SVG/vector style with precise lines
✓ White background with subtle grid
✓ Black outlines for cut lines (solid)
✓ Blue dashed lines for fold lines
✓ Red dotted lines for glue tabs
✓ Color fill matching reference image
✓ Text labels in clean sans-serif font
✓ Professional technical drawing aesthetic

7️⃣ COMPLETENESS CHECK:

Before finalizing, verify you included patterns for:
✓ Every visible component in the reference image
✓ Both left AND right limbs (if character has limbs)
✓ All layers of clothing (if multi-layered)
✓ Every hair component (base + curls + details)
✓ All accessories and props
✓ Connection tabs for assembly
✓ Base or stand (if applicable)

8️⃣ PAPER-ONLY CONSTRUCTION:

🚨 CRITICAL: ALL patterns must be paper-constructible:
✓ Use LOW-POLY GEOMETRIC approach for curves
✓ Curves achieved through faceted folds, NOT soft materials
✓ Round shapes = angular segments that approximate curves
✓ NO foam, fabric, wire, or soft materials
✓ Pure papercraft = everything folds/rolls from flat sheets

EXAMPLE CATEGORIES (for a princess character):
┌────────────────────────────────────────────┐
│ PATTERN SHEET - Princess Peach Papercraft │
├──────────┬─────────┬──────────┬───────────┤
│ HAIR     │ HEAD    │ BODY     │ DRESS     │
│ - Base   │ - Front │ - Torso  │ - Skirt   │
│ - Curls  │ - Back  │ - Neck   │ - Bodice  │
│ (orange) │ (skin)  │ (skin)   │ (green)   │
├──────────┼─────────┼──────────┼───────────┤
│ ARMS     │ HANDS   │ CROWN    │ BASE      │
│ - L/R    │ - L/R   │ - 5 pts  │ - Circle  │
│ (skin)   │ (skin)  │ (gold)   │ (brown)   │
└──────────┴─────────┴──────────┴───────────┘

📐 TECHNICAL PRECISION:
- This is a buildable template - someone must be able to print, cut, and assemble
- Patterns must be geometrically correct for 3D folding
- All pieces must connect properly with tabs
- Maintain proper proportions relative to reference image

🎨 FINAL OUTPUT:
One comprehensive, professionally organized pattern sheet with ALL elements labeled and ready to print.

Category: ${category}
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
    - EXAMPLE: If the full image shows "Link, Zelda, and Ganondorf" and I selected "Link", create instructions ONLY for Link figure, NOT Zelda, NOT Ganondorf, NOT the shield, NOT the sword accessories
    - The first image may contain some background elements due to imperfect selection - IGNORE them
    - Focus EXCLUSIVELY on: "${objectLabel}"

    YOUR TASK: Create step-by-step instructions to build THIS ONE OBJECT ONLY: "${objectLabel}"

    1. Determine the complexity (Simple, Moderate, Complex) and a score 1-10 FOR "${objectLabel}" ONLY.
    2. List the essential materials needed FOR "${objectLabel}" ONLY.
    3. Break down the construction into logical steps FOR "${objectLabel}" ONLY.

    🚨 CRITICAL STEP COUNT AND CHARACTER LIMIT RULES 🚨
    - MAXIMUM 4 STEPS TOTAL - This is a hard limit!
    - MAXIMUM 2 CHARACTERS per craft (NOT counting props/accessories)
    - Props and accessories (swords, shields, hats, pots, stands, bases) DO NOT count toward character limit
    - If "${objectLabel}" contains more than 2 characters, intelligently select the 2 most important/iconic ones
    - Examples:
      * "Mario and Luigi" = 2 characters ✓ (allowed)
      * "Mario, Luigi, and Peach" = 3 characters ✗ (pick 2 most iconic: Mario + Luigi)
      * "Link with Master Sword and Shield" = 1 character + 2 props ✓ (allowed, props don't count)
      * "Piranha Plant in Pot with Stand" = 1 character + 2 props ✓ (allowed)

    STEP COUNT RULES:
    - Do NOT create a "gather materials" step - start with actual construction
    - Combine related substeps into single steps (e.g., "Cut and shape base pieces" instead of two steps)
    - Focus on MAJOR construction phases only, not every tiny detail
    - Each step should represent a significant milestone in the build
    - Focus ONLY on "${objectLabel}", ignore all other objects in both images

    EXAMPLE - Good step breakdown for a papercraft figure (4 steps):
    Step 1: Cut out all pattern pieces and score fold lines
    Step 2: Assemble the main body structure
    Step 3: Attach limbs and head
    Step 4: Add final details and decorative elements

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

    1. Determine the complexity (Simple, Moderate, Complex) and a score 1-10.
    2. List the essential materials visible or implied.
    3. Break down the construction into logical, step-by-step instructions.

    🚨 CRITICAL STEP COUNT AND CHARACTER LIMIT RULES 🚨
    - MAXIMUM 4 STEPS TOTAL - This is a hard limit!
    - MAXIMUM 2 CHARACTERS per craft (NOT counting props/accessories)
    - Props and accessories (swords, shields, hats, pots, stands, bases) DO NOT count toward character limit
    - If the project contains more than 2 distinct characters, intelligently select the 2 most important/iconic ones
    - Examples:
      * "Mario and Luigi" = 2 characters ✓ (allowed)
      * "Mario, Luigi, Peach, and Bowser" = 4 characters ✗ (pick 2 most iconic: Mario + Bowser)
      * "Link with Master Sword and Hylian Shield" = 1 character + 2 props ✓ (allowed, props don't count)
      * "Three Piranha Plants in Pots" = 3 characters ✗ (reduce to 2 plants, keep all pots as props)

    STEP COUNT RULES:
    - Do NOT create a "gather materials" or "prepare materials" step - materials list is captured separately
    - Start directly with the first actual construction/assembly step
    - Combine related substeps into single steps (e.g., "Cut and shape base pieces" instead of two steps)
    - Focus on MAJOR construction phases only, not every tiny detail
    - Each step should represent a significant milestone in the build

    WHAT COUNTS AS A CHARACTER vs PROP:
    - Character: Standalone figure, person, creature, or main object (Mario, Link, Piranha Plant, dinosaur)
    - Prop: Accessory, weapon, container, base, or support item (sword, pot, stand, shield, hat, platform)
    - Complex example: "Link figure" = 1 character, "Master Sword" = 1 prop, "Hylian Shield" = 1 prop, "Display base" = 1 prop
    - If unclear, ask: "Can this exist independently as the main focus?" Yes = Character, No = Prop

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