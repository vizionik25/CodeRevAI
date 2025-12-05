import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/app/utils/apiClients';
import { prisma } from '@/app/lib/prisma';
import { clerkClient } from '@clerk/nextjs/server';
import { logger } from '@/app/utils/logger';
import { AppError, createErrorResponse } from '@/app/types/errors';
import { serverEnv } from '@/app/config/env';

const webhookSecret = serverEnv.STRIPE_WEBHOOK_SECRET;

/**
 * Map Stripe Price ID to internal plan name
 * This ensures consistent plan assignment across all subscription events
 */
function getPlanFromPriceId(priceId: string | null | undefined): string {
  if (!priceId) return 'free';

  // Map Stripe Price IDs to plan names
  // TODO: Move this to app/data/constants.ts when you have actual price IDs
  const priceIdMap: Record<string, string> = {
    [serverEnv.STRIPE_PRICE_ID_PRO || '']: 'pro',
    // Add more price IDs as you create them:
    // 'price_xxxxx_enterprise': 'enterprise',
  };

  return priceIdMap[priceId] || 'pro'; // Default to pro for unmapped active subscriptions
}

export async function POST(req: NextRequest) {
  const requestId = `stripe_wh_${Date.now()}`;
  logger.info('Stripe webhook received', { endpoint: '/api/webhooks/stripe' }, requestId);

  try {
    if (!webhookSecret) {
      const error = new AppError('SERVICE_UNAVAILABLE', 'Webhook secret is not configured');
      logger.error('Stripe webhook secret missing', error, requestId);
      return NextResponse.json(
        createErrorResponse(error),
        { status: 500, headers: { 'X-Request-ID': requestId } }
      );
    }

    const stripeInstance = getStripe();

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      const error = new AppError('INVALID_INPUT', 'Missing stripe-signature header');
      logger.warn('Missing stripe-signature header', error, requestId);
      return NextResponse.json(
        createErrorResponse(error),
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripeInstance.webhooks.constructEvent(body, signature, webhookSecret);
      logger.info('Stripe webhook event constructed', { eventType: event.type }, requestId);
    } catch (err: any) {
      logger.error('Webhook signature verification failed', err, requestId);
      const error = new AppError('VALIDATION_ERROR', `Webhook signature verification failed: ${err.message}`);
      return NextResponse.json(
        createErrorResponse(error),
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;

        logger.info('Checkout session completed', {
          sessionId: session.id,
          userId: session.metadata?.userId,
          plan: session.metadata?.plan
        }, requestId);

        if (userId && plan && session.customer && session.subscription) {
          // Get price ID from line items to ensure accurate plan mapping
          const priceId = (session as any).line_items?.data[0]?.price?.id || null;
          const actualPlan = priceId ? getPlanFromPriceId(priceId) : plan;

          // Store subscription in database
          await prisma.userSubscription.upsert({
            where: { userId },
            update: {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              stripePriceId: priceId,
              plan: actualPlan,
              status: 'active',
              updatedAt: new Date(),
            },
            create: {
              userId,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              stripePriceId: priceId,
              plan: actualPlan,
              status: 'active',
            },
          });

          // Update Clerk user metadata
          const clerk = await clerkClient();
          await clerk.users.updateUserMetadata(userId, {
            publicMetadata: { plan: actualPlan },
          });

          logger.info('Subscription created for user', {
            userId,
            plan: actualPlan,
            priceId,
            subscriptionId: session.subscription
          }, requestId);
        }

        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const subData = subscription as any;
        logger.info('Subscription created', { subscriptionId: subscription.id }, requestId);

        // Find if we already have a user subscription for this customer
        const existingUserSub = await prisma.userSubscription.findUnique({
          where: { stripeCustomerId: subscription.customer as string },
        });

        if (existingUserSub) {
          // Get plan from price ID for consistency
          const priceId = subscription.items.data[0]?.price?.id || null;
          const newPlan = subscription.status === 'active' ? getPlanFromPriceId(priceId) : 'free';

          // Update existing subscription
          await prisma.userSubscription.update({
            where: { id: existingUserSub.id },
            data: {
              stripeSubscriptionId: subscription.id,
              stripePriceId: priceId,
              status: subscription.status,
              plan: newPlan,
              currentPeriodStart: subData.current_period_start ? new Date(subData.current_period_start * 1000) : null,
              currentPeriodEnd: subData.current_period_end ? new Date(subData.current_period_end * 1000) : null,
              cancelAtPeriodEnd: subData.cancel_at_period_end || false,
              updatedAt: new Date(),
            },
          });

          // Update Clerk metadata
          const clerk = await clerkClient();
          await clerk.users.updateUserMetadata(existingUserSub.userId, {
            publicMetadata: { plan: newPlan },
          });

          logger.info(`Subscription ${subscription.id} created for user ${existingUserSub.userId}`, { plan: newPlan, priceId }, requestId);
        } else {
          logger.warn(`Subscription created but no matching user found for customer ${subscription.customer}`, {}, requestId);
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const subData = subscription as any; // Stripe SDK types are incomplete
        logger.info('Subscription updated', {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status
        }, requestId);

        // Find user by Stripe customer ID
        const userSub = await prisma.userSubscription.findUnique({
          where: { stripeCustomerId: subscription.customer as string },
        });

        if (userSub) {
          // Get plan from price ID for consistency
          const priceId = subscription.items.data[0]?.price?.id || null;
          const newPlan = subscription.status === 'active' ? getPlanFromPriceId(priceId) : 'free';

          await prisma.userSubscription.update({
            where: { id: userSub.id },
            data: {
              stripePriceId: priceId,
              status: subscription.status,
              plan: newPlan,
              currentPeriodStart: subData.current_period_start ? new Date(subData.current_period_start * 1000) : null,
              currentPeriodEnd: subData.current_period_end ? new Date(subData.current_period_end * 1000) : null,
              cancelAtPeriodEnd: subData.cancel_at_period_end || false,
              updatedAt: new Date(),
            },
          });

          // Update Clerk metadata
          const clerk = await clerkClient();
          await clerk.users.updateUserMetadata(userSub.userId, {
            publicMetadata: { plan: newPlan },
          });

          logger.info('Subscription updated for customer', {
            customerId: subscription.customer,
            userId: userSub.userId,
            newPlan,
            priceId,
            subscriptionStatus: subscription.status
          }, requestId);
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        logger.info('Subscription canceled', {
          subscriptionId: subscription.id,
          customerId: subscription.customer
        }, requestId);

        const userSub = await prisma.userSubscription.findUnique({
          where: { stripeCustomerId: subscription.customer as string },
        });

        if (userSub) {
          await prisma.userSubscription.update({
            where: { id: userSub.id },
            data: {
              status: 'canceled',
              plan: 'free',
              updatedAt: new Date(),
            },
          });

          const clerk = await clerkClient();
          await clerk.users.updateUserMetadata(userSub.userId, {
            publicMetadata: { plan: 'free' },
          });

          logger.info('Subscription canceled for customer', {
            customerId: subscription.customer,
            userId: userSub.userId,
            subscriptionId: subscription.id
          }, requestId);
        }

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceData = invoice as any; // Stripe SDK types may be incomplete
        logger.info('Invoice payment succeeded', {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          amount: invoice.amount_paid,
          subscription: invoiceData.subscription
        }, requestId);

        // Find user subscription
        if (invoice.customer && invoiceData.subscription) {
          const userSub = await prisma.userSubscription.findUnique({
            where: { stripeCustomerId: invoice.customer as string },
          });

          if (userSub) {
            // Get plan from invoice line items
            // Type assertion needed as Stripe SDK types are incomplete
            const priceId = (invoice.lines.data[0] as any)?.price?.id || null;
            const newPlan = getPlanFromPriceId(priceId);

            // Ensure subscription is active after successful payment
            await prisma.userSubscription.update({
              where: { id: userSub.id },
              data: {
                stripePriceId: priceId,
                status: 'active',
                plan: newPlan,
                updatedAt: new Date(),
              },
            });

            // Ensure Clerk metadata reflects active subscription
            const clerk = await clerkClient();
            await clerk.users.updateUserMetadata(userSub.userId, {
              publicMetadata: { plan: newPlan },
            });

            logger.info(`Payment succeeded for user ${userSub.userId}, subscription ${invoiceData.subscription}`, { plan: newPlan, priceId }, requestId);
          }
        }

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceData = invoice as any;
        logger.warn('Invoice payment failed', {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          amount: invoice.amount_due,
          subscription: invoiceData.subscription
        }, requestId);

        // Find user subscription and update status
        if (invoice.customer) {
          const userSub = await prisma.userSubscription.findUnique({
            where: { stripeCustomerId: invoice.customer as string },
          });

          if (userSub) {
            // Update subscription status to past_due
            await prisma.userSubscription.update({
              where: { id: userSub.id },
              data: {
                status: 'past_due',
                updatedAt: new Date(),
              },
            });

            logger.warn(`Payment failed for user ${userSub.userId}, subscription status updated to past_due`, {}, requestId);

            // Note: Email notifications should be handled by Stripe's built-in email system
            // or a separate notification service. You can add custom logic here if needed.
          }
        }

        break;
      }

      default:
        logger.info(`Unhandled event type: ${event.type}`, {}, requestId);
    }

    return NextResponse.json({ received: true }, { headers: { 'X-Request-ID': requestId } });
  } catch (error: unknown) {
    logger.error('Error processing webhook', error, requestId);
    const apiError = createErrorResponse(error, 'PAYMENT_ERROR');
    return NextResponse.json(
      apiError,
      { status: 500, headers: { 'X-Request-ID': requestId } }
    );
  }
}
