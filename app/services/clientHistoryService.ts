import { HistoryItem } from '@/app/types';

/**
 * Client-side history service
 * These functions call the API routes which handle database operations
 */

/**
 * Get review history for the current user from database
 */
export async function getHistory(): Promise<HistoryItem[]> {
  try {
    const response = await fetch('/api/history');
    if (!response.ok) {
      throw new Error('Failed to fetch history');
    }
    const data = await response.json();
    return data.history || [];
  } catch (error) {
    console.error('Error fetching history:', error);
    return [];
  }
}

/**
 * Add a new review to history
 */
export async function addHistoryItem(item: HistoryItem): Promise<void> {
  try {
    const response = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    
    if (!response.ok) {
      throw new Error('Failed to add history item');
    }
  } catch (error) {
    console.error('Error adding history item:', error);
  }
}

/**
 * Clear all history for the current user
 */
export async function clearHistory(): Promise<void> {
  try {
    const response = await fetch('/api/history', {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to clear history');
    }
  } catch (error) {
    console.error('Error clearing history:', error);
  }
}

