# Stripe Integration Guide

Complete guide for integrating Stripe payments with CodeRevAI.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Setup Instructions](#setup-instructions)
4. [Local Development](#local-development)
5. [Production Deployment](#production-deployment)
6. [Database Integration](#database-integration)
7. [Testing](#testing)
8. [Security Best Practices](#security-best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

CodeRevAI uses Stripe for subscription-based payments. The integration is **environment variable-based** with no hardcoded values, ensuring secure and flexible configuration across environments.

### Key Features

✅ Stripe checkout integration  
✅ Webhook handler for subscription events  
✅ Subscription management page  
✅ Test mode support  
✅ Proper error handling  
✅ TypeScript types  

### Architecture

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
└── page.tsx                  # Landing page with subscribe buttons
```

---

## Prerequisites

- ✅ Stripe account ([sign up here](https://dashboard.stripe.com/))
- ✅ Clerk authentication configured
- ✅ Next.js project with dependencies installed

---

## Setup Instructions

### Step 1: Get Your Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers → API keys**
3. Copy your **Publishable key** and **Secret key**
   - Use **test mode** keys for development (`pk_test_` and `sk_test_`)
   - Use **live mode** keys for production (`pk_live_` and `sk_live_`)

### Step 2: Create Products and Prices

1. Go to [Products](https://dashboard.stripe.com/products)
2. Click **"Add product"**
3. Create your pricing plans:
   - **Name:** "Pro Plan" (or your plan name)
   - **Price:** $29/month (or your pricing)
   - **Recurring:** Monthly
4. Copy the **Price ID** (format: `price_xxxxxxxxxxxxxxxxxxxxx`)

### Step 3: Configure Environment Variables

#### For Local Development

Add to your `.env.local` file:

```bash
# Stripe Keys (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO=price_your_actual_price_id_here
```

**Example with real IDs:**
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51AbCdEfGhIjKlMnOpQr
STRIPE_SECRET_KEY=sk_test_51AbCdEfGhIjKlMnOpQr
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO=price_1QAbCdEfGhIjKlMnOpQr
```

#### For Production (Google Cloud Run)

Create secrets in Google Cloud Secret Manager:

```bash
# Stripe Publishable Key
echo -n "pk_live_your_publishable_key" | gcloud secrets create STRIPE_PUBLISHABLE_KEY --data-file=-

# Stripe Secret Key
echo -n "sk_live_your_secret_key" | gcloud secrets create STRIPE_SECRET_KEY --data-file=-

# Stripe Webhook Secret
echo -n "whsec_your_webhook_secret" | gcloud secrets create STRIPE_WEBHOOK_SECRET --data-file=-

# Stripe Price ID
echo -n "price_your_price_id" | gcloud secrets create STRIPE_PRICE_ID_PRO --data-file=-

# Grant access to Cloud Run service account
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')
for SECRET in STRIPE_PUBLISHABLE_KEY STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_PRICE_ID_PRO; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

---

## Local Development

### Set Up Webhooks with Stripe CLI

Stripe webhooks allow your app to receive real-time notifications about payment events.

1. **Install Stripe CLI:**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Other platforms: https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe:**
   ```bash
   stripe login
   ```

3. **Forward webhook events to localhost:**
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. **Copy the webhook signing secret** (starts with `whsec_`) and add to `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_your_local_webhook_secret
   ```

5. **Start your development server:**
   ```bash
   npm run dev
   ```

---

## Production Deployment

### Configure Webhooks in Stripe Dashboard

1. Go to [Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Set **Endpoint URL:** `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **webhook signing secret** to your production environment

### Update Cloud Run Deployment

Make sure your `cloudbuild.yaml` includes all Stripe secrets:

```yaml
- '--update-secrets'
- 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=STRIPE_PUBLISHABLE_KEY:latest,STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest,NEXT_PUBLIC_STRIPE_PRICE_ID_PRO=STRIPE_PRICE_ID_PRO:latest,...'
```

---

## Database Integration

The webhook handler in `app/api/webhooks/stripe/route.ts` has TODO comments where you should implement database operations.

### Recommended Schema

```sql
-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  plan VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  stripe_invoice_id VARCHAR(255) UNIQUE,
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
```

### Implementation Tasks

In `app/api/webhooks/stripe/route.ts`, implement:

1. **Store subscription data** when `checkout.session.completed`
2. **Update subscription status** on `customer.subscription.updated`
3. **Track payment history** on `invoice.payment_succeeded`
4. **Handle failed payments** on `invoice.payment_failed`
5. **Clean up on cancellation** when `customer.subscription.deleted`

---

## Testing

### Test the Integration

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Sign in to your app** (Clerk authentication)

3. **Click "Upgrade Now"** on the Pro plan

4. **Use Stripe test cards:**
   - **Success:** `4242 4242 4242 4242`
   - **Decline:** `4000 0000 0000 0002`
   - **Authentication required:** `4000 0025 0000 3155`
   - Any future expiry date, any 3-digit CVC, any 5-digit ZIP

5. **Complete the checkout**

6. **Verify in Stripe Dashboard:**
   - Check [Payments](https://dashboard.stripe.com/payments)
   - Check [Customers](https://dashboard.stripe.com/customers)
   - Check [Subscriptions](https://dashboard.stripe.com/subscriptions)

### Testing Webhooks Locally

With Stripe CLI running:

```bash
# In one terminal
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# In another terminal, trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
stripe trigger customer.subscription.updated
```

---

## Security Best Practices

### Environment Variables Configuration

✅ **Price IDs are PUBLIC** - Safe to expose in frontend code (`NEXT_PUBLIC_*`)  
✅ **Publishable Keys are PUBLIC** - Safe to expose in frontend code (`pk_test_` or `pk_live_`)  
❌ **Secret Keys MUST be server-side only** - Never expose `sk_live_` or `sk_test_`  
❌ **Webhook Secrets MUST be server-side only** - Never expose `whsec_`  

### Application Security

1. **Verify webhook signatures** - Always verify (already implemented in `route.ts`)
2. **Use HTTPS in production** - Required by Stripe for webhooks
3. **Implement proper authentication** - Only authenticated users can create checkouts (Clerk)
4. **Validate amounts server-side** - Never trust client-provided amounts
5. **Use idempotency keys** - Prevent duplicate charges on retries

### Why Environment Variables?

❌ **BAD - Hardcoded Values:**
```typescript
// NEVER DO THIS!
const priceId = 'price_placeholder';
onClick={() => handleSubscribe('pro', 'price_placeholder')}
```

Problems:
- Will fail when clicked
- Sends invalid data to Stripe
- Requires code changes to configure
- Confusing error messages

✅ **GOOD - Environment Variables:**
```typescript
// ALWAYS DO THIS!
const STRIPE_PRICE_IDS = {
  pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO || '',
};
onClick={() => handleSubscribe('pro', STRIPE_PRICE_IDS.pro)}
```

Benefits:
- ✅ Fails gracefully with clear message
- ✅ No invalid data sent
- ✅ Easy to configure without code changes
- ✅ Different configs for dev/staging/production
- ✅ Keeps sensitive IDs out of version control

---

## Troubleshooting

### "Stripe failed to load" error

**Cause:** Incorrect or missing publishable key

**Solution:**
1. Check `.env.local` has `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
2. Verify key starts with `pk_test_` (test mode) or `pk_live_` (live mode)
3. Restart dev server after changing environment variables

### "Stripe is not configured" message

**Cause:** Missing Price ID

**Solution:**
1. Verify `.env.local` has `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO`
2. Check the Price ID format: `price_xxxxxxxxxxxxxxxxxxxxx`
3. Restart dev server: `npm run dev`
4. Verify in browser console:
   ```javascript
   console.log(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO)
   ```

### Webhook signature verification failed

**Cause:** Incorrect webhook secret

**Solution:**
1. For local dev: Get secret from `stripe listen` output
2. For production: Get secret from Stripe Dashboard webhook settings
3. Verify environment variable name is `STRIPE_WEBHOOK_SECRET`
4. Check webhook URL matches your API route exactly

### Checkout session creation fails

**Causes & Solutions:**

1. **Invalid Price ID:**
   - Verify price exists in your Stripe account
   - Check for typos in Price ID
   - Ensure using correct mode (test vs live)

2. **Authentication error:**
   - Verify user is signed in (Clerk auth working)
   - Check Clerk configuration

3. **API key error:**
   - Verify `STRIPE_SECRET_KEY` is correct
   - Check key matches mode (test vs live)

### Price ID Format Reference

- **Test mode:** `price_test_xxxxxxxxxxxxxxxxxxxxx` or `price_xxxxxxxxxxxxxxxxxxxxx`
- **Live mode:** `price_xxxxxxxxxxxxxxxxxxxxx`
- Always starts with `price_`
- Case-sensitive

---

## Adding More Subscription Plans

### 1. Create Product in Stripe

1. Go to [Products](https://dashboard.stripe.com/products)
2. Create new product (e.g., "Enterprise Plan")
3. Add price (e.g., $99/month)
4. Copy the Price ID

### 2. Update Environment Variables

Add to `.env.local`:
```bash
NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE=price_your_enterprise_plan_id
```

### 3. Update Application Code

In `app/page.tsx`:
```typescript
const STRIPE_PRICE_IDS = {
  pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO || '',
  enterprise: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE || '',
};
```

### 4. Add UI Component

```tsx
<button onClick={() => handleSubscribe('enterprise', STRIPE_PRICE_IDS.enterprise)}>
  Subscribe to Enterprise - $99/month
</button>
```

---

## Verification Checklist

Run these commands to verify setup:

```bash
# Check no hardcoded placeholders exist
grep -r "placeholder" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules | grep -v ".next"

# Verify environment variables are loaded
npm run dev
# Then check browser console for any Stripe-related warnings

# Test webhook endpoint
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type":"ping"}'
```

---

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing Cards](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Stripe Security Best Practices](https://stripe.com/docs/security)

---

**Remember:** Never hardcode API keys, secrets, or configuration values. Always use environment variables! 🔐
