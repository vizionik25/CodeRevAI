import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    console.error('Error fetching subscription:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch subscription';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
