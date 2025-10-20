import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/prisma';
import { logger } from '@/app/utils/logger';
import { AppError, createErrorResponse } from '@/app/types/errors';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      const error = new AppError('UNAUTHORIZED', 'Authentication required');
      return NextResponse.json(createErrorResponse(error), { status: 401 });
    }

    const subscription = await prisma.userSubscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return NextResponse.json({ subscription: null });
    }

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: subscription.plan,
        currentPeriodEnd: subscription.currentPeriodEnd?.getTime(),
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
    });
  } catch (error: unknown) {
    logger.error('Error fetching subscription:', error);
    const apiError = createErrorResponse(error, 'DATABASE_ERROR');
    return NextResponse.json(apiError, { status: 500 });
  }
}
