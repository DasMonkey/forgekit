import { useEffect } from 'react';
import { ToolType } from '../components/LeftToolbar';

interface UseToolKeyboardShortcutsOptions {
  enabled?: boolean;
  onToolChange: (tool: ToolType) => void;
}

/**
 * Custom hook to handle keyboard shortcuts for tool switching
 * V - Select tool
 * U - Upload tool
 * S - Shapes tool
 * T - Text tool
 * P - Pencil tool
 */
export const useToolKeyboardShortcuts = ({
  enabled = true,
  onToolChange,
}: UseToolKeyboardShortcutsOptions) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignore if modifier keys are pressed (except Shift for uppercase)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();

      switch (key) {
        case 'v':
          event.preventDefault();
          onToolChange('select');
          break;
        case 'u':
          event.preventDefault();
          onToolChange('upload');
          break;
        case 's':
          event.preventDefault();
          onToolChange('shapes');
          break;
        case 't':
          event.preventDefault();
          onToolChange('text');
          break;
        case 'p':
          event.preventDefault();
          onToolChange('pencil');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onToolChange]);
};
