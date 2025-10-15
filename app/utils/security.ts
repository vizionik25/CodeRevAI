// Security utilities for input validation and sanitization

/**
 * Sanitize user input to prevent injection attacks
 * Removes potentially dangerous characters and patterns
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');
  
  // Limit length to prevent DOS
  const MAX_LENGTH = 50000; // 50KB max
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
  }
  
  return sanitized.trim();
}

/**
 * Validate code input
 */
export function validateCodeInput(code: string): { valid: boolean; error?: string } {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Code must be a non-empty string' };
  }
  
  if (code.length > 100000) { // 100KB max for single file
    return { valid: false, error: 'Code exceeds maximum size of 100KB' };
  }
  
  if (code.length < 10) {
    return { valid: false, error: 'Code is too short to analyze' };
  }
  
  return { valid: true };
}

/**
 * Validate custom prompt
 */
export function validateCustomPrompt(prompt: string): { valid: boolean; error?: string } {
  if (!prompt) {
    return { valid: true }; // Empty prompt is okay
  }
  
  if (typeof prompt !== 'string') {
    return { valid: false, error: 'Prompt must be a string' };
  }
  
  if (prompt.length > 5000) { // 5KB max for prompts
    return { valid: false, error: 'Custom prompt exceeds maximum size of 5KB' };
  }
  
  return { valid: true };
}

/**
 * Validate language parameter
 */
export function validateLanguage(language: string): { valid: boolean; error?: string } {
  if (!language || typeof language !== 'string') {
    return { valid: false, error: 'Language must be specified' };
  }
  
  // Whitelist common programming languages
  const validLanguages = [
    'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
    'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'dart', 'scala',
    'r', 'sql', 'html', 'css', 'jsx', 'tsx', 'json', 'yaml', 'xml',
    'shell', 'bash', 'powershell', 'markdown', 'text'
  ];
  
  if (!validLanguages.includes(language.toLowerCase())) {
    return { valid: false, error: 'Unsupported programming language' };
  }
  
  return { valid: true };
}

/**
 * Validate review modes
 */
export function validateReviewModes(modes: any): { valid: boolean; error?: string } {
  if (!Array.isArray(modes)) {
    return { valid: false, error: 'Review modes must be an array' };
  }
  
  const validModes = [
    'comprehensive', 'bug_fixes', 'performance', 'security',
    'style', 'test_generation', 'production_ready'
  ];
  
  for (const mode of modes) {
    if (typeof mode !== 'string' || !validModes.includes(mode)) {
      return { valid: false, error: `Invalid review mode: ${mode}` };
    }
  }
  
  if (modes.length > 5) {
    return { valid: false, error: 'Too many review modes selected (max 5)' };
  }
  
  return { valid: true };
}

/**
 * Check if a file path is sensitive and should be excluded from AI review
 */
export function isSensitiveFile(filePath: string): boolean {
  const sensitivePatterns = [
    // Environment files
    /\.env/i,
    /\.env\./i,
    /\.env\.local/i,
    /\.env\.production/i,
    /\.env\.development/i,
    
    // Key files
    /\.key$/i,
    /\.pem$/i,
    /\.pfx$/i,
    /\.p12$/i,
    /\.asc$/i,
    /\.gpg$/i,
    
    // Secret/credential files
    /secret/i,
    /credential/i,
    /password/i,
    /api[_-]?key/i,
    /auth[_-]?token/i,
    /private[_-]?key/i,
    
    // Config files that often contain secrets
    /\.npmrc$/i,
    /\.pypirc$/i,
    /\.aws\/credentials/i,
    /\.ssh\//i,
    /\.gnupg\//i,
    
    // Database files
    /\.db$/i,
    /\.sqlite$/i,
    /\.sqlite3$/i,
    
    // Specific files
    /^\.git\//i,
    /^node_modules\//i,
    /^\.next\//i,
    /^dist\//i,
    /^build\//i,
    /^vendor\//i,
    /^target\//i,
  ];
  
  return sensitivePatterns.some(pattern => pattern.test(filePath));
}

/**
 * Filter out sensitive files from a file list
 */
export function filterSensitiveFiles(files: Array<{ path: string; content?: string }>): Array<{ path: string; content?: string }> {
  return files.filter(file => !isSensitiveFile(file.path));
}

/**
 * Validate file size
 */
export function validateFileSize(content: string, maxSize: number = 200000): { valid: boolean; error?: string } {
  if (content.length > maxSize) {
    return { valid: false, error: `File size exceeds maximum of ${maxSize} bytes` };
  }
  return { valid: true };
}

/**
 * Validate repository URL
 */
export function validateRepoUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'Repository URL must be provided' };
  }
  
  try {
    const urlObj = new URL(url);
    
    // Only allow GitHub URLs
    if (urlObj.hostname !== 'github.com') {
      return { valid: false, error: 'Only GitHub repositories are supported' };
    }
    
    // Check for valid path structure
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length < 2) {
      return { valid: false, error: 'Invalid GitHub repository URL format' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Rate limiting helper - simple in-memory store
 * For production, use Redis or a proper rate limiting service
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  if (!record || now > record.resetTime) {
    // New window
    const resetTime = now + windowMs;
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: limit - 1, resetTime };
  }
  
  if (record.count >= limit) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }
  
  // Increment count
  record.count++;
  rateLimitStore.set(identifier, record);
  return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime };
}

// Clean up old rate limit records periodically
if (typeof window === 'undefined') { // Only run on server
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000); // Clean up every minute
}
