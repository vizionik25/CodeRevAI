# Stripe Integration Setup Guide

This guide will help you set up Stripe payment processing for [CodeRevAI].

## Prerequisites

- Stripe account (sign up at https://dashboard.stripe.com/)
- Clerk account already configured
- Next.js project with required dependencies installed

## Step 1: Get Your Stripe Keys

1. Go to https://dashboard.stripe.com/
2. In the Developers section, click on "API keys"
3. Copy your **Publishable key** and **Secret key** (use test mode keys for development)

## Step 2: Configure Environment Variables

Update your `.env.local` file with your Stripe keys:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Step 3: Create Products and Prices in Stripe

1. Go to https://dashboard.stripe.com/products
2. Click "Add product"
3. Create your pricing plans (e.g., "Pro Plan")
4. Add recurring prices (e.g., $29/month)
5. Copy the **Price ID** (starts with `price_`)
6. Update the `handleSubscribe` function in `app/page.tsx` with your actual price IDs:

```typescript
// Replace 'price_pro_monthly_placeholder' with your actual Stripe Price ID
onClick={() => handleSubscribe('pro', 'price_1234567890')}
```

## Step 4: Set Up Webhooks

Stripe webhooks allow your app to receive real-time notifications about payment events.

### For Local Development (using Stripe CLI):

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Run: `stripe login`
3. Forward events to your local server:
   ```bash
   stripe listen --forward-to localhost:3001/api/webhooks/stripe
   ```
4. Copy the webhook signing secret (starts with `whsec_`) to your `.env.local`

### For Production:

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Set URL to: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret to your production environment variables

## Step 5: Test the Integration

1. Start your development server: `npm run dev`
2. Sign in to your app
3. Click "Upgrade Now" on the Pro plan
4. Use Stripe's test card: `4242 4242 4242 4242`
   - Use any future expiry date
   - Use any 3-digit CVC
   - Use any 5-digit ZIP code
5. Complete the checkout
6. Check your Stripe dashboard to see the test payment

## Database Integration (TODO)

The webhook handler in `app/api/webhooks/stripe/route.ts` has TODO comments where you should:

1. Store subscription information in your database
2. Update user subscription status
3. Track payment history
4. Handle failed payments

Example database schema:

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  plan VARCHAR(50),
  status VARCHAR(50),
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  stripe_invoice_id VARCHAR(255),
  amount INTEGER,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## File Structure

```
app/
├── api/
│   ├── create-checkout-session/
│   │   └── route.ts          # Creates Stripe checkout sessions
│   └── webhooks/
│       └── stripe/
│           └── route.ts       # Handles Stripe webhook events
├── billing/
│   └── page.tsx              # Subscription management page
├── utils/
│   └── stripeUtils.ts        # Stripe helper functions
└── page.tsx                  # Landing page with subscribe buttons
```

## Security Best Practices

1. **Never expose secret keys**: Keep `STRIPE_SECRET_KEY` server-side only
2. **Verify webhook signatures**: Always verify the webhook signature (already implemented)
3. **Use HTTPS in production**: Stripe requires HTTPS for webhooks
4. **Implement proper authentication**: Only allow authenticated users to create checkouts
5. **Store sensitive data securely**: Use environment variables for all keys

## Features Implemented

✅ Stripe checkout integration
✅ Webhook handler for subscription events
✅ Subscription management page
✅ Test mode support
✅ Error handling
✅ TypeScript types

## Next Steps

1. Set up a database to store subscription data
2. Implement subscription status checks in your app
3. Add usage limits based on subscription tiers
4. Create a customer portal for self-service billing
5. Add email notifications for payment events
6. Implement proration for plan changes

## Troubleshooting

### "Stripe failed to load" error
- Check that your publishable key is correct in `.env.local`
- Make sure the key starts with `pk_test_` for test mode

### Webhook signature verification failed
- Verify your webhook secret is correct
- Check that you're using the correct endpoint secret for your environment
- Ensure the webhook URL in Stripe dashboard matches your API route

### Checkout session creation fails
- Verify your secret key is correct
- Check that the price ID exists in your Stripe account
- Ensure the user is authenticated (Clerk auth working)

## Resources

- Stripe Documentation: https://stripe.com/docs
- Stripe Testing: https://stripe.com/docs/testing
- Stripe Webhooks: https://stripe.com/docs/webhooks
- Next.js API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
