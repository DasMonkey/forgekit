import { GoogleGenAI, Type } from "@google/genai";
import { CraftCategory, DissectionResponse } from "../types";
import { imageGenerationLimiter, dissectionLimiter, trackApiUsage } from "../utils/rateLimiter";

// Initialize GenAI
const apiKey = process.env.API_KEY || '';

const getAiClient = () => new GoogleGenAI({ apiKey });

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
- Show COMPLETE, FLAT pattern sheets laid out side-by-side in knolling arrangement
- DO NOT stack sheets - spread them out so ALL sheets are visible at once
- Each sheet should show the FULL pattern template with all pieces on that sheet
- Display sheets on grid background (like cutting mat) for scale reference
- Include cut lines (solid black), fold lines (dashed), and glue tabs on patterns
- Label each sheet or piece clearly (numbers or letters)
- Match exact colors from Reference Image
- Show sheets as if laid on a table, viewed from directly above (top-down view)
- Add text label at top: "PATTERN SHEETS" or "MATERIALS"
- CRITICAL: No matter how many sheets needed, show them ALL laid flat side-by-side

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

EXAMPLE - Hylian Shield "Cut and prepare base layers" step:
Panel 1: 3-4 pattern sheets laid flat side-by-side on grid background showing: gray base shield template, blue decorative layer template, yellow Triforce template, red bird emblem template - each sheet complete with cut/fold lines, labeled, spread out horizontally
Panel 2: Hand stacking layers with arrows showing order, text "STACK IN THIS ORDER: ①②③④"
Panel 3: Hand gluing Triforce to blue layer, arrow pointing to placement, text "CENTER TRIFORCE"
Panel 4: Completed shield showing all layers assembled, front view

EXAMPLE - Princess character "Prepare dress patterns" step:
Panel 1: Multiple pattern sheets (green dress panel, orange hair pieces, beige skin pieces, gold crown) ALL laid flat side-by-side on grid, showing complete templates with fold/cut lines
Panel 2: Hands cutting out pieces with scissors, arrows showing cutting direction
Panel 3: Hands scoring fold lines with ruler, text "SCORE DASHED LINES"
Panel 4: All cut pieces organized and ready for assembly`,

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
  targetObjectLabel?: string
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

  const prompt = `
🎯 YOUR TASK: Create a MULTI-PANEL instructional image for this step: "${stepDescription}"

📷 REFERENCE IMAGE PROVIDED: This shows the finished craft (colors, materials, style to match exactly)
${focusInstructions}

🎨 CRITICAL MULTI-PANEL REQUIREMENTS:
You MUST create an image divided into 2-4 clear panels showing sub-steps within this main step.

MANDATORY ELEMENTS IN YOUR IMAGE:
1️⃣ PANEL DIVISIONS: Clear visual separation between panels (thin border lines or spacing)
2️⃣ PANEL LABELS: Each panel MUST have a text heading at the top ("PATTERN SHEETS", "MATERIALS", "ASSEMBLE", "FINISHED", etc.)
3️⃣ BOLD ARROWS: Use large, clearly visible arrows (→ ➜ ⬇ ↑) showing movement, direction, or connections
4️⃣ TEXT ANNOTATIONS: Add instructional text explaining actions ("FOLD HERE", "GLUE TAB", "ATTACH HERE", "ALIGN EDGES")
5️⃣ HANDS/FINGERS: Show hands demonstrating techniques in assembly/process panels
6️⃣ DETAILED INFORMATION: Pack each panel with visual details - this should look like a professional craft instruction manual

🚨 SPECIAL REQUIREMENT FOR PAPERCRAFT FIRST PANEL:
- For Papercraft category, Panel 1 MUST show COMPLETE pattern sheets laid FLAT side-by-side
- DO NOT stack sheets on top of each other
- Spread ALL sheets out horizontally in knolling layout so every sheet is fully visible
- Show sheets from top-down view as if on a cutting mat with grid background
- Each sheet should display the complete pattern template with all pieces clearly visible

🚨 ABSOLUTE PROHIBITIONS:
❌ NO ELECTRONIC PARTS (no circuits, LEDs, batteries, wires, motors)
❌ NO POWER TOOLS visible in frame
✅ ONLY HANDCRAFT MATERIALS (paper, clay, fabric, wood, foam, beads, etc.)
✅ Simple hand tools are OK (scissors, glue, needle - but focus on the craft, not the tools)

${categoryRules}

FINAL REMINDER: This MUST be a multi-panel image with labels, arrows, text annotations, and hands demonstrating the technique. Reference the original image's colors and style exactly.
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
        },
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

    🚨 CRITICAL STEP COUNT REDUCTION RULES 🚨
    - MAXIMUM 4-6 STEPS TOTAL - Keep it simple and concise!
    - Do NOT create a "gather materials" step - start with actual construction
    - Combine related substeps into single steps (e.g., "Cut and shape base pieces" instead of two steps)
    - Focus on MAJOR construction phases only, not every tiny detail
    - Each step should represent a significant milestone in the build
    - Focus ONLY on "${objectLabel}", ignore all other objects in both images
    - If this is one character in a set, provide instructions for ONLY this character

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

    IMPORTANT RULES FOR STEPS:
    - Do NOT create a "gather materials" or "prepare materials" step. The materials list is already captured separately.
    - Start directly with the first actual construction/assembly step.
    - Focus only on hands-on construction actions.

    CHARACTER/OBJECT LIMIT:
    - If the project contains MULTIPLE DISTINCT CHARACTERS OR OBJECTS (e.g., "Mario set" with Mario, Mushroom, Block, Flower), limit to a MAXIMUM OF 4 characters/objects.
    - This limit ONLY applies to separate standalone items, NOT to parts of a single craft.
    - Examples that should be limited to 4 objects:
      * Character sets (Mario + Luigi + Peach + Bowser = 4 max)
      * Scene collections (multiple figures in a diorama)
      * Sets of similar items (multiple ornaments, multiple toys)
    - Examples that should NOT be limited:
      * Single automata with many gears/parts (this is ONE object with multiple components)
      * Single Lego figure with arms/legs/head/body (this is ONE figure)
      * Single complex model with many pieces (this is ONE craft)
    - If the user's prompt implies more than 4 distinct objects, intelligently select the 4 most important/iconic ones.

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