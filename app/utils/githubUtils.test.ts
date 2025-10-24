import { describe, it, expect } from 'vitest';
import { parseGitHubUrl, validateGitHubUrl, GITHUB_API_BASE } from '@/app/utils/githubUtils';
import type { GitHubRepoInfo } from '@/app/utils/githubUtils';

describe('GitHub Utilities', () => {
  describe('parseGitHubUrl', () => {
    it('should parse valid GitHub URLs correctly', () => {
      const testCases = [
        {
          url: 'https://github.com/facebook/react',
          expected: { owner: 'facebook', repo: 'react' }
        },
        {
          url: 'https://github.com/microsoft/vscode',
          expected: { owner: 'microsoft', repo: 'vscode' }
        },
        {
          url: 'https://github.com/vercel/next.js',
          expected: { owner: 'vercel', repo: 'next.js' }
        },
        {
          url: 'https://github.com/user-name/repo_name',
          expected: { owner: 'user-name', repo: 'repo_name' }
        }
      ];

      testCases.forEach(({ url, expected }) => {
        const result = parseGitHubUrl(url);
        expect(result).toEqual(expected);
      });
    });

    it('should handle URLs with additional path segments', () => {
      const url = 'https://github.com/facebook/react/tree/main/packages';
      const result = parseGitHubUrl(url);
      expect(result).toEqual({ owner: 'facebook', repo: 'react' });
    });

    it('should handle URLs with query parameters', () => {
      const url = 'https://github.com/facebook/react?tab=readme-ov-file';
      const result = parseGitHubUrl(url);
      expect(result).toEqual({ owner: 'facebook', repo: 'react' });
    });

    it('should handle URLs with fragments', () => {
      const url = 'https://github.com/facebook/react#installation';
      const result = parseGitHubUrl(url);
      expect(result).toEqual({ owner: 'facebook', repo: 'react' });
    });

    it('should return null for non-GitHub URLs', () => {
      const testCases = [
        'https://gitlab.com/user/repo',
        'https://bitbucket.org/user/repo',
        'https://example.com/user/repo',
        'https://github.io/user/repo'
      ];

      testCases.forEach(url => {
        const result = parseGitHubUrl(url);
        expect(result).toBeNull();
      });
    });

    it('should return null for invalid GitHub URLs', () => {
      const testCases = [
        'https://github.com', // No path
        'https://github.com/', // Empty path
        'https://github.com/user', // Only owner, no repo
        'https://github.com/user/', // Only owner with trailing slash
      ];

      testCases.forEach(url => {
        const result = parseGitHubUrl(url);
        expect(result).toBeNull();
      });
    });

    it('should return null for malformed URLs', () => {
      const testCases = [
        'not-a-url',
        'github.com/user/repo', // Missing protocol
        'https://github', // Incomplete
        '', // Empty string
        'https://', // Incomplete protocol
      ];

      testCases.forEach(url => {
        const result = parseGitHubUrl(url);
        expect(result).toBeNull();
      });
    });

    it('should parse URLs with wrong protocols that have correct hostname', () => {
      const testCases = [
        'ftp://github.com/user/repo', // Wrong protocol
        'http://github.com/user/repo', // Insecure protocol
        'ssh://github.com/user/repo', // SSH protocol
      ];

      testCases.forEach(url => {
        const result = parseGitHubUrl(url);
        // These URLs parse successfully because they have valid URL format and github.com hostname
        expect(result).toEqual({ owner: 'user', repo: 'repo' });
      });
    });

    it('should handle special characters in owner and repo names', () => {
      const testCases = [
        {
          url: 'https://github.com/user-123/repo.name',
          expected: { owner: 'user-123', repo: 'repo.name' }
        },
        {
          url: 'https://github.com/user_name/repo-name',
          expected: { owner: 'user_name', repo: 'repo-name' }
        },
        {
          url: 'https://github.com/123user/repo123',
          expected: { owner: '123user', repo: 'repo123' }
        }
      ];

      testCases.forEach(({ url, expected }) => {
        const result = parseGitHubUrl(url);
        expect(result).toEqual(expected);
      });
    });
  });

  describe('validateGitHubUrl', () => {
    it('should validate correct GitHub URLs', () => {
      const validUrls = [
        'https://github.com/facebook/react',
        'https://github.com/microsoft/vscode',
        'https://github.com/user/repo',
        'https://github.com/user-name/repo_name',
        'https://github.com/123user/repo.name',
        'https://github.com/user/repo/tree/main',
        'https://github.com/user/repo?tab=readme'
      ];

      validUrls.forEach(url => {
        const result = validateGitHubUrl(url);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject non-GitHub URLs', () => {
      const invalidUrls = [
        'https://gitlab.com/user/repo',
        'https://bitbucket.org/user/repo',
        'https://example.com/user/repo'
      ];

      invalidUrls.forEach(url => {
        const result = validateGitHubUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Only GitHub repositories are supported');
      });
    });

    it('should reject invalid GitHub URL formats', () => {
      const testCases = [
        {
          url: 'https://github.com',
          expectedError: 'Invalid GitHub repository URL format'
        },
        {
          url: 'https://github.com/',
          expectedError: 'Invalid GitHub repository URL format'
        },
        {
          url: 'https://github.com/user',
          expectedError: 'Invalid GitHub repository URL format'
        },
        {
          url: 'https://github.com/user/',
          expectedError: 'Invalid GitHub repository URL format'
        }
      ];

      testCases.forEach(({ url, expectedError }) => {
        const result = validateGitHubUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toBe(expectedError);
      });
    });

    it('should reject malformed URLs', () => {
      const malformedUrls = [
        'not-a-url',
        'github.com/user/repo'
      ];

      malformedUrls.forEach(url => {
        const result = validateGitHubUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid URL format');
      });
    });

    it('should reject URLs with wrong hostname', () => {
      const wrongHostnameUrls = [
        'https://github', // hostname: 'github' not 'github.com'
        'https://gitlab.com/user/repo',
        'https://bitbucket.org/user/repo'
      ];

      wrongHostnameUrls.forEach(url => {
        const result = validateGitHubUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Only GitHub repositories are supported');
      });
    });

    it('should accept URLs with any protocol if hostname and path are correct', () => {
      const differentProtocolUrls = [
        'ftp://github.com/user/repo',
        'http://github.com/user/repo',
        'ssh://github.com/user/repo'
      ];

      differentProtocolUrls.forEach(url => {
        const result = validateGitHubUrl(url);
        // Current implementation only checks hostname and path, not protocol
        expect(result.valid).toBe(true);
      });
    });

    it('should handle null, undefined, and non-string inputs', () => {
      const invalidInputs = [null, undefined, 123, {}, [], true, false];

      invalidInputs.forEach(input => {
        const result = validateGitHubUrl(input);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Repository URL must be provided');
      });
    });

    it('should handle empty string', () => {
      const result = validateGitHubUrl('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Repository URL must be provided');
    });

    it('should handle whitespace-only strings', () => {
      const whitespaceUrls = ['   ', '\t', '\n', '  \t\n  '];

      whitespaceUrls.forEach(url => {
        const result = validateGitHubUrl(url);
        expect(result.valid).toBe(false);
        // These will fail URL parsing, so should get "Invalid URL format"
        expect(result.error).toBe('Invalid URL format');
      });
    });
  });

  describe('GITHUB_API_BASE constant', () => {
    it('should have the correct GitHub API base URL', () => {
      expect(GITHUB_API_BASE).toBe('https://api.github.com');
    });

    it('should be a string', () => {
      expect(typeof GITHUB_API_BASE).toBe('string');
    });

    it('should be a valid URL', () => {
      expect(() => new URL(GITHUB_API_BASE)).not.toThrow();
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle URLs with encoded characters', () => {
      const url = 'https://github.com/user%20name/repo%20name';
      const parseResult = parseGitHubUrl(url);
      const validateResult = validateGitHubUrl(url);

      // URL constructor should handle encoding
      expect(parseResult).toEqual({ owner: 'user%20name', repo: 'repo%20name' });
      expect(validateResult.valid).toBe(true);
    });

    it('should handle very long URLs', () => {
      const longRepo = 'a'.repeat(100);
      const url = `https://github.com/user/${longRepo}`;
      
      const parseResult = parseGitHubUrl(url);
      const validateResult = validateGitHubUrl(url);

      expect(parseResult).toEqual({ owner: 'user', repo: longRepo });
      expect(validateResult.valid).toBe(true);
    });

    it('should handle URLs with port numbers', () => {
      // This shouldn't be valid for github.com, but test the behavior
      const url = 'https://github.com:443/user/repo';
      
      const parseResult = parseGitHubUrl(url);
      const validateResult = validateGitHubUrl(url);

      expect(parseResult).toEqual({ owner: 'user', repo: 'repo' });
      expect(validateResult.valid).toBe(true);
    });

    it('should maintain consistency between parse and validate functions', () => {
      const testUrls = [
        'https://github.com/user/repo',
        'https://github.com/user',
        'https://github.com',
        'https://gitlab.com/user/repo',
        'not-a-url'
      ];

      testUrls.forEach(url => {
        const parseResult = parseGitHubUrl(url);
        const validateResult = validateGitHubUrl(url);

        if (parseResult !== null) {
          // If parse succeeds, validate should also succeed (for GitHub URLs)
          expect(validateResult.valid).toBe(true);
        }
        // Note: validate might fail for reasons parse doesn't check (non-GitHub domains)
      });
    });
  });
});