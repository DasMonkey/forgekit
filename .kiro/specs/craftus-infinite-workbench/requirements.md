# Requirements Document

## Introduction

Craftus is an "Infinite Craft Workbench" application that leverages Generative AI to transform craft ideas into actionable, visual instruction sequences. The system generates a master reference image, material lists, and step-by-step isolated instruction images that recreate the aesthetic of traditional paper craft instructions from toy stores, sewing kits, and modeling guides. The application supports eight craft categories and provides an infinite canvas interface for spatial exploration of craft projects.

## Glossary

- **Craftus System**: The complete web application including canvas, AI generation, and user interface components
- **Master Reference Image**: A studio-quality AI-generated photograph showing the completed craft project
- **Dissection**: The process of analyzing a Master Reference Image to extract materials and step-by-step instructions
- **Step Image**: An isolated, knolled photograph showing only the components needed for a specific instruction step
- **Canvas**: The infinite, pannable, zoomable workspace built with React Flow
- **Node**: A visual card on the Canvas representing the Master Image, Materials List, or individual Step
- **Knolling**: A photographic layout technique where objects are arranged at 90-degree angles on a flat surface
- **Craft Category**: One of eight supported craft types (Papercraft, Clay, Fabric/Sewing, Costume & Props, Woodcraft, Jewelry, Kids Crafts, Tabletop Figures)
- **Summoning**: The initial AI generation process that creates the Master Reference Image from user description
- **Gemini API**: Google's Generative AI service used for image and text generation

## Requirements

### Requirement 1

**User Story:** As a craft enthusiast, I want to describe my craft idea in natural language and select a category, so that the system can generate a visual representation of my finished project

#### Acceptance Criteria

1. WHEN the user enters a craft description in the chat interface, THE Craftus System SHALL accept text input of at least 10 characters and up to 500 characters
2. WHEN the user submits a craft description, THE Craftus System SHALL display a category selector with exactly eight options: Papercraft, Clay, Fabric/Sewing, Costume & Props, Woodcraft, Jewelry, Kids Crafts, and Tabletop Figures
3. WHEN the user selects a category and confirms, THE Craftus System SHALL invoke the Gemini API with gemini-3-pro-image-preview model to generate the Master Reference Image
4. WHEN the Master Reference Image generation completes, THE Craftus System SHALL create a Master Node on the Canvas displaying the generated image
5. IF the Gemini API returns a 503 error, THEN THE Craftus System SHALL retry the request using exponential backoff with a maximum of 3 retry attempts

### Requirement 2

**User Story:** As a user, I want the Master Reference Image to look like a professional studio photograph of a handmade craft, so that I can clearly see the materials, textures, and construction details

#### Acceptance Criteria

1. THE Craftus System SHALL generate Master Reference Images with neutral backgrounds and even studio lighting
2. THE Craftus System SHALL ensure Master Reference Images display visible material textures including fabric weave, paper fibers, clay surface, foam texture, wood grain, or beads as appropriate to the category
3. THE Craftus System SHALL center the craft object in the Master Reference Image without including tools, hands, or environmental elements
4. WHEN generating a Master Reference Image, THE Craftus System SHALL include the selected Craft Category in the generation prompt to ensure category-appropriate materials and techniques
5. THE Craftus System SHALL generate Master Reference Images that depict fully finished, handmade-looking objects

### Requirement 3

**User Story:** As a user, I want to dissect the Master Reference Image into materials and steps, so that I can understand how to build the craft

#### Acceptance Criteria

1. WHEN the user clicks the Dissect button on a Master Node, THE Craftus System SHALL invoke the Gemini API with gemini-2.5-flash model to analyze the craft
2. WHEN dissection completes, THE Craftus System SHALL return a JSON response containing complexity level (Simple, Moderate, or Complex), complexity score (1-10), materials list, and chronological step-by-step instructions
3. WHEN dissection JSON is received, THE Craftus System SHALL create a Materials Node on the Canvas displaying all extracted materials
4. WHEN dissection JSON is received, THE Craftus System SHALL create Step Nodes arranged in a grid layout on the Canvas, one node per instruction step
5. THE Craftus System SHALL extract both explicit and implied materials from the Master Reference Image during dissection

### Requirement 4

**User Story:** As a user, I want each instruction step to have an isolated visual image showing only the components for that step, so that I can follow the instructions without confusion

#### Acceptance Criteria

1. WHEN a Step Node is created, THE Craftus System SHALL generate a Step Image using the Gemini API with gemini-3-pro-image-preview model
2. THE Craftus System SHALL generate Step Images that show ONLY the materials or sub-components required for that specific step
3. THE Craftus System SHALL generate Step Images that EXCLUDE the full finished object and unrelated parts
4. THE Craftus System SHALL apply category-specific visual rules to Step Images including knolling layout or macro close-up views appropriate to the Craft Category
5. THE Craftus System SHALL ensure Step Images match the exact textures, colors, and material properties from the Master Reference Image
6. THE Craftus System SHALL generate Step Images with pure white backgrounds and even lighting
7. WHEN generating Step Images sequentially, THE Craftus System SHALL queue requests to avoid rate limit errors

