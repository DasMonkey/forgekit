/**
 * Security utility functions for Craftus
 */

/**
 * Validates that a URL is a safe data URI or HTTPS URL
 * Prevents javascript:, data:text/html, and other XSS vectors
 */
export const sanitizeImageUrl = (url: string): string | null => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Allow base64 data URIs for images only
  if (url.startsWith('data:image/')) {
    // Validate it's actually an image MIME type
    const validImageTypes = ['data:image/png', 'data:image/jpeg', 'data:image/jpg', 'data:image/webp', 'data:image/gif'];
    if (validImageTypes.some(type => url.startsWith(type))) {
      return url;
    }
    return null;
  }

  // Allow HTTPS URLs only (no HTTP, javascript:, file:, etc.)
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') {
      return url;
    }
  } catch {
    // Invalid URL
  }

  return null;
};

/**
 * Sanitizes user input to prevent XSS in text content
 */
export const sanitizeText = (text: string, maxLength: number = 1000): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Truncate to prevent DoS
  const truncated = text.slice(0, maxLength);
  
  // Remove any HTML tags and dangerous characters
  return truncated
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Validates project data structure
 */
export const validateProjectData = (project: any): boolean => {
  if (!project || typeof project !== 'object') {
    return false;
  }

  // Required fields
  if (!project.id || typeof project.id !== 'string') return false;
  if (!project.name || typeof project.name !== 'string') return false;
  if (!project.category || typeof project.category !== 'string') return false;
  if (!project.prompt || typeof project.prompt !== 'string') return false;

  // Validate dates
  try {
    new Date(project.createdAt);
    new Date(project.lastModified);
  } catch {
    return false;
  }

  return true;
};

/**
 * Content Security Policy nonce generator
 */
export const generateNonce = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};
