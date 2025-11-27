/**
 * Client-side rate limiter to prevent API abuse
 * Note: This is NOT a security control, just a UX safeguard
 * Real rate limiting must be done server-side
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if request is allowed under rate limit
   */
  canMakeRequest(): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Remove old requests outside the window
    this.requests = this.requests.filter(time => time > windowStart);

    // Check if under limit
    if (this.requests.length >= this.config.maxRequests) {
      return false;
    }

    // Record this request
    this.requests.push(now);
    return true;
  }

  /**
   * Get time until next request is allowed (in ms)
   */
  getTimeUntilNextRequest(): number {
    if (this.requests.length < this.config.maxRequests) {
      return 0;
    }

    const oldestRequest = this.requests[0];
    const windowStart = Date.now() - this.config.windowMs;
    return Math.max(0, oldestRequest - windowStart);
  }

  /**
   * Get remaining requests in current window
   */
  getRemainingRequests(): number {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    this.requests = this.requests.filter(time => time > windowStart);
    return Math.max(0, this.config.maxRequests - this.requests.length);
  }
}

// Rate limiters for different API operations
export const imageGenerationLimiter = new RateLimiter({
  maxRequests: 10, // 10 images per hour
  windowMs: 60 * 60 * 1000,
});

export const dissectionLimiter = new RateLimiter({
  maxRequests: 20, // 20 dissections per hour
  windowMs: 60 * 60 * 1000,
});

export const uploadRateLimiter = new RateLimiter({
  maxRequests: 10, // 10 uploads per minute
  windowMs: 60 * 1000,
});

/**
 * Track API usage for monitoring
 * Silently fails if localStorage quota is exceeded
 */
export const trackApiUsage = (operation: string, success: boolean) => {
  try {
    const usage = JSON.parse(localStorage.getItem('craftus_api_usage') || '[]');
    usage.push({
      operation,
      success,
      timestamp: Date.now(),
    });

    // Keep only last 50 entries (reduced from 100 to save space)
    const recent = usage.slice(-50);

    try {
      localStorage.setItem('craftus_api_usage', JSON.stringify(recent));
    } catch (quotaError) {
      // If quota exceeded, clear old data and try again with minimal data
      if (quotaError instanceof DOMException && quotaError.name === 'QuotaExceededError') {
        localStorage.removeItem('craftus_api_usage');
        // Store only the most recent 10 entries
        const minimal = recent.slice(-10);
        try {
          localStorage.setItem('craftus_api_usage', JSON.stringify(minimal));
        } catch {
          // If still failing, just skip tracking - not critical
        }
      }
    }
  } catch {
    // Silently fail - tracking is not critical functionality
  }
};
