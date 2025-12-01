import { GoogleGenAI, Type } from "@google/genai";
import { CraftCategory, DissectionResponse, PixelGridSize } from "../types";
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
 * Generates a game asset image based on the specified style category.
 */
export const generateCraftImage = async (
  prompt: string,
  category: CraftCategory,
  pixelSize?: PixelGridSize
): Promise<string> => {
  // Check rate limit before making request
  if (!imageGenerationLimiter.canMakeRequest()) {
    const waitTime = imageGenerationLimiter.getTimeUntilNextRequest();
    const waitSeconds = Math.ceil(waitTime / 1000);
    throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds before generating another image.`);
  }

  const ai = getAiClient();

  // Get category-specific style rules for game assets
  const getAssetStylePrompt = (cat: CraftCategory, gridSize?: PixelGridSize): string => {
    switch (cat) {
      case CraftCategory.PIXEL_ART:
        const size = gridSize || 32;
        // Scale detail level based on pixel size
        const isSmall = size <= 32;
        const isMedium = size > 32 && size <= 128;
        const isLarge = size > 128;

        const detailLevel = isSmall
          ? 'Simple, iconic design with minimal details. Limited color palette (8-16 colors). Bold shapes and clear silhouette.'
          : isMedium
          ? 'Moderate detail with defined features. Color palette of 16-32 colors. Good balance of detail and readability.'
          : 'HIGHLY DETAILED pixel art with rich textures, shading, and fine details. Extended color palette (64-128+ colors). Include subtle gradients, highlights, shadows, fabric textures, hair strands, facial expressions, and intricate patterns. This is a HIGH RESOLUTION pixel art piece.';

        return `
PIXEL ART STYLE (${size}x${size} resolution):
- ${detailLevel}
- The sprite should be designed to fit within a ${size}x${size} pixel canvas
- Clean, crisp pixels with no anti-aliasing blur
- NO grid lines or pixel borders - pixels are solid color blocks that blend seamlessly
- NO visible grid overlay - just pure color fills
${isLarge ? '- Use advanced dithering techniques for smooth gradients and shading' : '- Dithering for gradients and shading where appropriate'}
${isLarge ? '- Include fine details: wrinkles in clothing, individual hair pixels, subtle color variations in skin tones, texture details' : ''}
- Game-ready sprite suitable for 2D games
- IMPORTANT: Use a PURE WHITE (#FFFFFF) solid background - NO transparency checkerboard pattern, NO gray/white checker pattern
- Each colored area is a smooth block of color with NO separating lines between pixels
- IMPORTANT: Design as a ${size}x${size} pixel sprite with ${isLarge ? 'MAXIMUM' : 'appropriate'} detail for this resolution

⚠️ COMPOSITION REQUIREMENT - CRITICAL:
- FOR SINGLE CHARACTERS/OBJECTS: Leave 10-15% padding on all sides, center the subject with breathing room
- FOR SCENES/LANDSCAPES/ENVIRONMENTS: Fill the ENTIRE canvas edge-to-edge with NO white borders or padding
- If the prompt describes a scene, landscape, environment, or multiple elements: USE FULL CANVAS
- If the prompt describes a single character or object: USE CENTERED COMPOSITION with padding`;

      case CraftCategory.AAA:
        return `
AAA GAME QUALITY STYLE:
- Photorealistic, high-fidelity 3D render quality
- Studio lighting with realistic shadows and reflections
- PBR (Physically Based Rendering) material quality
- Detailed textures with normal maps, roughness, metallic properties
- Subsurface scattering for skin/organic materials
- High polygon count appearance with smooth surfaces
- Cinematic quality suitable for next-gen games
- Professional concept art or in-game asset quality
- Neutral studio background with soft gradient`;

      case CraftCategory.LOW_POLY_3D:
        return `
LOW POLY 3D STYLE:
- Geometric, faceted 3D model aesthetic
- Flat-shaded triangular faces visible
- Minimalist polygon count with intentional faceting
- Clean, solid colors per face (no complex textures)
- Stylized and modern indie game look
- Sharp edges and angular forms
- Soft ambient lighting to show form
- Mobile-game or indie-game ready quality
- Simple gradient or solid color background`;

      case CraftCategory.HD_2D:
        return `
HD 2D / ILLUSTRATED SPRITE STYLE:
- Hand-painted, high-resolution 2D art (like Ori and the Blind Forest, Hollow Knight, Rayman Legends)
- Smooth, fluid artwork with NO visible pixel grid
- Rich painterly details with gradients and lighting effects
- Soft edges with subtle glows and atmospheric effects
- Detailed shading and highlights that feel hand-crafted
- Vibrant colors with depth and luminosity
- Layered visual depth with foreground/background separation feel
- Professional illustration quality suitable for HD/4K displays
- Artistic, stylized proportions (not photorealistic)
- Clean background with soft gradient or atmospheric elements`;

      case CraftCategory.VOXEL_ART:
        return `
VOXEL ART STYLE:
- 3D cubic/blocky aesthetic (Minecraft-inspired)
- Visible cube/voxel grid structure
- Each voxel is a distinct colored cube
- Clean, solid colors per voxel block
- Charming, blocky interpretation of the subject
- Ambient occlusion between voxels for depth
- Isometric or 3/4 view to show 3D depth
- Game-ready voxel model appearance
- Simple solid color or gradient background`;

      default:
        return `Game asset style with clean rendering and professional quality.`;
    }
  };

  const stylePrompt = getAssetStylePrompt(category, pixelSize);

  const fullPrompt = `
🎮 GAME ASSET GENERATION

Create a game-ready asset: ${prompt}

📦 STYLE CATEGORY: ${category}

${stylePrompt}

═══════════════════════════════════════════════════════════════
📋 UNIVERSAL REQUIREMENTS
═══════════════════════════════════════════════════════════════

1. ✅ GAME-READY - Asset should look like it belongs in a video game
2. ✅ CLEAR SILHOUETTE - Easily recognizable shape and form
3. ✅ COMPOSITION - See below for scene vs character rules
4. ✅ FRONT-FACING or 3/4 VIEW - Standard game asset presentation angle (for characters)
5. ✅ CONSISTENT STYLE - Match the ${category} aesthetic throughout
6. ✅ CLEAN BACKGROUND - Transparent-friendly or simple solid/gradient

🚨 CRITICAL COMPOSITION RULES:
- IF SINGLE CHARACTER/OBJECT: Center with padding, leave breathing room
- IF SCENE/LANDSCAPE/ENVIRONMENT: Fill ENTIRE canvas edge-to-edge, NO white borders
- Scenes include: landscapes, environments, buildings with surroundings, multiple characters in a setting
- Single assets include: one character, one object, one item

🚫 DO NOT:
- Mix art styles (e.g., no pixel art elements in AAA renders)
- Add excessive detail that doesn't match the style
- Use busy or distracting backgrounds
- Create assets that look unfinished or sketch-like
- Add white padding/borders around scenes or landscapes
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
 * Transforms an uploaded image into a game asset in the specified style.
 * Converts reference images into game-ready assets.
 */
export const generateCraftFromImage = async (
  imageBase64: string,
  category: CraftCategory,
  pixelSize?: PixelGridSize
): Promise<string> => {
  // Check rate limit before making request
  if (!imageGenerationLimiter.canMakeRequest()) {
    const waitTime = imageGenerationLimiter.getTimeUntilNextRequest();
    const waitSeconds = Math.ceil(waitTime / 1000);
    throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds before generating another image.`);
  }

  const ai = getAiClient();
  const cleanBase64 = imageBase64.split(',')[1] || imageBase64;

  // Get category-specific transformation rules
  const getTransformationRules = (cat: CraftCategory, gridSize?: PixelGridSize): string => {
    switch (cat) {
      case CraftCategory.PIXEL_ART:
        const size = gridSize || 32;
        // Scale detail level based on pixel size
        const isSmallT = size <= 32;
        const isMediumT = size > 32 && size <= 128;
        const isLargeT = size > 128;

        const detailLevelT = isSmallT
          ? 'Simple, iconic pixel art with limited colors (8-16). Bold shapes.'
          : isMediumT
          ? 'Moderate detail pixel art with 16-32 colors. Good balance of detail.'
          : 'HIGHLY DETAILED pixel art with 64-128+ colors. Rich textures, shading, fine details, gradients, highlights, shadows.';

        return `
PIXEL ART TRANSFORMATION (${size}x${size} resolution):
- Convert to ${size}x${size} pixel art style
- ${detailLevelT}
- The sprite must fit within a ${size}x${size} pixel grid
- Create clean, crisp pixels with no blur or anti-aliasing
- NO grid lines or pixel borders between pixels
- NO visible grid overlay - pixels blend seamlessly as solid color blocks
${isLargeT ? '- Use advanced dithering for smooth gradients and detailed shading' : '- Use dithering for shading and gradients'}
${isLargeT ? '- Preserve and enhance fine details: textures, hair, facial features, fabric patterns' : ''}
- Maintain character silhouette and key features
- IMPORTANT: Use a PURE WHITE (#FFFFFF) solid background - NO transparency checkerboard pattern, NO gray/white checker pattern
- IMPORTANT: Output must be a ${size}x${size} pixel sprite with ${isLargeT ? 'MAXIMUM' : 'appropriate'} detail

⚠️ COMPOSITION REQUIREMENT - CRITICAL:
- FOR SINGLE CHARACTERS/OBJECTS: Leave 10-15% padding on all sides, center the subject with breathing room
- FOR SCENES/LANDSCAPES/ENVIRONMENTS: Fill the ENTIRE canvas edge-to-edge with NO white borders or padding
- If the image shows a scene, landscape, environment, or multiple elements: USE FULL CANVAS
- If the image shows a single character or object: USE CENTERED COMPOSITION with padding`;

      case CraftCategory.AAA:
        return `
AAA QUALITY TRANSFORMATION:
- Reimagine as a high-fidelity 3D game asset
- Apply photorealistic rendering with PBR materials
- Add detailed textures, normal maps, and surface detail
- Use cinematic studio lighting with soft shadows
- Add subsurface scattering for organic materials
- Create next-gen console quality appearance
- Professional game character/asset quality`;

      case CraftCategory.LOW_POLY_3D:
        return `
LOW POLY 3D TRANSFORMATION:
- Convert to geometric, faceted 3D model style
- Use flat-shaded triangular faces
- Minimize polygon count with intentional angular forms
- Apply solid colors per face (no complex textures)
- Create modern indie game aesthetic
- Sharp edges and clean geometric shapes
- Stylized minimalist 3D look`;

      case CraftCategory.VOXEL_ART:
        return `
VOXEL ART TRANSFORMATION:
- Convert to 3D cubic/blocky voxel style
- Each element becomes distinct colored cubes
- Maintain recognizable form in blocky interpretation
- Add ambient occlusion between voxels
- Use clean, solid colors per voxel
- Create Minecraft-inspired aesthetic
- Show isometric or 3/4 view for depth`;

      default:
        return `Transform into a game-ready asset with clean styling.`;
    }
  };

  const transformRules = getTransformationRules(category, pixelSize);

  const prompt = `
🎮 GAME ASSET TRANSFORMATION

Transform this reference image into a ${category} style game asset.

📷 REFERENCE IMAGE: Use this as the source for character/object design

📦 TARGET STYLE: ${category}

${transformRules}

═══════════════════════════════════════════════════════════════
🔒 CONSISTENCY REQUIREMENTS
═══════════════════════════════════════════════════════════════

1. ✅ PRESERVE IDENTITY - Keep the core character/object recognizable
2. ✅ MATCH COLORS - Use similar color palette from the reference
3. ✅ KEEP PROPORTIONS - Maintain relative size and shape ratios
4. ✅ RETAIN KEY FEATURES - Preserve distinguishing characteristics
5. ✅ STYLE CONVERSION - Fully transform to ${category} aesthetic

═══════════════════════════════════════════════════════════════
📋 OUTPUT REQUIREMENTS
═══════════════════════════════════════════════════════════════

- CENTERED composition with appropriate padding
- FRONT-FACING or 3/4 VIEW angle
- CLEAN BACKGROUND (solid color or simple gradient)
- GAME-READY quality suitable for use in a video game
- CONSISTENT ${category} style throughout

🚫 DO NOT:
- Lose the character's recognizable features
- Mix multiple art styles together
- Use busy or complex backgrounds
- Create a sketch or unfinished look
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
 * Detects if the prompt is requesting a sprite sheet animation
 * Returns the frame count if detected, null otherwise
 */
const detectSpriteSheetRequest = (prompt: string): number | null => {
  const lowerPrompt = prompt.toLowerCase();

  // Check for sprite sheet animation patterns
  const patterns = [
    /(\d+)[-\s]?frame\s+sprite\s*sheet/i,
    /sprite\s*sheet\s+animation.*?(\d+)[-\s]?frame/i,
    /sprite\s*sheet.*?(\d+)\s*frame/i,
    /(\d+)\s*frame.*sprite\s*sheet/i,
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match && match[1]) {
      const frameCount = parseInt(match[1], 10);
      if (frameCount >= 2 && frameCount <= 12) {
        return frameCount;
      }
    }
  }

  // Check for generic sprite sheet requests without specific frame count
  if (lowerPrompt.includes('sprite sheet') || lowerPrompt.includes('spritesheet')) {
    return 4; // Default to 4 frames
  }

  return null;
};

/**
 * Generates an animation sprite sheet in a horizontal strip format
 * Designed for compatibility with animation tools (Unity, Godot, etc.)
 *
 * Output format:
 * - 16:9 aspect ratio for wide horizontal layout
 * - Single horizontal row of frames (no grid)
 * - Equal spacing between frames
 * - No overlapping poses
 * - Clear frame boundaries for easy slicing
 */
export const generateAnimationSpriteSheet = async (
  referenceImageBase64: string,
  frameCount: number,
  animationDescription: string,
  category: CraftCategory
): Promise<string> => {
  // Check rate limit before making request
  if (!imageGenerationLimiter.canMakeRequest()) {
    const waitTime = imageGenerationLimiter.getTimeUntilNextRequest();
    const waitSeconds = Math.ceil(waitTime / 1000);
    throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds before generating another image.`);
  }

  const ai = getAiClient();
  const cleanBase64 = referenceImageBase64.split(',')[1] || referenceImageBase64;

  // Category-specific style rules for sprite sheets
  const getStyleRules = (cat: CraftCategory): string => {
    switch (cat) {
      case CraftCategory.PIXEL_ART:
        return `
PIXEL ART STYLE:
- Clean, crisp pixels with NO anti-aliasing or blur
- Limited color palette (same colors across all frames)
- NO grid lines between pixels - seamless solid color blocks
- Each frame must maintain pixel-perfect consistency
- Use magenta (#FF00FF) or solid color background for easy removal`;

      case CraftCategory.AAA:
        return `
AAA QUALITY STYLE:
- Photorealistic, high-fidelity 3D render quality
- Consistent PBR lighting across all frames
- Same material properties in every pose
- Studio lighting with soft shadows
- Neutral background for easy extraction`;

      case CraftCategory.LOW_POLY_3D:
        return `
LOW POLY 3D STYLE:
- Geometric, faceted 3D model aesthetic
- Flat-shaded triangular faces
- Same polygon density in all frames
- Clean, solid colors per face
- Simple background`;

      case CraftCategory.VOXEL_ART:
        return `
VOXEL ART STYLE:
- 3D cubic/blocky voxel structure
- Same voxel resolution in all frames
- Consistent lighting and ambient occlusion
- Solid colors per voxel block
- Clean background`;

      case CraftCategory.HD_2D:
        return `
HD 2D / ILLUSTRATED STYLE:
- Hand-painted, high-resolution 2D art (Ori, Hollow Knight style)
- Smooth, fluid artwork with NO visible pixel grid
- Rich painterly details with gradients and lighting effects
- Soft glows and atmospheric effects consistent across frames
- Same level of detail and color palette in every frame
- Clean background for easy extraction`;

      default:
        return 'Consistent game-ready art style across all frames.';
    }
  };

  const styleRules = getStyleRules(category);

  // Grid layout: 4 frames = 2x2, 6 or 8 frames = 3x3
  const gridSize = frameCount === 4 ? 2 : 3;
  const totalCells = gridSize * gridSize;
  const emptyCells = totalCells - frameCount;

  // Generate grid diagram based on frame count
  const getGridDiagram = () => {
    if (frameCount === 4) {
      return `
┌────────┬────────┐
│ Frame 1│ Frame 2│
├────────┼────────┤
│ Frame 3│ Frame 4│
└────────┴────────┘`;
    } else if (frameCount === 6) {
      return `
┌────────┬────────┬────────┐
│ Frame 1│ Frame 2│ Frame 3│
├────────┼────────┼────────┤
│ Frame 4│ Frame 5│ Frame 6│
├────────┼────────┼────────┤
│ (empty)│ (empty)│ (empty)│
└────────┴────────┴────────┘`;
    } else {
      return `
┌────────┬────────┬────────┐
│ Frame 1│ Frame 2│ Frame 3│
├────────┼────────┼────────┤
│ Frame 4│ Frame 5│ Frame 6│
├────────┼────────┼────────┤
│ Frame 7│ Frame 8│ (empty)│
└────────┴────────┴────────┘`;
    }
  };

  const prompt = `
🎮 ANIMATION SPRITE SHEET

📷 REFERENCE CHARACTER: Use this image as the character to animate.
📦 ART STYLE: ${category}
🎬 ANIMATION: ${animationDescription}
🔢 TOTAL FRAMES: ${frameCount} frames

═══════════════════════════════════════════════════════════════
📐 SPRITE SHEET GRID LAYOUT - CRITICAL
═══════════════════════════════════════════════════════════════

Create a ${gridSize}×${gridSize} SQUARE grid sprite sheet:
- Grid size: ${gridSize} columns × ${gridSize} rows
- Total cells: ${totalCells} (${frameCount} frames + ${emptyCells} empty)
- SQUARE 1:1 aspect ratio

GRID LAYOUT:
${getGridDiagram()}

═══════════════════════════════════════════════════════════════
📏 EQUAL GRID CELLS - MANDATORY
═══════════════════════════════════════════════════════════════

- Divide the SQUARE canvas into a PERFECT ${gridSize}×${gridSize} grid
- Each cell is EQUAL SIZE (1/${gridSize} of width and height)
- ALL cells must be IDENTICAL SIZE
${emptyCells > 0 ? `- Last ${emptyCells} cell(s) should be empty (pure white)` : ''}

⚠️ PADDING PER CELL - CRITICAL:
- Leave 5-10% padding/margin within EACH cell
- Character's HEAD must NOT touch the top edge of the cell
- Character's FEET must NOT touch the bottom edge of the cell
- Character CENTERED within each cell with breathing room

═══════════════════════════════════════════════════════════════
🎭 CHARACTER & ANGLE - SAME AS REFERENCE
═══════════════════════════════════════════════════════════════

IMPORTANT: Keep the EXACT SAME viewing angle as the reference image!
- Do NOT rotate the character to different angles
- Do NOT show front/side/back views
- ONLY animate the character from the SAME angle shown in the reference

SAME character in ALL ${frameCount} frames:
- EXACT SAME colors - sample from reference
- EXACT SAME proportions and body structure
- EXACT SAME art style (${category})
- EXACT SAME level of detail
- EXACT SAME viewing angle
- Only the POSE changes between frames

═══════════════════════════════════════════════════════════════
🎬 ANIMATION FRAMES - EACH FRAME MUST BE DISTINCTLY DIFFERENT
═══════════════════════════════════════════════════════════════

Animation type: ${animationDescription}

🚨 CRITICAL: Every frame MUST show a DIFFERENT pose!
Adjacent frames should NOT look similar - they must show clear progression.

${frameCount === 4 ? `
══ 4-FRAME RUN/WALK CYCLE - SPECIFIC POSES ══

Frame 1 - CONTACT (Right foot forward):
- Right leg extended FORWARD, foot touching ground
- Left leg extended BACK behind body
- Left arm swings FORWARD, right arm swings BACK
- Body leaning slightly forward

Frame 2 - PASSING (Right leg under body):
- Right leg bent UNDER the body (knee high)
- Left leg straight, pushing off ground
- Arms at sides, switching positions
- Body upright, slight bounce UP

Frame 3 - CONTACT (Left foot forward):
- Left leg extended FORWARD, foot touching ground
- Right leg extended BACK behind body
- Right arm swings FORWARD, left arm swings BACK
- Body leaning slightly forward

Frame 4 - PASSING (Left leg under body):
- Left leg bent UNDER the body (knee high)
- Right leg straight, pushing off ground
- Arms at sides, switching positions
- Body upright, slight bounce UP

⚠️ Frames 1 and 3 are MIRROR poses (opposite legs forward)
⚠️ Frames 2 and 4 are MIRROR poses (opposite legs lifting)
⚠️ Frame 1 ≠ Frame 2 ≠ Frame 3 ≠ Frame 4 - ALL DIFFERENT!
` : frameCount === 6 ? `
══ 6-FRAME RUN/WALK CYCLE - SPECIFIC POSES ══

Frame 1 - CONTACT RIGHT: Right foot lands, left leg back, left arm forward
Frame 2 - RECOIL: Right leg absorbs impact, body lowest point
Frame 3 - PASSING: Right leg pushes, left leg swings forward under body
Frame 4 - CONTACT LEFT: Left foot lands, right leg back, right arm forward
Frame 5 - RECOIL: Left leg absorbs impact, body lowest point
Frame 6 - PASSING: Left leg pushes, right leg swings forward under body

⚠️ Frames 1-3 show RIGHT leg leading
⚠️ Frames 4-6 show LEFT leg leading (mirror of 1-3)
⚠️ ALL 6 frames must be visually DISTINCT!
` : `
══ 8-FRAME RUN/WALK CYCLE - SPECIFIC POSES ══

Frame 1 - CONTACT: Right foot forward, touching down
Frame 2 - RECOIL: Right leg bends absorbing impact, body low
Frame 3 - PASSING: Weight shifts, left leg swings forward
Frame 4 - HIGH POINT: Left leg raised high, body at highest
Frame 5 - CONTACT: Left foot forward, touching down
Frame 6 - RECOIL: Left leg bends absorbing impact, body low
Frame 7 - PASSING: Weight shifts, right leg swings forward
Frame 8 - HIGH POINT: Right leg raised high, body at highest

⚠️ Frames 1-4 and 5-8 are mirror cycles
⚠️ ALL 8 frames must be visually DISTINCT!
`}

FOR OTHER ANIMATIONS:
- IDLE: Breathing motion - chest rises/falls, slight sway
- ATTACK: Wind-up → Strike → Impact → Recovery (all different poses)
- JUMP: Crouch → Launch → Apex → Fall → Land (all different poses)

Reading order: Left to right, top to bottom

${styleRules}

═══════════════════════════════════════════════════════════════
🎨 BACKGROUND - CRITICAL
═══════════════════════════════════════════════════════════════

- Use PURE WHITE (#FFFFFF) background for the ENTIRE sprite sheet
- ALL cells (including empty ones) must be pure white
- NO transparency, NO gray, NO colored backgrounds
- Clean white background for easy character extraction

═══════════════════════════════════════════════════════════════
🚫 DO NOT - CRITICAL ERRORS TO AVOID
═══════════════════════════════════════════════════════════════

ANIMATION ERRORS (most important):
❌ DO NOT make frames look similar - each must be DISTINCTLY DIFFERENT
❌ DO NOT copy/paste the same pose with tiny changes
❌ DO NOT keep legs in same position across frames
❌ DO NOT keep arms in same position across frames
❌ DO NOT make frame 2 look like frame 4 (they should be mirrors of 1 and 3)

LAYOUT ERRORS:
- DO NOT change the viewing angle - keep SAME angle as reference
- DO NOT rotate the character to show different sides
- DO NOT make cells different sizes - EQUAL GRID CELLS ONLY
- DO NOT let poses overlap or extend beyond cell boundaries
- DO NOT add frame numbers, text, or labels

STYLE ERRORS:
- DO NOT change the character's design between frames
- DO NOT use different colors in different frames
- DO NOT add borders or grid lines between cells
- DO NOT use any background other than PURE WHITE (#FFFFFF)
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
          aspectRatio: "1:1", // Square format for 2x2 or 3x3 grid layout (Snap Pixel compatible)
          imageSize: "2K", // Higher resolution for good detail per cell
        },
        thinkingConfig: {
          includeThoughts: true,
        },
      },
    });

    // Log thinking process if available
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
      console.log('\n💭 === AI THINKING PROCESS (Animation Sprite Sheet) ===');
      console.log('Animation:', animationDescription);
      console.log('Frame Count:', frameCount);
      console.log('\nThinking:');
      console.log(thinkingTexts.join('\n'));
      console.log('=== END THINKING ===\n');
    }

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        trackApiUsage('generateAnimationSpriteSheet', true);
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    trackApiUsage('generateAnimationSpriteSheet', false);
    throw new Error("Failed to generate animation sprite sheet");
  }).catch((error) => {
    trackApiUsage('generateAnimationSpriteSheet', false);
    throw error;
  });
};

/**
 * Generates a game asset based on user prompt with reference images.
 * Allows users to provide one or more images as visual references for the generation.
 *
 * Automatically detects sprite sheet requests and uses the appropriate generation function.
 */
export const generateWithImageReferences = async (
  prompt: string,
  category: CraftCategory,
  referenceImageUrls: string[],
  pixelSize?: PixelGridSize
): Promise<string> => {
  // Check rate limit before making request
  if (!imageGenerationLimiter.canMakeRequest()) {
    const waitTime = imageGenerationLimiter.getTimeUntilNextRequest();
    const waitSeconds = Math.ceil(waitTime / 1000);
    throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds before generating another image.`);
  }

  if (referenceImageUrls.length === 0) {
    throw new Error("At least one reference image is required");
  }

  // Check if this is a sprite sheet animation request
  const frameCount = detectSpriteSheetRequest(prompt);
  if (frameCount && referenceImageUrls.length === 1) {
    // Use specialized animation sprite sheet generation
    console.log(`🎬 Detected sprite sheet request: ${frameCount} frames`);
    return generateAnimationSpriteSheet(
      referenceImageUrls[0],
      frameCount,
      prompt,
      category
    );
  }

  const ai = getAiClient();

  // Get category-specific style rules
  const getStyleRules = (cat: CraftCategory, gridSize?: PixelGridSize): string => {
    switch (cat) {
      case CraftCategory.PIXEL_ART:
        const size = gridSize || 32;
        const isSmall = size <= 32;
        const isMedium = size > 32 && size <= 128;
        const isLarge = size > 128;

        const detailLevel = isSmall
          ? 'Simple, iconic design with minimal details. Limited color palette (8-16 colors).'
          : isMedium
          ? 'Moderate detail with 16-32 colors. Good balance of detail and readability.'
          : 'HIGHLY DETAILED pixel art with 64-128+ colors. Rich textures, shading, fine details.';

        return `
PIXEL ART STYLE (${size}x${size} resolution):
- ${detailLevel}
- Clean, crisp pixels with no anti-aliasing blur
- NO grid lines or pixel borders
- Game-ready sprite suitable for 2D games
- PURE WHITE (#FFFFFF) solid background`;

      case CraftCategory.AAA:
        return `
AAA GAME QUALITY STYLE:
- Photorealistic, high-fidelity 3D render quality
- Studio lighting with realistic shadows
- PBR material quality
- Cinematic quality suitable for next-gen games`;

      case CraftCategory.LOW_POLY_3D:
        return `
LOW POLY 3D STYLE:
- Geometric, faceted 3D model aesthetic
- Flat-shaded triangular faces visible
- Minimalist polygon count
- Clean, solid colors per face`;

      case CraftCategory.VOXEL_ART:
        return `
VOXEL ART STYLE:
- 3D cubic/blocky aesthetic (Minecraft-inspired)
- Visible cube/voxel grid structure
- Clean, solid colors per voxel block
- Isometric or 3/4 view`;

      case CraftCategory.HD_2D:
        return `
HD 2D / ILLUSTRATED SPRITE STYLE:
- Hand-painted, high-resolution 2D art (Ori, Hollow Knight, Rayman style)
- Smooth, fluid artwork with NO visible pixel grid
- Rich painterly details with gradients and lighting
- Soft glows and atmospheric effects
- Professional illustration quality`;

      default:
        return `Game asset style with clean rendering and professional quality.`;
    }
  };

  const styleRules = getStyleRules(category, pixelSize);

  // Build the prompt based on number of reference images
  const referenceDescription = referenceImageUrls.length === 1
    ? "Use this reference image as visual guidance:"
    : `Use these ${referenceImageUrls.length} reference images as visual guidance:`;

  const fullPrompt = `
🎮 GAME ASSET GENERATION WITH REFERENCE

${referenceDescription}

📝 USER REQUEST: ${prompt}

📦 TARGET STYLE: ${category}

${styleRules}

═══════════════════════════════════════════════════════════════
🔒 REFERENCE IMAGE USAGE
═══════════════════════════════════════════════════════════════

1. ✅ USE REFERENCE FOR STYLE - Match the character/object style from reference
2. ✅ PRESERVE KEY FEATURES - Keep recognizable elements from the reference
3. ✅ MATCH COLORS - Use similar color palette when appropriate
4. ✅ FOLLOW USER PROMPT - The user's text request takes priority
5. ✅ MAINTAIN CONSISTENCY - Generated result should look like it belongs with reference

═══════════════════════════════════════════════════════════════
📋 OUTPUT REQUIREMENTS
═══════════════════════════════════════════════════════════════

- CENTERED composition with appropriate padding
- FRONT-FACING or 3/4 VIEW angle (unless specified otherwise)
- CLEAN BACKGROUND (solid color or simple gradient)
- GAME-READY quality suitable for use in a video game
- CONSISTENT ${category} style throughout

🚫 DO NOT:
- Ignore the reference image(s) completely
- Mix multiple art styles together
- Use busy or complex backgrounds
- Create a sketch or unfinished look
  `;

  // Build content parts: reference images first, then text prompt
  const contentParts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [];

  // Add each reference image
  for (const imageUrl of referenceImageUrls) {
    const cleanBase64 = imageUrl.split(',')[1] || imageUrl;
    contentParts.push({
      inlineData: {
        mimeType: 'image/png',
        data: cleanBase64,
      },
    });
  }

  // Add the text prompt
  contentParts.push({ text: fullPrompt });

  return retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: contentParts,
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
        trackApiUsage('generateWithImageReferences', true);
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    trackApiUsage('generateWithImageReferences', false);
    throw new Error("Failed to generate image with references");
  }).catch((error) => {
    trackApiUsage('generateWithImageReferences', false);
    throw error;
  });
};

/**
 * Get category-specific visual rules for sprite/animation sheet generation.
 * Rules focus on game asset style consistency for each category.
 */
const getCategorySpecificRules = (category: CraftCategory): string => {
  const categoryRules: Record<string, string> = {
    'Pixel Art': `
PIXEL ART SPRITE SHEET FORMAT:

STYLE REQUIREMENTS:
- Classic 16-32 bit pixel art aesthetic
- Clean, crisp pixels with NO anti-aliasing or blur
- Limited color palette (16-32 colors max)
- NO grid lines or pixel borders - pixels are seamless solid color blocks
- NO visible grid overlay between pixels
- Dithering for shading transitions (but no grid lines)
- Each colored area is a smooth block of pure color

ANIMATION FRAMES:
- Each frame must be pixel-perfect with seamless color fills
- Consistent pixel size across all frames
- Maintain exact color palette throughout
- Smooth pixel-level transitions between poses
- Clear silhouette in every frame
- NO separating lines between pixels

BACKGROUND: Transparent or solid color (magenta #FF00FF for transparency)
RESOLUTION: Consistent sprite size (32x32, 64x64, or 128x128)`,

    'AAA': `
AAA QUALITY SPRITE SHEET FORMAT:

STYLE REQUIREMENTS:
- Photorealistic, high-fidelity 3D render quality
- PBR (Physically Based Rendering) materials
- Cinematic studio lighting with soft shadows
- Detailed textures with normal map appearance
- Subsurface scattering for skin/organic materials
- High polygon count smooth surfaces

ANIMATION FRAMES:
- Film-quality rendering per frame
- Consistent lighting direction across all frames
- Smooth motion blur hints for action poses
- Professional animation principles (squash, stretch, anticipation)
- Consistent material properties throughout

BACKGROUND: Neutral studio gradient or transparent
RESOLUTION: High-res suitable for HD/4K games`,

    'Low Poly 3D': `
LOW POLY 3D SPRITE SHEET FORMAT:

STYLE REQUIREMENTS:
- Geometric, faceted 3D model aesthetic
- Flat-shaded triangular faces visible
- Minimalist polygon count with intentional faceting
- Clean, solid colors per face
- Sharp edges and angular forms
- Soft ambient lighting to show form

ANIMATION FRAMES:
- Maintain faceted low-poly look in all poses
- Consistent polygon density across frames
- Smooth geometric transitions between poses
- Keep flat-shaded appearance throughout
- Modern indie game aesthetic

BACKGROUND: Simple gradient or solid color
RESOLUTION: Consistent size optimized for mobile/indie games`,

    'Voxel Art': `
VOXEL ART SPRITE SHEET FORMAT:

STYLE REQUIREMENTS:
- 3D cubic/blocky aesthetic (Minecraft-inspired)
- Visible cube/voxel grid structure
- Each voxel is a distinct colored cube
- Clean, solid colors per voxel block
- Ambient occlusion between voxels for depth
- Isometric or 3/4 view angles

ANIMATION FRAMES:
- Maintain voxel grid consistency across frames
- Each pose should be a valid voxel model
- Smooth voxel-level transitions between poses
- Keep blocky charm in all movements
- Consistent voxel resolution throughout

BACKGROUND: Solid color or transparent
RESOLUTION: Consistent voxel grid size`,
  };

  return categoryRules[category] || `
GAME ASSET SPRITE SHEET FORMAT:

STYLE REQUIREMENTS:
- Consistent art style throughout
- Clean, professional game-ready quality
- Appropriate detail level for the style

ANIMATION FRAMES:
- Smooth transitions between poses
- Consistent proportions across all frames
- Clear silhouette in every frame

BACKGROUND: Clean, game-engine friendly
Match EXACT style from reference throughout.`;
};

/**
 * Generates an animation frame or sprite variation for a game character.
 * Creates consistent animations/poses based on the reference character.
 *
 * OPTIMIZED PROMPT STRUCTURE:
 * 1. Reference image comes FIRST in the parts array
 * 2. Consistency requirements are stated FIRST and repeatedly
 * 3. Animation/pose description guides the output
 * 4. Explicit negative constraints prevent common mistakes
 */
export const generateStepImage = async (
  originalImageBase64: string,
  stepDescription: string,
  category: CraftCategory,
  targetObjectLabel?: string,
  stepNumber?: number // Optional frame number for animation sequences
): Promise<string> => {
  const ai = getAiClient();
  const cleanBase64 = originalImageBase64.split(',')[1] || originalImageBase64;

  const categoryRules = getCategorySpecificRules(category);

  // Log generation info
  console.log(`🎮 Generating animation frame: ${stepDescription}`);
  console.log(`   Frame Number: ${stepNumber || 'N/A'}`);
  console.log(`   Style: ${category}`);

  const prompt = `
🎮 YOUR TASK: Generate an ANIMATION FRAME or SPRITE VARIATION for this game character.

📷 REFERENCE IMAGE: This is the CHARACTER you are creating animation frames for.
${targetObjectLabel ? `🎨 CHARACTER: ${targetObjectLabel}` : ''}
📦 STYLE: ${category}

═══════════════════════════════════════════════════════════════
🔒 CONSISTENCY REQUIREMENTS (CRITICAL - READ FIRST)
═══════════════════════════════════════════════════════════════

You MUST preserve EXACT visual consistency with the reference character:

1. ✅ SAME CHARACTER - This is the EXACT same character, not a similar one
2. ✅ SAME COLORS - Match colors EXACTLY (sample RGB values from reference)
3. ✅ SAME STYLE - Match the ${category} art style precisely
4. ✅ SAME PROPORTIONS - Keep all size ratios identical
5. ✅ SAME UNIQUE FEATURES - Every detail matters (colors, patterns, accessories, facial features)

IMAGINE: You are an animator creating frames for this exact game character. Each frame must look like it belongs in the same sprite sheet as the reference. The character's design, colors, and style NEVER change - only the pose changes.

🔴 CRITICAL - CHARACTER MUST MATCH REFERENCE:
- SAME exact color palette - every color must match
- SAME proportions and body structure
- SAME level of detail and art style (${category})
- SAME accessories, patterns, and unique features
- The character should be instantly recognizable as the same one

${targetObjectLabel ? `
🎯 ANIMATING: "${targetObjectLabel}"
- Create this specific pose/frame for "${targetObjectLabel}"
- Maintain all of "${targetObjectLabel}"'s distinctive features
` : ''}

═══════════════════════════════════════════════════════════════
🎬 ANIMATION FRAME TO CREATE
═══════════════════════════════════════════════════════════════

CURRENT FRAME: "${stepDescription}"

Create a single frame showing this pose/action.
The character should be in motion or the specified pose.

═══════════════════════════════════════════════════════════════
📐 OUTPUT FORMAT
═══════════════════════════════════════════════════════════════

Generate a SINGLE SPRITE/FRAME showing the character in the specified pose:

- Character in the described pose/action
- Same ${category} art style as reference
- Clean background (solid color or transparent-friendly)
- Centered composition with consistent framing
- Game-ready quality

${categoryRules}

═══════════════════════════════════════════════════════════════
🚫 DO NOT
═══════════════════════════════════════════════════════════════

- Change the character's design, colors, or proportions
- Use a different art style than ${category}
- Add or remove features not in the reference
- Create a different character
- Use inconsistent level of detail
- Add busy backgrounds or effects
- Create multiple characters or sprites in one image
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
 * Generates a comprehensive sprite sheet showing the character in multiple poses/animations.
 * Creates game-ready sprite sheets based on the art style category.
 *
 * This generates different types of sprite sheets based on the category:
 * - Pixel Art: Classic retro sprite sheet with clean pixels
 * - AAA: High-fidelity render poses sheet
 * - Low Poly 3D: Faceted 3D model poses
 * - Voxel Art: Blocky voxel character poses
 */
export const generateSVGPatternSheet = async (
  originalImageBase64: string,
  category: CraftCategory,
  craftLabel?: string
): Promise<string> => {
  console.log('🎮 [generateSpriteSheet] Function called');
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

  // Category-specific sprite sheet type
  const getSpriteSheetType = (cat: CraftCategory): string => {
    switch (cat) {
      case CraftCategory.PIXEL_ART:
        return 'pixel art sprite sheet with clean, crisp pixels and retro game aesthetic';
      case CraftCategory.AAA:
        return 'high-fidelity AAA quality character pose sheet with photorealistic rendering';
      case CraftCategory.LOW_POLY_3D:
        return 'low poly 3D model pose sheet with flat-shaded geometric facets';
      case CraftCategory.VOXEL_ART:
        return 'voxel art sprite sheet with cubic/blocky Minecraft-style aesthetic';
      default:
        return 'game asset sprite sheet';
    }
  };

  // Category-specific style rules for sprite sheets
  const getSpriteStyleRules = (cat: CraftCategory): string => {
    switch (cat) {
      case CraftCategory.PIXEL_ART:
        return `
PIXEL ART SPRITE SHEET RULES:
- Clean, crisp pixels with NO anti-aliasing or blur
- Limited color palette (same colors across all poses)
- NO grid lines or pixel borders - seamless solid color blocks
- NO visible grid overlay between pixels
- Each pose must be pixel-perfect with smooth color fills
- Dithering for shading where appropriate (but no grid lines)
- All sprites same resolution/size
- Magenta (#FF00FF) or transparent background`;

      case CraftCategory.AAA:
        return `
AAA QUALITY POSE SHEET RULES:
- Photorealistic, high-fidelity 3D render quality
- PBR materials with consistent lighting across poses
- Cinematic studio lighting with soft shadows
- Detailed textures maintained in all poses
- Professional animation quality poses
- High-res suitable for HD/4K games
- Neutral studio background`;

      case CraftCategory.LOW_POLY_3D:
        return `
LOW POLY 3D POSE SHEET RULES:
- Geometric, faceted 3D model aesthetic
- Flat-shaded triangular faces visible
- Clean, solid colors per face
- Sharp edges and angular forms maintained
- Consistent polygon density across poses
- Modern indie game aesthetic
- Simple gradient background`;

      case CraftCategory.VOXEL_ART:
        return `
VOXEL ART SPRITE SHEET RULES:
- 3D cubic/blocky aesthetic maintained
- Visible voxel grid structure in all poses
- Clean, solid colors per voxel block
- Ambient occlusion between voxels
- Isometric or 3/4 view consistency
- Blocky charm preserved in motion
- Solid color background`;

      default:
        return `Maintain consistent art style across all poses.`;
    }
  };

  const spriteSheetType = getSpriteSheetType(category);
  const styleRules = getSpriteStyleRules(category);

  const prompt = `
🎮 YOUR TASK: Create a ${spriteSheetType} for THIS EXACT game character.

📷 REFERENCE IMAGE: This is the CHARACTER you are creating a sprite sheet for.
${craftLabel ? `🎨 CHARACTER: ${craftLabel}` : ''}
📦 STYLE: ${category}

═══════════════════════════════════════════════════════════════
🎯 CRITICAL: ANIMATION-TOOL COMPATIBLE FORMAT
═══════════════════════════════════════════════════════════════

You MUST create a sprite sheet that works with game engines (Unity, Godot, etc.):

📐 LAYOUT - SINGLE HORIZONTAL STRIP:
┌────────┬────────┬────────┬────────┬────────┬────────┐
│  IDLE  │ WALK 1 │ WALK 2 │  JUMP  │ ATTACK │  HURT  │
│        │        │        │        │        │        │
└────────┴────────┴────────┴────────┴────────┴────────┘

MANDATORY REQUIREMENTS:
1. ✅ EXACTLY 6 FRAMES arranged in ONE HORIZONTAL ROW
2. ✅ EQUAL FRAME WIDTHS - Each frame takes exactly 1/6 of the total width
3. ✅ NO OVERLAPPING - Each pose must fit completely within its frame boundary
4. ✅ CONSISTENT SIZE - The character should be the same size in every frame
5. ✅ CENTERED IN FRAME - Each pose centered within its frame cell
6. ✅ NO LABELS - Do NOT add frame numbers, text, or labels
7. ✅ CLEAN BACKGROUND - Solid color (magenta #FF00FF or white) for easy removal

═══════════════════════════════════════════════════════════════
🔒 CONSISTENCY REQUIREMENTS (CRITICAL)
═══════════════════════════════════════════════════════════════

SAME CHARACTER in every frame:
- EXACT SAME colors - sample from reference
- EXACT SAME proportions and body structure
- EXACT SAME art style (${category})
- EXACT SAME level of detail
- EXACT SAME accessories and unique features

Only the POSE changes between frames, NOT the character design.

${craftLabel ? `
🎯 SPRITE SHEET FOR: "${craftLabel}"
- Create poses specifically for "${craftLabel}"
- Maintain all distinctive features in every pose
` : ''}

═══════════════════════════════════════════════════════════════
🎬 6 POSES TO CREATE (LEFT TO RIGHT)
═══════════════════════════════════════════════════════════════

Create these 6 poses in a single horizontal row:

1. IDLE - Standing neutral pose (similar to reference)
2. WALK 1 - Walking, left foot forward
3. WALK 2 - Walking, right foot forward
4. JUMP - Airborne/jumping pose
5. ATTACK - Action/attack pose with arm extended
6. HURT - Taking damage, recoiling pose

${styleRules}

═══════════════════════════════════════════════════════════════
🚫 DO NOT
═══════════════════════════════════════════════════════════════

- DO NOT create a grid layout (no rows stacked vertically)
- DO NOT let poses overlap or extend beyond frame boundaries
- DO NOT add frame numbers, text, or labels
- DO NOT change the character's design between frames
- DO NOT use different colors in different frames
- DO NOT make frames different sizes
- DO NOT add borders or grid lines between frames
- DO NOT create a busy or textured background
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
 * Generates a turn table view (left, right, or back) of the game character
 * Takes the original front-facing image and generates the specified view angle
 * Maintains art style consistency (Pixel Art, AAA, Low Poly 3D, Voxel Art)
 */
export const generateTurnTableView = async (
  originalImageBase64: string,
  view: TurnTableView,
  craftLabel?: string,
  category?: CraftCategory
): Promise<string> => {
  // Check rate limit before making request
  if (!imageGenerationLimiter.canMakeRequest()) {
    const waitTime = imageGenerationLimiter.getTimeUntilNextRequest();
    const waitSeconds = Math.ceil(waitTime / 1000);
    throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds before generating another image.`);
  }

  const ai = getAiClient();
  const cleanBase64 = originalImageBase64.split(',')[1] || originalImageBase64;

  // View-specific rotation descriptions - ORTHOGRAPHIC FLAT VIEWS (no angles)
  const viewDescriptions: Record<TurnTableView, string> = {
    left: 'PURE LEFT SIDE VIEW - Flat orthographic profile, camera exactly at 90° left, NO angle, NO perspective distortion',
    right: 'PURE RIGHT SIDE VIEW - Flat orthographic profile, camera exactly at 90° right, NO angle, NO perspective distortion',
    back: 'PURE BACK VIEW - Flat orthographic rear view, camera exactly at 180° behind, NO angle, NO perspective distortion',
  };

  const viewAngles: Record<TurnTableView, string> = {
    left: 'FLAT left side profile - camera perpendicular to left side, eye-level, pure silhouette view',
    right: 'FLAT right side profile - camera perpendicular to right side, eye-level, pure silhouette view',
    back: 'FLAT back view - camera directly behind, eye-level, pure rear silhouette view',
  };

  // Get art style rules based on category
  const getArtStyleRules = (cat?: CraftCategory): string => {
    if (!cat) return 'Maintain the exact same art style as the reference.';

    switch (cat) {
      case CraftCategory.PIXEL_ART:
        return `
PIXEL ART STYLE RULES:
- Maintain clean, crisp pixels with NO anti-aliasing
- Keep the same limited color palette
- NO grid lines or pixel borders - seamless solid color blocks
- NO visible grid overlay between pixels
- Same pixel density/resolution as reference
- Dithering patterns must be consistent (but no grid lines)
- PADDING: Keep same margins as reference - head and feet must NOT be cut off`;

      case CraftCategory.AAA:
        return `
AAA QUALITY STYLE RULES:
- Maintain photorealistic, high-fidelity rendering
- Keep PBR material properties consistent
- Same lighting setup and shadow quality
- Preserve texture detail level
- Consistent subsurface scattering for skin`;

      case CraftCategory.LOW_POLY_3D:
        return `
LOW POLY 3D STYLE RULES:
- Maintain geometric, faceted appearance
- Keep flat-shaded triangular faces
- Same polygon density as reference
- Preserve solid colors per face
- Consistent angular forms`;

      case CraftCategory.VOXEL_ART:
        return `
VOXEL ART STYLE RULES:
- Maintain cubic/blocky voxel structure
- Keep same voxel resolution/size
- Preserve solid colors per voxel
- Same ambient occlusion depth
- Consistent blocky proportions`;

      default:
        return 'Maintain the exact same art style as the reference.';
    }
  };

  const artStyleRules = getArtStyleRules(category);

  const prompt = `
🎮 TASK: Generate the ${view.toUpperCase()} SIDE of this character - rotate the ENTIRE CHARACTER ${view === 'left' ? '90° counter-clockwise' : view === 'right' ? '90° clockwise' : '180°'}.

📷 REFERENCE: Front view of the character
${craftLabel ? `🎨 CHARACTER: ${craftLabel}` : ''}
${category ? `📦 STYLE: ${category}` : ''}

═══════════════════════════════════════════════════════════════
🚨 CRITICAL: ROTATE THE WHOLE BODY, NOT JUST THE HEAD
═══════════════════════════════════════════════════════════════

You must rotate the ENTIRE CHARACTER like spinning a toy on a table:
- The whole body rotates ${view === 'left' ? '90° to show the left side' : view === 'right' ? '90° to show the right side' : '180° to show the back'}
- NOT just turning the head - the ENTIRE body, arms, legs, everything rotates
- Same pose, but viewed from a different angle

${view === 'left' ? `
══ LEFT SIDE VIEW - WHAT YOU SHOULD SEE ══

