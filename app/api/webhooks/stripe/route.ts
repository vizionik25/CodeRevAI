import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/app/utils/apiClients';
import { prisma } from '@/app/lib/prisma';
import { clerkClient } from '@clerk/nextjs/server';
import { logger } from '@/app/utils/logger';
import { AppError, createErrorResponse } from '@/app/types/errors';
import { serverEnv } from '@/app/config/env';

const webhookSecret = serverEnv.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  try {
    if (!webhookSecret) {
      const error = new AppError('SERVICE_UNAVAILABLE', 'Webhook secret is not configured');
      logger.error('Stripe webhook secret missing');
      return NextResponse.json(
        createErrorResponse(error),
        { status: 500 }
      );
    }
    
    const stripeInstance = getStripe();

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      const error = new AppError('INVALID_INPUT', 'Missing stripe-signature header');
      return NextResponse.json(
        createErrorResponse(error),
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripeInstance.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      logger.error(`Webhook signature verification failed: ${err.message}`);
      const error = new AppError('VALIDATION_ERROR', `Webhook signature verification failed: ${err.message}`);
      return NextResponse.json(
        createErrorResponse(error),
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;

        console.log('Checkout session completed:', session.id);

        if (userId && plan && session.customer && session.subscription) {
          // Store subscription in database
          await prisma.userSubscription.upsert({
            where: { userId },
            update: {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              stripePriceId: session.metadata?.priceId || null,
              plan: plan,
              status: 'active',
              updatedAt: new Date(),
            },
            create: {
              userId,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              stripePriceId: session.metadata?.priceId || null,
              plan: plan,
              status: 'active',
            },
          });

          // Update Clerk user metadata
          const clerk = await clerkClient();
          await clerk.users.updateUserMetadata(userId, {
            publicMetadata: { plan: plan },
          });

          console.log(`Subscription created for user ${userId}`);
        }
        
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const subData = subscription as any;
        logger.info('Subscription created:', subscription.id);
        
        // Find if we already have a user subscription for this customer
        const existingUserSub = await prisma.userSubscription.findUnique({
          where: { stripeCustomerId: subscription.customer as string },
        });

        if (existingUserSub) {
          // Update existing subscription
          await prisma.userSubscription.update({
            where: { id: existingUserSub.id },
            data: {
              stripeSubscriptionId: subscription.id,
              status: subscription.status,
              plan: subscription.status === 'active' ? 'pro' : 'free',
              currentPeriodStart: subData.current_period_start ? new Date(subData.current_period_start * 1000) : null,
              currentPeriodEnd: subData.current_period_end ? new Date(subData.current_period_end * 1000) : null,
              cancelAtPeriodEnd: subData.cancel_at_period_end || false,
              updatedAt: new Date(),
            },
          });

          // Update Clerk metadata
          const newPlan = subscription.status === 'active' ? 'pro' : 'free';
          const clerk = await clerkClient();
          await clerk.users.updateUserMetadata(existingUserSub.userId, {
            publicMetadata: { plan: newPlan },
          });

          logger.info(`Subscription ${subscription.id} created for user ${existingUserSub.userId}`);
        } else {
          logger.warn(`Subscription created but no matching user found for customer ${subscription.customer}`);
        }
        
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const subData = subscription as any; // Stripe SDK types are incomplete
        console.log('Subscription updated:', subscription.id);
        
        // Find user by Stripe customer ID
        const userSub = await prisma.userSubscription.findUnique({
          where: { stripeCustomerId: subscription.customer as string },
        });

        if (userSub) {
          await prisma.userSubscription.update({
            where: { id: userSub.id },
            data: {
              status: subscription.status,
              currentPeriodStart: subData.current_period_start ? new Date(subData.current_period_start * 1000) : null,
              currentPeriodEnd: subData.current_period_end ? new Date(subData.current_period_end * 1000) : null,
              cancelAtPeriodEnd: subData.cancel_at_period_end || false,
              updatedAt: new Date(),
            },
          });

          // Update plan if status changed
          const newPlan = subscription.status === 'active' ? 'pro' : 'free';
          const clerk = await clerkClient();
          await clerk.users.updateUserMetadata(userSub.userId, {
            publicMetadata: { plan: newPlan },
          });

          console.log(`Subscription updated for customer ${subscription.customer}`);
        }
        
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription canceled:', subscription.id);
        
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

          console.log(`Subscription canceled for customer ${subscription.customer}`);
        }
        
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceData = invoice as any; // Stripe SDK types may be incomplete
        logger.info('Invoice payment succeeded:', {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          amount: invoice.amount_paid,
          subscription: invoiceData.subscription
        });
        
        // Find user subscription
        if (invoice.customer && invoiceData.subscription) {
          const userSub = await prisma.userSubscription.findUnique({
            where: { stripeCustomerId: invoice.customer as string },
          });

          if (userSub) {
            // Ensure subscription is active after successful payment
            await prisma.userSubscription.update({
              where: { id: userSub.id },
              data: {
                status: 'active',
                updatedAt: new Date(),
              },
            });

            // Ensure Clerk metadata reflects active subscription
            const clerk = await clerkClient();
            await clerk.users.updateUserMetadata(userSub.userId, {
              publicMetadata: { plan: 'pro' },
            });

            logger.info(`Payment succeeded for user ${userSub.userId}, subscription ${invoiceData.subscription}`);
          }
        }
        
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceData = invoice as any;
        logger.warn('Invoice payment failed:', {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          amount: invoice.amount_due,
          subscription: invoiceData.subscription
        });
        
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

            logger.warn(`Payment failed for user ${userSub.userId}, subscription status updated to past_due`);
            
            // Note: Email notifications should be handled by Stripe's built-in email system
            // or a separate notification service. You can add custom logic here if needed.
          }
        }
        
        break;
      }

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    logger.error('Error processing webhook:', error);
    const apiError = createErrorResponse(error, 'PAYMENT_ERROR');
    return NextResponse.json(
      apiError,
      { status: 500 }
    );
  }
}
