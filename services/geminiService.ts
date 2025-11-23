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
 * All 8 categories from the spec are now properly mapped.
 */
const getCategorySpecificRules = (category: CraftCategory): string => {
  const categoryRules: Record<string, string> = {
    'Papercraft': `
STRICT VISUAL RULES:
1. EXTREME ISOLATION: Show ONLY the paper pieces, flat cut shapes, folded tabs, scored lines, or glue flaps needed for this step.
2. EXCLUDE UNRELATED PARTS: Do NOT show the full model or other pieces.
3. VIEW: Knolling flat-lay OR macro close-up for folds/tab placement.
4. CONSISTENCY: Match paper texture, weight, color, and edge sharpness from the Reference Image.
5. BACKGROUND: Pure white, evenly lit.`,

    'Clay': `
STRICT VISUAL RULES:
1. EXTREME ISOLATION: Show ONLY clay forms for this step—rolled shapes, slabs, balls, or partially sculpted pieces.
2. EXCLUDE UNRELATED PARTS: Do NOT show the full sculpture or future details.
3. VIEW: Knolling layout OR macro of shaping/blending.
4. CONSISTENCY: Match clay color, matte softness, texture, and fingerprints from the Reference Image.
5. BACKGROUND: Pure white, soft lighting.`,

    'Fabric/Sewing': `
STRICT VISUAL RULES:
1. EXTREME ISOLATION: Show ONLY pattern pieces, seam edges, folded hems, stuffing, or stitched portions relevant to this step.
2. EXCLUDE UNRELATED PARTS: Do NOT show the final craft or unrelated patterns.
3. VIEW: Knolling OR macro of seam alignment.
4. CONSISTENCY: Match fabric weave, color, stitch density, and softness from the Reference Image.
5. BACKGROUND: Pure white, no tools.`,

    'Costume & Props': `
STRICT VISUAL RULES:
1. EXTREME ISOLATION: Show ONLY foam pieces, beveled cuts, thermoplastic sections, or primed layers used in this step.
2. EXCLUDE UNRELATED PARTS: Do NOT show the full prop or later elements.
3. VIEW: Knolling OR macro on bevels/layer edges.
4. CONSISTENCY: Match foam density, surface, thickness, and paint tones from the Reference Image.
5. BACKGROUND: Pure white, no tools or glue.`,

    'Woodcraft': `
STRICT VISUAL RULES:
1. EXTREME ISOLATION: Show ONLY the wood parts—cut boards, dowels, joints, sanded edges—needed for this step.
2. EXCLUDE UNRELATED PARTS: No full item, no extra pieces.
3. VIEW: Knolling OR macro of joinery surfaces.
4. CONSISTENCY: Match wood grain, color, and thickness from the Reference Image.
5. BACKGROUND: Pure white, evenly lit.`,

    'Jewelry': `
STRICT VISUAL RULES:
1. EXTREME ISOLATION: Show ONLY beads, charms, jump rings, wire cuts, and chain segments required for this step.
2. EXCLUDE UNRELATED PARTS: Do NOT show the final piece.
3. VIEW: Knolling OR macro of wire loops/links.
4. CONSISTENCY: Match metal color, bead clarity, and shine from the Reference Image.
5. BACKGROUND: Pure white, soft lighting.`,

    'Kids Crafts': `
STRICT VISUAL RULES:
1. EXTREME ISOLATION: Show ONLY bright colored shapes—felt, foam, pipe cleaners, simple paper parts—required for this step.
2. EXCLUDE UNRELATED PARTS: No full craft or advanced details.
3. VIEW: Knolling OR macro for glue alignment areas.
4. CONSISTENCY: Match simple shapes, playful color palette, and handmade texture from the Reference Image.
5. BACKGROUND: Pure white, evenly lit.`,

    'Tabletop Figures': `
STRICT VISUAL RULES:
1. EXTREME ISOLATION: Show ONLY the miniature parts—arms, heads, weapons, torsos, bases, primed pieces—needed for this step.
2. EXCLUDE UNRELATED PARTS: Do NOT show the full miniature or scenes.
3. VIEW: Knolling OR macro close-up highlighting fit points and surfaces.
4. CONSISTENCY: Match sculpt detail, primer color, paint texture, and scale from the Reference Image.
5. BACKGROUND: Pure white, high-clarity macro lighting.`,
  };

  // Return category-specific rules or default generic rules
  return categoryRules[category] || `
STRICT VISUAL RULES:
1. EXTREME ISOLATION: Show ONLY the specific materials, tools, or sub-components described in this step.
2. EXCLUDE UNRELATED PARTS: Do NOT show the entire finished object. Do NOT show parts that are not yet created or relevant.
3. VIEW: Use a "Knolling" (organized flat-lay) arrangement for materials, or a Macro Close-up for assembly steps.
4. CONSISTENCY: You MUST use the exact textures, colors, and style from the Reference Image.
5. BACKGROUND: Pure white or clean neutral background, evenly lit.`;
};

/**
 * Generates a visualization for a specific step using the master image as reference.
 */
export const generateStepImage = async (
  originalImageBase64: string,
  stepDescription: string,
  category: CraftCategory
): Promise<string> => {
  const ai = getAiClient();
  const cleanBase64 = originalImageBase64.split(',')[1] || originalImageBase64;

  const categoryRules = getCategorySpecificRules(category);
  
  const prompt = `
REFERENCE IMAGE: This is the finished craft.
TASK: Generate a photorealistic step image for: "${stepDescription}".

${categoryRules}
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
        }
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Failed to generate step image");
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