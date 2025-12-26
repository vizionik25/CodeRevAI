import React from 'react';
import ReactMarkdown from 'react-markdown';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

// Workaround for TypeScript build issue where React types aren't resolving correctly
const { useState, useEffect, Suspense, lazy } = React as any;

// Lazy load heavy components
const ReactDiffViewer = lazy(() => import('react-diff-viewer-continued'));
const SyntaxHighlighter = lazy(() => import('react-syntax-highlighter').then(mod => ({ default: mod.Prism })));
import { LoadingState } from './LoadingState';
import { ErrorMessage } from './ErrorMessage';
import { LoaderIcon } from './icons/LoaderIcon';
import { CodeFile } from '@/app/types';
import { downloadFile } from '../utils/fileUtils';
import { generateFullCodeFromReview } from '../services/geminiApiService';
import { saveFileWithBakExtension } from '../services/localFileService';

interface FeedbackDisplayProps {
  feedback: string;
  isLoading: boolean;
  selectedFile: CodeFile | null;
  originalCode: string;
  setError: (error: string | null) => void;
  reviewType: 'file' | 'repo';
  directoryHandle: FileSystemDirectoryHandle | null;
}

const Placeholder = () => (
  <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
    <h3 className="text-xl font-semibold">AI Feedback</h3>
    <p className="mt-2">Your code review results will appear here.</p>
  </div>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const SaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
  </svg>
);


type ViewMode = 'review' | 'diff';

export const FeedbackDisplay = ({ feedback, isLoading, selectedFile, originalCode, setError, reviewType, directoryHandle }: FeedbackDisplayProps) => {
  const [viewMode, setViewMode] = useState('review');
  const [diffCode, setDiffCode] = useState(null);
  const [isGeneratingDiff, setIsGeneratingDiff] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset diff when feedback changes or review type changes
  useEffect(() => {
    setDiffCode(null);
    setViewMode('review');
  }, [feedback, reviewType]);

  const handleSaveFeedback = () => {
    if (!feedback) return;
    const namePart = reviewType === 'repo' ? 'repository-review' : selectedFile?.path.split('/').pop() || 'review';
    const downloadFilename = `${namePart}.review.md`;
    downloadFile(feedback, downloadFilename, 'text/markdown;charset=utf-8');
  };

  const handleGenerateDiff = async () => {
    if (diffCode) {
      setViewMode('diff');
      return;
    }
    if (!originalCode || !feedback || !selectedFile) return;

    setIsGeneratingDiff(true);
    setError(null);
    try {
      const language = selectedFile.language.label;
      const newCode = await generateFullCodeFromReview(originalCode, language, feedback);
      setDiffCode(newCode);
      setViewMode('diff');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to generate diff: ${errorMessage}`);
    } finally {
      setIsGeneratingDiff(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!directoryHandle || !selectedFile || diffCode === null) return;

    setIsSaving(true);
    setError(null);
    try {
      await saveFileWithBakExtension(directoryHandle, selectedFile.path, diffCode);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to save file: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <LoadingState type="review" showProgress={true} />;
    }

    if (!feedback) {
      return <Placeholder />;
    }

    if (viewMode === 'diff' && reviewType === 'file') {
      if (isGeneratingDiff) {
        return <LoadingState type="diff" showProgress={true} />;
      }
      return (
        <div className="flex flex-col h-full bg-gray-800">
          <div className="flex-shrink-0 p-2 bg-gray-900/50 border-b border-gray-700 flex justify-end items-center">
            <button
              onClick={handleSaveChanges}
              disabled={!directoryHandle || isSaving || diffCode === null}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:bg-blue-800/50 disabled:cursor-not-allowed transition-colors"
              title={!directoryHandle ? "Save is only available for local folder reviews" : `Save changes to ${selectedFile?.path}.bak`}
            >
              {isSaving ? (
                <><LoaderIcon /> Saving...</>
              ) : (
                <><SaveIcon /> Save to .bak</>
              )}
            </button>
          </div>
          <div className="flex-grow overflow-auto">
            <Suspense fallback={<LoadingState type="diff" showProgress={true} />}>
              <ReactDiffViewer
                oldValue={originalCode}
                newValue={diffCode || ''}
                splitView={true}
                useDarkTheme={true}
                styles={{
                  variables: {
                    dark: {
                      addedBackground: '#047857', // green-700
                      removedBackground: '#991B1B', // red-800
                    }
                  },
                  diffContainer: { backgroundColor: '#1F2937', border: 'none' }, // gray-800
                  gutter: { backgroundColor: '#374151', border: 'none' }, // gray-700
                  line: {
                    // Fix: Moved text color property here from 'variables.dark' as 'color' is not a valid property there.
                    color: '#D1D5DB',
                    '&:hover': { background: '#374151' },
                  },
                }}
              />
            </Suspense>
          </div>
        </div>
      );
    }

    return (
      <div className="prose prose-invert prose-sm md:prose-base max-w-none text-gray-300 p-4">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <Suspense fallback={<code className={className} {...props}>{children}</code>}>
                  <SyntaxHighlighter
                    style={vscDarkPlus as any}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </Suspense>
              ) : (
                <code className="bg-gray-700 rounded px-1.5 py-1 text-indigo-300 font-mono" {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {feedback}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg flex flex-col h-[75vh]">
      <div className="p-4 bg-gray-700/50 rounded-t-lg border-b border-gray-600 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="isolate inline-flex rounded-md shadow-sm bg-gray-900/50 p-1">
            <button
              onClick={() => setViewMode('review')}
              className={`relative inline-flex items-center rounded-l-md px-3 py-1 text-sm font-semibold transition-colors ${viewMode === 'review' || reviewType === 'repo' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
            >
              Review
            </button>
            <button
              onClick={handleGenerateDiff}
              disabled={!feedback || isGeneratingDiff || reviewType === 'repo'}
              className={`relative -ml-px inline-flex items-center rounded-r-md px-3 py-1 text-sm font-semibold transition-colors ${viewMode === 'diff' && reviewType === 'file' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'} disabled:text-gray-500 disabled:cursor-not-allowed`}
              title={reviewType === 'repo' ? "Diff view is not available for repository reviews" : ""}
            >
              Diff
            </button>
          </div>
        </div>
        <button
          onClick={handleSaveFeedback}
          disabled={!feedback}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
          aria-label="Save feedback to a file"
        >
          <DownloadIcon />
          Save
        </button>
      </div>
      <div className="flex-grow overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
};
