# Technical Stack

## Core Technologies

- **Frontend Framework**: React 19 (functional components with hooks)
- **Build Tool**: Vite
- **Styling**: TailwindCSS with custom dark mode theme
- **Canvas Library**: React Flow (@xyflow/react) for infinite workspace
- **AI Integration**: Google GenAI SDK (@google/genai)
  - gemini-3-pro-image-preview for image generation
  - gemini-2.5-flash for text reasoning/dissection
- **Icons**: Lucide React
- **Routing**: React Router v6
- **State Management**: React Context API + useReducer
- **Storage**: Browser LocalStorage (primary), optional Supabase for community

## Color Palette

- Dark mode with technical blueprint aesthetic
- Slate → Indigo → Emerald gradient for UI elements
- Orange-yellow for primary action buttons
- Pure white backgrounds for generated step images

## Common Commands

### Development
```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Production build
npm run preview      # Preview production build
```

### Testing
```bash
npm run test         # Run unit tests with Vitest
npm run test:watch   # Run tests in watch mode
```

## Environment Variables

Required in `.env` file:
```
VITE_GEMINI_API_KEY=your_api_key_here
```

## AI Pipeline Architecture

1. **Master Image Generation**: User prompt + category → studio-quality reference image
2. **Dissection**: Master image analysis → JSON with materials and steps
3. **Step Image Generation**: Sequential generation of isolated instruction images with category-specific visual rules

## Error Handling Strategy

- Exponential backoff for 503 errors (1s, 2s, 4s delays, max 3 attempts)
- Request queuing for rate limits (2-second delay between step images)
- Graceful fallback states in UI components
- Manual retry options for failed generations

## Performance Considerations

- Sequential step image generation to avoid rate limits
- React.memo for node components
- Lazy loading for images
- LocalStorage compression for large projects
- React Flow viewport culling for canvas performance
