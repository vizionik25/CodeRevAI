// Security utilities for input validation and sanitization
import { validateGitHubUrl as validateGitHubUrlUtil } from './githubUtils';

// Global sanity limit for any text input (prompts, metadata, etc.)
// This prevents DoS attacks from extremely large text inputs
const GLOBAL_INPUT_SANITY_LIMIT = 50000; // 50KB

// Maximum code length for AI review (can be larger as it's raw code)
// Code files are typically larger than prompts/metadata
const MAX_CODE_LENGTH = 100000; // 100KB

/**
 * Sanitize user input to prevent injection attacks
 * Removes potentially dangerous characters and patterns
 * Escapes markdown characters to prevent AI prompt manipulation
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  let sanitized = input;
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Limit length to prevent DOS (before escaping to preserve original size intent)
  if (sanitized.length > GLOBAL_INPUT_SANITY_LIMIT) {
    sanitized = sanitized.substring(0, GLOBAL_INPUT_SANITY_LIMIT);
  }
  
  return sanitized;
}

/**
 * Sanitize input specifically for AI prompts
 * Escapes markdown characters that could be interpreted as new instructions by the AI
 * Use this for user-provided prompts, feedback, and custom instructions
 */
export function sanitizeForAIPrompt(input: string): string {
  if (!input) return '';
  
  let sanitized = sanitizeInput(input);
  
  // Escape markdown characters that could be misinterpreted as AI instructions
  sanitized = sanitized
    .replace(/`/g, '\\`')      // Escape backticks (code blocks)
    .replace(/\*/g, '\\*')     // Escape asterisks (bold/italic)
    .replace(/_/g, '\\_')      // Escape underscores (italic)
    .replace(/#/g, '\\#')      // Escape hashtags (headings)
    .replace(/\[/g, '\\[')     // Escape brackets (links)
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')     // Escape parentheses (links)
    .replace(/\)/g, '\\)')
    .replace(/</g, '&lt;')     // Basic HTML escaping
    .replace(/>/g, '&gt;');
  
  return sanitized;
}

/**
 * Validate code input
 */
export function validateCodeInput(code: string): { valid: boolean; error?: string } {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Code must be a non-empty string' };
  }
  
  if (code.length > MAX_CODE_LENGTH) {
    return { valid: false, error: `Code exceeds maximum size of ${MAX_CODE_LENGTH / 1000}KB` };
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
    'best_practices', 'test_generation', 'production_ready'
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
 * Uses shared validation utility
 */
export function validateRepoUrl(url: string): { valid: boolean; error?: string } {
  return validateGitHubUrlUtil(url);
}

/**
 * Rate limiting helper
 * NOTE: In-memory rate limiting has been replaced with Redis-based distributed rate limiting.
 * See app/utils/redis.ts for the new implementation using checkRateLimitRedis().
 * This ensures rate limits work correctly across multiple instances/containers in production.
 */
