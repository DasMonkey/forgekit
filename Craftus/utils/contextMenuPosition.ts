/**
 * Calculate the optimal position for a context menu relative to a target element
 * Ensures the menu stays within the viewport bounds
 */
export interface MenuPosition {
  x: number;
  y: number;
}

export interface CalculateMenuPositionOptions {
  targetRect: DOMRect;
  menuWidth?: number;
  menuHeight?: number;
  preferredPosition?: 'below' | 'above' | 'right' | 'left';
  offset?: number;
}

const DEFAULT_MENU_WIDTH = 200;
const DEFAULT_MENU_HEIGHT = 150;
const DEFAULT_OFFSET = 8;

/**
 * Calculate context menu position below a target element
 * Falls back to above, right, or left if there's not enough space
 */
export const calculateMenuPosition = ({
  targetRect,
  menuWidth = DEFAULT_MENU_WIDTH,
  menuHeight = DEFAULT_MENU_HEIGHT,
  preferredPosition = 'below',
  offset = DEFAULT_OFFSET,
}: CalculateMenuPositionOptions): MenuPosition => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  let x = 0;
  let y = 0;

  // Calculate space available in each direction
  const spaceBelow = viewportHeight - (targetRect.bottom - scrollY);
  const spaceAbove = targetRect.top - scrollY;
  const spaceRight = viewportWidth - (targetRect.right - scrollX);
  const spaceLeft = targetRect.left - scrollX;

  // Determine vertical position
  if (preferredPosition === 'below' && spaceBelow >= menuHeight + offset) {
    // Position below target
    y = targetRect.bottom + offset;
  } else if (preferredPosition === 'above' && spaceAbove >= menuHeight + offset) {
    // Position above target
    y = targetRect.top - menuHeight - offset;
  } else if (spaceBelow >= menuHeight + offset) {
    // Default to below if space available
    y = targetRect.bottom + offset;
  } else if (spaceAbove >= menuHeight + offset) {
    // Fall back to above
    y = targetRect.top - menuHeight - offset;
  } else {
    // Not enough space above or below, center vertically
    y = Math.max(offset, (viewportHeight - menuHeight) / 2);
  }

  // Determine horizontal position
  if (preferredPosition === 'right' && spaceRight >= menuWidth + offset) {
    // Position to the right of target
    x = targetRect.right + offset;
  } else if (preferredPosition === 'left' && spaceLeft >= menuWidth + offset) {
    // Position to the left of target
    x = targetRect.left - menuWidth - offset;
  } else {
    // Center horizontally relative to target
    x = targetRect.left + (targetRect.width - menuWidth) / 2;

    // Ensure menu doesn't overflow viewport
    if (x + menuWidth > viewportWidth - offset) {
      x = viewportWidth - menuWidth - offset;
    }
    if (x < offset) {
      x = offset;
    }
  }

  return { x, y };
};

/**
 * Calculate position for a context menu below a node in React Flow canvas
 * Takes into account the canvas viewport transformation
 */
export const calculateNodeMenuPosition = (
  nodeElement: HTMLElement,
  menuWidth = DEFAULT_MENU_WIDTH,
  menuHeight = DEFAULT_MENU_HEIGHT,
): MenuPosition => {
  const rect = nodeElement.getBoundingClientRect();
  
  return calculateMenuPosition({
    targetRect: rect,
    menuWidth,
    menuHeight,
    preferredPosition: 'below',
    offset: 12,
  });
};

/**
 * Calculate position for menus below nodes (ImageNode, MasterNode)
 * Ensures the menu stays within viewport bounds and is centered
 */
export const calculateCraftMenuPosition = (
  nodeElement: HTMLElement,
  menuWidth = 400, // Default menu bar width, can be overridden
  menuHeight = 50, // Single row menu bar height
): MenuPosition => {
  const rect = nodeElement.getBoundingClientRect();

  // Center the menu horizontally below the image
  const x = rect.left + (rect.width - menuWidth) / 2;
  const y = rect.bottom + 8; // Small offset below the image

  // Ensure menu stays within viewport
  const viewportWidth = window.innerWidth;
  const adjustedX = Math.max(8, Math.min(x, viewportWidth - menuWidth - 8));

  return { x: adjustedX, y };
};
