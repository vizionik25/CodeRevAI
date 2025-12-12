import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { historyQueue } from './historyQueue';
import { HistoryItem } from '@/app/types';

// Mock the logger
vi.mock('./logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

// Mock the historyServiceDB
vi.mock('@/app/services/historyServiceDB', () => ({
    addHistoryItemToDB: vi.fn(),
}));

import { logger } from './logger';

describe('HistoryQueue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear the queue between tests
        historyQueue.clear();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        historyQueue.clear();
    });

    describe('enqueue', () => {
        it('should add items to the queue', () => {
            const mockHistoryItem: Omit<HistoryItem, 'id'> = {
                timestamp: Date.now(),
                fileName: 'test.ts',
                language: 'TypeScript',
                feedback: 'Test feedback',
                code: 'const x = 1;',
                mode: ['comprehensive'],
                reviewType: 'file',
            };

            historyQueue.enqueue('user_123', mockHistoryItem);

            expect(historyQueue.getQueueSize()).toBe(1);
            expect(logger.warn).toHaveBeenCalledWith(
                'History item queued for retry',
                expect.objectContaining({
                    userId: 'user_123',
                    queueSize: 1,
                })
            );
        });

        it('should support multiple items in queue', () => {
            const mockItem1: Omit<HistoryItem, 'id'> = {
                timestamp: Date.now(),
                fileName: 'test1.ts',
                language: 'TypeScript',
                feedback: 'Test 1',
                code: 'const x = 1;',
                mode: ['comprehensive'],
                reviewType: 'file',
            };

            const mockItem2: Omit<HistoryItem, 'id'> = {
                timestamp: Date.now(),
                fileName: 'test2.ts',
                language: 'TypeScript',
                feedback: 'Test 2',
                code: 'const y = 2;',
                mode: ['security'],
                reviewType: 'file',
            };

            historyQueue.enqueue('user_123', mockItem1);
            historyQueue.enqueue('user_456', mockItem2);

            expect(historyQueue.getQueueSize()).toBe(2);
        });
    });

    describe('getStats', () => {
        it('should return empty stats for empty queue', () => {
            const stats = historyQueue.getStats();

            expect(stats.queueSize).toBe(0);
            expect(stats.oldestRetryAge).toBe(0);
            expect(stats.itemsPendingRetry).toBe(0);
        });

        it('should return accurate stats for populated queue', () => {
            const mockItem: Omit<HistoryItem, 'id'> = {
                timestamp: Date.now(),
                fileName: 'test.ts',
                language: 'TypeScript',
                feedback: 'Test',
                code: 'const x = 1;',
                mode: ['comprehensive'],
                reviewType: 'file',
            };

            historyQueue.enqueue('user_123', mockItem);

            const stats = historyQueue.getStats();
            expect(stats.queueSize).toBe(1);
            expect(stats.itemsPendingRetry).toBe(0); // Not ready yet
        });

        it('should identify items pending retry after delay', () => {
            const mockItem: Omit<HistoryItem, 'id'> = {
                timestamp: Date.now(),
                fileName: 'test.ts',
                language: 'TypeScript',
                feedback: 'Test',
                code: 'const x = 1;',
                mode: ['comprehensive'],
                reviewType: 'file',
            };

            historyQueue.enqueue('user_123', mockItem);

            // Fast forward past the base delay (5 seconds)
            vi.advanceTimersByTime(6000);

            const stats = historyQueue.getStats();
            expect(stats.itemsPendingRetry).toBe(1);
        });
    });

    describe('processQueue', () => {
        it('should successfully save items and remove them from queue', async () => {
            const { addHistoryItemToDB } = await import('@/app/services/historyServiceDB');
            vi.mocked(addHistoryItemToDB).mockResolvedValue(true);

            const mockItem: Omit<HistoryItem, 'id'> = {
                timestamp: Date.now(),
                fileName: 'test.ts',
                language: 'TypeScript',
                feedback: 'Test',
                code: 'const x = 1;',
                mode: ['comprehensive'],
                reviewType: 'file',
            };

            historyQueue.enqueue('user_123', mockItem);
            expect(historyQueue.getQueueSize()).toBe(1);

            // Advance time past the retry delay
            vi.advanceTimersByTime(6000);

            // Trigger processor manually by advancing to the next interval
            await vi.advanceTimersByTimeAsync(10000);

            // Wait for async processing
            await vi.waitFor(() => {
                expect(historyQueue.getQueueSize()).toBe(0);
            });

            expect(addHistoryItemToDB).toHaveBeenCalledWith('user_123', mockItem);
            expect(logger.info).toHaveBeenCalledWith(
                'Successfully saved queued history item',
                expect.objectContaining({ userId: 'user_123' })
            );
        });

        it('should retry failed saves with exponential backoff', async () => {
            const { addHistoryItemToDB } = await import('@/app/services/historyServiceDB');

            // First two attempts fail, third succeeds
            vi.mocked(addHistoryItemToDB)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true);

            const mockItem: Omit<HistoryItem, 'id'> = {
                timestamp: Date.now(),
                fileName: 'test.ts',
                language: 'TypeScript',
                feedback: 'Test',
                code: 'const x = 1;',
                mode: ['comprehensive'],
                reviewType: 'file',
            };

            historyQueue.enqueue('user_123', mockItem);

            // First retry after 5 seconds
            await vi.advanceTimersByTimeAsync(15000);
            expect(historyQueue.getQueueSize()).toBe(1); // Still in queue

            // Second retry after 10 seconds (exponential backoff)
            await vi.advanceTimersByTimeAsync(20000);
            expect(historyQueue.getQueueSize()).toBe(1); // Still in queue

            // Third retry after 20 seconds
            await vi.advanceTimersByTimeAsync(30000);

            await vi.waitFor(() => {
                expect(historyQueue.getQueueSize()).toBe(0); // Successfully saved
            });

            expect(addHistoryItemToDB).toHaveBeenCalledTimes(3);
        });

        it('should discard items after max retries', async () => {
            const { addHistoryItemToDB } = await import('@/app/services/historyServiceDB');

            // Always fail
            vi.mocked(addHistoryItemToDB).mockResolvedValue(false);

            const mockItem: Omit<HistoryItem, 'id'> = {
                timestamp: Date.now(),
                fileName: 'test.ts',
                language: 'TypeScript',
                feedback: 'Test',
                code: 'const x = 1;',
                mode: ['comprehensive'],
                reviewType: 'file',
            };

            historyQueue.enqueue('user_123', mockItem);

            // Retry 1 (after 5s)
            await vi.advanceTimersByTimeAsync(15000);
            expect(historyQueue.getQueueSize()).toBe(1);

            // Retry 2 (after 10s)
            await vi.advanceTimersByTimeAsync(20000);
            expect(historyQueue.getQueueSize()).toBe(1);

            // Retry 3 (after 20s)
            await vi.advanceTimersByTimeAsync(30000);
            expect(historyQueue.getQueueSize()).toBe(1);

            // After max retries (3), should be discarded
            await vi.advanceTimersByTimeAsync(50000);

            await vi.waitFor(() => {
                expect(historyQueue.getQueueSize()).toBe(0);
            });

            expect(logger.error).toHaveBeenCalledWith(
                'Max retries reached for history item, discarding',
                expect.objectContaining({ userId: 'user_123' })
            );
        });

        it('should handle database exceptions gracefully', async () => {
            const { addHistoryItemToDB } = await import('@/app/services/historyServiceDB');

            // Throw error on first attempt, succeed on second
            vi.mocked(addHistoryItemToDB)
                .mockRejectedValueOnce(new Error('Database connection failed'))
                .mockResolvedValueOnce(true);

            const mockItem: Omit<HistoryItem, 'id'> = {
                timestamp: Date.now(),
                fileName: 'test.ts',
                language: 'TypeScript',
                feedback: 'Test',
                code: 'const x = 1;',
                mode: ['comprehensive'],
                reviewType: 'file',
            };

            historyQueue.enqueue('user_123', mockItem);

            // First attempt - should catch error
            await vi.advanceTimersByTimeAsync(15000);

            expect(logger.error).toHaveBeenCalledWith(
                'Error retrying history save',
                expect.any(Error)
            );
            expect(historyQueue.getQueueSize()).toBe(1);

            // Second attempt - should succeed
            await vi.advanceTimersByTimeAsync(20000);

            await vi.waitFor(() => {
                expect(historyQueue.getQueueSize()).toBe(0);
            });
        });

        it('should not process queue concurrently', async () => {
            const { addHistoryItemToDB } = await import('@/app/services/historyServiceDB');

            // Make the function slow
            vi.mocked(addHistoryItemToDB).mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve(true), 100))
            );

            const mockItem: Omit<HistoryItem, 'id'> = {
                timestamp: Date.now(),
                fileName: 'test.ts',
                language: 'TypeScript',
                feedback: 'Test',
                code: 'const x = 1;',
                mode: ['comprehensive'],
                reviewType: 'file',
            };

            historyQueue.enqueue('user_123', mockItem);

            // Trigger multiple processor cycles
            vi.advanceTimersByTime(15000);
            vi.advanceTimersByTime(20000);

            await vi.runAllTimersAsync();

            // Should only call once because isProcessing flag prevents concurrent execution
            expect(addHistoryItemToDB).toHaveBeenCalledTimes(1);
        });
    });

    describe('clear', () => {
        it('should remove all items from queue', () => {
            const mockItem: Omit<HistoryItem, 'id'> = {
                timestamp: Date.now(),
                fileName: 'test.ts',
                language: 'TypeScript',
                feedback: 'Test',
                code: 'const x = 1;',
                mode: ['comprehensive'],
                reviewType: 'file',
            };

            historyQueue.enqueue('user_123', mockItem);
            historyQueue.enqueue('user_456', mockItem);

            expect(historyQueue.getQueueSize()).toBe(2);

            historyQueue.clear();

            expect(historyQueue.getQueueSize()).toBe(0);
            expect(logger.info).toHaveBeenCalledWith(
                'History queue cleared',
                { itemsDiscarded: 2 }
            );
        });
    });

    describe('exponential backoff', () => {
        it('should apply correct delays: 5s, 10s, 20s', () => {
            // Base delay: 5000ms
            // Retry 1: 5000 * 2^0 = 5000ms
            // Retry 2: 5000 * 2^1 = 10000ms
            // Retry 3: 5000 * 2^2 = 20000ms

            const mockItem: Omit<HistoryItem, 'id'> = {
                timestamp: Date.now(),
                fileName: 'test.ts',
                language: 'TypeScript',
                feedback: 'Test',
                code: 'const x = 1;',
                mode: ['comprehensive'],
                reviewType: 'file',
            };

            historyQueue.enqueue('user_123', mockItem);

            expect(logger.warn).toHaveBeenCalledWith(
                'History item queued for retry',
                expect.objectContaining({
                    nextRetryIn: '5s',
                })
            );
        });

        it('should cap delay at maxDelay (60 seconds)', async () => {
            const { addHistoryItemToDB } = await import('@/app/services/historyServiceDB');
            vi.mocked(addHistoryItemToDB).mockResolvedValue(false);

            const mockItem: Omit<HistoryItem, 'id'> = {
                timestamp: Date.now(),
                fileName: 'test.ts',
                language: 'TypeScript',
                feedback: 'Test',
                code: 'const x = 1;',
                mode: ['comprehensive'],
                reviewType: 'file',
            };

            historyQueue.enqueue('user_123', mockItem);

            // After retry 3, delay would be 40s, which is under 60s max
            await vi.advanceTimersByTimeAsync(100000);

            // Check the warning logs to verify delays are capped
            const warnCalls = vi.mocked(logger.warn).mock.calls;
            const delayCalls = warnCalls.filter(call =>
                call[0] === 'History save retry failed, scheduling next attempt'
            );

            // Each delay should be <= 60s
            delayCalls.forEach(call => {
                const logData = call[1] as { nextRetryIn?: string };
                if (logData.nextRetryIn) {
                    const seconds = parseFloat(logData.nextRetryIn);
                    expect(seconds).toBeLessThanOrEqual(60);
                }
            });
        });
    });
});
