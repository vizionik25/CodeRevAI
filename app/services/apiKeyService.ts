import { prisma } from '@/app/lib/prisma';
import crypto from 'crypto';

// Use a secure prefix for keys to make them identifiable
const KEY_PREFIX = 'sk_live_';

export interface CreateApiKeyResult {
    key: string;
    keyId: string;
}

/**
 * Service for managing API keys
 * Keys are stored as hashes for security. The plain text key is only returned once upon creation.
 */
export const apiKeyService = {
    /**
     * Generate a new API key for a user
     */
    async createApiKey(userId: string, name: string): Promise<CreateApiKeyResult> {
        // Generate secure random bytes
        const randomBytes = crypto.randomBytes(24).toString('hex');
        const plainTextKey = `${KEY_PREFIX}${randomBytes}`;

        // Hash the key for storage
        const keyHash = crypto
            .createHash('sha256')
            .update(plainTextKey)
            .digest('hex');

        // Store in database
        const apiKey = await prisma.apiKey.create({
            data: {
                userId,
                name,
                keyHash,
            },
        });

        return {
            key: plainTextKey, // Returned only once
            keyId: apiKey.id,
        };
    },

    /**
     * Validate an API key and update its lastUsed timestamp
     */
    async validateApiKey(plainTextKey: string): Promise<string | null> {
        if (!plainTextKey.startsWith(KEY_PREFIX)) {
            return null;
        }

        const keyHash = crypto
            .createHash('sha256')
            .update(plainTextKey)
            .digest('hex');

        const apiKey = await prisma.apiKey.findUnique({
            where: { keyHash },
        });

        if (!apiKey || !apiKey.isActive) {
            return null;
        }

        // Async update of usage stats (fail-safe)
        prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { lastUsed: new Date() },
        }).catch(err => {
            console.error('Failed to update API key stats', err);
        });

        return apiKey.userId;
    },

    /**
     * Revoke/Delete an API key
     */
    async revokeApiKey(keyId: string, userId: string): Promise<void> {
        await prisma.apiKey.deleteMany({
            where: {
                id: keyId,
                userId, // Ensure ownership
            },
        });
    },

    /**
     * List API keys for a user
     */
    async listApiKeys(userId: string) {
        return prisma.apiKey.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                createdAt: true,
                lastUsed: true,
                isActive: true,
                // Never select keyHash
            },
        });
    }
};
