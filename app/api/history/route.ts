import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getHistoryFromDB, addHistoryItemToDB, clearHistoryFromDB } from '@/app/services/historyServiceDB';
import { logger } from '@/app/utils/logger';
import { AppError, createErrorResponse } from '@/app/types/errors';
import { historyQueue } from '@/app/utils/historyQueue';

export async function GET(req: Request) {
  const requestId = req.headers.get('X-Request-ID') || `req_${Date.now()}`;
  logger.info('Get history request started', { endpoint: '/api/history' }, requestId);

  try {
    const { userId } = await auth();
    
    if (!userId) {
      const error = new AppError('UNAUTHORIZED', 'Authentication required');
      logger.warn('Unauthorized get history attempt', {}, requestId);
      return NextResponse.json(createErrorResponse(error), { status: 401, headers: { 'X-Request-ID': requestId } });
    }

    const history = await getHistoryFromDB(userId, requestId);
    logger.info('Get history request successful', { historyCount: history.length }, requestId);
    return NextResponse.json({ history }, { headers: { 'X-Request-ID': requestId } });
  } catch (error: unknown) {
    logger.error('Error fetching history', error, requestId);
    const apiError = createErrorResponse(error, 'DATABASE_ERROR');
    return NextResponse.json(apiError, { status: 500, headers: { 'X-Request-ID': requestId } });
  }
}

export async function POST(req: Request) {
  const requestId = req.headers.get('X-Request-ID') || `req_${Date.now()}`;
  logger.info('Post history request started', { endpoint: '/api/history' }, requestId);

  try {
    const { userId } = await auth();
    
    if (!userId) {
      const error = new AppError('UNAUTHORIZED', 'Authentication required');
      logger.warn('Unauthorized post history attempt', {}, requestId);
      return NextResponse.json(createErrorResponse(error), { status: 401, headers: { 'X-Request-ID': requestId } });
    }

    const historyItem = await req.json();
    const saved = await addHistoryItemToDB(userId, historyItem, requestId);

    if (!saved) {
      // Queue for retry with exponential backoff
      historyQueue.enqueue(userId, historyItem);
      
      logger.warn('Failed to save history item to database; queued for retry', {
        queueSize: historyQueue.getQueueSize(),
      }, requestId);
      
      return NextResponse.json({ 
        success: true, 
        saved: false,
        queued: true,
        queueSize: historyQueue.getQueueSize(),
      }, { headers: { 'X-Request-ID': requestId } });
    }

    logger.info('Post history request successful', {}, requestId);
    return NextResponse.json({ success: true, saved: true }, { headers: { 'X-Request-ID': requestId } });
  } catch (error: unknown) {
    logger.error('Error adding history', error, requestId);
    const apiError = createErrorResponse(error, 'DATABASE_ERROR');
    return NextResponse.json(apiError, { status: 500, headers: { 'X-Request-ID': requestId } });
  }
}

export async function DELETE(req: Request) {
  const requestId = req.headers.get('X-Request-ID') || `req_${Date.now()}`;
  logger.info('Delete history request started', { endpoint: '/api/history' }, requestId);

  try {
    const { userId } = await auth();
    
    if (!userId) {
      const error = new AppError('UNAUTHORIZED', 'Authentication required');
      logger.warn('Unauthorized delete history attempt', {}, requestId);
      return NextResponse.json(createErrorResponse(error), { status: 401, headers: { 'X-Request-ID': requestId } });
    }

    await clearHistoryFromDB(userId, requestId);
    logger.info('Delete history request successful', {}, requestId);
    return NextResponse.json({ success: true }, { headers: { 'X-Request-ID': requestId } });
  } catch (error: unknown) {
    logger.error('Error clearing history', error, requestId);
    const apiError = createErrorResponse(error, 'DATABASE_ERROR');
    return NextResponse.json(apiError, { status: 500, headers: { 'X-Request-ID': requestId } });
  }
}
