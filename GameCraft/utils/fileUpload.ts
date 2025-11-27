/**
 * File upload utilities with validation and security checks
 */

import { uploadRateLimiter } from './rateLimiter';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const BLOCKED_IMAGE_TYPES = ['image/svg+xml']; // SVG can contain JavaScript - XSS risk
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (safer for data URLs)
const MAX_DATA_URL_SIZE = 7 * 1024 * 1024; // ~7MB base64 encoded
const MAX_IMAGE_DIMENSION = 4096; // 4K resolution max
const RESERVED_FILENAMES = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 
                            'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 
                            'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate file type by checking magic numbers (file signatures)
 * Prevents file extension spoofing attacks
 */
const validateFileMagicNumber = async (file: File): Promise<FileValidationResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const arr = new Uint8Array(e.target?.result as ArrayBuffer).subarray(0, 4);
      let header = '';
      for (let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16).padStart(2, '0');
      }
      
      // Check magic numbers for allowed image types
      const validHeaders: Record<string, string[]> = {
        'image/jpeg': ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffe3', 'ffd8ffe8'],
        'image/png': ['89504e47'],
        'image/gif': ['47494638'],
        'image/webp': ['52494646'], // RIFF header
      };
      
      const isValid = Object.values(validHeaders).some(headers => 
        headers.some(h => header.startsWith(h))
      );
      
      if (!isValid) {
        resolve({
          valid: false,
          error: 'Invalid file format. File content does not match allowed image types.',
        });
      } else {
        resolve({ valid: true });
      }
    };
    
    reader.onerror = () => {
      resolve({
        valid: false,
        error: 'Failed to read file for validation',
      });
    };
    
    reader.readAsArrayBuffer(file.slice(0, 4));
  });
};

/**
 * Validate image dimensions to prevent memory exhaustion
 */
const validateImageDimensions = async (file: File): Promise<FileValidationResult> => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      if (img.width > MAX_IMAGE_DIMENSION || img.height > MAX_IMAGE_DIMENSION) {
        resolve({
          valid: false,
          error: `Image dimensions exceed maximum allowed size of ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}px`,
        });
      } else {
        resolve({ valid: true });
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        valid: false,
        error: 'Failed to load image for dimension validation',
      });
    };
    
    img.src = url;
  });
};

/**
 * Validate file type (browser-provided MIME type)
 */
export const validateFileType = (file: File): FileValidationResult => {
  // Explicitly block dangerous types
  if (BLOCKED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'SVG files are not allowed for security reasons.',
    };
  }
  
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: JPG, PNG, GIF, WebP`,
    };
  }
  return { valid: true };
};

/**
 * Validate file size
 */
export const validateFileSize = (file: File): FileValidationResult => {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    };
  }
  return { valid: true };
};

/**
 * Sanitize file name to prevent path traversal and other attacks
 */
export const sanitizeFileName = (fileName: string): string => {
  // Remove path separators
  let sanitized = fileName.replace(/[/\\]/g, '');
  
  // Replace invalid characters with single underscore
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]+/g, '_');
  
  // Remove leading/trailing dots and underscores (hidden files, etc.)
  sanitized = sanitized.replace(/^[._]+|[._]+$/g, '');
  
  // Ensure filename is not empty
  if (!sanitized) {
    sanitized = 'unnamed';
  }
  
  // Check for reserved filenames (Windows)
  const nameWithoutExt = sanitized.split('.')[0].toUpperCase();
  if (RESERVED_FILENAMES.includes(nameWithoutExt)) {
    sanitized = `file_${sanitized}`;
  }
  
  // Limit length (leave room for extension)
  const maxLength = 200;
  if (sanitized.length > maxLength) {
    const ext = sanitized.split('.').pop();
    const nameOnly = sanitized.substring(0, sanitized.lastIndexOf('.'));
    sanitized = nameOnly.substring(0, maxLength - (ext?.length || 0) - 1) + '.' + ext;
  }
  
  return sanitized;
};

/**
 * Validate uploaded file with comprehensive security checks
 */
export const validateFile = async (file: File): Promise<FileValidationResult> => {
  // Check file type (browser-provided)
  const typeValidation = validateFileType(file);
  if (!typeValidation.valid) {
    return typeValidation;
  }

  // Check file size
  const sizeValidation = validateFileSize(file);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }

  // Check magic numbers (file content signature)
  const magicNumberValidation = await validateFileMagicNumber(file);
  if (!magicNumberValidation.valid) {
    return magicNumberValidation;
  }

  // Check image dimensions
  const dimensionValidation = await validateImageDimensions(file);
  if (!dimensionValidation.valid) {
    return dimensionValidation;
  }

  return { valid: true };
};

/**
 * Convert file or blob to data URL
 */
export const fileToDataURL = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Compress image to reduce file size
 */
const compressImage = async (file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }
    
    img.onload = () => {
      // Calculate new dimensions
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        file.type,
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    
    const url = URL.createObjectURL(file);
    img.src = url;
    
    // Clean up object URL after image loads
    img.onload = () => {
      URL.revokeObjectURL(url);
      img.onload(null as any);
    };
  });
};

/**
 * Handle file upload with comprehensive validation and security checks
 */
export const handleFileUpload = async (file: File): Promise<{ dataUrl: string; fileName: string }> => {
  // Check rate limit
  if (!uploadRateLimiter.canMakeRequest()) {
    const waitTime = uploadRateLimiter.getTimeUntilNextRequest();
    const waitSeconds = Math.ceil(waitTime / 1000);
    throw new Error(`Too many uploads. Please wait ${waitSeconds} seconds before uploading again.`);
  }

  // Validate file (now async with magic number and dimension checks)
  const validation = await validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Sanitize file name
  const sanitizedFileName = sanitizeFileName(file.name);

  // Compress image if needed
  let fileToConvert: File | Blob = file;
  if (file.size > 2 * 1024 * 1024) { // Compress files larger than 2MB
    try {
      fileToConvert = await compressImage(file);
    } catch (error) {
      console.warn('Image compression failed, using original:', error);
      // Continue with original file if compression fails
    }
  }

  // Convert to data URL
  const dataUrl = await fileToDataURL(fileToConvert);
  
  // Check data URL size (base64 encoding increases size by ~33%)
  if (dataUrl.length > MAX_DATA_URL_SIZE) {
    throw new Error('Image is too large after encoding. Please use a smaller image.');
  }

  return {
    dataUrl,
    fileName: sanitizedFileName,
  };
};
