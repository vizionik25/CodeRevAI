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

async function fetchTree(owner: string, repo: string, branch: string) {
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

export async function fetchRepoFiles(owner: string, repo: string): Promise<CodeFile[]> {
    let treeData;
    try {
        treeData = await fetchTree(owner, repo, 'main');
    } catch (error) {
        logger.warn("Could not fetch 'main' branch, trying 'master'...");
        try {
            treeData = await fetchTree(owner, repo, 'master');
        } catch (masterError) {
             logger.error('Error fetching repo tree:', masterError);
             throw new Error('Failed to fetch repository files. Please check the URL, ensure the repository is public, and that it has a `main` or `master` branch.');
        }
    }

    if (treeData.truncated) {
        logger.warn("Repository tree is too large and has been truncated by the GitHub API.");
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

export async function fetchFileContent(owner: string, repo: string, path: string): Promise<string> {
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
        logger.error("Base64 decoding error:", e);
        throw new Error("Failed to decode file content.");
    }
}