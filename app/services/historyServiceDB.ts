import { prisma } from '@/app/lib/prisma';
import { HistoryItem } from '@/app/types';

/**
 * Server-side history service
 * Handles database operations for review history
 */

/**
 * Get review history for a user from database
 */
export async function getHistoryFromDB(userId: string): Promise<HistoryItem[]> {
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
    console.error('Error fetching history from database:', error);
    return [];
  }
}

/**
 * Add a new review to history in database
 */
export async function addHistoryItemToDB(userId: string, item: Omit<HistoryItem, 'id'>): Promise<void> {
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
  } catch (error) {
    console.error('Error saving history to database:', error);
    throw error;
  }
}

/**
 * Clear all history for a user from database
 */
export async function clearHistoryFromDB(userId: string): Promise<void> {
  try {
    await prisma.reviewHistory.deleteMany({
      where: { userId },
    });
  } catch (error) {
    console.error('Error clearing history from database:', error);
    throw error;
  }
}
