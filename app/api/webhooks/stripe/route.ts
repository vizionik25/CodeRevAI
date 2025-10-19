import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/app/utils/apiClients';
import { prisma } from '@/app/lib/prisma';
import { clerkClient } from '@clerk/nextjs/server';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(req: NextRequest) {
  try {
    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'Webhook secret is not configured' },
        { status: 500 }
      );
    }
    
    const stripeInstance = getStripe();

    const body = await req.text();
    const signature = req.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripeInstance.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
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
        console.log('Subscription created:', subscription.id);
        
        // TODO: Update user's subscription status in your database
        
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
        console.log('Invoice payment succeeded:', invoice.id);
        
        // TODO: Update payment history in your database
        
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice payment failed:', invoice.id);
        
        // TODO: Handle failed payment (send email, update status)
        
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while processing webhook';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