✅ VISIBLE (must show these):
- LEFT EAR only (right ear hidden behind head)
- LEFT side of the face in profile (nose pointing left)
- LEFT ARM in full view
- LEFT LEG in full view
- The LEFT side of the body/torso
- Items held - seen from the left side

❌ NOT VISIBLE (these should be hidden):
- NO front of face (no both eyes visible)
- NO right ear
- NO right arm (hidden behind body)
- The character should look like they are facing LEFT` : ''}
${view === 'right' ? `
══ RIGHT SIDE VIEW - WHAT YOU SHOULD SEE ══

✅ VISIBLE (must show these):
- RIGHT EAR only (left ear hidden behind head)
- RIGHT side of the face in profile (nose pointing right)
- RIGHT ARM in full view
- RIGHT LEG in full view
- The RIGHT side of the body/torso
- Items held - seen from the right side

❌ NOT VISIBLE (these should be hidden):
- NO front of face (no both eyes visible)
- NO left ear
- NO left arm (hidden behind body)
- The character should look like they are facing RIGHT` : ''}
${view === 'back' ? `
══ BACK VIEW - WHAT YOU SHOULD SEE ══

✅ VISIBLE (must show these):
- BACK of the head (hair, hat from behind)
- BACK of the body/torso
- BOTH arms from behind
- BOTH legs from behind
- Any back details (cape, backpack, tail)

