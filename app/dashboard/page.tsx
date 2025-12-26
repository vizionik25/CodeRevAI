'use client';
import * as ReactImport from 'react';
const React: any = ReactImport;
import { CodeInput } from '../components/CodeInput';
import { FeedbackDisplay } from '../components/FeedbackDisplay';
import { Header } from '../components/Header';
import ApiKeyManager from '../components/ApiKeyManager';
import Notification from '../components/Notification';
import { HistoryPanel } from '../components/HistoryPanel';
import { reviewCode, reviewRepository } from '../services/geminiApiService';
import { getHistory, addHistoryItem, clearHistory } from '../services/historyApiService';
import { LANGUAGES } from '@/app/data/constants';
import { CodeFile, HistoryItem } from '@/app/types';
import { ApiError } from '@/app/types/errors';
import { logger } from '@/app/utils/logger';
import { useApiErrorDisplay } from '@/app/hooks/useApiErrorDisplay';

export default function HomePage() {
  const [feedback, setFeedback] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const { error, errorContext, setError, setErrorContext, displayError, clearError } = useApiErrorDisplay();
  const [selectedFile, setSelectedFile] = React.useState(null as CodeFile | null);
  const [code, setCode] = React.useState('');
  const [customPrompt, setCustomPrompt] = React.useState('');
  const [history, setHistory] = React.useState([] as HistoryItem[]);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = React.useState(false);
  const [reviewMode, setReviewMode] = React.useState(['comprehensive'] as string[]);
  const [reviewType, setReviewType] = React.useState('file' as 'file' | 'repo');
  const [directoryHandle, setDirectoryHandle] = React.useState(null as FileSystemDirectoryHandle | null);


  React.useEffect(() => {
    // Load history from database on mount
    const loadHistory = async () => {
      const historyData = await getHistory();
      setHistory(historyData);
    };
    loadHistory();
  }, []);

  const handleReview = React.useCallback(async (codeToReview: string, language: string, prompt: string) => {
    if (!codeToReview.trim()) {
      displayError(new Error("Cannot review empty code."), 'file');
      return;
    }
    setIsLoading(true);
    setFeedback('');
    clearError();
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
      setHistory((prev: HistoryItem[]) => [historyItem, ...prev].slice(0, 50));

      await addHistoryItem(historyItem);
      // Optional: re-fetch to ensure sync, but optimistic update makes it snappy
      // const updatedHistory = await getHistory();
      // setHistory(updatedHistory);

    } catch (e) {
      displayError(e, 'review', 'Failed to get review:');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, reviewMode]);

  const handleRepoReview = React.useCallback(async (filesWithContent: { path: string, content: string }[], repoUrl: string, prompt: string) => {
    setIsLoading(true);
    setFeedback('');
    setIsLoading(true);
    setFeedback('');
    clearError();
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
      setHistory((prev: HistoryItem[]) => [historyItem, ...prev].slice(0, 50));

      await addHistoryItem(historyItem);
      // const updatedHistory = await getHistory();
      // setHistory(updatedHistory);

    } catch (e) {
      displayError(e, 'review', 'Failed to get review:');
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
      <Header onToggleHistory={() => setIsHistoryPanelOpen((prev: boolean) => !prev)} />
      <Notification message={error} onDismiss={clearError} />
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

        {/* API Key Management Section */}
        <div className="mt-12 mb-8">
          <ApiKeyManager />
        </div>
      </main>
    </div>
  );
}
