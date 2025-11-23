/**
 * Tool-specific cursor styling utilities
 * Provides cursor definitions for different canvas tools
 */

import { ToolType } from '../components/LeftToolbar';

/**
 * Get the CSS cursor class for a given tool
 */
export const getToolCursor = (tool: ToolType): string => {
  switch (tool) {
    case 'select':
      return 'cursor-default';
    case 'shapes':
    case 'text':
      return 'cursor-crosshair';
    case 'pencil':
      return 'cursor-crosshair';
    case 'upload':
      return 'cursor-default';
    default:
      return 'cursor-default';
  }
};

/**
 * Get the CSS cursor style string for a given tool
 * This can be used for inline styles if needed
 */
export const getToolCursorStyle = (tool: ToolType): string => {
  switch (tool) {
    case 'select':
      return 'default';
    case 'shapes':
    case 'text':
      return 'crosshair';
    case 'pencil':
      return 'crosshair';
    case 'upload':
      return 'default';
    default:
      return 'default';
  }
};

/**
 * Apply cursor styling to an element based on the active tool
 */
export const applyToolCursor = (element: HTMLElement | null, tool: ToolType): void => {
  if (!element) return;
  
  // Remove all cursor classes
  element.classList.remove(
    'cursor-default',
    'cursor-crosshair',
    'cursor-pointer',
    'cursor-move',
    'cursor-grab',
    'cursor-grabbing'
  );
  
  // Add the appropriate cursor class
  element.classList.add(getToolCursor(tool));
};