### Requirement 5

**User Story:** As a user, I want to interact with an infinite canvas workspace, so that I can spatially arrange and explore my craft project visually

#### Acceptance Criteria

1. THE Craftus System SHALL provide an infinite Canvas using React Flow technology that supports panning and zooming
2. THE Craftus System SHALL render the Canvas with a dark mode aesthetic using a slate to indigo to emerald color palette
3. THE Craftus System SHALL display a dotted grid pattern on the Canvas background
4. WHEN the user drags a Node, THE Craftus System SHALL update the Node position in real-time
5. WHEN the user zooms the Canvas, THE Craftus System SHALL scale all Nodes proportionally while maintaining readability
6. THE Craftus System SHALL allow users to reposition Master Nodes, Materials Nodes, and Step Nodes independently

### Requirement 6

**User Story:** As a user, I want to view a landing page that explains Craftus and guides me to start creating, so that I understand the value proposition before using the application

#### Acceptance Criteria

1. WHEN the user navigates to the root URL, THE Craftus System SHALL display a landing page with a hero section containing the tagline "Dissect your imagination. Build reality."
2. THE Craftus System SHALL display a "How It Works" section with three steps: Describe It, See It, and Build It
3. THE Craftus System SHALL display a grid showing all eight supported Craft Categories with icons
4. WHEN the user clicks the "Start Crafting" button, THE Craftus System SHALL navigate to the Canvas route
5. THE Craftus System SHALL display a showcase carousel with example projects including thumbnails and category labels

### Requirement 7

**User Story:** As a user, I want to save my craft projects locally, so that I can return to them later and continue working

#### Acceptance Criteria

1. WHEN the user completes a craft project, THE Craftus System SHALL provide a save option that stores the project data
2. THE Craftus System SHALL save project data including Master Image URL, Craft Category, materials list JSON, steps JSON, Step Image URLs, and Node positions
3. WHEN the user navigates to the Projects route, THE Craftus System SHALL display a grid of saved projects with thumbnails, project names, categories, and last modified timestamps
4. WHEN the user clicks a project card, THE Craftus System SHALL load the Canvas with the exact saved layout and all Nodes restored
5. WHEN the user clicks delete on a project card, THE Craftus System SHALL remove the project from storage after confirmation
6. THE Craftus System SHALL store project data in browser local storage

### Requirement 8

**User Story:** As a user, I want to publish my craft projects to a community gallery, so that I can share my creations and inspire others

#### Acceptance Criteria

1. WHEN the user clicks "Publish to Community" on a completed project, THE Craftus System SHALL upload the Master Image, Craft Category, steps JSON, Step Images, difficulty score, and thumbnail
2. WHEN the user navigates to the Community route, THE Craftus System SHALL display a Pinterest-style grid of published projects
3. WHEN the user clicks a community project card, THE Craftus System SHALL load the Canvas in readonly mode showing the Master Image, Materials list, and Step cards
4. WHILE in readonly mode, THE Craftus System SHALL prevent editing of Nodes and project data
5. WHEN viewing a community project, THE Craftus System SHALL display a share button that allows copying a project link

### Requirement 9

**User Story:** As a user, I want the system to handle API errors gracefully, so that temporary failures don't break my workflow

#### Acceptance Criteria

1. IF the Gemini API returns a 503 Overloaded error, THEN THE Craftus System SHALL retry the request using exponential backoff with delays of 1 second, 2 seconds, and 4 seconds
2. IF the Gemini API fails after maximum retry attempts, THEN THE Craftus System SHALL display an error message to the user with a retry button
3. WHEN rate limits are encountered during Step Image generation, THE Craftus System SHALL queue remaining requests and process them sequentially with appropriate delays
4. WHEN a Node is waiting for image generation, THE Craftus System SHALL display a loading state with visual feedback
5. IF image generation fails for a Step Node, THEN THE Craftus System SHALL display a fallback state with an error indicator and manual retry option

### Requirement 10

**User Story:** As a user, I want the application to use appropriate visual styling and UI components, so that the interface feels cohesive and professional

#### Acceptance Criteria

1. THE Craftus System SHALL implement a dark mode interface with a technical blueprint aesthetic
2. THE Craftus System SHALL use a color palette transitioning from slate to indigo to emerald for UI elements
3. THE Craftus System SHALL use orange-yellow colors for primary action buttons
4. THE Craftus System SHALL use Lucide Icons for all iconography
5. THE Craftus System SHALL implement responsive layouts using TailwindCSS that adapt to different screen sizes
