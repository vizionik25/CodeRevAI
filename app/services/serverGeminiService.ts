import { getGeminiAI } from '@/app/utils/apiClients';
import { buildPrompt, buildRepoPrompt } from '@/app/services/geminiPromptService';

/**
 * Service for server-side Gemini AI interactions.
 * Handles prompt building and model generation.
 */

// Define return type for better type safety
interface ReviewResult {
    feedback: string;
    aiDuration: number;
}

/**
 * Generates a code review for a single file.
 */
export async function generateCodeReview(
    code: string,
    language: string,
    customPrompt: string,
    reviewModes: string[]
): Promise<ReviewResult> {
    const prompt = buildPrompt(code, language, customPrompt, reviewModes);

    const aiStartTime = Date.now();
    const aiInstance = getGeminiAI();

    const response = await aiInstance.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    const aiDuration = Date.now() - aiStartTime;
    const feedback = response.text || '';

    return { feedback, aiDuration };
}

/**
 * Generates a repository review.
 */
export async function generateRepoReview(
    files: Array<{ path: string; content: string }>,
    repoUrl: string,
    customPrompt: string,
    reviewModes: string[]
): Promise<ReviewResult> {
    const prompt = buildRepoPrompt(files, repoUrl, customPrompt, reviewModes);

    const aiStartTime = Date.now();
    const aiInstance = getGeminiAI();

    const response = await aiInstance.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    const aiDuration = Date.now() - aiStartTime;
    const feedback = response.text || '';

    return { feedback, aiDuration };
}
