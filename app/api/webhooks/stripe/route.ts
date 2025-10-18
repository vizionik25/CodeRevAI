import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/app/utils/apiClients';

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
        console.log('Checkout session completed:', session.id);
        
        // TODO: Store subscription info in your database
        // You can access userId from session.metadata.userId
        // and plan from session.metadata.plan
        
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
        console.log('Subscription updated:', subscription.id);
        
        // TODO: Update subscription status in your database
        // Handle subscription changes (upgrade/downgrade)
        
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription canceled:', subscription.id);
        
        // TODO: Mark subscription as canceled in your database
        
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
