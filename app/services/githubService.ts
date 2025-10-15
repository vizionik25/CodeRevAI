import { LANGUAGES } from '../../constants';
import { CodeFile, GitHubTreeFile, GitHubContent, Language } from '../../types';

const GITHUB_API_BASE = 'https://api.github.com';

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
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
    console.error("URL parsing error:", error);
    return null;
  }
}

function getLanguageForFile(filePath: string): Language | undefined {
    const extension = '.' + filePath.split('.').pop()?.toLowerCase();
    return LANGUAGES.find(lang => lang.extensions.includes(extension));
}

async function fetchTree(owner: string, repo: string, branch: string) {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
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
        console.warn("Could not fetch 'main' branch, trying 'master'...");
        try {
            treeData = await fetchTree(owner, repo, 'master');
        } catch (masterError) {
             console.error('Error fetching repo tree:', masterError);
             throw new Error('Failed to fetch repository files. Please check the URL, ensure the repository is public, and that it has a `main` or `master` branch.');
        }
    }

    if (treeData.truncated) {
        console.warn("Repository tree is too large and has been truncated by the GitHub API.");
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
        console.error("Base64 decoding error:", e);
        throw new Error("Failed to decode file content.");
    }
}