import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getHistoryFromDB, addHistoryItemToDB, clearHistoryFromDB } from '@/app/services/historyServiceDB';
import { logger } from '@/app/utils/logger';
import { AppError, createErrorResponse } from '@/app/types/errors';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      const error = new AppError('UNAUTHORIZED', 'Authentication required');
      return NextResponse.json(createErrorResponse(error), { status: 401 });
    }

    const history = await getHistoryFromDB(userId);
    return NextResponse.json({ history });
  } catch (error: unknown) {
    logger.error('Error fetching history:', error);
    const apiError = createErrorResponse(error, 'DATABASE_ERROR');
    return NextResponse.json(apiError, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      const error = new AppError('UNAUTHORIZED', 'Authentication required');
      return NextResponse.json(createErrorResponse(error), { status: 401 });
    }

    const historyItem = await req.json();
    await addHistoryItemToDB(userId, historyItem);
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error('Error adding history:', error);
    const apiError = createErrorResponse(error, 'DATABASE_ERROR');
    return NextResponse.json(apiError, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      const error = new AppError('UNAUTHORIZED', 'Authentication required');
      return NextResponse.json(createErrorResponse(error), { status: 401 });
    }

    await clearHistoryFromDB(userId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error('Error clearing history:', error);
    const apiError = createErrorResponse(error, 'DATABASE_ERROR');
    return NextResponse.json(apiError, { status: 500 });
  }
}
