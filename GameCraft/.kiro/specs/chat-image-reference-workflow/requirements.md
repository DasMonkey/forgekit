# Requirements Document

## Introduction

This feature transforms the animation creation workflow from preset actions to a flexible, user-driven system where users can iterate on poses via chat with image references. Users can attach canvas node images to the chat interface, describe desired variations or animations, and generate new assets based on those references. This enables an iterative, conversational workflow for creating sprite sheets, character variations, and animation frames.

## Glossary

- **ChatInterface**: The bottom-anchored chat input component where users enter prompts and generate game assets
- **ReferenceImage**: An image attached to the chat that the AI uses as visual guidance during generation
- **MasterNode**: A canvas node containing an AI-generated game asset image with an actions menu
- **ImageNode**: A canvas node containing an uploaded or converted image with a unified menu
- **CanvasWorkspace**: The main React Flow canvas page where nodes are displayed and managed
- **Gemini API**: The Google Generative AI service used for multimodal image generation
- **Sprite Sheet**: A collection of animation frames or character poses arranged in a grid

## Requirements

### Requirement 1

**User Story:** As a game developer, I want to attach reference images to my chat prompts, so that I can generate new assets based on existing visual styles and characters.

#### Acceptance Criteria

1. WHEN a user clicks the "+" button in the ChatInterface THEN the System SHALL open a native file picker dialog accepting image files
2. WHEN a user selects one or more image files from the file picker THEN the System SHALL display thumbnail previews above the chat input bar
3. WHEN reference images are attached THEN the System SHALL display each thumbnail with the image preview, filename, and a remove button
4. WHEN a user hovers over a reference image thumbnail THEN the System SHALL display the full filename as a tooltip
5. WHERE multiple reference images are attached THEN the System SHALL arrange thumbnails in a horizontally scrollable row

### Requirement 2

**User Story:** As a game developer, I want to remove reference images before submitting my prompt, so that I can control which images influence the AI generation.

#### Acceptance Criteria

1. WHEN a user clicks the X button on a reference image thumbnail THEN the System SHALL remove that image from the reference array
2. WHEN all reference images are removed THEN the System SHALL hide the thumbnail preview row
3. WHEN a user submits a prompt with reference images THEN the System SHALL clear all reference images after successful generation
4. WHEN generation fails THEN the System SHALL preserve the attached reference images for retry

### Requirement 3

**User Story:** As a game developer, I want to add canvas node images to the chat as references, so that I can iterate on existing assets without re-uploading files.

#### Acceptance Criteria

1. WHEN a user clicks "Add to Chat" in the MasterNodeActionsMenu THEN the System SHALL add the node's image to the ChatInterface reference array
2. WHEN a user clicks "Add to Chat" in the ImageNodeUnifiedMenu THEN the System SHALL add the node's image to the ChatInterface reference array
3. WHEN a user attempts to add an image that is already attached THEN the System SHALL skip the duplicate and maintain the current reference array
4. WHEN an image is successfully added to chat THEN the System SHALL provide visual feedback to the user
5. WHERE the ChatInterface is not visible THEN the System SHALL still accept the reference image and display it when the chat becomes visible

### Requirement 4

**User Story:** As a game developer, I want to generate new assets using reference images and text prompts, so that I can create variations that match the style of my existing assets.

#### Acceptance Criteria

1. WHEN a user submits a prompt with one reference image attached THEN the System SHALL call generateWithImageReferences with the prompt, category, single image URL, and pixel size
2. WHEN a user submits a prompt with multiple reference images attached THEN the System SHALL call generateWithImageReferences with the prompt, category, array of image URLs, and pixel size
3. WHEN a user submits a prompt without reference images THEN the System SHALL call generateCraftImage with the prompt, category, and pixel size
4. WHEN the Gemini API returns a generated image THEN the System SHALL create a new MasterNode on the canvas with the generated image
5. WHERE generation fails THEN the System SHALL display an error message and preserve the prompt and reference images

### Requirement 5

**User Story:** As a game developer, I want the AI to understand my reference images in context, so that generated assets maintain visual consistency with the references.

#### Acceptance Criteria

1. WHEN generateWithImageReferences is called with one reference image THEN the System SHALL construct a prompt stating "Use this reference image as visual guidance"
2. WHEN generateWithImageReferences is called with multiple reference images THEN the System SHALL construct a prompt stating "Use these N reference images as visual guidance"
3. WHEN sending images to the Gemini API THEN the System SHALL include all reference images as inline data before the text prompt
4. WHEN constructing the AI prompt THEN the System SHALL include category-specific style rules matching the selected craft category
5. WHERE the user selects Pixel Art category THEN the System SHALL include the pixel grid size in the style rules

### Requirement 6

**User Story:** As a game developer, I want visual feedback during the generation process, so that I understand the system is working on my request.

#### Acceptance Criteria

1. WHEN a user submits a prompt THEN the System SHALL immediately create a placeholder MasterNode on the canvas
2. WHILE generation is in progress THEN the System SHALL display a loading state in the ChatInterface
3. WHEN generation completes successfully THEN the System SHALL update the placeholder node with the generated image
4. WHEN generation fails THEN the System SHALL remove the placeholder node from the canvas
5. WHERE rate limits are exceeded THEN the System SHALL display the wait time in seconds before the next request is allowed

### Requirement 7

**User Story:** As a game developer, I want the "Add to Chat" button to be easily accessible, so that I can quickly add node images as references without complex interactions.

#### Acceptance Criteria

1. WHEN a MasterNode actions menu is displayed THEN the System SHALL show the "Add to Chat" button as the first action
2. WHEN an ImageNode unified menu is displayed THEN the System SHALL show the "Add to Chat" button as the first action
3. WHEN a user clicks "Add to Chat" THEN the System SHALL execute the action without requiring additional confirmation
4. WHEN the "Add to Chat" button is hovered THEN the System SHALL display a tooltip stating "Add to chat as reference"
5. WHERE a node is being converted or snapped THEN the System SHALL disable the "Add to Chat" button

### Requirement 8

**User Story:** As a game developer, I want the reference image workflow to integrate seamlessly with existing features, so that I can use it alongside other canvas operations.

#### Acceptance Criteria

1. WHEN reference images are attached THEN the System SHALL display a visual indicator on the chat input bar border
2. WHEN the chat input placeholder text is displayed with references THEN the System SHALL show "Describe what to create based on the reference..."
3. WHEN the chat input placeholder text is displayed without references THEN the System SHALL show "Describe a game asset you want to create..."
4. WHEN a user changes the category selector THEN the System SHALL preserve attached reference images
5. WHERE the user opens the pixel size submenu THEN the System SHALL preserve attached reference images