❌ NOT VISIBLE (these should be hidden):
- NO face at all
- NO front of body
- NO chest/belly
- The character should be facing AWAY from camera` : ''}

═══════════════════════════════════════════════════════════════
📐 LEFT vs RIGHT - THEY MUST BE DIFFERENT!
═══════════════════════════════════════════════════════════════

LEFT VIEW: Character's nose points to the LEFT of the image
RIGHT VIEW: Character's nose points to the RIGHT of the image

These are MIRROR OPPOSITES - if left and right look the same, it's WRONG!

═══════════════════════════════════════════════════════════════
🎭 KEEP THE SAME POSE
═══════════════════════════════════════════════════════════════

- Arms stay in same position (just viewed from ${view})
- Legs stay in same stance (just viewed from ${view})
- Items held stay in same hand position
- Only the VIEWING ANGLE changes, not the pose

${artStyleRules}

═══════════════════════════════════════════════════════════════
🚫 COMMON MISTAKES TO AVOID
═══════════════════════════════════════════════════════════════

❌ WRONG: Just turning the head while body faces forward
❌ WRONG: Showing 3/4 view where you see front AND side
❌ WRONG: Left and right views looking identical
❌ WRONG: Changing the pose or arm positions
❌ WRONG: Showing both eyes in a side view

✅ CORRECT: Full body rotation showing true ${view} profile
✅ CORRECT: Only ONE eye visible in side views (or none in back)
✅ CORRECT: Nose pointing ${view === 'left' ? 'LEFT' : view === 'right' ? 'RIGHT' : 'AWAY'}
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