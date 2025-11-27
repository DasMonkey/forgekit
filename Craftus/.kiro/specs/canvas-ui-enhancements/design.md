# Design Document

## Overview

This design document outlines the architecture for enhancing the Canvas Workspace with a professional UI/UX layer including a floating navigation menu, context-based interactions, and a comprehensive toolbar system. The design maintains the existing React Flow canvas architecture while adding new interaction layers that don't interfere with the core craft generation workflow.

## Architecture

### High-Level Component Structure

```
CanvasWorkspace (existing)
├── FloatingMenuBar (new)
│   ├── Logo/Brand
│   ├── Navigation Links
│   └── Project Name Display
├── LeftToolbar (new)
│   ├── ToolButton (Select)
│   ├── ToolButton (Upload) → UploadSubmenu
│   ├── ToolButton (Shapes) → ShapesSubmenu
│   ├── ToolButton (Text)
│   └── ToolButton (Pencil) → PencilSubmenu
├── ContextMenu (new)
│   └── MenuItem (Dissect)
├── ReactFlow (existing)
│   ├── MasterNode (modified)
│   ├── InstructionNode (modified)
│   ├── MaterialNode (modified)
│   ├── ShapeNode (new)
│   ├── TextNode (new)
│   ├── ImageNode (new)
│   └── DrawingNode (new)
└── ChatInterface (existing)
```

### State Management

We'll extend the existing canvas state to include:
- Active tool selection
- Context menu state (position, visibility, target node)
- Drawing state (for pencil tool)
- Uploaded images collection

## Components and Interfaces

### 1. FloatingMenuBar Component

**Purpose**: Provide persistent navigation and context information

**Props**:
```typescript
interface FloatingMenuBarProps {
  projectName?: string;
  onNavigate: (path: string) => void;
}
```

**Styling**:
- Fixed position at top of viewport
- Semi-transparent background with backdrop blur
- z-index above canvas but below modals
- Responsive design (collapse on mobile)

**Features**:
- Logo/brand on left
- Navigation links (Home, Projects, Community)
- Project name display (center or right)
- Smooth fade-in animation on mount

### 2. LeftToolbar Component

**Purpose**: Provide quick access to canvas manipulation tools

**Props**:
```typescript
interface LeftToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

type ToolType = 'select' | 'upload' | 'shapes' | 'text' | 'pencil';
```

**Styling**:
- Fixed position on left side, vertically centered
- Rounded pill-shaped container
- Semi-transparent background with backdrop blur
- Tool buttons with hover states and active indicators

**Features**:
- Vertical stack of tool buttons
- Active tool highlighted with background color
- Tooltips on hover showing tool name and keyboard shortcut
- Submenu support for tools with multiple options
- Keyboard shortcut support (V, U, S, T, P)

### 3. ToolSubmenu Component

**Purpose**: Display additional options for tools with multiple modes

**Props**:
```typescript
interface ToolSubmenuProps {
  tool: ToolType;
  position: { x: number; y: number };
  onSelect: (option: string) => void;
  onClose: () => void;
}
```

**Submenu Configurations**:

**Upload Submenu**:
- Upload Image option with file picker

**Shapes Submenu**:
- Basic shapes: Rectangle, Circle, Triangle, Star
- Shapes with text: Rectangle, Circle, Speech Bubble, Arrows

**Pencil Submenu**:
- Pencil (freehand)
- Pen (smooth curves)

**Styling**:
- Positioned adjacent to toolbar
- White/light background for contrast
- Smooth slide-in animation
- Click outside to close

### 4. ContextMenu Component

**Purpose**: Provide contextual actions for canvas nodes

**Props**:
```typescript
interface ContextMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  nodeId: string;
  nodeType: string;
  onAction: (action: string, nodeId: string) => void;
  onClose: () => void;
}
```

**Features**:
- Positioned below clicked node
- Dynamic action list based on node type
- For MasterNode: "Dissect" action
- Smooth fade-in animation
- Auto-close on outside click or action selection

**Styling**:
- White background with shadow
- Rounded corners
- Menu items with hover states
- Icons next to action labels

### 5. Modified Node Components

**MasterNode Changes**:
- Remove inline "Dissect" button overlay
- Add click handler to trigger context menu
- Remove decorative border (keep minimal selection indicator)
- Clean image display without frame

**InstructionNode Changes**:
- Remove decorative border
- Simplify to image + text content
- Minimal hover state

**MaterialNode Changes**:
- Remove decorative border
- Simplify styling

### 6. New Node Types

**ShapeNode**:
```typescript
interface ShapeNodeData {
  shapeType: 'rectangle' | 'circle' | 'triangle' | 'star';
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  width: number;
  height: number;
  text?: string;
}
```

**TextNode**:
```typescript
interface TextNodeData {
  content: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  alignment: 'left' | 'center' | 'right';
}
```

**ImageNode** (for uploaded images):
```typescript
interface ImageNodeData {
  imageUrl: string;
  width: number;
  height: number;
  altText: string;
}
```

**DrawingNode** (for pencil/pen drawings):
```typescript
interface DrawingNodeData {
  paths: DrawingPath[];
  strokeColor: string;
  strokeWidth: number;
}

interface DrawingPath {
  points: { x: number; y: number }[];
  tool: 'pencil' | 'pen';
}
```

## Data Models

### Canvas Tool State

