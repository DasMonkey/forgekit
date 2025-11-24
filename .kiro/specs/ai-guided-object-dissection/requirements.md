# Requirements Document

## Introduction

This feature enhances the Craftus AI dissection workflow by integrating MediaPipe Interactive Segmenter results to guide the AI in creating focused, object-specific craft instructions. When a user selects an object within an image using segmentation, the system will use that selection to instruct the AI to generate step-by-step instructions specifically for crafting that selected object, while ensuring the AI has full context of the complete object even when segmentation masks are incomplete.

## Glossary

- **AI-Guided Dissection**: The process of using segmentation data to focus AI instruction generation on a specific selected object
- **Segmentation Mask**: A binary pixel map identifying which pixels belong to the selected object (from MediaPipe Interactive Segmenter)
- **Bounding Box**: A rectangular region that fully contains the selected object, calculated from the segmentation mask
- **Context Padding**: Additional image area around the bounding box to ensure small parts (ears, tails, etc.) are visible to the AI
- **Dissection Prompt**: The AI prompt that includes information about the selected object and requests craft instructions
- **Master Image**: The reference image containing one or more objects that can be segmented and dissected
- **Uploaded Image**: A user-uploaded image that can be segmented and dissected
- **Object-Focused Instructions**: Step-by-step craft instructions generated specifically for the selected object
- **Gemini Vision API**: The Google AI service used to analyze images and generate instructions

## Requirements

### Requirement 1

**User Story:** As a craft creator, I want to select an object in an image and have the AI generate instructions specifically for that object, so that I can focus on crafting individual elements from complex scenes.

#### Acceptance Criteria

1. WHEN the user selects an object using MediaPipe segmentation and clicks a "Dissect Selected" button, THE System SHALL send the image with selection context to the Gemini Vision API
2. THE System SHALL include the segmentation bounding box coordinates in the AI prompt to focus attention on the selected region
3. THE Gemini Vision API SHALL return craft instructions specifically for the selected object within 30 seconds
4. THE System SHALL create MaterialsNode and StepNodes on the canvas based on the AI-generated instructions for the selected object
5. IF no object is selected when "Dissect Selected" is clicked, THEN THE System SHALL display an error message "Please select an object first"

### Requirement 2

**User Story:** As a craft creator, I want the AI to see the complete object even when my segmentation selection misses small parts, so that the generated instructions include all necessary details.

#### Acceptance Criteria

1. THE System SHALL calculate a bounding box that encompasses the entire segmentation mask
2. THE System SHALL add context padding of 15-25% around the bounding box to capture adjacent small parts
3. THE System SHALL crop the image to the padded bounding box before sending to the AI
4. THE System SHALL include in the AI prompt that the object may extend slightly beyond the highlighted region
5. THE Gemini Vision API SHALL analyze the full cropped region, not just the masked pixels

### Requirement 3

**User Story:** As a craft creator, I want to see a visual preview of what region will be sent to the AI, so that I can verify the selection includes the complete object before dissecting.

#### Acceptance Criteria

1. WHEN an object is selected, THE System SHALL display a preview outline showing the bounding box with context padding
2. THE Preview Outline SHALL use a distinct visual style (dashed border, different color) from the segmentation highlight
3. THE System SHALL show the preview outline for at least 2 seconds after selection
4. THE System SHALL allow the user to adjust the context padding via a slider (0-50%) before dissecting
5. WHEN the user hovers over the "Dissect Selected" button, THE System SHALL re-display the preview outline

### Requirement 4

**User Story:** As a craft creator, I want the AI to understand what type of craft I'm making, so that the generated instructions match my selected category.

#### Acceptance Criteria

1. THE System SHALL include the current craft category (papercraft, clay, fabric, etc.) in the dissection prompt
2. THE System SHALL allow the user to override the category for the selected object if different from the master image category
3. THE Dissection Prompt SHALL specify that instructions should be appropriate for the selected craft category
4. THE System SHALL maintain the category selection in the project data for consistency
5. IF no category is set, THEN THE System SHALL default to "General Craft" category

### Requirement 5

**User Story:** As a craft creator, I want to provide additional context about the selected object, so that the AI generates more accurate instructions.

#### Acceptance Criteria

1. THE System SHALL provide an optional text input field for object description before dissecting
2. WHEN the user provides an object description, THE System SHALL include it in the dissection prompt
3. THE Object Description SHALL be limited to 200 characters
4. THE System SHALL sanitize the object description using existing security validation
5. THE System SHALL save the object description with the generated instructions for reference

### Requirement 6

**User Story:** As a craft creator, I want to dissect multiple objects from the same image independently, so that I can create separate instruction sets for each element.

#### Acceptance Criteria

1. THE System SHALL allow multiple sequential dissections from the same master or uploaded image
2. WHEN a new dissection is triggered, THE System SHALL create a new set of MaterialsNode and StepNodes
3. THE System SHALL position new instruction nodes in a different canvas location to avoid overlap
4. THE System SHALL maintain a visual connection (edge) between the source image and each dissection result
5. THE System SHALL label each dissection with the object description or "Object 1", "Object 2", etc.

### Requirement 7

**User Story:** As a craft creator, I want the dissection to work with both AI-generated and uploaded images, so that I can create instructions for any craft reference.

#### Acceptance Criteria

1. THE System SHALL support object-focused dissection on MasterNode images (AI-generated)
2. THE System SHALL support object-focused dissection on ImageNode images (user-uploaded)
3. THE System SHALL validate that the image is fully loaded before allowing dissection
4. THE System SHALL handle different image formats (JPEG, PNG, WebP) consistently
5. THE System SHALL respect the maximum image size limits (4096x4096) for dissection

### Requirement 8

**User Story:** As a craft creator, I want clear visual feedback during the dissection process, so that I know the system is working and can track progress.

#### Acceptance Criteria

1. WHEN dissection starts, THE System SHALL display a loading indicator on the source image node
2. THE System SHALL show a progress message "Analyzing selected object..." during AI processing
3. WHEN step images are being generated, THE System SHALL show "Generating step X of Y" progress
4. THE System SHALL display the total time elapsed during dissection
5. IF dissection fails, THEN THE System SHALL display a specific error message and allow retry

### Requirement 9

**User Story:** As a developer, I want the object-focused dissection to integrate seamlessly with existing dissection logic, so that code remains maintainable and consistent.

#### Acceptance Criteria

1. THE System SHALL reuse existing dissectCraft() function with additional parameters for object-focused mode
2. THE System SHALL reuse existing error handling and retry logic from the standard dissection flow
3. THE System SHALL reuse existing rate limiting and request queuing mechanisms
4. THE System SHALL follow the same security validation patterns for all AI requests
5. THE System SHALL maintain backward compatibility with standard (non-object-focused) dissection

### Requirement 10

**User Story:** As a craft creator, I want the system to handle edge cases gracefully, so that I have a reliable experience even with unusual selections.

#### Acceptance Criteria

1. IF the segmentation mask is too small (< 5% of image area), THEN THE System SHALL warn "Selection may be too small for detailed instructions"
2. IF the segmentation mask is too large (> 90% of image area), THEN THE System SHALL suggest using standard dissection instead
3. IF the bounding box with padding exceeds image boundaries, THEN THE System SHALL clamp to image edges
4. IF the AI returns instructions unrelated to the selected object, THEN THE System SHALL display a warning and allow retry
5. THE System SHALL handle cases where the AI cannot identify a craftable object in the selection

