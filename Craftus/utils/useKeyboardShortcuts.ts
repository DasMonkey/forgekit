import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';

/**
 * Custom hook for canvas keyboard shortcuts
 * Provides zoom, pan, and navigation controls
 */
export const useKeyboardShortcuts = (enabled: boolean = true) => {
  const reactFlowInstance = useReactFlow();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const { key, ctrlKey, metaKey, shiftKey } = event;
      const cmdOrCtrl = ctrlKey || metaKey;

      // Zoom controls
      if (cmdOrCtrl && (key === '=' || key === '+')) {
        event.preventDefault();
        reactFlowInstance.zoomIn({ duration: 200 });
      } else if (cmdOrCtrl && (key === '-' || key === '_')) {
        event.preventDefault();
        reactFlowInstance.zoomOut({ duration: 200 });
      } else if (cmdOrCtrl && key === '0') {
        event.preventDefault();
        reactFlowInstance.fitView({ duration: 300, padding: 0.2 });
      }

      // Pan controls (Arrow keys)
      const panAmount = shiftKey ? 100 : 50;
      let panX = 0;
      let panY = 0;

      switch (key) {
        case 'ArrowUp':
          panY = panAmount;
          break;
        case 'ArrowDown':
          panY = -panAmount;
          break;
        case 'ArrowLeft':
          panX = panAmount;
          break;
        case 'ArrowRight':
          panX = -panAmount;
          break;
        default:
          return;
      }

      if (panX !== 0 || panY !== 0) {
        event.preventDefault();
        const viewport = reactFlowInstance.getViewport();
        reactFlowInstance.setViewport(
          {
            x: viewport.x + panX,
            y: viewport.y + panY,
            zoom: viewport.zoom,
          },
          { duration: 200 }
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, reactFlowInstance]);
};