```typescript
interface CanvasToolState {
  activeTool: ToolType;
  toolOptions: {
    shapes: {
      fillColor: string;
      strokeColor: string;
      strokeWidth: number;
    };
    text: {
      fontSize: number;
      fontFamily: string;
      color: string;
    };
    pencil: {
      strokeColor: string;
      strokeWidth: number;
      tool: 'pencil' | 'pen';
    };
  };
}
```

### Context Menu State

```typescript
interface ContextMenuState {
  visible: boolean;
  position: { x: number; y: number };
  targetNodeId: string | null;
  targetNodeType: string | null;
}
```

### Drawing State

```typescript
interface DrawingState {
  isDrawing: boolean;
  currentPath: { x: number; y: number }[];
  completedPaths: DrawingPath[];
}
```

## Error Handling

### File Upload Validation
- Validate file type (images only: jpg, png, gif, webp)
- Validate file size (max 10MB)
- Sanitize file names
- Display user-friendly error messages

### Drawing Performance
- Throttle mouse move events during drawing
- Limit path complexity (max 1000 points per path)
- Debounce canvas updates

### Context Menu Edge Cases
- Prevent menu from rendering outside viewport
- Handle rapid clicks (debounce)
- Clean up event listeners on unmount

## Testing Strategy

### Unit Tests
- ToolButton component rendering and interactions
- ContextMenu positioning logic
- File upload validation functions
- Drawing path simplification algorithms

### Integration Tests
- Tool switching workflow
- Context menu triggering from node clicks
- Shape creation and placement
- Text node editing
- Image upload and display

### Visual Regression Tests
- Toolbar appearance and positioning
- Context menu styling
- Node styling without borders
- Floating menu bar responsiveness

### User Interaction Tests
- Keyboard shortcuts for tool switching
- Click outside to close menus
- Drag and drop for uploaded images
- Drawing with mouse/touch

## Performance Considerations

### Rendering Optimization
- Memoize toolbar and menu components
- Use React.memo for node components
- Throttle drawing updates
- Lazy load submenu components

### Canvas Performance
- Limit number of drawing nodes (max 20)
- Simplify drawing paths using Douglas-Peucker algorithm
- Use React Flow's built-in viewport culling
- Debounce auto-save during drawing

### Memory Management
- Clean up event listeners on component unmount
- Limit undo/redo history for drawings
- Compress uploaded images if too large
- Clear unused node data from state

## Accessibility

### Keyboard Navigation
- Tab through toolbar buttons
- Enter/Space to activate tools
- Escape to close menus
- Arrow keys for canvas navigation (existing)

### Screen Reader Support
- ARIA labels for toolbar buttons
- ARIA live regions for tool state changes
- Alt text for all images
- Semantic HTML for menus

### Visual Accessibility
- High contrast mode support
- Focus indicators on interactive elements
- Sufficient color contrast ratios
- Scalable UI elements

## Security Considerations

### File Upload Security
- Validate file types on client side
- Sanitize file names before storage
- Use Content Security Policy for uploaded images
- Limit file size to prevent DoS

### XSS Prevention
- Sanitize text node content before rendering
- Validate SVG paths for shape nodes
- Escape user-generated content
- Use React's built-in XSS protection

### Data Validation
- Validate all tool option inputs
- Sanitize drawing path data
- Validate node positions and dimensions
- Check for malicious SVG content

## Migration Strategy

### Phase 1: UI Components
1. Create FloatingMenuBar component
2. Create LeftToolbar component
3. Create ContextMenu component
4. Add to CanvasWorkspace without functionality

### Phase 2: Node Modifications
1. Remove borders from existing nodes
2. Add context menu trigger to MasterNode
3. Update node styling for cleaner appearance
4. Test existing functionality

### Phase 3: Tool Implementation
1. Implement Select tool (default behavior)
2. Implement Upload tool with file picker
3. Implement Shapes tool with basic shapes
4. Implement Text tool with inline editing
5. Implement Pencil tool with drawing

### Phase 4: Integration
1. Connect tools to canvas state
2. Add keyboard shortcuts
3. Implement tool-specific cursors
4. Add tooltips and help text

### Phase 5: Polish
1. Add animations and transitions
2. Optimize performance
3. Add accessibility features
4. User testing and refinements

## Design Decisions and Rationales

### Why Context Menu Instead of Inline Button?
- Cleaner visual appearance
- Scalable for future actions
- Standard UX pattern in design tools
- Reduces visual clutter on nodes

### Why Left Toolbar Instead of Top?
- Vertical space is more available
- Matches design tool conventions (Figma, Sketch)
- Easier thumb access on mobile
- Doesn't compete with floating menu bar

### Why Separate Node Types for Shapes/Text?
- Better separation of concerns
- Easier to extend with new features
- Cleaner data models
- Better performance (targeted re-renders)

### Why Sequential Tool Activation?
- Simpler state management
- Clear user intent
- Prevents mode confusion
- Standard design tool behavior

## Future Enhancements

### Phase 2 Features (Post-MVP)
- Color picker for shapes and text
- Layer management panel
- Undo/redo for all operations
- Copy/paste for nodes
- Alignment guides and snapping
- Export canvas as image
- Collaborative editing indicators

### Advanced Drawing Features
- Pressure sensitivity for tablets
- Brush library
- Eraser tool
- Fill tool for closed paths
- Path smoothing options

### Advanced Shape Features
- Custom shape library
- Shape grouping
- Boolean operations
- Gradient fills
- Pattern fills
