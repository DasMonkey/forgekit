# Project Structure

## Folder Organization

```
craftus/
├── src/
│   ├── components/          # React components
│   │   ├── nodes/          # Canvas node components (MasterNode, MaterialsNode, StepNode)
│   │   ├── ChatInterface.jsx
│   │   └── ...
│   ├── contexts/           # React Context providers
│   │   ├── AIContext.jsx   # AI generation state and actions
│   │   └── ProjectsContext.jsx  # Project management state
│   ├── services/           # External service integrations
│   │   ├── aiService.js    # Gemini API wrapper
│   │   └── requestQueue.js # Sequential request processing
│   ├── pages/              # Route-level components
│   │   ├── LandingPage.jsx
│   │   ├── CanvasWorkspace.jsx
│   │   ├── ProjectsGallery.jsx
│   │   └── CommunityGallery.jsx
│   ├── utils/              # Helper functions
│   ├── App.jsx             # Root component with routing
│   └── main.jsx            # Entry point
├── .kiro/
│   ├── specs/              # Specification documents
│   └── steering/           # AI assistant guidance (this folder)
└── public/                 # Static assets
```

## Component Architecture

### Node Components (Canvas Elements)

- **MasterNode**: Displays reference image with Dissect button
- **MaterialsNode**: Shows extracted materials list
- **StepNode**: Displays step number, description, and isolated instruction image

All nodes support drag-and-drop positioning and have loading/error states.

### Context Providers

- **AIContext**: Manages AI generation workflow (summonCraft, dissectCraft, generateStepImages)
- **ProjectsContext**: Handles project CRUD operations and LocalStorage persistence

### Service Layer

- **aiService.js**: Encapsulates all Gemini API calls with retry logic
- **requestQueue.js**: Ensures sequential processing of step image requests

## Routing Structure

- `/` - Landing page with marketing content
- `/canvas` - Main workspace with infinite canvas
- `/canvas/:projectId` - Load specific saved project
- `/projects` - Gallery of saved projects
- `/community` - Public showcase of published projects

## Data Flow

1. User input (ChatInterface) → AIContext.summonCraft()
2. Master image generated → MasterNode created on canvas
3. User clicks Dissect → AIContext.dissectCraft()
4. Materials + Steps extracted → MaterialsNode + StepNodes created
5. Step images queued → Sequential generation updates StepNodes
6. Project auto-saved to LocalStorage via ProjectsContext

## Naming Conventions

- Components: PascalCase (e.g., `ChatInterface.jsx`)
- Services: camelCase (e.g., `aiService.js`)
- Contexts: PascalCase with "Context" suffix (e.g., `AIContext.jsx`)
- Utilities: camelCase (e.g., `formatDate.js`)
- Constants: UPPER_SNAKE_CASE

## State Management Pattern

Use React Context for global state, local useState/useReducer for component-specific state. Avoid prop drilling by leveraging context providers at appropriate levels.
