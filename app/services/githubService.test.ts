/**
 * Tests for GitHub Service
 * Tests repository file fetching, API integration, and error handling
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { fetchRepoFiles, fetchFileContent, fetchFilesWithContent } from './githubService';
import { GITHUB_API_BASE } from '@/app/utils/githubUtils';
import { logger } from '@/app/utils/logger';

// Mock the logger to avoid console output during tests
vi.mock('@/app/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('GitHub Service', () => {
  const mockRepoResponse = {
    default_branch: 'main'
  };

  const mockTreeResponse = {
      tree: [
        { path: 'src/index.ts', type: 'blob', sha: 'abc123' },
        { path: 'src/utils.js', type: 'blob', sha: 'def456' },
        { path: 'README.md', type: 'blob', sha: 'ghi789' },
        { path: 'package.json', type: 'blob', sha: 'jkl012' },
        { path: 'dist/', type: 'tree', sha: 'mno345' }, // Should be filtered out
        { path: 'src/binary.png', type: 'blob', sha: 'pqr678' }, // No language match
      ],
      truncated: false
    };

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as Mock).mockClear();
  });

  describe('fetchRepoFiles', () => {
    it('should fetch repository files successfully', async () => {
      (fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockRepoResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockTreeResponse),
        });

      const result = await fetchRepoFiles('owner', 'repo');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(1, `${GITHUB_API_BASE}/repos/owner/repo`);
      expect(fetch).toHaveBeenNthCalledWith(2, `${GITHUB_API_BASE}/repos/owner/repo/git/trees/main?recursive=1`);
      
      expect(result).toHaveLength(2); // Only files with recognized languages (TS and JS)
      expect(result.map(f => f.path)).toEqual([
        'src/index.ts',
        'src/utils.js'
      ]);
      
      // Check that files have correct language assignments
      const tsFile = result.find(f => f.path === 'src/index.ts');
      expect(tsFile?.language?.label).toBe('TypeScript');
      
      const jsFile = result.find(f => f.path === 'src/utils.js');
      expect(jsFile?.language?.label).toBe('JavaScript');
    });

    it('should handle repository with master as default branch', async () => {
      const masterRepoResponse = { default_branch: 'master' };
      
      (fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(masterRepoResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockTreeResponse),
        });

      await fetchRepoFiles('owner', 'repo');

      expect(fetch).toHaveBeenNthCalledWith(2, `${GITHUB_API_BASE}/repos/owner/repo/git/trees/master?recursive=1`);
      expect(logger.info).toHaveBeenCalledWith("Using branch 'master' for repository owner/repo");
    });

    it('should fallback to master when main branch fails', async () => {
      (fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockRepoResponse),
        })
        .mockRejectedValueOnce(new Error('Branch not found'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockTreeResponse),
        });

      await fetchRepoFiles('owner', 'repo');

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(fetch).toHaveBeenNthCalledWith(3, `${GITHUB_API_BASE}/repos/owner/repo/git/trees/master?recursive=1`);
      expect(logger.warn).toHaveBeenCalledWith("Could not fetch 'main' branch, trying 'master'...");
    });

    it('should fallback to main when master is default but fails', async () => {
      const masterRepoResponse = { default_branch: 'master' };
      
      (fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(masterRepoResponse),
        })
        .mockRejectedValueOnce(new Error('Branch not found'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockTreeResponse),
        });

      await fetchRepoFiles('owner', 'repo');

      expect(fetch).toHaveBeenNthCalledWith(3, `${GITHUB_API_BASE}/repos/owner/repo/git/trees/main?recursive=1`);
      expect(logger.warn).toHaveBeenCalledWith("Could not fetch 'master' branch, trying 'main'...");
    });

    it('should handle truncated repository tree', async () => {
      const truncatedTreeResponse = { ...mockTreeResponse, truncated: true };
      
      (fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockRepoResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(truncatedTreeResponse),
        });

      await fetchRepoFiles('owner', 'repo');

      expect(logger.warn).toHaveBeenCalledWith("Repository tree is too large and has been truncated by the GitHub API.");
    });

    it('should handle GitHub API rate limiting on repository info and fallback', async () => {
      (fetch as Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          headers: {
            get: vi.fn().mockImplementation((header: string) => {
              if (header === 'X-RateLimit-Remaining') return '0';
              if (header === 'X-RateLimit-Reset') return String(Math.floor(Date.now() / 1000) + 3600);
              return null;
            })
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockTreeResponse),
        });

      // Should fall back to 'main' when repo info fails
      const result = await fetchRepoFiles('owner', 'repo');
      
      expect(logger.warn).toHaveBeenCalledWith('Failed to detect default branch, falling back to main/master:', expect.any(Error));
      expect(result).toHaveLength(2); // Should still return files
    });

    it('should handle GitHub API rate limiting on tree fetch', async () => {
      (fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockRepoResponse),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          headers: {
            get: vi.fn().mockImplementation((header: string) => {
              if (header === 'X-RateLimit-Remaining') return '0';
              if (header === 'X-RateLimit-Reset') return String(Math.floor(Date.now() / 1000) + 3600);
              return null;
            })
          },
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          headers: {
            get: vi.fn().mockImplementation((header: string) => {
              if (header === 'X-RateLimit-Remaining') return '0';
              if (header === 'X-RateLimit-Reset') return String(Math.floor(Date.now() / 1000) + 3600);
              return null;
            })
          },
        });

      // Both main and master branches hit rate limit, should get the fallback error
      await expect(fetchRepoFiles('owner', 'repo')).rejects.toThrow('Failed to fetch repository files');
    });

    it('should handle repository not found and fallback', async () => {
      (fetch as Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockTreeResponse),
        });

      // Should fall back to 'main' when repo info fails with 404
      const result = await fetchRepoFiles('owner', 'repo');
      
      expect(logger.warn).toHaveBeenCalledWith('Failed to detect default branch, falling back to main/master:', expect.any(Error));
      expect(result).toHaveLength(2); // Should still return files
    });

    it('should handle both main and master branch failures', async () => {
      (fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockRepoResponse),
        })
        .mockRejectedValueOnce(new Error('Main branch not found'))
        .mockRejectedValueOnce(new Error('Master branch not found'));

      await expect(fetchRepoFiles('owner', 'repo')).rejects.toThrow(
        "Failed to fetch repository files. Please check the URL, ensure the repository is public, and that it has a 'main' or 'master' branch."
      );
    });

    it('should handle default branch detection failure gracefully', async () => {
      (fetch as Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockTreeResponse),
        });

      await fetchRepoFiles('owner', 'repo');

      expect(logger.warn).toHaveBeenCalledWith('Failed to detect default branch, falling back to main/master:', expect.any(Error));
      expect(fetch).toHaveBeenNthCalledWith(2, `${GITHUB_API_BASE}/repos/owner/repo/git/trees/main?recursive=1`);
    });
  });

  describe('fetchFileContent', () => {
    const mockFileContent = {
      content: btoa('console.log("Hello World");'), // base64 encoded
      encoding: 'base64'
    };

    it('should fetch and decode file content successfully', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockFileContent),
      });

      const result = await fetchFileContent('owner', 'repo', 'src/index.js');

      expect(fetch).toHaveBeenCalledWith(`${GITHUB_API_BASE}/repos/owner/repo/contents/src/index.js`);
      expect(result).toBe('console.log("Hello World");');
    });

    it('should handle GitHub API rate limiting', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: new Map([
          ['X-RateLimit-Remaining', '0'],
          ['X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 3600)]
        ]),
      });

      await expect(fetchFileContent('owner', 'repo', 'src/index.js')).rejects.toThrow('GitHub API rate limit exceeded');
    });

    it('should handle file not found', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(fetchFileContent('owner', 'repo', 'nonexistent.js')).rejects.toThrow(
        'Could not fetch file content for nonexistent.js. Status: 404'
      );
    });

    it('should handle unsupported file encoding', async () => {
      const unsupportedContent = { ...mockFileContent, encoding: 'utf-8' };
      
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(unsupportedContent),
      });

      await expect(fetchFileContent('owner', 'repo', 'src/index.js')).rejects.toThrow(
        'Unsupported file encoding: utf-8'
      );
    });

    it('should handle base64 decoding errors', async () => {
      const invalidContent = { ...mockFileContent, content: 'invalid-base64!' };
      
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(invalidContent),
      });

      await expect(fetchFileContent('owner', 'repo', 'src/index.js')).rejects.toThrow(
        'Failed to decode file content.'
      );
    });
  });

  describe('fetchFilesWithContent', () => {
    const mockFiles = [
      { path: 'src/index.js', language: { value: 'javascript', label: 'JavaScript', extensions: ['.js'] } },
      { path: 'README.md', language: { value: 'markdown', label: 'Markdown', extensions: ['.md'] } },
      { path: 'existing.js', language: { value: 'javascript', label: 'JavaScript', extensions: ['.js'] }, content: 'existing content' },
    ];

    it('should fetch content for multiple files', async () => {
      (fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ content: btoa('console.log("index");'), encoding: 'base64' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ content: btoa('# README'), encoding: 'base64' }),
        });

      const result = await fetchFilesWithContent('owner', 'repo', mockFiles);

      expect(fetch).toHaveBeenCalledTimes(2); // Should not fetch content for file that already has it
      expect(result).toHaveLength(3);
      
      expect(result[0].content).toBe('console.log("index");');
      expect(result[1].content).toBe('# README');
      expect(result[2].content).toBe('existing content'); // Should preserve existing content
    });

    it('should handle individual file fetch failures gracefully', async () => {
      (fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ content: btoa('console.log("index");'), encoding: 'base64' }),
        })
        .mockRejectedValueOnce(new Error('File fetch failed'));

      const result = await fetchFilesWithContent('owner', 'repo', mockFiles.slice(0, 2));

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('console.log("index");');
      expect(result[1].content).toBeUndefined(); // Failed file should not have content
      expect(logger.error).toHaveBeenCalledWith('Failed to fetch content for README.md:', expect.any(Error));
    });

    it('should handle empty file list', async () => {
      const result = await fetchFilesWithContent('owner', 'repo', []);

      expect(fetch).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should skip files that already have content', async () => {
      const filesWithContent = [
        { path: 'existing.js', language: { value: 'javascript', label: 'JavaScript', extensions: ['.js'] }, content: 'existing content' },
      ];

      const result = await fetchFilesWithContent('owner', 'repo', filesWithContent);

      expect(fetch).not.toHaveBeenCalled();
      expect(result[0].content).toBe('existing content');
    });
  });

  describe('Language Detection', () => {
    it('should correctly identify file languages from extensions', async () => {
      const mockTreeWithVariousFiles = {
        tree: [
          { path: 'app.py', type: 'blob', sha: 'abc123' },
          { path: 'style.css', type: 'blob', sha: 'def456' },
          { path: 'index.html', type: 'blob', sha: 'ghi789' },
          { path: 'config.yaml', type: 'blob', sha: 'jkl012' },
          { path: 'script.sh', type: 'blob', sha: 'mno345' },
          { path: 'dockerfile', type: 'blob', sha: 'pqr678' }, // No extension
          { path: 'unknown.xyz', type: 'blob', sha: 'stu901' }, // Unknown extension
        ],
        truncated: false
      };

      (fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ default_branch: 'main' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockTreeWithVariousFiles),
        });

      const result = await fetchRepoFiles('owner', 'repo');

      // Should only include files with recognized languages (only Python from the supported languages)
      const resultPaths = result.map(f => f.path).sort();
      expect(resultPaths).toEqual([
        'app.py'
      ]);

      // Check specific language assignments
      const pythonFile = result.find(f => f.path === 'app.py');
      expect(pythonFile?.language?.label).toBe('Python');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (fetch as Mock).mockRejectedValue(new Error('Network error'));

      await expect(fetchRepoFiles('owner', 'repo')).rejects.toThrow();
    });

    it('should handle malformed JSON responses and fallback', async () => {
      (fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.reject(new Error('Invalid JSON')),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockTreeResponse),
        });

      // Should fall back to 'main' when repo info JSON parsing fails
      const result = await fetchRepoFiles('owner', 'repo');
      
      expect(logger.warn).toHaveBeenCalledWith('Failed to detect default branch, falling back to main/master:', expect.any(Error));
      expect(result).toHaveLength(2); // Should still return files
    });
  });
});