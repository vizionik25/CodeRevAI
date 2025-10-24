import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock functions must be declared at the top level
const mockAuth = vi.fn();
const mockRateLimit = vi.fn();
const mockValidateCodeInput = vi.fn();
const mockSanitizeInput = vi.fn();
const mockSanitizeForAIPrompt = vi.fn();
const mockValidateCustomPrompt = vi.fn();
const mockValidateLanguage = vi.fn();
const mockValidateReviewModes = vi.fn();
const mockGenerateContent = vi.fn();
const mockLoggerInfo = vi.fn();
const mockLoggerError = vi.fn();
const mockLoggerWarn = vi.fn();

// Mock Clerk authentication
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
}));

// Mock Redis rate limiting
vi.mock('@/app/utils/redis', () => ({
  checkRateLimitRedis: mockRateLimit,
}));

// Mock security utilities
vi.mock('@/app/utils/security', () => ({
  validateCodeInput: mockValidateCodeInput,
  sanitizeInput: mockSanitizeInput,
  sanitizeForAIPrompt: mockSanitizeForAIPrompt,
  validateCustomPrompt: mockValidateCustomPrompt,
  validateLanguage: mockValidateLanguage,
  validateReviewModes: mockValidateReviewModes,
}));

// Mock Gemini AI
vi.mock('@/app/utils/apiClients', () => ({
  getGeminiAI: () => ({
    models: {
      generateContent: mockGenerateContent,
    },
  }),
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
    info: mockLoggerInfo,
    error: mockLoggerError,
    warn: mockLoggerWarn,
  },
}));

// Mock error types
vi.mock('@/app/types/errors', () => ({
  AppError: class AppError extends Error {
    constructor(message: string, public statusCode: number = 500) {
      super(message);
    }
  },
  createErrorResponse: vi.fn((error: any, status: number) => ({
    error: error.message || error,
    status
  })),
}));

// Import the route handler after mocking
import { POST } from '@/app/api/review-code/route';

describe('POST /api/review-code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks for successful scenarios
    mockAuth.mockReturnValue({ userId: 'user_123' });
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
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'Mock review response',
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should reject requests without authentication', async () => {
      mockAuth.mockReturnValue({ userId: null });

      const request = new NextRequest('http://localhost:3000/api/review-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'test code' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
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
      expect(data.error).toBe('Rate limit exceeded');
      expect(mockRateLimit).toHaveBeenCalledWith('review-code:user_123', 20, 60000);
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
      expect(data.error).toBe('Code must be a non-empty string');
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
      expect(data.error).toBe('Custom prompt too long');
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
        contents: [{
          role: 'user',
          parts: [{ text: expect.stringContaining('typescript') }]
        }]
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
      expect(data.error).toBe('AI service unavailable');
      expect(mockLoggerError).toHaveBeenCalledWith('Code review error:', expect.any(Error));
    });

    it('should return successful review response', async () => {
      const mockReview = 'This code looks good! Consider using const instead of var.';
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => mockReview,
        },
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
      expect(data.review).toBe(mockReview);
      expect(data.success).toBe(true);
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

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should handle missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/review-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Missing code field
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
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
      expect(data.error).toBe('Internal server error');
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });
});