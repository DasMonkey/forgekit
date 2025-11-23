import { useState, useCallback, useRef } from 'react';
import { DrawingPath } from '../types';

export type PencilMode = 'pencil' | 'pen';

interface DrawingState {
  isDrawing: boolean;
  currentPath: { x: number; y: number }[];
  completedPaths: DrawingPath[];
}

interface UseDrawingStateOptions {
  mode: PencilMode;
  strokeColor: string;
  strokeWidth: number;
  onDrawingComplete?: (paths: DrawingPath[]) => void;
}

export const useDrawingState = (options: UseDrawingStateOptions) => {
  const { mode, strokeColor, strokeWidth, onDrawingComplete } = options;
  
  const [state, setState] = useState<DrawingState>({
    isDrawing: false,
    currentPath: [],
    completedPaths: [],
  });

  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const throttleRef = useRef<number | null>(null);

  /**
   * Start drawing
   */
  const startDrawing = useCallback((x: number, y: number) => {
    setState(prev => ({
      ...prev,
      isDrawing: true,
      currentPath: [{ x, y }],
    }));
    lastPointRef.current = { x, y };
  }, []);

  /**
   * Add point to current path (with minimal throttling)
   */
  const addPoint = useCallback((x: number, y: number) => {
    // Reduced throttle for smoother drawing
    if (throttleRef.current) {
      return;
    }

    throttleRef.current = window.setTimeout(() => {
      throttleRef.current = null;
    }, 5); // Faster sampling for smoother lines

    setState(prev => {
      if (!prev.isDrawing) return prev;

      // Skip if point is too close to last point (< 1px for smoother curves)
      if (lastPointRef.current) {
        const dx = x - lastPointRef.current.x;
        const dy = y - lastPointRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 1) {
          return prev;
        }
      }

      lastPointRef.current = { x, y };

      // Limit path complexity (max 1000 points)
      const newPath = [...prev.currentPath, { x, y }];
      if (newPath.length > 1000) {
        return prev;
      }

      return {
        ...prev,
        currentPath: newPath,
      };
    });
  }, []);

  /**
   * Finish drawing
   */
  const finishDrawing = useCallback(() => {
    setState(prev => {
      if (!prev.isDrawing || prev.currentPath.length < 2) {
        return {
          ...prev,
          isDrawing: false,
          currentPath: [],
        };
      }

      const newPath: DrawingPath = {
        points: prev.currentPath,
        tool: mode,
      };

      const newCompletedPaths = [...prev.completedPaths, newPath];

      // Call completion callback
      if (onDrawingComplete) {
        onDrawingComplete(newCompletedPaths);
      }

      return {
        isDrawing: false,
        currentPath: [],
        completedPaths: newCompletedPaths,
      };
    });

    lastPointRef.current = null;
  }, [mode, onDrawingComplete]);

  /**
   * Cancel drawing
   */
  const cancelDrawing = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDrawing: false,
      currentPath: [],
    }));
    lastPointRef.current = null;
  }, []);

  /**
   * Clear all paths
   */
  const clearPaths = useCallback(() => {
    setState({
      isDrawing: false,
      currentPath: [],
      completedPaths: [],
    });
    lastPointRef.current = null;
  }, []);

  return {
    isDrawing: state.isDrawing,
    currentPath: state.currentPath,
    completedPaths: state.completedPaths,
    startDrawing,
    addPoint,
    finishDrawing,
    cancelDrawing,
    clearPaths,
  };
};
