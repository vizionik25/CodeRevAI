import { LANGUAGES } from '@/app/data/constants';
import { CodeFile, Language } from '@/app/types';
import { logger } from '@/app/utils/logger';
import { parseGitHubUrl, GITHUB_API_BASE } from '@/app/utils/githubUtils';
import { AppError } from '@/app/types/errors';
import { getLanguageForFile } from '@/app/utils/languageDetection';

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

/**
 * Generic function to handle GitHub API responses and check for rate limits.
 * Throws AppError for structured client-side error handling.
 */
async function handleGitHubApiResponse(response: Response, resource: string, requestId?: string): Promise<Response> {
    if (response.status === 403) {
        const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
        const rateLimitReset = response.headers.get('X-RateLimit-Reset');

        if (rateLimitRemaining === '0' && rateLimitReset) {
            const resetDate = new Date(parseInt(rateLimitReset) * 1000);
            logger.warn(`GitHub API rate limit exceeded for ${resource}. Resets at ${resetDate.toISOString()}`, {}, requestId);
            throw new AppError(
                'RATE_LIMIT_EXCEEDED',
                `GitHub API rate limit exceeded. Please try again after ${resetDate.toLocaleTimeString()}.`,
                `Reset time: ${resetDate.toISOString()}`,
                true // Indicate retryable
            );
        }
    }

    if (!response.ok) {
        const errorText = await response.text();
        logger.error(`GitHub API error for ${resource}: ${response.status} - ${errorText}`, {}, requestId);
        throw new AppError(
            'GITHUB_API_ERROR',
            `Could not fetch ${resource}. Status: ${response.status}.`,
            errorText
        );
    }

    return response;
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
        const handledRes = await handleGitHubApiResponse(res, `repository info for ${owner}/${repo}`, requestId);
        const repoData = await handledRes.json();
        return repoData.default_branch || 'main';
    } catch (error) {
        if (error instanceof AppError) throw error; // Re-throw AppErrors immediately
        logger.warn('Failed to detect default branch, falling back to main/master', error, requestId);
        return 'main';
    }
}

async function fetchTree(owner: string, repo: string, branch: string, requestId?: string) {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
    return handleGitHubApiResponse(res, `repository tree for ${owner}/${repo} branch ${branch}`, requestId);
}

export async function fetchRepoFiles(owner: string, repo: string, requestId?: string): Promise<CodeFile[]> {
    // Detect the repository's default branch
    const defaultBranch = await detectDefaultBranch(owner, repo, requestId);
    logger.info(`Using branch '${defaultBranch}' for repository ${owner}/${repo}`, {}, requestId);

    let treeData;
    try {
        treeData = await (await fetchTree(owner, repo, defaultBranch, requestId)).json();
    } catch (error) {
        if (error instanceof AppError) throw error; // Re-throw AppErrors immediately
        const fallbackBranch = defaultBranch === 'main' ? 'master' : 'main';
        logger.warn(`Could not fetch '${defaultBranch}' branch, trying '${fallbackBranch}'...`, {}, requestId);
        try {
            treeData = await (await fetchTree(owner, repo, fallbackBranch, requestId)).json();
        } catch (masterError) {
            if (masterError instanceof AppError) throw masterError; // Re-throw AppErrors immediately
            logger.error('Error fetching repo tree', masterError, requestId);
            throw new AppError(
                'GITHUB_API_ERROR',
                `Failed to fetch repository files. Please check the URL, ensure the repository is public, and that it has a '${defaultBranch}' or '${fallbackBranch}' branch.`
            );
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
    const handledRes = await handleGitHubApiResponse(res, `file content for ${path}`, requestId);
    const contentData: GitHubContent = await handledRes.json();

    if (contentData.encoding !== 'base64') {
        throw new AppError('GITHUB_API_ERROR', `Unsupported file encoding: ${contentData.encoding}`);
    }

    try {
        return atob(contentData.content);
    } catch (e) {
        logger.error("Base64 decoding error", e, requestId);
        throw new AppError('GITHUB_API_ERROR', "Failed to decode file content.");
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