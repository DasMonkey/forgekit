import { describe, it, expect } from 'vitest';
import { getToolCursor, getToolCursorStyle, applyToolCursor } from '../toolCursors';

describe('toolCursors', () => {
  describe('getToolCursor', () => {
    it('should return cursor-default for select tool', () => {
      expect(getToolCursor('select')).toBe('cursor-default');
    });

    it('should return cursor-crosshair for shapes tool', () => {
      expect(getToolCursor('shapes')).toBe('cursor-crosshair');
    });

    it('should return cursor-crosshair for text tool', () => {
      expect(getToolCursor('text')).toBe('cursor-crosshair');
    });

    it('should return cursor-crosshair for pencil tool', () => {
      expect(getToolCursor('pencil')).toBe('cursor-crosshair');
    });

    it('should return cursor-default for upload tool', () => {
      expect(getToolCursor('upload')).toBe('cursor-default');
    });
  });

  describe('getToolCursorStyle', () => {
    it('should return default for select tool', () => {
      expect(getToolCursorStyle('select')).toBe('default');
    });

    it('should return crosshair for shapes tool', () => {
      expect(getToolCursorStyle('shapes')).toBe('crosshair');
    });

    it('should return crosshair for text tool', () => {
      expect(getToolCursorStyle('text')).toBe('crosshair');
    });

    it('should return crosshair for pencil tool', () => {
      expect(getToolCursorStyle('pencil')).toBe('crosshair');
    });

    it('should return default for upload tool', () => {
      expect(getToolCursorStyle('upload')).toBe('default');
    });
  });

  describe('applyToolCursor', () => {
    it('should apply cursor-default class for select tool', () => {
      const element = document.createElement('div');
      applyToolCursor(element, 'select');
      expect(element.classList.contains('cursor-default')).toBe(true);
    });

    it('should apply cursor-crosshair class for text tool', () => {
      const element = document.createElement('div');
      applyToolCursor(element, 'text');
      expect(element.classList.contains('cursor-crosshair')).toBe(true);
    });

    it('should remove previous cursor classes when applying new one', () => {
      const element = document.createElement('div');
      element.classList.add('cursor-pointer');
      applyToolCursor(element, 'select');
      expect(element.classList.contains('cursor-pointer')).toBe(false);
      expect(element.classList.contains('cursor-default')).toBe(true);
    });

    it('should handle null element gracefully', () => {
      expect(() => applyToolCursor(null, 'select')).not.toThrow();
    });
  });
});
