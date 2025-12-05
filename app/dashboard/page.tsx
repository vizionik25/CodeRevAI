'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { CodeInput } from '../components/CodeInput';
import { FeedbackDisplay } from '../components/FeedbackDisplay';
import { Header } from '../components/Header';
import Notification from '../components/Notification';
import { HistoryPanel } from '../components/HistoryPanel';
import { reviewCode, reviewRepository } from '../services/clientGeminiService';
import { getHistory, addHistoryItem, clearHistory } from '../services/clientHistoryService';
import { LANGUAGES } from '@/app/data/constants';
import { CodeFile, HistoryItem } from '@/app/types';
import { ApiError } from '@/app/types/errors';
import { logger } from '@/app/utils/logger';

export default function HomePage() {
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorContext, setErrorContext] = useState<'review' | 'diff' | 'file' | 'network' | 'auth' | 'rate-limit' | undefined>(undefined);
  const [selectedFile, setSelectedFile] = useState<CodeFile | null>(null);
  const [code, setCode] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState<string[]>(['comprehensive']);
  const [reviewType, setReviewType] = useState<'file' | 'repo'>('file');
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);


  useEffect(() => {
    // Load history from database on mount
    const loadHistory = async () => {
      const historyData = await getHistory();
      setHistory(historyData);
    };
    loadHistory();
  }, []);

  const handleReview = useCallback(async (codeToReview: string, language: string, prompt: string) => {
    if (!codeToReview.trim()) {
      setError("Cannot review empty code.");
      setErrorContext('file');
      return;
    }
    setIsLoading(true);
    setFeedback('');
    setError(null);
    setErrorContext(undefined);
    setReviewType('file');
    try {
      const review = await reviewCode(codeToReview, language, prompt, reviewMode);
      setFeedback(review);

      const languageData = LANGUAGES.find(l => l.value === language);
      const languageLabel = languageData ? languageData.label : language;

      const historyItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        fileName: selectedFile ? selectedFile.path : 'Pasted Snippet',
        language: selectedFile ? selectedFile.language.label : languageLabel,
        feedback: review,
        code: codeToReview,
        mode: reviewMode,
        reviewType: 'file',
      };

      // Optimistic update
      setHistory(prev => [historyItem, ...prev].slice(0, 50));

      await addHistoryItem(historyItem);
      // Optional: re-fetch to ensure sync, but optimistic update makes it snappy
      // const updatedHistory = await getHistory();
      // setHistory(updatedHistory);

    } catch (e) {
      let errorMessage = 'An unknown error occurred.';
      let context: typeof errorContext = 'review';

      // Handle structured AppError from services
      if (e && typeof e === 'object' && 'code' in e) {
        const apiError = e as ApiError;
        errorMessage = apiError.message;

        // Map error codes to contexts for better user feedback
        switch (apiError.code) {
          case 'RATE_LIMIT_EXCEEDED':
            context = 'rate-limit';
            break;
          case 'UNAUTHORIZED':
            context = 'auth';
            break;
          case 'FILE_TOO_LARGE':
          case 'INVALID_INPUT':
            context = 'file';
            break;
          case 'AI_SERVICE_ERROR':
          case 'SERVICE_UNAVAILABLE':
          case 'INTERNAL_ERROR':
            context = 'network';
            break;
          default:
            context = 'review';
        }
      } else if (e instanceof Error) {
        // Fallback for unexpected non-AppError errors (shouldn't happen normally)
        errorMessage = e.message;
        context = 'review';
      }

      setError(`Failed to get review: ${errorMessage}`);
      setErrorContext(context);
      logger.error('Review error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, reviewMode]);

  const handleRepoReview = useCallback(async (filesWithContent: { path: string, content: string }[], repoUrl: string, prompt: string) => {
    setIsLoading(true);
    setFeedback('');
    setError(null);
    setErrorContext(undefined);
    setReviewType('repo');
    setSelectedFile(null);
    setCode('');
    try {
      const review = await reviewRepository(filesWithContent, repoUrl, prompt, reviewMode);
      setFeedback(review);

      const historyItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        fileName: repoUrl,
        language: 'Repository',
        feedback: review,
        code: '',
        mode: reviewMode,
        reviewType: 'repo',
      };

      // Optimistic update
      setHistory(prev => [historyItem, ...prev].slice(0, 50));

      await addHistoryItem(historyItem);
      // const updatedHistory = await getHistory();
      // setHistory(updatedHistory);

    } catch (e) {
      let errorMessage = 'An unknown error occurred.';
      let context: typeof errorContext = 'review';

      // Handle structured AppError from services
      if (e && typeof e === 'object' && 'code' in e) {
        const apiError = e as ApiError;
        errorMessage = apiError.message;

        // Map error codes to contexts for better user feedback
        switch (apiError.code) {
          case 'RATE_LIMIT_EXCEEDED':
            context = 'rate-limit';
            break;
          case 'UNAUTHORIZED':
            context = 'auth';
            break;
          case 'REPO_TOO_LARGE':
          case 'INVALID_INPUT':
            context = 'file';
            break;
          case 'GITHUB_API_ERROR':
          case 'AI_SERVICE_ERROR':
          case 'SERVICE_UNAVAILABLE':
          case 'INTERNAL_ERROR':
            context = 'network';
            break;
          default:
            context = 'review';
        }
      } else if (e instanceof Error) {
        // Fallback for unexpected non-AppError errors (shouldn't happen normally)
        errorMessage = e.message;
        context = 'review';
      }

      setError(`Failed to get review: ${errorMessage}`);
      setErrorContext(context);
      logger.error('Repository review error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [reviewMode]);

  const handleSelectHistoryItem = (item: HistoryItem) => {
    const modes = Array.isArray(item.mode) ? item.mode : [item.mode || 'comprehensive'];
    if (item.reviewType === 'repo') {
      setSelectedFile(null);
      setCode('');
      setFeedback(item.feedback);
      setReviewMode(modes);
      setReviewType('repo');
    } else {
      const isPasted = item.fileName === 'Pasted Snippet';
      const language = { value: item.language.toLowerCase(), label: item.language, extensions: [] };
      setSelectedFile(isPasted ? null : { path: item.fileName, language });
      setCode(item.code);
      setFeedback(item.feedback);
      setReviewMode(modes);
      setReviewType('file');
    }
    setDirectoryHandle(null); // History items don't have a live handle
    setIsHistoryPanelOpen(false);
  };

  const handleClearHistory = async () => {
    await clearHistory();
    setHistory([]);
  }


  return (
    <div className="bg-gray-900 min-h-screen text-gray-200 font-sans">
      <Header onToggleHistory={() => setIsHistoryPanelOpen(prev => !prev)} />
      <Notification message={error} onDismiss={() => setError(null)} />
      <HistoryPanel
        isOpen={isHistoryPanelOpen}
        onClose={() => setIsHistoryPanelOpen(false)}
        history={history}
        onSelect={handleSelectHistoryItem}
        onClear={handleClearHistory}
      />

      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <div>
            <CodeInput
              onReview={handleReview}
              onRepoReview={handleRepoReview}
              isLoading={isLoading}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              code={code}
              setCode={setCode}
              customPrompt={customPrompt}
              setCustomPrompt={setCustomPrompt}
              setError={setError}
              reviewModes={reviewMode}
              setReviewModes={setReviewMode}
              setDirectoryHandle={setDirectoryHandle}
            />
          </div>
          <div>
            <FeedbackDisplay
              feedback={feedback}
              isLoading={isLoading}
              selectedFile={selectedFile}
              originalCode={code}
              setError={setError}
              reviewType={reviewType}
              directoryHandle={directoryHandle}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
