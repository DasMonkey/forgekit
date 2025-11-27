Product Requirement Document (PRD): Craftus

1. Overview

Craftus is an "Infinite Craft Workbench" that uses Generative AI to visualize complex craft ideas and dissect them into actionable, spatial instruction cards.

The system turns a user’s idea into:

A Master Reference Image (the “truth” image of the craft).

A Material List.

A step-by-step instruction sequence.

A set of precise, isolated step-by-step images, knolled or macro, showing only the components for each step.

This resurrects the tradition of old paper instruction sheets from toy stores, sewing kits, papercraft books, and tabletop modeling — now reimagined with AI.

Tagline: Dissect your imagination. Build reality.

2. Core Features

A. Infinite Workbench (Canvas)

Technology: React Flow (infinite canvas, panning, zooming).

Style: Dark mode. Technical blueprint aesthetic (slate → indigo → emerald palette), orange yellow button colors.

Function:

Nodes represent logical objects (Master, Materials, Steps).

Users drag nodes spatially and explore the build visually.

B. Summoning (Master Image Generation)

Users describe a craft in the chat (e.g., “Papercraft fox”).

User selects a Craft Category from the sidebar:

Papercraft

Clay

Fabric / Sewing

Costume & Props

Woodcraft

Jewelry

Kids Crafts

Tabletop Figures

System uses gemini-3-pro-image-preview to create a studio-quality Master Reference Image.

The image reflects:

tangible handmade materials

neutral background

proper craft textures (foam, felt, wood grain, beads, clay, paper fibers)

clean, centered view

C. Dissection (Text Reasoning)

User clicks Dissect on the Master Node.

System uses gemini-2.5-flash to:

Analyze complexity (Simple / Moderate / Complex).

Extract materials (explicit + implied).

Generate chronological step-by-step instructions.

Return strict JSON for UI binding.

Canvas then automatically spawns:

a Materials Node

Step Nodes arranged in a grid

D. Visual Instruction Steps (Knolling Image Generation)

For each instruction step, the app asks gemini-3-pro-image-preview to generate a photorealistic, isolated step image.

Each image:

uses EXTREME ISOLATION

shows ONLY the materials or sub-components of that step

never shows the full finished object

uses knolling layout or macro close-up

matches the exact textures/colors from the Master Image

The result looks like an AI-generated IKEA manual or crafting booklet.

3. User Flow

Landing: User sees an empty dotted-grid canvas.

Prompting: User types: “Make a clay turtle.” and selects Clay category.

Master Generation: A new Master Node appears with the studio-quality image.

Dissection: User clicks Dissect → The system produces:

Materials List node

Empty Step Cards

Step Image Filling: One by one, each Step Card lights up with a category-specific step image (generated live).

User Interaction: User can reposition nodes, inspect steps, zoom, adjust.

4. AI Prompt Engineering Strategy

The app uses three core prompting stages.

Stage 1: Master Image Generation

Model: gemini-3-pro-image-preview Prompt:

Create a photorealistic studio photograph of a DIY craft project: {user_prompt}. Category: {category}. Style: Neutral background, even studio lighting, highly detailed textures showing materials such as fabric weave, paper fibers, clay surface, foam texture, wood grain, or beads. The object should look handmade and fully finished. Center the object. Do not include tools, hands, or environment. 

Stage 2: Dissection (Text Logic)

Model: gemini-2.5-flash Prompt:

You are an expert maker. Analyze this craft project described as "{user_prompt}". 1. Determine the complexity (Simple, Moderate, Complex) and a score from 1-10. 2. List all essential materials visible or implied. 3. Break down the construction into clear chronological steps. Return strict JSON matching this schema: { ...schema_definition... } 

Stage 3: Step Image Generation

Model: gemini-3-pro-image-preview

Structure:

Same PRD structure → but now with category-specific visual rules.

CATEGORY-SPECIFIC STEP IMAGE PROMPTS

