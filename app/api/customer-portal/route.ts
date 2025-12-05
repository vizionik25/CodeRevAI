import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe } from '@/app/utils/apiClients';
import { prisma } from '@/app/lib/prisma';
import { logger } from '@/app/utils/logger';
import { AppError, createErrorResponse } from '@/app/types/errors';

export async function POST(req: NextRequest) {
    const requestId = req.headers.get('X-Request-ID') || `req_${Date.now()}`;
    logger.info('Customer portal request started', { endpoint: '/api/customer-portal' }, requestId);

    try {
        const { userId } = await auth();

        if (!userId) {
            const error = new AppError('UNAUTHORIZED', 'Authentication required');
            logger.warn('Unauthorized customer portal attempt', {}, requestId);
            return NextResponse.json(
                createErrorResponse(error),
                { status: 401, headers: { 'X-Request-ID': requestId } }
            );
        }

        // Get user's subscription from database
        const userSubscription = await prisma.userSubscription.findUnique({
            where: { userId },
        });

        if (!userSubscription || !userSubscription.stripeCustomerId) {
            const error = new AppError('INVALID_INPUT', 'No active subscription found');
            logger.warn('Customer portal requested without subscription', { userId }, requestId);
            return NextResponse.json(
                createErrorResponse(error),
                { status: 400, headers: { 'X-Request-ID': requestId } }
            );
        }

        const stripeInstance = getStripe();

        // Create Stripe billing portal session
        const portalSession = await stripeInstance.billingPortal.sessions.create({
            customer: userSubscription.stripeCustomerId,
            return_url: `${req.headers.get('origin')}/billing`,
        });

        logger.info('Customer portal session created', { userId, customerId: userSubscription.stripeCustomerId }, requestId);
        return NextResponse.json({ url: portalSession.url }, { headers: { 'X-Request-ID': requestId } });
    } catch (error: unknown) {
        logger.error('Error creating customer portal session', error, requestId);

        const apiError = createErrorResponse(error, 'PAYMENT_ERROR');
        return NextResponse.json(
            apiError,
            { status: 500, headers: { 'X-Request-ID': requestId } }
        );
    }
}
