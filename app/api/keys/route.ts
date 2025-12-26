import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { apiKeyService } from '@/app/services/apiKeyService';
import { AppError, createErrorResponse } from '@/app/types/errors';
import { logger } from '@/app/utils/logger';

export async function GET(req: NextRequest) {
    const requestId = req.headers.get('X-Request-ID') || `req_${Date.now()}`;

    try {
        const { userId } = await auth();
        if (!userId) {
            throw new AppError('UNAUTHORIZED', 'Authentication required');
        }

        const keys = await apiKeyService.listApiKeys(userId);
        return NextResponse.json(keys);
    } catch (error) {
        logger.error('Error listing API keys', error, requestId);
        return NextResponse.json(createErrorResponse(error), { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const requestId = req.headers.get('X-Request-ID') || `req_${Date.now()}`;

    try {
        const { userId } = await auth();
        if (!userId) {
            throw new AppError('UNAUTHORIZED', 'Authentication required');
        }

        const body = await req.json();
        const { name } = body;

        if (!name || typeof name !== 'string' || name.length > 50) {
            throw new AppError('INVALID_INPUT', 'Invalid key name');
        }

        const result = await apiKeyService.createApiKey(userId, name);

        logger.info('API key created', { userId, keyId: result.keyId }, requestId);
        return NextResponse.json(result);
    } catch (error) {
        logger.error('Error creating API key', error, requestId);
        const status = error instanceof AppError && error.code === 'INVALID_INPUT' ? 400 : 500;
        return NextResponse.json(createErrorResponse(error), { status });
    }
}

export async function DELETE(req: NextRequest) {
    const requestId = req.headers.get('X-Request-ID') || `req_${Date.now()}`;

    try {
        const { userId } = await auth();
        if (!userId) {
            throw new AppError('UNAUTHORIZED', 'Authentication required');
        }

        const { searchParams } = new URL(req.url);
        const keyId = searchParams.get('id');

        if (!keyId) {
            throw new AppError('INVALID_INPUT', 'Key ID required');
        }

        await apiKeyService.revokeApiKey(keyId, userId);

        logger.info('API key revoked', { userId, keyId }, requestId);
        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Error revoking API key', error, requestId);
        return NextResponse.json(createErrorResponse(error), { status: 500 });
    }
}
