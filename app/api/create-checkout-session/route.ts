import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe } from '@/app/utils/apiClients';
import { logger } from '@/app/utils/logger';
import { AppError, createErrorResponse } from '@/app/types/errors';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      const error = new AppError('UNAUTHORIZED', 'Authentication required');
      return NextResponse.json(
        createErrorResponse(error),
        { status: 401 }
      );
    }

    const { priceId, plan } = await req.json();

    if (!priceId) {
      const error = new AppError('INVALID_INPUT', 'Price ID is required');
      return NextResponse.json(
        createErrorResponse(error),
        { status: 400 }
      );
    }

    const stripeInstance = getStripe();

    // Create Checkout Session
    const session = await stripeInstance.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get('origin')}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/?canceled=true`,
      metadata: {
        userId,
        plan,
      },
      subscription_data: {
        metadata: {
          userId,
          plan,
        },
      },
    });

    // Return the checkout URL for direct redirect (Stripe API 2025-09-30+)
    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    logger.error('Error creating checkout session:', error);
    
    const apiError = createErrorResponse(error, 'PAYMENT_ERROR');
    return NextResponse.json(
      apiError,
      { status: 500 }
    );
  }
}
