import React from 'react';

interface ErrorMessageProps {
  error: string;
  context?: 'review' | 'diff' | 'file' | 'network' | 'auth' | 'rate-limit';
}

interface ErrorSolution {
  title: string;
  solutions: string[];
  icon: string;
}

const ERROR_SOLUTIONS: Record<string, ErrorSolution> = {
  'rate-limit': {
    icon: '\u23F1\uFE0F',
    title: 'Rate Limit Reached',
    solutions: [
      'Wait a few minutes before trying again',
      'The limit resets every 60 seconds',
      'Consider upgrading for higher limits',
    ],
  },
  'network': {
    icon: '\uD83C\uDF10',
    title: 'Connection Error',
    solutions: [
      'Check your internet connection',
      'Refresh the page and try again',
      'The service may be temporarily unavailable',
    ],
  },
  'auth': {
    icon: '\uD83D\uDD10',
    title: 'Authentication Required',
    solutions: [
      'Sign in to your account',
      'Your session may have expired - try refreshing',
      'Clear your browser cache and sign in again',
    ],
  },
  'file': {
    icon: '\uD83D\uDCC4',
    title: 'File Processing Error',
    solutions: [
      'Ensure the file is a valid code file',
      'Check that the file isn\'t corrupted or too large (max 100KB)',
      'Try selecting a different file',
    ],
  },
  'review': {
    icon: '\uD83E\uDD16',
    title: 'AI Review Failed',
    solutions: [
      'The code may be too complex or too long',
      'Try breaking it into smaller pieces',
      'Ensure the code is valid and not minified',
    ],
  },
};

function detectErrorContext(error: string): string {
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('rate limit') || errorLower.includes('too many requests')) {
    return 'rate-limit';
  }
  if (errorLower.includes('unauthorized') || errorLower.includes('authentication') || errorLower.includes('auth')) {
    return 'auth';
  }
  if (errorLower.includes('network') || errorLower.includes('fetch') || errorLower.includes('connection')) {
    return 'network';
  }
  if (errorLower.includes('file') || errorLower.includes('invalid') || errorLower.includes('too large')) {
    return 'file';
  }
  return 'review';
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, context }) => {
  const detectedContext = context || detectErrorContext(error);
  const solution = ERROR_SOLUTIONS[detectedContext] || ERROR_SOLUTIONS.review;

  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="max-w-lg w-full bg-red-900/20 border border-red-700/50 rounded-lg p-6 space-y-4">
        {/* Error Header */}
        <div className="flex items-start gap-3">
          <span className="text-3xl flex-shrink-0">{solution.icon}</span>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-400">{solution.title}</h3>
            <p className="text-sm text-gray-300 mt-1">{error}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-red-700/30"></div>

        {/* Solutions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300">\uD83D\uDCA1 What you can try:</h4>
          <ul className="space-y-2">
            {solution.solutions.map((sol, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-400">
                <span className="text-indigo-400 font-bold flex-shrink-0">{index + 1}.</span>
                <span>{sol}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Additional help for specific errors */}
        {detectedContext === 'rate-limit' && (
          <div className="mt-4 p-3 bg-gray-800/50 border border-gray-700 rounded text-xs text-gray-400">
            <strong className="text-gray-300">Rate Limits:</strong> Free tier allows 15 requests per minute.
            Upgrade to Pro for unlimited reviews.
          </div>
        )}

        {detectedContext === 'auth' && (
          <div className="mt-4 p-3 bg-gray-800/50 border border-gray-700 rounded text-xs text-gray-400">
            <strong className="text-gray-300">Need Help?</strong> If you continue having authentication
            issues, try signing out and back in, or contact support.
          </div>
        )}

        {/* Action button */}
        <div className="pt-2">
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors text-sm font-medium"
          >
            Refresh Page & Try Again
          </button>
        </div>
      </div>
    </div>
  );
};
