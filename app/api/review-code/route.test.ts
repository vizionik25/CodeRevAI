import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Clerk authentication
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Redis rate limiting
vi.mock('@/app/utils/redis', () => ({
  checkRateLimitRedis: vi.fn(),
}));

// Mock security utilities
vi.mock('@/app/utils/security', () => ({
  validateCodeInput: vi.fn(),
  sanitizeInput: vi.fn(),
  sanitizeForAIPrompt: vi.fn(),
  validateCustomPrompt: vi.fn(),
  validateLanguage: vi.fn(),
  validateReviewModes: vi.fn(),
}));

// Mock Gemini AI
vi.mock('@/app/utils/apiClients', () => ({
  getGeminiAI: vi.fn(),
}));

// Mock prompts
vi.mock('@/app/data/prompts', () => ({
  PROMPT_INSTRUCTIONS: {
    'best-practices': 'Focus on best practices for {language}',
    'comprehensive': 'Comprehensive review of {language} code',
  },
}));

// Mock logger
vi.mock('@/app/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock error types
vi.mock('@/app/types/errors', () => ({
  AppError: class AppError extends Error {
    public code: string;
    public details?: string;
    public retryable: boolean;

    constructor(code: string, message: string, details?: string, retryable = false) {
      super(message);
      this.name = 'AppError';
      this.code = code;
      this.details = details;
      this.retryable = retryable;
    }

    toJSON() {
      return {
        code: this.code,
        message: this.message,
        details: this.details,
        retryable: this.retryable,
      };
    }
  },
  createErrorResponse: vi.fn((error: any) => ({
    code: error.code || 'INTERNAL_ERROR',
    message: error.message || 'Internal server error',
    retryable: false,
  })),
}));

// Import the route handler and mocked modules
import { POST } from '@/app/api/review-code/route';
import { auth } from '@clerk/nextjs/server';
import { checkRateLimitRedis } from '@/app/utils/redis';
import { 
  validateCodeInput, 
  sanitizeInput, 
  sanitizeForAIPrompt,
  validateCustomPrompt,
  validateLanguage,
  validateReviewModes 
} from '@/app/utils/security';
import { getGeminiAI } from '@/app/utils/apiClients';
import { logger } from '@/app/utils/logger';
import { createErrorResponse } from '@/app/types/errors';

// Type the mocked functions
const mockAuth = vi.mocked(auth);
const mockRateLimit = vi.mocked(checkRateLimitRedis);
const mockValidateCodeInput = vi.mocked(validateCodeInput);
const mockSanitizeInput = vi.mocked(sanitizeInput);
const mockSanitizeForAIPrompt = vi.mocked(sanitizeForAIPrompt);
const mockValidateCustomPrompt = vi.mocked(validateCustomPrompt);
const mockValidateLanguage = vi.mocked(validateLanguage);
const mockValidateReviewModes = vi.mocked(validateReviewModes);
const mockGetGeminiAI = vi.mocked(getGeminiAI);
const mockLogger = vi.mocked(logger);
const mockCreateErrorResponse = vi.mocked(createErrorResponse);

describe('POST /api/review-code', () => {
  const mockGenerateContent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks for successful scenarios
    mockAuth.mockResolvedValue({ userId: 'user_123' } as any);
    mockRateLimit.mockResolvedValue({ 
      allowed: true, 
      remaining: 10, 
      resetTime: Date.now() + 60000 
    });
    mockValidateCodeInput.mockReturnValue({ valid: true });
    mockSanitizeInput.mockImplementation((input: any) => input);
    mockSanitizeForAIPrompt.mockImplementation((input: any) => input);
    mockValidateCustomPrompt.mockReturnValue({ valid: true });
    mockValidateLanguage.mockReturnValue({ valid: true });
    mockValidateReviewModes.mockReturnValue({ valid: true });
    mockCreateErrorResponse.mockImplementation((error: any) => ({
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Internal server error',
      retryable: false,
    }));

    // Mock Gemini AI instance
    mockGetGeminiAI.mockReturnValue({
      models: {
        generateContent: mockGenerateContent,
      },
    } as any);

    mockGenerateContent.mockResolvedValue({
      text: 'Mock review response',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should reject requests without authentication', async () => {
      mockAuth.mockResolvedValue({ userId: null } as any);

      const request = new NextRequest('http://localhost:3000/api/review-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'test code' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe('Authentication required');
    });

    it('should accept requests with valid authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/review-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: 'const x = 1;',
          language: 'typescript'
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockAuth).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting', () => {
    it('should reject requests when rate limit is exceeded', async () => {
      mockRateLimit.mockResolvedValue({ 
        allowed: false, 
        remaining: 0, 
        resetTime: Date.now() + 60000 
      });

      const request = new NextRequest('http://localhost:3000/api/review-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'test code' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.message).toBe('Rate limit exceeded. Please try again later.');
      expect(mockRateLimit).toHaveBeenCalledWith('review-code:user_123', 20, 60000, true);
    });

    it('should include rate limit headers in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/review-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: 'const x = 1;',
          language: 'typescript'
        }),
      });

      const response = await POST(request);

      expect(response.headers.get('x-ratelimit-remaining')).toBe('10');
      expect(response.headers.get('x-ratelimit-reset')).toBeTruthy();
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid code input', async () => {
      mockValidateCodeInput.mockReturnValue({ 
        valid: false, 
        error: 'Code must be a non-empty string' 
      });

      const request = new NextRequest('http://localhost:3000/api/review-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe('Code must be a non-empty string');
    });

    it('should reject invalid custom prompt', async () => {
      mockValidateCustomPrompt.mockReturnValue({ 
        valid: false, 
        error: 'Custom prompt too long' 
      });

      const request = new NextRequest('http://localhost:3000/api/review-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: 'const x = 1;',
          customPrompt: 'x'.repeat(1001) // Too long
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe('Custom prompt too long');
    });

    it('should sanitize inputs before processing', async () => {
      const request = new NextRequest('http://localhost:3000/api/review-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: 'const x = 1; // test\x00null',
          customPrompt: 'Review this\x00null'
        }),
      });

      await POST(request);

      expect(mockSanitizeInput).toHaveBeenCalledWith('const x = 1; // test\x00null');
      expect(mockSanitizeForAIPrompt).toHaveBeenCalledWith('Review this\x00null');
    });
  });

  describe('AI Processing', () => {
    it('should call Gemini AI with correct prompt', async () => {
      const request = new NextRequest('http://localhost:3000/api/review-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: 'const x = 1;',
          language: 'typescript',
          reviewModes: ['best-practices'],
          customPrompt: 'Focus on performance'
        }),
      });

      await POST(request);

      expect(mockGenerateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        contents: expect.stringContaining('typescript')
      });
    });

    it('should handle AI service errors gracefully', async () => {
      mockGenerateContent.mockRejectedValue(new Error('AI service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/review-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: 'const x = 1;',
          language: 'typescript'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toBe('AI service unavailable');
      expect(mockLogger.error).toHaveBeenCalledWith('Error in code review API', expect.any(Error), expect.any(String));
    });

    it('should return successful review response', async () => {
      const mockReview = 'This code looks good! Consider using const instead of var.';
      mockGenerateContent.mockResolvedValue({
        text: mockReview,
      });

      const request = new NextRequest('http://localhost:3000/api/review-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: 'var x = 1;',
          language: 'javascript'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.feedback).toBe(mockReview);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/review-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toBeTruthy(); // JSON parsing errors get caught by the generic error handler
    });

    it('should handle missing required fields', async () => {
      // Set validation to fail for missing code
      mockValidateCodeInput.mockReturnValue({
        valid: false,
        error: 'Code is required'
      });

      const request = new NextRequest('http://localhost:3000/api/review-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Missing code field
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe('Code is required');
      expect(mockValidateCodeInput).toHaveBeenCalledWith(undefined);
    });

    it('should handle unexpected errors gracefully', async () => {
      mockValidateCodeInput.mockImplementation(() => {
        throw new Error('Unexpected validation error');
      });

      const request = new NextRequest('http://localhost:3000/api/review-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toBe('Unexpected validation error'); // The actual error message is preserved
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});