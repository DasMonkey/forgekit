/**
 * Secure configuration management
 */

interface AppConfig {
  apiKey: string;
  environment: 'development' | 'production' | 'test';
  apiBaseUrl: string;
  maxProjectSize: number;
  maxProjects: number;
}

/**
 * Load and validate configuration
 */
export const getConfig = (): AppConfig => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY || '';
  
  // Validate API key format (basic check)
  if (!apiKey || apiKey.length < 20) {
    console.error('Invalid or missing API key');
  }
  
  // Warn if using default/example keys
  if (apiKey.includes('your_api_key') || apiKey.includes('example')) {
    console.error('Using example API key - please configure a real key');
  }

  return {
    apiKey,
    environment: import.meta.env.MODE as any || 'development',
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'https://generativelanguage.googleapis.com',
    maxProjectSize: 5 * 1024 * 1024, // 5MB
    maxProjects: 100,
  };
};

/**
 * Check if running in production
 */
export const isProduction = (): boolean => {
  return getConfig().environment === 'production';
};

/**
 * Check if running in development
 */
export const isDevelopment = (): boolean => {
  return getConfig().environment === 'development';
};
