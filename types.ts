export interface Language {
  value: string;
  label: string;
  extensions: string[];
}

export interface CodeFile {
  path: string;
  language: Language;
  handle?: FileSystemFileHandle; // For local files
  content?: string; // Loaded on demand
}

export interface GitHubTreeFile {
  path: string;
  mode: string;
  type: 'blob' | 'tree' | 'commit';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubContent {
  content: string;
  encoding: 'base64' | string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  fileName: string; // file path or repo URL
  language: string; // e.g., 'TypeScript' or 'Repository'
  feedback: string;
  code: string; // empty for repo review
  mode: string[];
  reviewType: 'file' | 'repo';
}

export interface ReviewMode {
  value: string;
  label: string;
  description: string;
}

export interface ReviewModeGroup {
    name: string;
    modes: ReviewMode[];
}


declare global {
  interface Window {
    showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
  }
}
