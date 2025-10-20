/**
 * Lightweight in-memory queue for failed history saves with retry logic
 * Falls back gracefully when database is unavailable
 */

import { HistoryItem } from '@/app/types';
import { logger } from './logger';

interface QueuedHistoryItem {
  userId: string;
  item: Omit<HistoryItem, 'id'>;
  retries: number;
  nextRetryAt: number;
}

class HistoryQueue {
  private queue: QueuedHistoryItem[] = [];
  private maxRetries = 3;
  private baseDelay = 5000; // 5 seconds
  private maxDelay = 60000; // 1 minute
  private isProcessing = false;
  private processInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start background processor
    this.startProcessor();
  }

  /**
   * Add a failed history item to the retry queue
   */
  enqueue(userId: string, item: Omit<HistoryItem, 'id'>) {
    const queuedItem: QueuedHistoryItem = {
      userId,
      item,
      retries: 0,
      nextRetryAt: Date.now() + this.baseDelay,
    };

    this.queue.push(queuedItem);
    logger.warn('History item queued for retry', {
      userId,
      queueSize: this.queue.length,
      nextRetryIn: `${this.baseDelay / 1000}s`,
    });
  }

  /**
   * Get current queue size (for monitoring)
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      queueSize: this.queue.length,
      oldestRetryAge: this.queue.length > 0 
        ? Date.now() - (this.queue[0].nextRetryAt - this.baseDelay)
        : 0,
      itemsPendingRetry: this.queue.filter(item => item.nextRetryAt <= Date.now()).length,
    };
  }

  /**
   * Start background processor for retries
   */
  private startProcessor() {
    if (this.processInterval) return;

    // Process queue every 10 seconds
    this.processInterval = setInterval(() => {
      this.processQueue().catch(error => {
        logger.error('Error in history queue processor', error);
      });
    }, 10000);

    // Don't prevent Node from exiting if this is the only active timer
    if (this.processInterval.unref) {
      this.processInterval.unref();
    }
  }

  /**
   * Process items in the queue
   */
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const now = Date.now();
      const itemsToRetry = this.queue.filter(item => item.nextRetryAt <= now);

      if (itemsToRetry.length === 0) {
        this.isProcessing = false;
        return;
      }

      logger.info('Processing history retry queue', {
        itemsToRetry: itemsToRetry.length,
        totalQueueSize: this.queue.length,
      });

      // Import dynamically to avoid circular dependencies
      const { addHistoryItemToDB } = await import('@/app/services/historyServiceDB');

      for (const queuedItem of itemsToRetry) {
        try {
          const saved = await addHistoryItemToDB(queuedItem.userId, queuedItem.item);

          if (saved) {
            // Success! Remove from queue
            this.queue = this.queue.filter(item => item !== queuedItem);
            logger.info('Successfully saved queued history item', {
              userId: queuedItem.userId,
              retriesUsed: queuedItem.retries,
            });
          } else {
            // Still failed, schedule next retry
            queuedItem.retries++;

            if (queuedItem.retries >= this.maxRetries) {
              // Max retries reached, discard
              this.queue = this.queue.filter(item => item !== queuedItem);
              logger.error('Max retries reached for history item, discarding', {
                userId: queuedItem.userId,
                retries: queuedItem.retries,
              });
            } else {
              // Calculate next retry with exponential backoff
              const delay = Math.min(
                this.baseDelay * Math.pow(2, queuedItem.retries),
                this.maxDelay
              );
              queuedItem.nextRetryAt = now + delay;

              logger.warn('History save retry failed, scheduling next attempt', {
                userId: queuedItem.userId,
                retries: queuedItem.retries,
                nextRetryIn: `${delay / 1000}s`,
              });
            }
          }
        } catch (error) {
          // Unexpected error during retry
          logger.error('Error retrying history save', error);
          queuedItem.retries++;

          if (queuedItem.retries >= this.maxRetries) {
            this.queue = this.queue.filter(item => item !== queuedItem);
          } else {
            const delay = Math.min(
              this.baseDelay * Math.pow(2, queuedItem.retries),
              this.maxDelay
            );
            queuedItem.nextRetryAt = now + delay;
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Clear the queue (for testing or manual intervention)
   */
  clear() {
    const size = this.queue.length;
    this.queue = [];
    logger.info('History queue cleared', { itemsDiscarded: size });
  }

  /**
   * Stop the background processor (for graceful shutdown)
   */
  stop() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
  }
}

// Singleton instance
export const historyQueue = new HistoryQueue();
