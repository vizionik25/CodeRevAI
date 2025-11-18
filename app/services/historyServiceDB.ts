import { prisma } from '@/app/lib/prisma';
import { HistoryItem } from '@/app/types';
import { logger } from '@/app/utils/logger';

/**
 * Server-side history service
 * Handles database operations for review history
 */

/**
 * Get review history for a user from database
 */
export async function getHistoryFromDB(userId: string, requestId?: string): Promise<HistoryItem[]> {
  try {
    const history = await prisma.reviewHistory.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 50, // Limit to last 50 reviews
    });

    return history.map((item: any): HistoryItem => ({
      id: item.id,
      timestamp: item.timestamp.getTime(),
      fileName: item.fileName || item.repoUrl || 'Unknown',
      language: item.language || 'text',
      feedback: item.feedback,
      code: item.codeSnippet || '',
      mode: item.reviewModes,
      reviewType: item.type === 'repository' ? 'repo' : 'file',
    }));
  } catch (error) {
    logger.error('Error fetching history from database', error, requestId);
    return [];
  }
}

/**
 * Add a new review to history in database
 */
export async function addHistoryItemToDB(userId: string, item: Omit<HistoryItem, 'id'>, requestId?: string): Promise<boolean> {
  try {
    await prisma.reviewHistory.create({
      data: {
        userId,
        type: item.reviewType === 'repo' ? 'repository' : 'code',
        language: item.language,
        reviewModes: item.mode,
        codeSnippet: item.code?.substring(0, 500), // Store first 500 chars
        feedback: item.feedback,
        repoUrl: item.reviewType === 'repo' ? item.fileName : undefined,
        fileName: item.reviewType === 'file' ? item.fileName : undefined,
        timestamp: new Date(item.timestamp),
      },
    });

    return true;
  } catch (error) {
    // Log the error but do NOT throw - saving history is non-critical and should not
    // prevent the main review flow from succeeding when the database is unavailable.
    logger.error('Error saving history to database', error, requestId);
    return false;
  }
}

/**
 * Clear all history for a user from database
 */
export async function clearHistoryFromDB(userId: string, requestId?: string): Promise<void> {
  try {
    await prisma.reviewHistory.deleteMany({
      where: { userId },
    });
  } catch (error) {
    logger.error('Error clearing history from database', error, requestId);
    throw error;
  }
}
