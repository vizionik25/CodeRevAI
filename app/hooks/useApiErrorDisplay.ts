import * as ReactImport from 'react';
const React: any = ReactImport;
import { ApiError } from '@/app/types/errors';
import { logger } from '@/app/utils/logger';

export type ErrorContext = 'review' | 'diff' | 'file' | 'network' | 'auth' | 'rate-limit' | undefined;

export function useApiErrorDisplay() {
    const [error, setError] = React.useState(null as string | null);
    const [errorContext, setErrorContext] = React.useState(undefined as ErrorContext);

    const displayError = React.useCallback((e: unknown, defaultContext: ErrorContext, prefix: string = '') => {
        let errorMessage = 'An unknown error occurred.';
        let context: ErrorContext = defaultContext;

        // Handle structured AppError/ApiError
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
                    context = defaultContext;
            }
        } else if (e instanceof Error) {
            errorMessage = e.message;
            context = defaultContext;
        }

        const fullMessage = prefix ? `${prefix} ${errorMessage}` : errorMessage;
        setError(fullMessage);
        setErrorContext(context);
        logger.error(`Error (${context}):`, e);
    }, []);

    const clearError = React.useCallback(() => {
        setError(null);
        setErrorContext(undefined);
    }, []);

    return {
        error,
        errorContext,
        setError,
        setErrorContext,
        displayError,
        clearError,
    };
}