1. Papercraft

REFERENCE IMAGE: This is the finished papercraft model. TASK: Generate a photorealistic step image for: "{step_description}".  STRICT VISUAL RULES: 1. EXTREME ISOLATION: Show ONLY the paper pieces, flat cut shapes, folded tabs, scored lines, or glue flaps needed for this step. 2. EXCLUDE UNRELATED PARTS: Do NOT show the full model or other pieces. 3. VIEW: Knolling flat-lay OR macro close-up for folds/tab placement. 4. CONSISTENCY: Match paper texture, weight, color, and edge sharpness from the Reference Image. 5. BACKGROUND: Pure white, evenly lit. 

2. Clay

REFERENCE IMAGE: This is the finished clay sculpture. TASK: Generate a photorealistic step image for: "{step_description}".  STRICT VISUAL RULES: 1. EXTREME ISOLATION: Show ONLY clay forms for this step—rolled shapes, slabs, balls, or partially sculpted pieces. 2. EXCLUDE UNRELATED PARTS: Do NOT show the full sculpture or future details. 3. VIEW: Knolling layout OR macro of shaping/blending. 4. CONSISTENCY: Match clay color, matte softness, texture, and fingerprints from the Reference Image. 5. BACKGROUND: Pure white, soft lighting. 

3. Fabric / Sewing

REFERENCE IMAGE: This is the finished fabric craft. TASK: Generate a photorealistic step image for: "{step_description}".  STRICT VISUAL RULES: 1. EXTREME ISOLATION: Show ONLY pattern pieces, seam edges, folded hems, stuffing, or stitched portions relevant to this step. 2. EXCLUDE UNRELATED PARTS: Do NOT show the final craft or unrelated patterns. 3. VIEW: Knolling OR macro of seam alignment. 4. CONSISTENCY: Match fabric weave, color, stitch density, and softness from the Reference Image. 5. BACKGROUND: Pure white, no tools. 

4. Costume & Props (Foam / Worbla)

REFERENCE IMAGE: This is the completed foam or Worbla prop. TASK: Generate a photorealistic step image for: "{step_description}".  STRICT VISUAL RULES: 1. EXTREME ISOLATION: Show ONLY foam pieces, beveled cuts, thermoplastic sections, or primed layers used in this step. 2. EXCLUDE UNRELATED PARTS: Do NOT show the full prop or later elements. 3. VIEW: Knolling OR macro on bevels/layer edges. 4. CONSISTENCY: Match foam density, surface, thickness, and paint tones from the Reference Image. 5. BACKGROUND: Pure white, no tools or glue. 

5. Woodcraft

REFERENCE IMAGE: This is the finished wooden craft. TASK: Generate a photorealistic step image for: "{step_description}".  STRICT VISUAL RULES: 1. EXTREME ISOLATION: Show ONLY the wood parts—cut boards, dowels, joints, sanded edges—needed for this step. 2. EXCLUDE UNRELATED PARTS: No full item, no extra pieces. 3. VIEW: Knolling OR macro of joinery surfaces. 4. CONSISTENCY: Match wood grain, color, and thickness from the Reference Image. 5. BACKGROUND: Pure white, evenly lit. 

6. Jewelry

REFERENCE IMAGE: This is the finished jewelry item. TASK: Generate a photorealistic step image for: "{step_description}".  STRICT VISUAL RULES: 1. EXTREME ISOLATION: Show ONLY beads, charms, jump rings, wire cuts, and chain segments required for this step. 2. EXCLUDE UNRELATED PARTS: Do NOT show the final piece. 3. VIEW: Knolling OR macro of wire loops/links. 4. CONSISTENCY: Match metal color, bead clarity, and shine from the Reference Image. 5. BACKGROUND: Pure white, soft lighting. 

7. Kids Crafts

