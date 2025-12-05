import { AppError } from '@/app/types/errors';
import { LANGUAGES } from '@/app/data/constants';
import { Language } from '@/app/types';

/**
 * Detects programming language from file extension
 * @param filePath - Path to the file
 * @returns Language object if detected, undefined otherwise
 */
export function getLanguageForFile(filePath: string): Language | undefined {
    const extension = '.' + filePath.split('.').pop()?.toLowerCase();
    return LANGUAGES.find(lang => lang.extensions.includes(extension));
}

/**
 * Validates if a file extension is allowed for code review
 * @param filePath - Path to the file
 * @returns true if extension is in allowed list
 */
export function isAllowedExtension(filePath: string): boolean {
    const language = getLanguageForFile(filePath);
    return language !== undefined;
}
