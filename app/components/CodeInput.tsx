import React, { useState, useEffect, useRef } from 'react';
import { CodeFile } from '@/app/types';
import { fetchRepoFiles, fetchFileContent } from '../services/githubService';
import { parseGitHubUrl } from '@/app/utils/githubUtils';
import { openDirectoryAndGetFiles, readFileContent, getFilesFromInput } from '../services/localFileService';
import { SparklesIcon } from './icons/SparklesIcon';
import { LanguageOverrideSelector } from './LanguageOverrideSelector';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ReviewModeSelector } from './ReviewModeSelector';
import { LocalFolderWarningModal } from './LocalFolderWarningModal';

interface CodePasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (code: string) => void;
  initialCode: string;
}

const CodePasteModal: React.FC<CodePasteModalProps> = ({ isOpen, onClose, onConfirm, initialCode }) => {
  const [code, setCode] = useState(initialCode);

  useEffect(() => {
    if (isOpen) {
      setCode(initialCode);
    }
  }, [isOpen, initialCode]);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    onConfirm(code);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose} aria-modal="true" role="dialog">
      <div 
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-4/5 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Paste Code</h2>
           <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700" aria-label="Close modal">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        <div className="p-4 flex-grow">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your code here..."
            className="w-full h-full p-3 bg-gray-900/50 border border-gray-600 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
            spellCheck="false"
          />
        </div>
        <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">
            Cancel
          </button>
          <button onClick={handleConfirm} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors">
            Save Code
          </button>
        </div>
      </div>
    </div>
  );
};

interface CodeInputProps {
  onReview: (code: string, language: string, customPrompt: string) => void;
  onRepoReview: (files: {path: string, content: string}[], repoUrl: string, customPrompt: string) => void;
  isLoading: boolean;
  selectedFile: CodeFile | null;
  setSelectedFile: (file: CodeFile | null) => void;
  code: string;
  setCode: (code: string) => void;
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;
  setError: (error: string | null) => void;
  reviewModes: string[];
  setReviewModes: (modes: string[]) => void;
  setDirectoryHandle: (handle: FileSystemDirectoryHandle | null) => void;
}

const HIDE_WARNING_KEY = 'hideLocalFolderWarning';

