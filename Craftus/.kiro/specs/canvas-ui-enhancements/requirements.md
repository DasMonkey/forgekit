# Requirements Document

## Introduction

This feature enhances the Canvas Workspace with professional UI/UX improvements including a floating navigation menu, context-based interactions for generated images, and a comprehensive left-side toolbar for canvas manipulation tools. The goal is to provide a more intuitive and feature-rich editing experience similar to modern design tools while maintaining the craft-focused aesthetic.

## Glossary

- **Canvas Workspace**: The infinite pan/zoom workspace where craft projects are visualized using React Flow
- **Master Image Node**: The primary generated image node showing the finished craft project
- **Context Menu**: A popup menu that appears when interacting with specific canvas elements
- **Toolbar**: The vertical tool palette on the left side of the canvas
- **Floating Menu Bar**: The top navigation bar that remains visible while scrolling/panning the canvas
- **Tool State**: The currently active tool selected from the toolbar

## Requirements

### Requirement 1

**User Story:** As a user, I want a floating menu bar at the top of the canvas, so that I can easily navigate to other pages without leaving the canvas view

#### Acceptance Criteria

1. WHEN the Canvas Workspace loads, THE Canvas Workspace SHALL display a floating menu bar at the top of the viewport
2. THE floating menu bar SHALL remain visible while the user pans or zooms the canvas
3. THE floating menu bar SHALL include navigation links to the home page, projects gallery, and community gallery
4. THE floating menu bar SHALL use a semi-transparent background with backdrop blur for visual hierarchy
5. THE floating menu bar SHALL display the current project name if a project is loaded

### Requirement 2

**User Story:** As a user, I want generated images to display without decorative borders, so that I can focus on the craft content itself

#### Acceptance Criteria

1. WHEN a Master Image Node renders, THE Master Image Node SHALL display only the image without border styling
2. WHEN a Step Image Node renders, THE Step Image Node SHALL display only the image without border styling
3. THE image nodes SHALL maintain hover states for interactivity feedback
4. THE image nodes SHALL display loading and error states without decorative borders
5. THE image nodes SHALL support selection highlighting without permanent border decoration

### Requirement 3

**User Story:** As a user, I want to access the Dissect function through a context menu on the master image, so that I have a cleaner interface and more intuitive interaction

#### Acceptance Criteria

1. WHEN the user clicks on a Master Image Node, THE Canvas Workspace SHALL display a context menu below the image
2. THE context menu SHALL include the "Dissect" action option
3. WHEN the user selects "Dissect" from the context menu, THE Canvas Workspace SHALL trigger the dissection process
4. THE context menu SHALL close when the user clicks outside of it
5. THE context menu SHALL display with smooth animation transitions

### Requirement 4

**User Story:** As a user, I want a left-side toolbar with basic canvas tools, so that I can manipulate and add content to my craft workspace

#### Acceptance Criteria

1. WHEN the Canvas Workspace loads, THE Canvas Workspace SHALL display a vertical toolbar on the left side of the viewport
2. THE toolbar SHALL remain visible and accessible while panning or zooming the canvas
3. THE toolbar SHALL include the following tool buttons: Select, Upload, Shapes, Text, and Pencil
4. WHEN the user clicks a tool button, THE Canvas Workspace SHALL set that tool as the active tool
5. THE toolbar SHALL visually indicate which tool is currently active

### Requirement 5

**User Story:** As a user, I want the Select tool to allow me to interact with canvas elements, so that I can move and manipulate nodes

#### Acceptance Criteria

1. WHEN the Select tool is active, THE Canvas Workspace SHALL allow the user to click and drag nodes
2. WHEN the Select tool is active, THE Canvas Workspace SHALL allow the user to select multiple nodes
3. THE Select tool SHALL be the default active tool when the canvas loads
4. WHEN the Select tool is active, THE Canvas Workspace SHALL display the standard cursor
5. WHEN a node is selected with the Select tool, THE Canvas Workspace SHALL display selection indicators

### Requirement 6

**User Story:** As a user, I want the Upload tool to let me add images to the canvas, so that I can include reference materials or custom content

#### Acceptance Criteria

1. WHEN the user clicks the Upload tool button, THE Canvas Workspace SHALL display a submenu with "Upload Image" option
2. WHEN the user selects "Upload Image", THE Canvas Workspace SHALL open a file picker dialog
3. WHEN the user selects an image file, THE Canvas Workspace SHALL create a new image node on the canvas
4. THE uploaded image node SHALL be positioned at the center of the current viewport
5. THE Canvas Workspace SHALL validate uploaded files to ensure they are valid image formats

### Requirement 7

**User Story:** As a user, I want the Shapes tool to provide basic geometric shapes, so that I can annotate and organize my craft workspace

#### Acceptance Criteria

1. WHEN the user clicks the Shapes tool button, THE Canvas Workspace SHALL display a submenu with shape options
2. THE shapes submenu SHALL include rectangle, circle, triangle, and star shapes
3. THE shapes submenu SHALL include a "Shape with Text" section with rectangle, circle, and speech bubble options
4. WHEN the user selects a shape, THE Canvas Workspace SHALL create a new shape node on the canvas
5. THE shape nodes SHALL be positioned at the center of the current viewport

### Requirement 8

**User Story:** As a user, I want the Text tool to add text annotations to the canvas, so that I can label and document my craft projects

#### Acceptance Criteria

1. WHEN the user clicks the Text tool button, THE Canvas Workspace SHALL activate text creation mode
2. WHEN the user clicks on the canvas with the Text tool active, THE Canvas Workspace SHALL create a new text node at that position
3. THE text node SHALL be editable immediately after creation
4. THE text node SHALL support basic text formatting
5. WHEN the user clicks outside the text node, THE Canvas Workspace SHALL finalize the text content

### Requirement 9

**User Story:** As a user, I want the Pencil tool to draw freehand annotations, so that I can sketch ideas and mark up my craft workspace

#### Acceptance Criteria

1. WHEN the user clicks the Pencil tool button, THE Canvas Workspace SHALL display a submenu with drawing options
2. THE pencil submenu SHALL include "Pencil" and "Pen" options with keyboard shortcuts
3. WHEN the Pencil tool is active and the user drags on the canvas, THE Canvas Workspace SHALL create a freehand drawing path
4. THE drawing paths SHALL be rendered as vector paths for scalability
5. THE Pencil tool SHALL support different stroke widths and colors

### Requirement 10

**User Story:** As a user, I want tool interactions to follow standard design tool conventions, so that I can use the interface intuitively

#### Acceptance Criteria

1. THE toolbar buttons SHALL display tooltips on hover showing the tool name and keyboard shortcut
2. THE toolbar SHALL support keyboard shortcuts for quick tool switching
3. WHEN a tool with a submenu is clicked, THE Canvas Workspace SHALL display the submenu adjacent to the toolbar
4. THE submenus SHALL close when the user selects an option or clicks outside
5. THE toolbar and menus SHALL use consistent styling with the application's dark mode theme
