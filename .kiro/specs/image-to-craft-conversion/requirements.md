# Requirements Document

## Introduction

This feature extends the existing image upload system to enable craft conversion functionality. Users can select uploaded images on the canvas and convert them into craft projects by choosing a craft style from a contextual menu. The system will use Gemini's image generation capabilities to transform the uploaded image into a studio-quality craft reference image in the selected style, following the same pipeline as text-based craft generation.

## Glossary

- **Existing Image Upload System**: The current file upload mechanism that allows users to add images to the canvas as nodes
- **Craft Style Menu**: A contextual popup menu that appears below a selected uploaded image, displaying available craft category options
- **Image-to-Craft Pipeline**: The AI generation workflow that converts an uploaded image into a craft-style master reference image using Gemini's multimodal capabilities
- **Master Reference Image**: The studio-quality generated image showing the finished craft in the selected style
- **Canvas Selection State**: The active state indicating which image node is currently selected by the user

## Requirements

### Requirement 1

**User Story:** As a user, I want to select an uploaded image on the canvas so that I can access craft conversion options

#### Acceptance Criteria

1. WHEN the user clicks on an uploaded image node, THE Canvas Selection State SHALL highlight the selected image with a visual indicator
2. WHEN the user clicks outside the selected image, THE Canvas Selection State SHALL deselect the image and remove the visual indicator
3. WHEN an image is selected, THE Existing Image Upload System SHALL display the Craft Style Menu below the selected image node
4. THE Craft Style Menu SHALL position itself within the visible viewport boundaries
5. WHEN the user selects a different image, THE Craft Style Menu SHALL move to the newly selected image location

### Requirement 2

**User Story:** As a user, I want to choose from available craft styles in a popup menu so that I can specify how my image should be transformed

#### Acceptance Criteria

1. THE Craft Style Menu SHALL display buttons for all eight supported craft categories (Papercraft, Clay, Fabric/Sewing, Costume & Props, Woodcraft, Jewelry, Kids Crafts, Tabletop Figures)
2. THE Craft Style Menu SHALL display a "Turn Image into Craft" action button
3. WHEN the user hovers over a craft category button, THE Craft Style Menu SHALL provide visual feedback indicating the hoverable state
4. WHEN the user clicks a craft category button, THE Craft Style Menu SHALL highlight the selected category
5. THE Craft Style Menu SHALL allow only one craft category to be selected at a time

### Requirement 3

**User Story:** As a user, I want to convert my uploaded image into a craft project so that I can generate step-by-step instructions based on a reference photo

#### Acceptance Criteria

1. WHEN the user clicks "Turn Image into Craft" with a category selected, THE Image-to-Craft Pipeline SHALL send the uploaded image and selected category to Gemini's multimodal API
2. THE Image-to-Craft Pipeline SHALL construct a prompt that instructs Gemini to generate a studio-quality craft reference image in the selected style based on the uploaded image
3. WHEN generation starts, THE Existing Image Upload System SHALL display a loading state on the selected image node
4. WHEN generation completes successfully, THE Image-to-Craft Pipeline SHALL create a Master Reference Image node on the canvas
5. IF generation fails, THEN THE Existing Image Upload System SHALL display an error message with a retry option

### Requirement 4

**User Story:** As a user, I want the generated craft image to follow the same workflow as text-based generation so that I can dissect it into materials and steps

#### Acceptance Criteria

1. THE Master Reference Image SHALL contain the same dissection capabilities as text-generated master images
2. WHEN the user clicks the Dissect button on the generated Master Reference Image, THE Image-to-Craft Pipeline SHALL trigger the standard dissection workflow
3. THE Image-to-Craft Pipeline SHALL apply the same rate limiting rules as text-based generation (2-second delays between requests)
4. THE Image-to-Craft Pipeline SHALL apply the same retry logic with exponential backoff for failed requests
5. THE Image-to-Craft Pipeline SHALL validate the generated image URL using the existing sanitizeImageUrl utility

### Requirement 5

**User Story:** As a user, I want the craft style menu to close when I deselect the image so that the interface remains clean and uncluttered

#### Acceptance Criteria

1. WHEN the user clicks on empty canvas space, THE Craft Style Menu SHALL close and remove itself from view
2. WHEN the user clicks on a different canvas element, THE Craft Style Menu SHALL close
3. WHEN the user pans or zooms the canvas, THE Craft Style Menu SHALL maintain its position relative to the selected image
4. WHEN the selected image is deleted, THE Craft Style Menu SHALL close immediately
5. WHEN generation starts, THE Craft Style Menu SHALL close automatically

### Requirement 6

**User Story:** As a user, I want my image-to-craft conversions to be validated and secured so that the system remains safe and reliable

#### Acceptance Criteria

1. THE Existing Image Upload System SHALL validate that the selected image is a valid uploaded image node before showing the Craft Style Menu
2. THE Image-to-Craft Pipeline SHALL sanitize the craft category selection before sending to the API
3. THE Image-to-Craft Pipeline SHALL enforce the same security validations as text-based generation (rate limiting, input sanitization)
4. IF the uploaded image file is corrupted or invalid, THEN THE Existing Image Upload System SHALL display an error message and prevent generation
5. THE Image-to-Craft Pipeline SHALL log generation attempts for debugging without exposing sensitive data
