import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/prisma';
import { logger } from '@/app/utils/logger';
import { AppError, createErrorResponse } from '@/app/types/errors';

export async function GET(req: Request) {
  const requestId = req.headers.get('X-Request-ID') || `req_${Date.now()}`;
  logger.info('Get subscription request started', { endpoint: '/api/subscription' }, requestId);

  try {
    const { userId } = await auth();
    
    if (!userId) {
      const error = new AppError('UNAUTHORIZED', 'Authentication required');
      logger.warn('Unauthorized get subscription attempt', {}, requestId);
      return NextResponse.json(createErrorResponse(error), { status: 401, headers: { 'X-Request-ID': requestId } });
    }

    const subscription = await prisma.userSubscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      logger.info('No subscription found for user', { userId }, requestId);
      return NextResponse.json({ subscription: null }, { headers: { 'X-Request-ID': requestId } });
    }

    logger.info('Get subscription request successful', { userId, plan: subscription.plan }, requestId);
    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: subscription.plan,
        currentPeriodEnd: subscription.currentPeriodEnd?.getTime(),
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
    }, { headers: { 'X-Request-ID': requestId } });
  } catch (error: unknown) {
    logger.error('Error fetching subscription', error, requestId);
    const apiError = createErrorResponse(error, 'DATABASE_ERROR');
    return NextResponse.json(apiError, { status: 500, headers: { 'X-Request-ID': requestId } });
  }
}
