# Requirements Document

## Introduction

Gamecraft is a variant mode of the Craftus application that transforms the craft instruction generator into a game asset creation tool. Instead of generating step-by-step craft instructions, Gamecraft generates game characters, props, and assets with related design variations. The system will reuse the existing infinite canvas architecture and AI pipeline but adapt the prompts and output structure for game development workflows.

## Glossary

- **Gamecraft Mode**: The application mode focused on game asset generation
- **Asset Category**: The type of game asset to generate (3D Model, 2D Pixel Art, Low Poly, Sprite Sheet, etc.)
- **Master Asset**: The primary reference image showing the main character/prop/asset
- **Variation Node**: A node showing a design variation of the master asset (different pose, prop, color scheme, etc.)
- **Sprite Sheet Node**: A node containing multiple frames of animation or poses arranged in a grid
- **Asset Metadata**: Information about the generated asset including style, dimensions, color palette, and usage notes
- **Canvas Workspace**: The infinite pan/zoom workspace where asset nodes are displayed
- **AI Pipeline**: The three-stage generation process (Master Asset → Analysis → Variations)

## Requirements

### Requirement 1

**User Story:** As a game developer, I want to select an asset category type, so that I can generate assets appropriate for my game's visual style.

#### Acceptance Criteria

1. WHEN a user accesses the Gamecraft interface THEN the system SHALL display asset category options including 3D Model, 2D Pixel Art, Low Poly, Sprite Sheet, Isometric, and Concept Art
2. WHEN a user selects an asset category THEN the system SHALL update the generation context to use category-specific prompts and visual rules
3. WHEN a user switches between asset categories THEN the system SHALL preserve the selected category for subsequent generations within the same session
4. WHERE the user has not selected a category THEN the system SHALL default to 3D Model style
5. WHEN displaying category options THEN the system SHALL provide visual indicators or examples for each asset type

### Requirement 2

**User Story:** As a game developer, I want to describe a game character or asset in natural language, so that I can quickly generate visual references without manual illustration.

#### Acceptance Criteria

1. WHEN a user enters a description of 10-500 characters THEN the system SHALL accept the input for generation
2. WHEN a user submits a valid description with a selected category THEN the system SHALL generate a master asset image matching the description and category style
3. WHEN the description contains game-specific terms (HP, mana, attack, defense, etc.) THEN the system SHALL incorporate these attributes into the visual design
4. IF a user submits an empty or invalid description THEN the system SHALL display an error message and prevent generation
5. WHEN a user describes multiple asset types in one prompt THEN the system SHALL focus on the primary subject and note secondary elements for variations

### Requirement 3

**User Story:** As a game developer, I want the system to analyze my master asset and suggest design variations, so that I can explore different versions without starting from scratch.

#### Acceptance Criteria

1. WHEN a user clicks "Generate Variations" on a master asset THEN the system SHALL analyze the asset and extract key design elements (color scheme, proportions, style, accessories)
2. WHEN the analysis completes THEN the system SHALL generate a metadata node containing design attributes and variation suggestions
3. WHEN generating variation suggestions THEN the system SHALL propose 4-8 variation types including pose changes, prop additions, color variants, and expression changes
4. WHEN the master asset is a character THEN the system SHALL suggest character-specific variations (combat pose, idle pose, damaged state, powered-up form)
5. WHEN the master asset is a prop or environment piece THEN the system SHALL suggest prop-specific variations (different angles, wear states, size variants, seasonal versions)

### Requirement 4

**User Story:** As a game developer, I want to generate specific variations of my master asset, so that I can create a cohesive set of related assets for my game.

#### Acceptance Criteria

1. WHEN a user selects a variation type from the metadata node THEN the system SHALL queue that variation for generation
2. WHEN generating a variation THEN the system SHALL maintain visual consistency with the master asset while applying the requested changes
3. WHEN multiple variations are requested THEN the system SHALL generate them sequentially with appropriate rate limiting
4. WHEN a variation generation completes THEN the system SHALL create a new variation node on the canvas positioned near the master asset
5. WHEN a variation fails to generate THEN the system SHALL display an error state on the node with a retry option

### Requirement 5

