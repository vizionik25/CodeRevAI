import { describe, it, expect } from 'vitest';
import {
  sanitizeInput,
  sanitizeForAIPrompt,
  validateCodeInput,
  validateLanguage,
  validateReviewModes
} from '../security';

describe('sanitizeInput', () => {
  it('should remove null bytes from input', () => {
    const input = 'test\0string\0here';
    const result = sanitizeInput(input);
    expect(result).toBe('teststringhere');
    expect(result).not.toContain('\0');
  });

  it('should trim leading and trailing whitespace', () => {
    const input = '   test string   ';
    expect(sanitizeInput(input)).toBe('test string');
  });

  it('should limit string length to 50KB (GLOBAL_INPUT_SANITY_LIMIT)', () => {
    const longString = 'a'.repeat(60000);
    const result = sanitizeInput(longString);
    expect(result.length).toBe(50000);
  });

  it('should return empty string for empty input', () => {
    expect(sanitizeInput('')).toBe('');
  });

  it('should handle input with only whitespace', () => {
    expect(sanitizeInput('   ')).toBe('');
  });

  it('should preserve internal whitespace', () => {
    const input = 'test  multiple   spaces';
    expect(sanitizeInput(input)).toBe('test  multiple   spaces');
  });
});

describe('sanitizeForAIPrompt', () => {
  it('should escape backticks', () => {
    const input = 'use `const` keyword';
    const result = sanitizeForAIPrompt(input);
    expect(result).toBe('use \\`const\\` keyword');
  });

  it('should escape asterisks', () => {
    const input = 'this is *bold* text';
    const result = sanitizeForAIPrompt(input);
    expect(result).toContain('\\*bold\\*');
  });

  it('should escape markdown characters', () => {
    const input = '# Heading\n**bold** _italic_ [link](url)';
    const result = sanitizeForAIPrompt(input);
    expect(result).toContain('\\#');
    expect(result).toContain('\\*\\*');
    expect(result).toContain('\\_');
    expect(result).toContain('\\[');
    expect(result).toContain('\\]');
  });

  it('should escape HTML characters', () => {
    const input = '<script>alert("xss")</script>';
    const result = sanitizeForAIPrompt(input);
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
  });

  it('should sanitize input first (remove null bytes)', () => {
    const input = 'test\0string';
    const result = sanitizeForAIPrompt(input);
    expect(result).not.toContain('\0');
    expect(result).toBe('teststring');
  });

  it('should handle empty input', () => {
    expect(sanitizeForAIPrompt('')).toBe('');
  });
});

describe('validateCodeInput', () => {
  it('should reject empty code', () => {
    const result = validateCodeInput('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('non-empty');
  });

  it('should reject null or undefined code', () => {
    const result1 = validateCodeInput(null as any);
    const result2 = validateCodeInput(undefined as any);
    expect(result1.valid).toBe(false);
    expect(result2.valid).toBe(false);
  });

  it('should reject code exceeding MAX_CODE_LENGTH limit', () => {
    const largeCode = 'x'.repeat(222240801); // Just over the limit
    const result = validateCodeInput(largeCode);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds');
  });

  it('should reject code that is too short', () => {
    const shortCode = 'int x;';
    const result = validateCodeInput(shortCode);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('too short');
  });

  it('should accept valid code', () => {
    const validCode = 'function hello() { return "world"; }';
    const result = validateCodeInput(validCode);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept code at boundary (10 characters)', () => {
    const code = 'a'.repeat(10);
    const result = validateCodeInput(code);
    expect(result.valid).toBe(true);
  });
});

describe('validateLanguage', () => {
  it('should accept valid programming languages', () => {
    expect(validateLanguage('javascript').valid).toBe(true);
    expect(validateLanguage('python').valid).toBe(true);
    expect(validateLanguage('typescript').valid).toBe(true);
    expect(validateLanguage('java').valid).toBe(true);
  });

  it('should reject invalid languages', () => {
    expect(validateLanguage('invalid-lang').valid).toBe(false);
    expect(validateLanguage('foobar').valid).toBe(false);
    expect(validateLanguage('').valid).toBe(false);
  });

  it('should be case-insensitive', () => {
    expect(validateLanguage('JavaScript').valid).toBe(true);
    expect(validateLanguage('PYTHON').valid).toBe(true);
    expect(validateLanguage('TypeScript').valid).toBe(true);
  });

  it('should handle null or undefined input', () => {
    expect(validateLanguage(null as any).valid).toBe(false);
    expect(validateLanguage(undefined as any).valid).toBe(false);
  });

  it('should include error message for invalid language', () => {
    const result = validateLanguage('fake-lang');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unsupported');
  });
});

describe('validateReviewModes', () => {
  it('should accept valid review modes', () => {
    const validModes = ['comprehensive', 'security', 'performance'];
    expect(validateReviewModes(validModes).valid).toBe(true);
  });

  it('should accept empty array', () => {
    expect(validateReviewModes([]).valid).toBe(true);
  });

  it('should reject array with invalid modes', () => {
    const invalidModes = ['comprehensive', 'invalid-mode'];
    expect(validateReviewModes(invalidModes).valid).toBe(false);
  });

  it('should reject non-array input', () => {
    expect(validateReviewModes('security' as any).valid).toBe(false);
    expect(validateReviewModes(null as any).valid).toBe(false);
    expect(validateReviewModes(undefined as any).valid).toBe(false);
  });

  it('should accept single valid mode', () => {
    expect(validateReviewModes(['comprehensive']).valid).toBe(true);
  });

  it('should reject if any mode is invalid', () => {
    const modes = ['security', 'performance', 'fake-mode'];
    expect(validateReviewModes(modes).valid).toBe(false);
  });

  it('should reject more than 5 modes', () => {
    const tooManyModes = [
      'comprehensive',
      'bug_fixes',
      'performance',
      'security',
      'best_practices',
      'test_generation'
    ];
    expect(validateReviewModes(tooManyModes).valid).toBe(false);
    expect(validateReviewModes(tooManyModes).error).toContain('Too many');
  });

  it('should include error message for invalid mode', () => {
    const result = validateReviewModes(['invalid']);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid review mode');
  });
});
