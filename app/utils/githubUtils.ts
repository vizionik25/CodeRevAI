/**
 * GitHub Utilities
 * Shared utilities for GitHub URL parsing and validation
 */

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
}

/**
 * Parse a GitHub repository URL and extract owner and repo name
 * @param url - GitHub repository URL
 * @returns Object with owner and repo, or null if invalid
 * @example
 * parseGitHubUrl('https://github.com/facebook/react')
 * // Returns: { owner: 'facebook', repo: 'react' }
 */
export function parseGitHubUrl(url: string): GitHubRepoInfo | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname !== 'github.com') {
      return null;
    }

    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length < 2) {
      return null;
    }

    const [owner, repo] = pathParts;
    return { owner, repo };
  } catch (error) {
    return null;
  }
}

/**
 * Validate a GitHub repository URL
 * @param url - URL to validate
 * @returns Validation result with error message if invalid
 */
export function validateGitHubUrl(url: unknown): { valid: boolean; error?: string } {
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
 * GitHub API base URL
 */
export const GITHUB_API_BASE = 'https://api.github.com';
