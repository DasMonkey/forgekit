/**
 * Unit tests for error handler utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sanitizeError,
  logError,
  CraftusError,
  ErrorCode,
  logSecurityEvent,
  SecurityEventType,
} from '../errorHandler';

describe('errorHandler utilities', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear console mocks
    vi.clearAllMocks();
  });

  describe('sanitizeError', () => {
    it('should sanitize API key errors', () => {
      const error = new Error('Invalid API key: AIzaSyCXUmKcBLVPQsxj9Yt_Q5dBY34JxhaS4OM');
      const result = sanitizeError(error);
      expect(result).toBe('Authentication error. Please check your configuration.');
      expect(result).not.toContain('AIza');
    });

    it('should sanitize rate limit errors with wait time', () => {
      const error = new Error('Rate limit exceeded. Please wait 30 seconds.');
      const result = sanitizeError(error);
      expect(result).toBe('Rate limit exceeded. Please wait 30 seconds.');
    });

    it('should sanitize network errors', () => {
      const error = new Error('Network connection failed at http://localhost:3000/api');
      const result = sanitizeError(error);
      expect(result).toBe('Connection error. Please check your internet connection.');
      expect(result).not.toContain('localhost');
    });

    it('should sanitize file path information', () => {
      const error = new Error('File validation failed at /src/utils/fileUpload.ts line 42');
      const result = sanitizeError(error);
      expect(result).not.toContain('/src/utils');
      expect(result).not.toContain('line 42');
    });

    it('should sanitize stack trace information', () => {
      const error = new Error('TypeError at validateInput (validation.ts:123:45)');
      const result = sanitizeError(error);
      expect(result).not.toContain('validation.ts');
      expect(result).not.toContain(':123:45');
    });

    it('should handle validation errors safely', () => {
      const error = new Error('Invalid file type: image/svg+xml');
      const result = sanitizeError(error);
      expect(result).toContain('Invalid');
      expect(result).not.toContain('svg+xml'); // Should be sanitized
    });

    it('should return generic message for unknown errors in production', () => {
      // Mock production environment
      vi.stubEnv('PROD', true);
      vi.stubEnv('DEV', false);
      
      const error = new Error('Some internal error with sensitive data');
      const result = sanitizeError(error);
      expect(result).toBe('An error occurred. Please try again.');
    });

    it('should handle non-Error objects', () => {
      const result = sanitizeError('Some string error');
      expect(result).toBe('An error occurred. Please try again.');
    });

    it('should handle null/undefined', () => {
      expect(sanitizeError(null)).toBe('An error occurred. Please try again.');
      expect(sanitizeError(undefined)).toBe('An error occurred. Please try again.');
    });
  });

  describe('CraftusError', () => {
    it('should create error with code and context', () => {
      const error = new CraftusError(
        'Rate limit exceeded',
        ErrorCode.RATE_LIMIT_EXCEEDED,
        { requestCount: 10 }
      );
      
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
      expect(error.context).toEqual({ requestCount: 10 });
      expect(error.name).toBe('CraftusError');
    });
  });

  describe('logError', () => {
    it('should log error with context', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const error = new Error('Test error');
      const errorId = logError('test-context', error, { userId: '123' });
      
      expect(errorId).toMatch(/^ERR-\d+-[a-z0-9]+$/);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should store errors in localStorage in production', () => {
      vi.stubEnv('PROD', true);
      vi.stubEnv('DEV', false);
      
      const error = new Error('Production error');
      logError('prod-context', error);
      
      const stored = localStorage.getItem('craftus_error_log');
      expect(stored).toBeTruthy();
      
      const errors = JSON.parse(stored!);
      expect(errors).toHaveLength(1);
      expect(errors[0].context).toBe('prod-context');
    });

    it('should limit stored errors to 50', () => {
      vi.stubEnv('PROD', true);
      
      // Log 60 errors
      for (let i = 0; i < 60; i++) {
        logError('test', new Error(`Error ${i}`));
      }
      
      const stored = localStorage.getItem('craftus_error_log');
      const errors = JSON.parse(stored!);
      expect(errors).toHaveLength(50);
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security event with details', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const eventId = logSecurityEvent(SecurityEventType.FILE_UPLOAD_REJECTED, {
        fileName: 'malicious.svg',
        fileType: 'image/svg+xml',
      });
      
      expect(eventId).toMatch(/^SEC-\d+-[a-z0-9]+$/);
      expect(consoleWarnSpy).toHaveBeenCalled();
      
      consoleWarnSpy.mockRestore();
    });

    it('should store security events in localStorage', () => {
      logSecurityEvent(SecurityEventType.SUSPICIOUS_PATTERN_DETECTED, {
        pattern: 'script_tag',
      });
      
      const stored = localStorage.getItem('craftus_security_log');
      expect(stored).toBeTruthy();
      
      const events = JSON.parse(stored!);
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe(SecurityEventType.SUSPICIOUS_PATTERN_DETECTED);
    });

    it('should limit stored security events to 100', () => {
      // Log 120 events
      for (let i = 0; i < 120; i++) {
        logSecurityEvent(SecurityEventType.RATE_LIMIT_HIT, { attempt: i });
      }
      
      const stored = localStorage.getItem('craftus_security_log');
      const events = JSON.parse(stored!);
      expect(events).toHaveLength(100);
    });
  });
});
