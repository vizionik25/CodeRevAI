/**
 * Tests for History Service Database Operations
 * Tests CRUD operations, error handling, and data transformation
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { getHistoryFromDB, addHistoryItemToDB, clearHistoryFromDB } from './historyServiceDB';
import { prisma } from '@/app/lib/prisma';
import { logger } from '@/app/utils/logger';

// Mock Prisma
vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    reviewHistory: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// Mock the logger to avoid console output during tests
vi.mock('@/app/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('History Service Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getHistoryFromDB', () => {
    const mockUserId = 'user_123';
    
    const mockDatabaseRecords = [
      {
        id: 'history_1',
        userId: mockUserId,
        type: 'code',
        language: 'javascript',
        reviewModes: ['security', 'performance'],
        timestamp: new Date('2025-01-01T10:00:00Z'),
        codeSnippet: 'console.log("Hello");',
        feedback: 'Code looks good!',
        repoUrl: null,
        fileName: 'test.js',
      },
      {
        id: 'history_2',
        userId: mockUserId,
        type: 'repository',
        language: 'typescript',
        reviewModes: ['comprehensive'],
        timestamp: new Date('2025-01-01T09:00:00Z'),
        codeSnippet: null,
        feedback: 'Repository review completed',
        repoUrl: 'https://github.com/user/repo',
        fileName: null,
      },
      {
        id: 'history_3',
        userId: mockUserId,
        type: 'code',
        language: null,
        reviewModes: ['bug_fixes'],
        timestamp: new Date('2025-01-01T08:00:00Z'),
        codeSnippet: 'some code',
        feedback: 'Found potential issues',
        repoUrl: null,
        fileName: null,
      },
    ];

    it('should fetch and transform history records successfully', async () => {
      (prisma.reviewHistory.findMany as Mock).mockResolvedValue(mockDatabaseRecords);

      const result = await getHistoryFromDB(mockUserId);

      expect(prisma.reviewHistory.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { timestamp: 'desc' },
        take: 50,
      });

      expect(result).toHaveLength(3);

      // Check first record transformation
      expect(result[0]).toEqual({
        id: 'history_1',
        timestamp: new Date('2025-01-01T10:00:00Z').getTime(),
        fileName: 'test.js',
        language: 'javascript',
        feedback: 'Code looks good!',
        code: 'console.log("Hello");',
        mode: ['security', 'performance'],
        reviewType: 'file',
      });

      // Check repository record transformation
      expect(result[1]).toEqual({
        id: 'history_2',
        timestamp: new Date('2025-01-01T09:00:00Z').getTime(),
        fileName: 'https://github.com/user/repo',
        language: 'typescript',
        feedback: 'Repository review completed',
        code: '',
        mode: ['comprehensive'],
        reviewType: 'repo',
      });

      // Check record with missing optional fields
      expect(result[2]).toEqual({
        id: 'history_3',
        timestamp: new Date('2025-01-01T08:00:00Z').getTime(),
        fileName: 'Unknown',
        language: 'text',
        feedback: 'Found potential issues',
        code: 'some code',
        mode: ['bug_fixes'],
        reviewType: 'file',
      });
    });

    it('should handle empty result from database', async () => {
      (prisma.reviewHistory.findMany as Mock).mockResolvedValue([]);

      const result = await getHistoryFromDB(mockUserId);

      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      (prisma.reviewHistory.findMany as Mock).mockRejectedValue(dbError);

      const result = await getHistoryFromDB(mockUserId);

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith('Error fetching history from database:', dbError);
    });

    it('should respect the 50 record limit', async () => {
      (prisma.reviewHistory.findMany as Mock).mockResolvedValue([]);

      await getHistoryFromDB(mockUserId);

      expect(prisma.reviewHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });

    it('should order results by timestamp descending', async () => {
      (prisma.reviewHistory.findMany as Mock).mockResolvedValue([]);

      await getHistoryFromDB(mockUserId);

      expect(prisma.reviewHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { timestamp: 'desc' },
        })
      );
    });

    it('should filter by userId correctly', async () => {
      (prisma.reviewHistory.findMany as Mock).mockResolvedValue([]);

      await getHistoryFromDB(mockUserId);

      expect(prisma.reviewHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserId },
        })
      );
    });
  });

  describe('addHistoryItemToDB', () => {
    const mockUserId = 'user_123';
    const mockTimestamp = 1704110400000; // 2025-01-01T10:00:00Z

    const mockHistoryItem = {
      timestamp: mockTimestamp,
      fileName: 'test.js',
      language: 'javascript',
      feedback: 'Code review completed',
      code: 'console.log("Hello World");'.repeat(20), // Long code snippet
      mode: ['security', 'performance'],
      reviewType: 'file' as const,
    };

    const mockRepoHistoryItem = {
      timestamp: mockTimestamp,
      fileName: 'https://github.com/user/repo',
      language: 'typescript',
      feedback: 'Repository analysis done',
      code: '',
      mode: ['comprehensive'],
      reviewType: 'repo' as const,
    };

    it('should save file review history successfully', async () => {
      (prisma.reviewHistory.create as Mock).mockResolvedValue({
        id: 'history_new',
        ...mockHistoryItem,
      });

      const result = await addHistoryItemToDB(mockUserId, mockHistoryItem);

      expect(result).toBe(true);
      expect(prisma.reviewHistory.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          type: 'code',
          language: 'javascript',
          reviewModes: ['security', 'performance'],
          codeSnippet: mockHistoryItem.code.substring(0, 500),
          feedback: 'Code review completed',
          repoUrl: undefined,
          fileName: 'test.js',
          timestamp: new Date(mockTimestamp),
        },
      });
    });

    it('should save repository review history successfully', async () => {
      (prisma.reviewHistory.create as Mock).mockResolvedValue({
        id: 'history_repo',
        ...mockRepoHistoryItem,
      });

      const result = await addHistoryItemToDB(mockUserId, mockRepoHistoryItem);

      expect(result).toBe(true);
      expect(prisma.reviewHistory.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          type: 'repository',
          language: 'typescript',
          reviewModes: ['comprehensive'],
          codeSnippet: '',
          feedback: 'Repository analysis done',
          repoUrl: 'https://github.com/user/repo',
          fileName: undefined,
          timestamp: new Date(mockTimestamp),
        },
      });
    });

    it('should truncate code snippet to 500 characters', async () => {
      const longCode = 'x'.repeat(1000);
      const itemWithLongCode = {
        ...mockHistoryItem,
        code: longCode,
      };

      (prisma.reviewHistory.create as Mock).mockResolvedValue({});

      await addHistoryItemToDB(mockUserId, itemWithLongCode);

      expect(prisma.reviewHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          codeSnippet: longCode.substring(0, 500),
        }),
      });
    });

    it('should handle database errors gracefully and return false', async () => {
      const dbError = new Error('Database constraint violation');
      (prisma.reviewHistory.create as Mock).mockRejectedValue(dbError);

      const result = await addHistoryItemToDB(mockUserId, mockHistoryItem);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Error saving history to database:', dbError);
    });

    it('should handle missing optional fields', async () => {
      const minimalItem = {
        timestamp: mockTimestamp,
        fileName: 'test.js',
        language: 'javascript',
        feedback: 'Review done',
        code: '',
        mode: ['security'],
        reviewType: 'file' as const,
      };

      (prisma.reviewHistory.create as Mock).mockResolvedValue({});

      const result = await addHistoryItemToDB(mockUserId, minimalItem);

      expect(result).toBe(true);
      expect(prisma.reviewHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          codeSnippet: '',
        }),
      });
    });

    it('should convert timestamp to Date object correctly', async () => {
      (prisma.reviewHistory.create as Mock).mockResolvedValue({});

      await addHistoryItemToDB(mockUserId, mockHistoryItem);

      expect(prisma.reviewHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          timestamp: new Date(mockTimestamp),
        }),
      });
    });

    it('should handle empty review modes array', async () => {
      const itemWithEmptyModes = {
        ...mockHistoryItem,
        mode: [],
      };

      (prisma.reviewHistory.create as Mock).mockResolvedValue({});

      const result = await addHistoryItemToDB(mockUserId, itemWithEmptyModes);

      expect(result).toBe(true);
      expect(prisma.reviewHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reviewModes: [],
        }),
      });
    });
  });

  describe('clearHistoryFromDB', () => {
    const mockUserId = 'user_123';

    it('should clear all history for user successfully', async () => {
      (prisma.reviewHistory.deleteMany as Mock).mockResolvedValue({ count: 5 });

      await clearHistoryFromDB(mockUserId);

      expect(prisma.reviewHistory.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });

    it('should handle no records to delete', async () => {
      (prisma.reviewHistory.deleteMany as Mock).mockResolvedValue({ count: 0 });

      await expect(clearHistoryFromDB(mockUserId)).resolves.not.toThrow();
    });

    it('should throw error when database operation fails', async () => {
      const dbError = new Error('Delete operation failed');
      (prisma.reviewHistory.deleteMany as Mock).mockRejectedValue(dbError);

      await expect(clearHistoryFromDB(mockUserId)).rejects.toThrow('Delete operation failed');
      expect(logger.error).toHaveBeenCalledWith('Error clearing history from database:', dbError);
    });

    it('should only delete records for specified user', async () => {
      (prisma.reviewHistory.deleteMany as Mock).mockResolvedValue({ count: 3 });

      await clearHistoryFromDB(mockUserId);

      expect(prisma.reviewHistory.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });
  });

  describe('Data Transformation Edge Cases', () => {
    const mockUserId = 'user_123';

    it('should handle missing fileName and repoUrl by using Unknown', async () => {
      const recordWithoutFileInfo = {
        id: 'history_1',
        userId: mockUserId,
        type: 'code',
        language: 'javascript',
        reviewModes: ['security'],
        timestamp: new Date('2025-01-01T10:00:00Z'),
        codeSnippet: 'code',
        feedback: 'feedback',
        repoUrl: null,
        fileName: null,
      };

      (prisma.reviewHistory.findMany as Mock).mockResolvedValue([recordWithoutFileInfo]);

      const result = await getHistoryFromDB(mockUserId);

      expect(result[0].fileName).toBe('Unknown');
    });

    it('should use repoUrl when fileName is null for repository type', async () => {
      const repoRecord = {
        id: 'history_1',
        userId: mockUserId,
        type: 'repository',
        language: 'typescript',
        reviewModes: ['comprehensive'],
        timestamp: new Date('2025-01-01T10:00:00Z'),
        codeSnippet: null,
        feedback: 'feedback',
        repoUrl: 'https://github.com/user/repo',
        fileName: null,
      };

      (prisma.reviewHistory.findMany as Mock).mockResolvedValue([repoRecord]);

      const result = await getHistoryFromDB(mockUserId);

      expect(result[0].fileName).toBe('https://github.com/user/repo');
      expect(result[0].reviewType).toBe('repo');
    });

    it('should handle null codeSnippet by converting to empty string', async () => {
      const recordWithNullCode = {
        id: 'history_1',
        userId: mockUserId,
        type: 'repository',
        language: 'typescript',
        reviewModes: ['comprehensive'],
        timestamp: new Date('2025-01-01T10:00:00Z'),
        codeSnippet: null,
        feedback: 'feedback',
        repoUrl: 'https://github.com/user/repo',
        fileName: null,
      };

      (prisma.reviewHistory.findMany as Mock).mockResolvedValue([recordWithNullCode]);

      const result = await getHistoryFromDB(mockUserId);

      expect(result[0].code).toBe('');
    });

    it('should default language to text when null', async () => {
      const recordWithNullLanguage = {
        id: 'history_1',
        userId: mockUserId,
        type: 'code',
        language: null,
        reviewModes: ['security'],
        timestamp: new Date('2025-01-01T10:00:00Z'),
        codeSnippet: 'code',
        feedback: 'feedback',
        repoUrl: null,
        fileName: 'test.txt',
      };

      (prisma.reviewHistory.findMany as Mock).mockResolvedValue([recordWithNullLanguage]);

      const result = await getHistoryFromDB(mockUserId);

      expect(result[0].language).toBe('text');
    });
  });

  describe('Error Logging', () => {
    const mockUserId = 'user_123';

    it('should log specific error details for getHistoryFromDB failures', async () => {
      const specificError = new Error('Connection timeout after 30s');
      (prisma.reviewHistory.findMany as Mock).mockRejectedValue(specificError);

      await getHistoryFromDB(mockUserId);

      expect(logger.error).toHaveBeenCalledWith('Error fetching history from database:', specificError);
    });

    it('should log specific error details for addHistoryItemToDB failures', async () => {
      const constraintError = new Error('UNIQUE constraint violation');
      (prisma.reviewHistory.create as Mock).mockRejectedValue(constraintError);

      const mockItem = {
        timestamp: Date.now(),
        fileName: 'test.js',
        language: 'javascript',
        feedback: 'feedback',
        code: 'code',
        mode: ['security'],
        reviewType: 'file' as const,
      };

      await addHistoryItemToDB(mockUserId, mockItem);

      expect(logger.error).toHaveBeenCalledWith('Error saving history to database:', constraintError);
    });

    it('should log specific error details for clearHistoryFromDB failures', async () => {
      const permissionError = new Error('Insufficient permissions');
      (prisma.reviewHistory.deleteMany as Mock).mockRejectedValue(permissionError);

      await expect(clearHistoryFromDB(mockUserId)).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith('Error clearing history from database:', permissionError);
    });
  });
});