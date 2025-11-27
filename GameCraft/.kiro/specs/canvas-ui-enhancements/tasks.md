# Implementation Plan

- [x] 1. Create FloatingMenuBar component



  - Create new component file `components/FloatingMenuBar.tsx`
  - Implement navigation links to home, projects, and community pages
  - Add project name display with truncation for long names
  - Style with semi-transparent background and backdrop blur
  - Add responsive design for mobile (collapse navigation)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Create LeftToolbar component with tool selection




- [x] 2.1 Create ToolButton component

  - Create `components/ToolButton.tsx` for individual tool buttons
  - Implement active state styling
  - Add hover effects and tooltips
  - Support icon display and keyboard shortcut hints
  - _Requirements: 4.3, 4.4, 10.1_

- [x] 2.2 Create LeftToolbar container


  - Create `components/LeftToolbar.tsx` as vertical toolbar container
  - Add tool buttons for Select, Upload, Shapes, Text, and Pencil
  - Implement tool state management with useState
  - Style with rounded pill container and backdrop blur
  - Position fixed on left side, vertically centered
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2.3 Add keyboard shortcuts for tool switching


  - Create `utils/useToolKeyboardShortcuts.ts` custom hook
  - Implement keyboard listeners for V (Select), U (Upload), S (Shapes), T (Text), P (Pencil)
  - Integrate with LeftToolbar component
  - _Requirements: 10.2, 10.3_

- [x] 3. Create ContextMenu component




- [x] 3.1 Implement ContextMenu component

  - Create `components/ContextMenu.tsx` with position and visibility props
  - Add menu item rendering with icons
  - Implement click outside detection to close menu
  - Add smooth fade-in animation
  - Style with white background and shadow
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [x] 3.2 Add context menu positioning logic


  - Create `utils/contextMenuPosition.ts` helper function
  - Calculate position below target node
  - Handle viewport edge cases (prevent overflow)
  - _Requirements: 3.1_

- [x] 3.3 Integrate ContextMenu with MasterNode


  - Modify `components/CustomNodes.tsx` MasterNode component
  - Add click handler to show context menu
  - Remove inline Dissect button overlay
  - Pass onDissect callback to context menu
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Update node styling to remove borders



  - Modify MasterNode in `components/CustomNodes.tsx` to remove decorative borders
  - Modify InstructionNode to remove decorative borders
  - Modify MaterialNode to remove decorative borders
  - Keep minimal selection indicators for interactivity
  - Update hover states to be subtle
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5. Create tool submenu components




- [x] 5.1 Create ToolSubmenu base component

  - Create `components/ToolSubmenu.tsx` with position and options props
  - Implement slide-in animation
  - Add click outside detection
  - Style with white background and shadow
  - _Requirements: 10.3, 10.4_

- [x] 5.2 Create UploadSubmenu component


  - Create `components/UploadSubmenu.tsx` extending ToolSubmenu
  - Add "Upload Image" menu item
  - Implement file picker trigger
  - _Requirements: 6.1, 6.2_

- [x] 5.3 Create ShapesSubmenu component


  - Create `components/ShapesSubmenu.tsx` extending ToolSubmenu
  - Add basic shapes section (Rectangle, Circle, Triangle, Star)
  - Add shapes with text section (Rectangle, Circle, Speech Bubble, Arrows)
  - Display shape icons for each option
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 5.4 Create PencilSubmenu component


  - Create `components/PencilSubmenu.tsx` extending ToolSubmenu
  - Add Pencil and Pen options with keyboard shortcuts
  - Display tool icons
  - _Requirements: 9.1, 9.2_

- [x] 6. Implement Select tool functionality



  - Set Select as default active tool in LeftToolbar
  - Ensure React Flow's default drag and select behavior is active
  - Add standard cursor styling when Select tool is active
  - Verify node selection and multi-select work correctly
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7. Implement Upload tool functionality




- [x] 7.1 Create file upload handler

  - Create `utils/fileUpload.ts` with validation functions
  - Validate file type (jpg, png, gif, webp only)
  - Validate file size (max 10MB)
  - Sanitize file names
  - Convert file to data URL or blob URL
  - _Requirements: 6.3, 6.5_


- [x] 7.2 Create ImageNode component

  - Create new node type in `components/CustomNodes.tsx`
  - Display uploaded image with clean styling
  - Support resize handles
  - Add alt text support
  - _Requirements: 6.3, 6.4_


