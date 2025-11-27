/**
 * Input validation utilities for Craftus
 * Prevents XSS, injection attacks, and malformed data
 */

export const validatePrompt = (prompt: string): { valid: boolean; error?: string } => {
  // Length check - just ensure it's not empty
  if (prompt.trim().length === 0) {
    return { valid: false, error: 'Prompt cannot be empty' };
  }

  if (prompt.length > 500) {
    return { valid: false, error: 'Prompt must be less than 500 characters' };
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /data:text\/html/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(prompt)) {
      return { valid: false, error: 'Invalid characters detected' };
    }
  }
  
  return { valid: true };
};

export const validateProjectData = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;
  
  // Required fields
  if (!data.id || typeof data.id !== 'string') return false;
  if (!data.name || typeof data.name !== 'string') return false;
  if (!data.category || typeof data.category !== 'string') return false;
  if (!data.prompt || typeof data.prompt !== 'string') return false;
  
  // Length limits
  if (data.id.length > 100) return false;
  if (data.name.length > 200) return false;
  if (data.prompt.length > 1000) return false;
  
  // Valid category
  const validCategories = [
    'Papercraft', 'Clay', 'Fabric/Sewing', 'Costume & Props',
    'Woodcraft', 'Jewelry', 'Kids Crafts', 'Tabletop Figures'
  ];
  if (!validCategories.includes(data.category)) return false;
  
  return true;
};

/**
 * Validates email format
 */
export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Basic email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // Length check
  if (email.length > 254) {
    return false;
  }

  return emailRegex.test(email);
};

/**
 * Validates password strength
 * Requirements: At least 8 characters, contains letter and number
 */
export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password must be less than 128 characters' };
  }

  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one letter' };
  }

  // Must contain at least one number
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  return { valid: true };
};