**User Story:** As a game developer, I want to generate sprite sheets for 2D animations, so that I can use the assets directly in my game engine.

#### Acceptance Criteria

1. WHERE the selected category is Sprite Sheet or 2D Pixel Art THEN the system SHALL offer sprite sheet generation options
2. WHEN a user requests a sprite sheet THEN the system SHALL generate multiple frames showing the character in different animation states (idle, walk, run, jump, attack)
3. WHEN generating sprite sheets THEN the system SHALL arrange frames in a grid layout with consistent spacing and frame dimensions
4. WHEN a sprite sheet is generated THEN the system SHALL include metadata specifying frame count, frame dimensions, and animation sequence
5. WHEN displaying sprite sheets THEN the system SHALL allow users to preview individual frames or the full sheet

### Requirement 6

**User Story:** As a game developer, I want to save and organize my generated assets into projects, so that I can manage multiple game concepts separately.

#### Acceptance Criteria

1. WHEN a user generates assets THEN the system SHALL automatically save the canvas state to the current project
2. WHEN a user creates a new project THEN the system SHALL initialize an empty canvas with Gamecraft mode settings
3. WHEN a user loads a saved project THEN the system SHALL restore all asset nodes, variations, and metadata to their saved positions
4. WHEN a user switches between Craftus and Gamecraft projects THEN the system SHALL maintain separate project lists for each mode
5. WHEN displaying projects THEN the system SHALL indicate which mode each project belongs to

### Requirement 7

**User Story:** As a game developer, I want to export asset metadata and generation prompts, so that I can recreate or refine assets later.

#### Acceptance Criteria

1. WHEN a user views an asset node THEN the system SHALL display the original generation prompt and category
2. WHEN a user views a variation node THEN the system SHALL display the variation type and relationship to the master asset
3. WHEN a user exports a project THEN the system SHALL include all prompts, categories, and metadata in the export data
4. WHEN a user copies an asset node THEN the system SHALL copy the image URL and metadata to the clipboard
5. WHEN displaying metadata THEN the system SHALL format it in a developer-friendly structure (JSON or similar)

### Requirement 8

**User Story:** As a game developer, I want the AI to understand game-specific visual styles, so that the generated assets match common game art conventions.

#### Acceptance Criteria

1. WHEN the category is 3D Model THEN the system SHALL generate assets with realistic lighting, materials, and perspective appropriate for 3D games
2. WHEN the category is 2D Pixel Art THEN the system SHALL generate assets with limited color palettes, pixel-perfect edges, and retro game aesthetics
3. WHEN the category is Low Poly THEN the system SHALL generate assets with visible polygon facets and flat shading typical of low-poly art
4. WHEN the category is Isometric THEN the system SHALL generate assets in isometric perspective with consistent angle and scale
5. WHEN the category is Concept Art THEN the system SHALL generate detailed, painterly assets suitable for game design documentation

### Requirement 9

**User Story:** As a game developer, I want to generate character variations with different equipment or states, so that I can show progression and customization options.

#### Acceptance Criteria

1. WHEN generating character variations THEN the system SHALL support equipment changes (different weapons, armor, accessories)
2. WHEN generating character variations THEN the system SHALL support state changes (normal, damaged, powered-up, defeated)
3. WHEN generating character variations THEN the system SHALL support expression changes (neutral, angry, happy, surprised)
4. WHEN generating equipment variations THEN the system SHALL maintain character identity while changing only the specified equipment
5. WHEN generating state variations THEN the system SHALL apply appropriate visual effects (damage marks, power auras, status indicators)

### Requirement 10

**User Story:** As a game developer, I want the system to maintain visual consistency across variations, so that all assets feel like they belong to the same game.

#### Acceptance Criteria

1. WHEN generating variations THEN the system SHALL preserve the master asset's color palette within a reasonable tolerance
2. WHEN generating variations THEN the system SHALL maintain consistent art style, line weight, and rendering approach
3. WHEN generating variations THEN the system SHALL preserve character proportions and distinctive features
4. WHEN generating variations THEN the system SHALL maintain consistent lighting direction and intensity
5. WHEN visual consistency cannot be maintained THEN the system SHALL flag the variation for user review
