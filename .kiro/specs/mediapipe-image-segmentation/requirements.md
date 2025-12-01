# Requirements Document

## Introduction

This feature integrates MediaPipe Interactive Segmenter to enable users to select objects or characters from generated craft images using point-and-click interaction. The system uses the "magic touch" model to detect and highlight selected regions, providing an intuitive way to isolate specific elements within craft instruction images.

## Glossary

- **MediaPipe Interactive Segmenter**: A machine learning model from Google MediaPipe that performs interactive image segmentation based on user click input
- **Magic Touch Model**: The specific MediaPipe model variant optimized for single-click object selection
- **Segmentation Mask**: A binary or multi-class pixel map that identifies which pixels belong to the selected object
- **Highlight Overlay**: A visual indicator (e.g., colored overlay or outline) that shows the selected region to the user
- **Generated Image**: Any AI-generated craft image (master reference, step image, or material image) displayed in the Craftus application
- **Selection State**: The current state tracking which object/region is selected and its segmentation mask
- **Canvas Node**: A React Flow node component that displays images on the infinite canvas workspace

## Requirements

### Requirement 1

**User Story:** As a craft creator, I want to click on objects within generated images, so that I can select and isolate specific elements for further manipulation or reference.

#### Acceptance Criteria

1. WHEN the user clicks on any pixel within a generated image, THE MediaPipe Segmenter SHALL process the click coordinates and return a segmentation mask within 2 seconds
2. THE MediaPipe Segmenter SHALL use the magic touch model variant for single-click object detection
3. IF the MediaPipe model fails to load or process the image, THEN THE System SHALL display an error message "Object selection unavailable" and allow normal image interaction
4. THE System SHALL support segmentation on all generated image types (master images, step images, and material images)
5. THE System SHALL maintain the original image quality and dimensions during segmentation processing

### Requirement 2

**User Story:** As a craft creator, I want to see a clear visual highlight of the selected object, so that I can confirm which element I have selected.

#### Acceptance Criteria

1. WHEN a segmentation mask is successfully generated, THE System SHALL render a visual highlight overlay on the selected region within 500 milliseconds
2. THE Highlight Overlay SHALL use a semi-transparent colored fill (opacity 0.3-0.5) with a contrasting border to clearly indicate the selected area
3. THE Highlight Overlay SHALL follow the exact contours of the segmentation mask without simplification
4. WHILE a region is selected, THE System SHALL maintain the highlight overlay visibility until the user clicks elsewhere or deselects
5. THE System SHALL use a visually distinct color (e.g., cyan, yellow, or emerald) that contrasts with the dark mode UI theme

### Requirement 3

**User Story:** As a craft creator, I want the segmentation feature to integrate seamlessly with the existing canvas workflow, so that I can use it without disrupting my current project work.

#### Acceptance Criteria

1. THE System SHALL add the segmentation capability to existing image nodes without requiring new node types
2. WHEN the user enables selection mode, THE System SHALL change the cursor to indicate interactive selection is available
3. THE System SHALL allow users to toggle selection mode on/off via a toolbar button or keyboard shortcut
4. WHILE selection mode is disabled, THE System SHALL maintain normal canvas pan, zoom, and drag interactions
5. THE System SHALL preserve all existing node functionality (resize, delete, connect) when segmentation is active

### Requirement 4

**User Story:** As a craft creator, I want the segmentation to work efficiently without slowing down the application, so that I can maintain a smooth creative workflow.

#### Acceptance Criteria

1. THE System SHALL load the MediaPipe model asynchronously during application initialization without blocking the UI
2. THE System SHALL cache the loaded model in memory to avoid repeated downloads
3. WHEN processing a segmentation request, THE System SHALL display a loading indicator if processing exceeds 500 milliseconds
4. THE System SHALL limit concurrent segmentation requests to one at a time to prevent resource exhaustion
5. IF the model download fails, THEN THE System SHALL retry up to 2 times with exponential backoff before showing an error

### Requirement 5

**User Story:** As a craft creator, I want to deselect or change my selection easily, so that I can explore different objects within the same image.

#### Acceptance Criteria

1. WHEN the user clicks on a different location within the same image, THE System SHALL clear the previous highlight and generate a new segmentation mask
2. WHEN the user clicks outside the image boundaries, THE System SHALL clear the current selection and remove the highlight overlay
3. THE System SHALL provide a "Clear Selection" button or ESC key shortcut to deselect without clicking
4. THE System SHALL allow multiple sequential selections on the same image without requiring mode changes
5. WHEN the user switches to a different canvas node, THE System SHALL preserve the selection state of the previous node

### Requirement 6

**User Story:** As a developer, I want the MediaPipe integration to follow security best practices, so that the application remains safe and user data is protected.

#### Acceptance Criteria

1. THE System SHALL load the MediaPipe model from official CDN sources only (cdn.jsdelivr.net or unpkg.com)
2. THE System SHALL process all images client-side without sending image data to external servers
3. THE System SHALL validate image dimensions and file sizes before processing to prevent memory exhaustion attacks
4. THE System SHALL sanitize all user click coordinates before passing to the segmentation model
5. THE System SHALL handle model errors gracefully without exposing internal error details to users
