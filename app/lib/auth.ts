import { auth } from '@clerk/nextjs/server';
import { apiKeyService } from '@/app/services/apiKeyService';
import { AppError } from '@/app/types/errors';

/**
 * Authenticates an API request using either Clerk session or API Key
 * 
 * @param req The Request object containing headers
 * @returns The authenticated userId
 * @throws AppError if authentication fails
 */
export async function authenticateApiRequest(req: Request): Promise<string> {
    // 1. Check for API Key in Authorization header
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const apiKey = authHeader.split(' ')[1];
        const userId = await apiKeyService.validateApiKey(apiKey);

        if (userId) {
            return userId;
        }
        // Only throw if header was present but invalid. 
        // If we want to allow fallback to Clerk, we shouldn't throw here strictly yet, 
        // but typically mixing auth types in one request isn't common. 
        // However, for safety, if an API key is provided and fails, request should fail.
        throw new AppError('UNAUTHORIZED', 'Invalid API Key');
    }

    // 2. Fallback to Clerk Authentication (Session)
    const { userId } = await auth();

    if (!userId) {
        throw new AppError('UNAUTHORIZED', 'Authentication required via Session or API Key');
    }

    return userId;
}