export const CodeInput: React.FC<CodeInputProps> = ({ 
    onReview, 
    onRepoReview,
    isLoading, 
    selectedFile, 
    setSelectedFile, 
    code, 
    setCode, 
    customPrompt,
    setCustomPrompt,
    setError,
    reviewModes,
    setReviewModes,
    setDirectoryHandle,
}) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [isFetchingFiles, setIsFetchingFiles] = useState(false);
  const [languageOverride, setLanguageOverride] = useState('auto-detect');
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [showReviewOptions, setShowReviewOptions] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [isIframe, setIsIframe] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    try {
      setIsIframe(window.self !== window.top);
    } catch (e) {
      // Browsers can throw an error when trying to access window.top from a cross-origin iframe.
      // In this case, we can assume it's an iframe.
      setIsIframe(true);
    }
  }, []);

  useEffect(() => {
    if (selectedFile) {
      setCode(selectedFile.content || '');
    } else {
      // Don't clear code if there's no selected file, it might be pasted code
    }
  }, [selectedFile, setCode]);

  const handleFetchRepo = async () => {
    setError(null);
    setDirectoryHandle(null);
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      setError("Invalid GitHub repository URL.");
      return;
    }
    setIsFetchingFiles(true);
    setFiles([]);
    setSelectedFile(null);
    setCode('');
    try {
      const repoFiles = await fetchRepoFiles(parsed.owner, parsed.repo);
      setFiles(repoFiles);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(errorMessage);
    } finally {
      setIsFetchingFiles(false);
    }
  };
  
  const handleLocalFolderClick = () => {
    const shouldHideWarning = localStorage.getItem(HIDE_WARNING_KEY) === 'true';
    if (shouldHideWarning) {
        initiateDirectorySelection();
    } else {
        setIsWarningModalOpen(true);
    }
  };

  const handleWarningConfirm = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
        localStorage.setItem(HIDE_WARNING_KEY, 'true');
    }
    setIsWarningModalOpen(false);
    initiateDirectorySelection();
  };
  
  const initiateDirectorySelection = async () => {
    // Reset state before starting selection
    setError(null);
    setFiles([]);
    setSelectedFile(null);
    setCode('');
    setRepoUrl('');
    setDirectoryHandle(null);

    // Use fallback for iframe environments
    if (isIframe) {
      fileInputRef.current?.click();
      return;
    }

    // Use File System Access API for top-level contexts
    setIsFetchingFiles(true);
    try {
      const { directoryHandle, files: localFiles } = await openDirectoryAndGetFiles();
      if (localFiles.length > 0) {
        setDirectoryHandle(directoryHandle);
        setFiles(localFiles);
      } else {
        setDirectoryHandle(null);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(errorMessage);
      setDirectoryHandle(null);
    } finally {
      setIsFetchingFiles(false);
    }
  };

  const handleFileSelectedFromInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsFetchingFiles(true);
    try {
        const localFiles = await getFilesFromInput(e.target.files);
        setFiles(localFiles);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(errorMessage);
    } finally {
        setIsFetchingFiles(false);
        if (e.target) e.target.value = ''; // Reset for next selection
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const filePath = e.target.value;
    if (!filePath) {
      setSelectedFile(null);
      return;
    }

    const file = files.find(f => f.path === filePath);
    if (file) {
      setError(null);

      // If content is already loaded (from iframe fallback), use it.
      if (file.content) {
        setSelectedFile(file);
        return;
      }

      setIsFetchingFiles(true);
      try {
        let content = '';
        if (file.handle) { // Local file from Picker API
          content = await readFileContent(file);
        } else { // GitHub file
          const parsed = parseGitHubUrl(repoUrl);
          if (parsed) {
            content = await fetchFileContent(parsed.owner, parsed.repo, file.path);
          }
        }
        setSelectedFile({ ...file, content });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        setError(`Failed to fetch file content: ${errorMessage}`);
        setSelectedFile(null);
      } finally {
        setIsFetchingFiles(false);
      }
    }
  };
  
  const handleReviewClick = () => {
    const languageToUse = languageOverride !== 'auto-detect' 
      ? languageOverride 
      : selectedFile?.language.value || 'typescript'; // Fallback for pasted code
    onReview(code, languageToUse, customPrompt);
  };

  const handleRepoReviewClick = async () => {
    if (!repoUrl || files.length === 0) return;

    setError(null);
    setIsFetchingFiles(true);
    setSelectedFile(null);
    try {
        const parsed = parseGitHubUrl(repoUrl);
        if (!parsed) return;

        const filesWithContent = await Promise.all(files.map(async (file) => {
            const content = await fetchFileContent(parsed.owner, parsed.repo, file.path);
            return { path: file.path, content };
        }));

        onRepoReview(filesWithContent, repoUrl, customPrompt);

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        setError(`Failed to fetch repository content: ${errorMessage}`);
    } finally {
        setIsFetchingFiles(false);
    }
  };

  const handlePasteConfirm = (pastedCode: string) => {
    setCode(pastedCode);
    setSelectedFile(null);
    setRepoUrl('');
    setFiles([]);
    setDirectoryHandle(null);
    setIsPasteModalOpen(false);
  };


  return (
    <div className="bg-gray-800 rounded-lg shadow-lg flex flex-col">
      <div className="p-4 bg-gray-700/50 rounded-t-lg border-b border-gray-600">
        <h2 className="text-lg font-semibold text-gray-100">Code Input</h2>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto">
        {/* GitHub URL Input */}
        <div className="flex gap-2">
            <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isFetchingFiles}
            />
            <button onClick={handleFetchRepo} disabled={isFetchingFiles || !repoUrl} className="px-4 py-2 bg-indigo-600 rounded-md hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed transition-colors">
                {isFetchingFiles ? '...' : 'Load'}
            </button>
        </div>
        
        {/* Local/Paste Buttons */}
        <div className="relative flex items-center">
            <div className="flex-grow border-t border-gray-600"></div>
            <span className="flex-shrink mx-4 text-gray-500 text-sm">OR</span>
            <div className="flex-grow border-t border-gray-600"></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
            <input
              type="file"
              // @ts-ignore
              webkitdirectory="true"
              directory="true"
              multiple
              ref={fileInputRef}
              onChange={handleFileSelectedFromInput}
              style={{ display: 'none' }}
            />
            <button
                onClick={handleLocalFolderClick}
                disabled={isFetchingFiles}
                className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 rounded-md disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors"
                title="Select a folder from your local machine"
            >
                Select Local Folder
            </button>
            <button
                onClick={() => setIsPasteModalOpen(true)}
                disabled={isFetchingFiles}
                className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 rounded-md disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors"
            >
                Paste Code Manually
            </button>
        </div>

        {/* File Selector */}
        {(files.length > 0 || isFetchingFiles) && (
          <div>
            <select
                value={selectedFile?.path || ''}
                onChange={handleFileSelect}
                disabled={isFetchingFiles}
                className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <option value="">{isFetchingFiles ? 'Loading files...' : 'Select a file to review'}</option>
                {files.map(file => (
                    <option key={file.path} value={file.path}>
                        {file.path} ({file.language.label})
                    </option>
                ))}
            </select>

            {repoUrl && (
              <div className="mt-4">
                  <button
                      onClick={handleRepoReviewClick}
                      disabled={isLoading || isFetchingFiles || reviewModes.includes('test_generation')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 font-semibold bg-purple-600 text-white rounded-md hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed transition-colors"
                      title={reviewModes.includes('test_generation') ? "Test Generation is not available for repository-wide reviews" : "Review the entire repository"}
                  >
                      <SparklesIcon />
                      Review Entire Repository
                  </button>
              </div>
            )}
          </div>
        )}

        <LanguageOverrideSelector value={languageOverride} onChange={setLanguageOverride} />

        {/* Review Options Section */}
        <div className="border-t border-gray-700 pt-4">
          <button 
            onClick={() => setShowReviewOptions(prev => !prev)}
            className="w-full flex justify-between items-center text-left text-sm font-medium text-gray-400 hover:text-gray-200"
          >
            Code Analysis Options
            <ChevronDownIcon className={`h-5 w-5 transition-transform ${showReviewOptions ? 'rotate-180' : ''}`} />
          </button>
          {showReviewOptions && (
            <div className="mt-3">
              <ReviewModeSelector selectedModes={reviewModes} onModeChange={setReviewModes} />
            </div>
          )}
        </div>

        {/* Custom Prompt Section */}
        <div className="border-t border-gray-700 pt-4">
          <button 
            onClick={() => setShowCustomPrompt(prev => !prev)}
            className="w-full flex justify-between items-center text-left text-sm font-medium text-gray-400 hover:text-gray-200"
          >
            Custom Instructions
            <ChevronDownIcon className={`h-5 w-5 transition-transform ${showCustomPrompt ? 'rotate-180' : ''}`} />
          </button>
          {showCustomPrompt && (
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., 'Focus on performance optimizations' or 'Check for adherence to SOLID principles.'"
              className="w-full mt-2 p-2 bg-gray-900/50 border border-gray-600 rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm h-24"
              spellCheck="false"
            />
          )}
        </div>
      </div>

      <div className="p-4 bg-gray-700/50 rounded-b-lg border-t border-gray-600 flex justify-end">
        <button
          onClick={handleReviewClick}
          disabled={isLoading || !code}
          className="flex items-center gap-2 px-6 py-2.5 font-semibold bg-green-600 text-white rounded-md hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed transition-colors"
        >
          <SparklesIcon />
          {isLoading ? 'Reviewing...' : 'Review File'}
        </button>
      </div>
      <CodePasteModal 
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onConfirm={handlePasteConfirm}
        initialCode={code}
      />
       <LocalFolderWarningModal
        isOpen={isWarningModalOpen}
        onClose={() => setIsWarningModalOpen(false)}
        onConfirm={handleWarningConfirm}
      />
    </div>
  );
};