- [x] 7.3 Integrate upload with canvas

  - Connect Upload tool to file picker
  - Create ImageNode on canvas when file is selected
  - Position node at viewport center
  - Add error handling for invalid files
  - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [x] 8. Implement Shapes tool functionality



- [x] 8.1 Create ShapeNode component

  - Create new node type in `components/CustomNodes.tsx`
  - Support rectangle, circle, triangle, and star shapes
  - Implement SVG rendering for each shape type
  - Add fill and stroke color support
  - Support text overlay for "Shape with Text" variants
  - _Requirements: 7.4, 7.5_


- [x] 8.2 Integrate shapes with canvas

  - Connect Shapes tool submenu to shape creation
  - Create ShapeNode on canvas when shape is selected
  - Position node at viewport center
  - Set default colors and dimensions
  - _Requirements: 7.3, 7.4, 7.5_

- [x] 9. Implement Text tool functionality






- [x] 9.1 Create TextNode component

  - Create new node type in `components/CustomNodes.tsx`
  - Display editable text content
  - Support inline editing on double-click
  - Add basic text formatting (font size, color)
  - Implement auto-resize based on content
  - _Requirements: 8.2, 8.3, 8.4_


- [x] 9.2 Integrate text tool with canvas

  - Activate text creation mode when Text tool is selected
  - Create TextNode on canvas click
  - Focus text input immediately after creation
  - Finalize text on click outside or Enter key
  - _Requirements: 8.1, 8.2, 8.5_

- [x] 10. Implement Pencil tool functionality




- [x] 10.1 Create DrawingNode component

  - Create new node type in `components/CustomNodes.tsx`
  - Render SVG paths for freehand drawings
  - Support multiple paths in single node
  - Add stroke color and width support
  - _Requirements: 9.4_


- [x] 10.2 Create drawing state management

  - Create `utils/useDrawingState.ts` custom hook
  - Track mouse down/move/up events
  - Build path points array during drawing
  - Support both Pencil (raw) and Pen (smoothed) modes
  - _Requirements: 9.3, 9.4_

- [x] 10.3 Integrate drawing with canvas


  - Activate drawing mode when Pencil tool is selected
  - Capture mouse events on canvas
  - Create DrawingNode when drawing is complete
  - Add path smoothing for Pen mode
  - Support different stroke widths and colors
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 11. Integrate all components into CanvasWorkspace

  - Import and add FloatingMenuBar to CanvasWorkspace
  - Import and add LeftToolbar to CanvasWorkspace
  - Import and add ContextMenu to CanvasWorkspace
  - Register new node types (ImageNode, ShapeNode, TextNode, DrawingNode) with React Flow
  - Update z-index layering for proper stacking
  - Test all components work together without conflicts
  - _Requirements: 1.1, 4.1, 3.1_


- [x] 12. Add tool-specific cursor styling





  - Create `utils/toolCursors.ts` with cursor definitions
  - Apply standard cursor for Select tool
  - Apply crosshair cursor for Shapes and Text tools
  - Apply pencil cursor for Pencil tool
  - Update cursor dynamically based on active tool
  - _Requirements: 5.4, 10.5_


- [x] 13. Implement canvas state persistence





  - Update `utils/storage.ts` to include new node types
  - Serialize ImageNode, ShapeNode, TextNode, DrawingNode data
  - Deserialize and restore nodes on project load
  - Handle backward compatibility with existing projects
  - _Requirements: 4.1, 6.3, 7.4, 8.2, 9.3_


- [ ] 14. Add tooltips to toolbar buttons
  - Create `components/Tooltip.tsx` component
  - Display tool name and keyboard shortcut on hover
  - Position tooltip adjacent to button
  - Add fade-in animation with delay
  - _Requirements: 10.1_


- [ ] 15. Optimize performance for drawing operations
  - Implement path point throttling in drawing hook
  - Add Douglas-Peucker algorithm for path simplification
  - Limit maximum points per path (1000)
  - Debounce canvas state updates during drawing
  - _Requirements: 9.3, 9.4_


- [ ] 16. Add accessibility features
  - Add ARIA labels to all toolbar buttons
  - Add ARIA live regions for tool state changes
  - Ensure keyboard navigation works for all menus
  - Add focus indicators to interactive elements
  - Test with screen reader
  - _Requirements: 10.1, 10.2, 10.3_


- [x] 17. Write unit tests for utility functions

  - Test file upload validation in `fileUpload.ts`
  - Test context menu positioning in `contextMenuPosition.ts`
  - Test path simplification algorithm
  - Test keyboard shortcut handlers
  - _Requirements: 6.5, 3.1, 9.4, 10.2_
