# Craftus

> **Dissect your imagination. Build reality.**

Craftus is an AI-powered "Infinite Craft Workbench" that transforms craft ideas into visual, step-by-step instruction sequences. The system generates studio-quality reference images and isolated instruction visuals that recreate the aesthetic of traditional paper craft manuals.

## 🪦 Resurrection Category - Bringing Back Lost Craft Culture

**Dead Technology Being Resurrected:** Paper craft instruction sheets from the 1970s-1990s

Remember the tactile joy of unfolding a paper instruction sheet from a model kit, origami book, or sewing pattern? Those beautifully illustrated, step-by-step guides that showed isolated components in knolling layouts? The ones that made complex builds feel achievable through careful visual breakdowns?

**That format is dead.** Replaced by YouTube tutorials, Pinterest pins, and text-heavy blog posts.

### What We Lost
- **Spatial Clarity**: Instructions you could spread across a table and reference at a glance
- **Isolated Component Views**: Each step showing ONLY what you need, not the entire finished product
- **Knolling Aesthetics**: Organized, flat-lay arrangements of materials and sub-assemblies
- **Tangible Reference**: A physical artifact you could annotate, fold, and keep with your project
- **Universal Design Language**: Visual instructions that transcended language barriers

### How Craftus Resurrects It
Craftus doesn't just digitize old instruction sheets—it uses AI to **generate them on-demand for ANY craft idea**:

1. **Master Reference Image** (gemini-3-pro-image-preview): Creates a studio-quality photograph of the finished craft with handmade textures, neutral backgrounds, and proper material detail—exactly like vintage instruction sheet cover images.

2. **Intelligent Dissection** (gemini-2.5-flash): Analyzes the craft like an expert maker would have manually designed an instruction sheet, breaking it into logical steps with materials lists and complexity ratings.

3. **Isolated Step Visualizations** (gemini-3-pro-image-preview): Generates photorealistic "knolling" images for each step showing ONLY the components needed—no full product, no distractions. Just like those vintage IKEA manuals and Tamiya model kit guides.

4. **Infinite Canvas**: Resurrects the "spread it on the table" experience digitally. Pan, zoom, and spatially arrange your instruction nodes like physical paper sheets.

### Why This Matters Today
The craft instruction sheet format died because it was expensive to produce professionally. You needed:
- Professional photographers
- Expert makers to design the breakdown
- Graphic designers for layout
- Print production costs

**Craftus makes this accessible to everyone.** AI generation means anyone can have professional-quality, visually-clear instructions for their craft ideas—whether it's papercraft, clay, fabric, woodworking, or cosplay props.

We're resurrecting a superior instructional format and solving tomorrow's problem: **making crafting accessible in an age of overwhelming, poorly-structured online tutorials.**

## Features

### 🎨 Infinite Canvas Workbench
- Built on React Flow for infinite panning and zooming
- Dark mode with technical blueprint aesthetic
- Spatial arrangement of craft instructions
- Drag and reposition nodes freely

### ✨ AI-Powered Master Image Generation
Describe your craft idea and select a category, then watch as Gemini 3 Pro creates a photorealistic studio photograph showing:
- Tangible handmade materials with detailed textures
- Neutral background with even studio lighting
- Clean, centered composition
- Category-specific material details (fabric weave, paper fibers, wood grain, etc.)

### 🔬 Intelligent Dissection
The system analyzes your craft and automatically generates:
- **Complexity Assessment**: Simple, Moderate, or Complex rating (1-10 scale)
- **Materials List**: All essential materials visible or implied
- **Step-by-Step Instructions**: Chronological breakdown of the build process
- **Category-Specific Guidance**: Tailored to your craft type

### 📸 Isolated Step Visualizations
For each instruction step, the AI generates photorealistic, isolated images using "knolling" layouts:
- Shows ONLY the materials needed for that specific step
- Matches exact textures and colors from the master image
- Excludes the finished product to maintain clarity
- Creates an IKEA-manual style visual guide

## Supported Craft Categories

- 📄 **Papercraft** - Origami, paper models, card crafts
- 🏺 **Clay** - Sculptures, pottery, modeling
- 🧵 **Fabric/Sewing** - Plushies, quilts, fabric crafts
- 🛡️ **Costume & Props** - Foam armor, cosplay props, Worbla builds
- 🪵 **Woodcraft** - Furniture, toys, wood projects
- 💎 **Jewelry** - Beading, wire work, accessories
- 🎨 **Kids Crafts** - Simple projects for children
- ⚔️ **Tabletop Figures** - Miniatures, wargaming models

## Tech Stack

- **React 19** - Modern UI framework
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first styling
- **React Flow** (@xyflow/react) - Infinite canvas implementation
- **Google Gemini AI** (@google/genai) - AI image and text generation
  - `gemini-3-pro-image-preview` for image generation
  - `gemini-2.5-flash` for text reasoning/dissection
- **Lucide React** - Beautiful icons
- **Vite** - Fast build tool and dev server

## Getting Started

### Prerequisites

- Node.js 16+ installed
- A Google Gemini API key ([Get one here](https://aistudio.google.com/apikey))

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Craftus
```

2. Install dependencies:
```bash
npm install
```

3. Set up your environment variables:
   - Create a `.env.local` file in the root directory
   - Add your Gemini API key:
```env
GEMINI_API_KEY=your_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser to `http://localhost:3000`

### Build for Production

```bash
npm run build
npm run preview
```

## How It Works

1. **Describe It** - Type your craft idea (e.g., "Papercraft fox") and select a category
2. **See It** - A master reference image appears showing the finished craft
3. **Dissect It** - Click "Dissect" to analyze the craft and generate steps
4. **Build It** - Step cards with isolated visuals expand on the canvas

## User Flow Example

```
User: "Make a clay turtle"
└─> Select: Clay category
    └─> Master Image: Studio photo of finished clay turtle
        └─> Click: Dissect
            └─> Materials Node: List of clay colors, tools
            └─> Step Cards:
                • Roll clay balls for body parts
                • Shape the shell dome
                • Attach legs and head
                • Add texture details
                • (Each with isolated knolling images)
```

## Error Handling

- **Retry Logic**: Automatic exponential backoff for 503/429 errors
- **Rate Limiting**: Sequential queuing for step image generation
- **Graceful Fallbacks**: Loading states and error messages in UI

## Project Structure

```
Craftus/
├── components/          # React components
│   ├── ChatInterface.tsx
│   ├── GeneratorModal.tsx
│   └── ...
├── services/           # API services
│   └── geminiService.ts
├── types.ts            # TypeScript type definitions
├── App.tsx             # Main application
├── index.tsx           # Entry point
└── vite.config.ts      # Vite configuration
```

## Future Roadmap

- [ ] Landing page with showcase examples
- [ ] User project gallery ("My Projects")
- [ ] Community showcase page
- [ ] Project export (PDF/PNG)
- [ ] Cloud sync with Supabase
- [ ] Share and publish projects

## License

This project is private and not licensed for redistribution.

## Acknowledgments

- Powered by Google Gemini AI
- Built with React Flow
- Inspired by traditional craft instruction manuals
