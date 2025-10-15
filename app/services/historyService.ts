import { HistoryItem } from '../types';

const HISTORY_KEY = 'codeReviewHistory';

export function getHistory(): HistoryItem[] {
  try {
    const historyJson = localStorage.getItem(HISTORY_KEY);
    if (historyJson) {
      const parsedHistory = JSON.parse(historyJson) as any[];
      const history = parsedHistory.map(item => {
        // Backwards compatibility for old history items
        const mode = typeof item.mode === 'string' ? [item.mode] : item.mode || ['comprehensive'];
        return {
          ...item,
          mode: mode,
          reviewType: item.reviewType || 'file'
        };
      });
      // Sort by timestamp descending (newest first)
      return history.sort((a, b) => b.timestamp - a.timestamp);
    }
  } catch (error) {
    console.error("Failed to parse history from localStorage", error);
    localStorage.removeItem(HISTORY_KEY);
  }
  return [];
}

export function addHistoryItem(item: HistoryItem): void {
  const history = getHistory();
  // Prevent duplicates and limit history size
  const newHistory = [item, ...history.filter(h => h.id !== item.id)].slice(0, 50);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  } catch (error) {
    console.error("Failed to save history to localStorage", error);
  }
}

export function clearHistory(): void {
    try {
        localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
        console.error("Failed to clear history from localStorage", error);
    }
}