REFERENCE IMAGE: This is the finished kids craft. TASK: Generate a photorealistic step image for: "{step_description}".  STRICT VISUAL RULES: 1. EXTREME ISOLATION: Show ONLY bright colored shapes—felt, foam, pipe cleaners, simple paper parts—required for this step. 2. EXCLUDE UNRELATED PARTS: No full craft or advanced details. 3. VIEW: Knolling OR macro for glue alignment areas. 4. CONSISTENCY: Match simple shapes, playful color palette, and handmade texture from the Reference Image. 5. BACKGROUND: Pure white, evenly lit. 

8. Tabletop Figures

REFERENCE IMAGE: This is the finished tabletop miniature. TASK: Generate a photorealistic step image for: "{step_description}".  STRICT VISUAL RULES: 1. EXTREME ISOLATION: Show ONLY the miniature parts—arms, heads, weapons, torsos, bases, primed pieces—needed for this step. 2. EXCLUDE UNRELATED PARTS: Do NOT show the full miniature or scenes. 3. VIEW: Knolling OR macro close-up highlighting fit points and surfaces. 4. CONSISTENCY: Match sculpt detail, primer color, paint texture, and scale from the Reference Image. 5. BACKGROUND: Pure white, high-clarity macro lighting. 

5. Technical Stack

React 19

TailwindCSS

React Flow (@xyflow/react)

Google GenAI SDK (@google/genai)

Lucide Icons

Minimal backend (no database needed for hackathon)

6. Error Handling

Retry on 503 Overloaded using exponential backoff

Queue step images sequentially if rate limits trigger

Graceful fallback states in Step Nodes.



7. Landing Page (Marketing Front Door)

Purpose: Introduce Knoll-It-All, explain the concept, build trust, and push users directly into the canvas.

Sections:

Hero Section

Full-width minimal hero

Centered tagline: “Dissect your imagination. Build reality.”

Subtext: Resurrecting the lost art of craft instruction sheets — with AI.

CTA Button: “Start Crafting” → /canvas

How It Works (3-Step Visual)

1. Describe It

User types “Papercraft fox,” chooses category.

2. See It

Master Reference Image appears.

3. Build It

Knolled step cards expand on the canvas with isolated visuals.

Supported Craft Categories

Grid of 8 icons: Papercraft • Clay • Fabric/Sewing • Costume & Props • Woodcraft • Jewelry • Kids Crafts • Tabletop Figures

Showcase Banner

Carousel of example projects:

Papercraft Owl

Clay Turtle

EVA Armor Shoulder

Tabletop Orc Miniature

Each preview links to a readonly demo project.

Footer

GitHub link

Hackathon submission link

Credits to Kiro / Gemini

8. My Projects (User Gallery)

Route: /projects Purpose: Local or temporary session-based saving of user-created projects.

UI Structure:

Masonry or card grid layout

Each card shows:

Master Image thumbnail

Project name (auto-generated or user-edited)

Craft Category

Last modified time

Card Actions:

Open Project → loads canvas at exact layout

Delete Project

Duplicate Project (optional)

Export (PDF / PNG)

Project Save Format:

Each project saves:

Master Image (URL / blob)

Category

Materials list JSON

Steps JSON

Step image URLs

Node positions (React Flow graph coordinates)

No backend required — can use:

browser storage

local file export

or simple Supabase if you want cloud sync (optional)

9. Community Page (Public Showcase)

Route: /community Purpose: Explore other users’ crafts. No editing, just inspiration.

UI Structure:

Pinterest-style grid

Cards include:

Master Image

Creator handle (or “Anonymous”)

Category

Difficulty score

Card Interaction:

Clicking a card loads the Canvas Readonly Mode:

Master Image pinned

Materials list

Step cards with isolated images

No editing allowed

Share button available

Submission Flow:

When a user finishes a project:

They click “Publish to Community”

The app uploads:

Master Image

Category

Steps (json)

Step Images

Difficulty

Thumbnail

All public projects are permanent until manually removed.