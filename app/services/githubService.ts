import { LANGUAGES } from '@/app/data/constants';
import { CodeFile, Language } from '@/app/types';
import { logger } from '@/app/utils/logger';
import { parseGitHubUrl, GITHUB_API_BASE } from '@/app/utils/githubUtils';

// GitHub API types
interface GitHubTreeFile {
  path: string;
  type: string;
  sha: string;
}

interface GitHubContent {
  content: string;
  encoding: string;
}

function getLanguageForFile(filePath: string): Language | undefined {
    const extension = '.' + filePath.split('.').pop()?.toLowerCase();
    return LANGUAGES.find(lang => lang.extensions.includes(extension));
}

/**
 * Detect the default branch of a GitHub repository
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param requestId - Optional request ID for tracing
 * @returns Default branch name (e.g., 'main', 'master', 'develop')
 */
async function detectDefaultBranch(owner: string, repo: string, requestId?: string): Promise<string> {
    try {
        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`);
        
        // Check for rate limiting
        if (res.status === 403) {
            const rateLimitRemaining = res.headers.get('X-RateLimit-Remaining');
            const rateLimitReset = res.headers.get('X-RateLimit-Reset');
            
            if (rateLimitRemaining === '0' && rateLimitReset) {
                const resetDate = new Date(parseInt(rateLimitReset) * 1000);
                throw new Error(`GitHub API rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}`);
            }
        }
        
        if (!res.ok) {
            throw new Error(`Could not fetch repository info. Status: ${res.status}`);
        }
        
        const repoData = await res.json();
        return repoData.default_branch || 'main'; // Fallback to 'main' if not specified
    } catch (error) {
        logger.warn('Failed to detect default branch, falling back to main/master', error, requestId);
        return 'main'; // Fallback to 'main' on error
    }
}

async function fetchTree(owner: string, repo: string, branch: string, requestId?: string) {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
    
    // Check for rate limiting
    if (res.status === 403) {
        const rateLimitRemaining = res.headers.get('X-RateLimit-Remaining');
        const rateLimitReset = res.headers.get('X-RateLimit-Reset');
        
        if (rateLimitRemaining === '0' && rateLimitReset) {
            const resetDate = new Date(parseInt(rateLimitReset) * 1000);
            throw new Error(`GitHub API rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}`);
        }
    }
    
    if (!res.ok) {
        throw new Error(`Could not fetch repository tree for branch ${branch}. Status: ${res.status}`);
    }
    return res.json();
}

export async function fetchRepoFiles(owner: string, repo: string, requestId?: string): Promise<CodeFile[]> {
    // Detect the repository's default branch
    const defaultBranch = await detectDefaultBranch(owner, repo, requestId);
    logger.info(`Using branch '${defaultBranch}' for repository ${owner}/${repo}`, {}, requestId);
    
    let treeData;
    try {
        treeData = await fetchTree(owner, repo, defaultBranch, requestId);
    } catch (error) {
        // If the detected branch fails, try common alternatives
        const fallbackBranch = defaultBranch === 'main' ? 'master' : 'main';
        logger.warn(`Could not fetch '${defaultBranch}' branch, trying '${fallbackBranch}'...`, {}, requestId);
        try {
            treeData = await fetchTree(owner, repo, fallbackBranch, requestId);
        } catch (masterError) {
             logger.error('Error fetching repo tree', masterError, requestId);
             throw new Error(`Failed to fetch repository files. Please check the URL, ensure the repository is public, and that it has a '${defaultBranch}' or '${fallbackBranch}' branch.`);
        }
    }

    if (treeData.truncated) {
        logger.warn("Repository tree is too large and has been truncated by the GitHub API.", {}, requestId);
    }

    const files: CodeFile[] = treeData.tree
        .filter((file: GitHubTreeFile) => file.type === 'blob' && file.path)
        .map((file: GitHubTreeFile) => ({
        path: file.path,
        language: getLanguageForFile(file.path),
        }))
        .filter((file: any): file is CodeFile => file.language !== undefined);
    
    return files;
}

export async function fetchFileContent(owner: string, repo: string, path: string, requestId?: string): Promise<string> {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`);
    
    // Check for rate limiting
    if (res.status === 403) {
        const rateLimitRemaining = res.headers.get('X-RateLimit-Remaining');
        const rateLimitReset = res.headers.get('X-RateLimit-Reset');
        
        if (rateLimitRemaining === '0' && rateLimitReset) {
            const resetDate = new Date(parseInt(rateLimitReset) * 1000);
            throw new Error(`GitHub API rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}`);
        }
    }
    
    if (!res.ok) {
        throw new Error(`Could not fetch file content for ${path}. Status: ${res.status}`);
    }
    const contentData: GitHubContent = await res.json();
    if (contentData.encoding !== 'base64') {
        throw new Error(`Unsupported file encoding: ${contentData.encoding}`);
    }
    try {
        return atob(contentData.content);
    } catch (e) {
        logger.error("Base64 decoding error", e, requestId);
        throw new Error("Failed to decode file content.");
    }
}

/**
 * Fetch content for multiple files and cache them in the CodeFile objects
 * This reduces repeated API calls and improves performance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param files - Array of CodeFile objects to fetch content for
 * @param requestId - Optional request ID for tracing
 * @returns Array of CodeFile objects with content cached
 */
export async function fetchFilesWithContent(
    owner: string,
    repo: string,
    files: CodeFile[],
    requestId?: string
): Promise<CodeFile[]> {
    const filesWithContent = await Promise.all(
        files.map(async (file) => {
            try {
                // Skip if content is already cached
                if (file.content !== undefined) {
                    return file;
                }
                
                const content = await fetchFileContent(owner, repo, file.path, requestId);
                return { ...file, content };
            } catch (error) {
                logger.error(`Failed to fetch content for ${file.path}`, error, requestId);
                // Return file without content on error (will be skipped in review)
                return file;
            }
        })
    );
    
    return filesWithContent;
}