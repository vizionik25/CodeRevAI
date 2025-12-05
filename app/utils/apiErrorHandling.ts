import { AppError, ApiError } from '@/app/types/errors';

/**
 * Deserialize API error response and throw AppError
 */
export async function handleApiError(response: Response): Promise<never> {
    try {
        const errorData: ApiError = await response.json();

        // Check if we received a structured error response
        if (errorData.code && errorData.message) {
            throw new AppError(
                errorData.code,
                errorData.message,
                errorData.details,
                errorData.retryable
            );
        }

        // Fallback for non-structured errors
        throw new AppError(
            'INTERNAL_ERROR',
            errorData.message || `Request failed with status ${response.status}`,
            undefined,
            false
        );
    } catch (parseError) {
        // If JSON parsing fails, create a generic error
        if (parseError instanceof AppError) {
            throw parseError;
        }

        throw new AppError(
            'INTERNAL_ERROR',
            `Request failed with status ${response.status}`,
            response.statusText,
            false
        );
    }
}
