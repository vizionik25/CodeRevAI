# Stripe Configuration Guide - NO PLACEHOLDERS

## ⚠️ IMPORTANT: No Hardcoded Values in Code

This application properly handles Stripe configuration using **environment variables only**. There are NO placeholder values in the codebase.

## How It Works

### 1. Environment Variable Based Configuration

The Stripe Price ID is loaded from environment variables in `app/page.tsx`:

```typescript
const STRIPE_PRICE_IDS = {
  pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO || '',
};
```

### 2. Validation Before Use

The application checks if the Price ID is configured before attempting checkout:

```typescript
const handleSubscribe = async (plan: string, priceId: string) => {
  if (!isSignedIn) {
    alert('Please sign in first to subscribe');
    return;
  }
  
  if (!priceId) {
    alert('Stripe is not configured yet. Please set up your Stripe Price IDs.');
    console.error('Missing Stripe Price ID for plan:', plan);
    return;
  }
  
  await redirectToCheckout(priceId, plan);
};
```

### 3. User-Friendly Error Handling

If Stripe is not configured:
- ✅ The button still works (no crashes)
- ✅ User gets a clear message: "Stripe is not configured yet"
- ✅ Developer sees error in console with details
- ✅ No placeholder values ever sent to Stripe

## Setup Instructions

### Step 1: Create Product in Stripe

1. Go to https://dashboard.stripe.com/products
2. Click "Add product"
3. Name: "Pro Plan" (or your plan name)
4. Add price: $29/month (or your price)
5. Copy the **Price ID** (format: `price_xxxxxxxxxxxxxxxxxxxxx`)

### Step 2: Add to Environment Variables

Add to your `.env.local` file:

```bash
# Stripe Price ID for Pro Plan
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO=price_your_actual_price_id_here
```

**Example with real ID:**
```bash
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO=price_1QAbCdEfGhIjKlMnOpQr
```

### Step 3: Restart Development Server

```bash
# Stop the server (Ctrl+C) and restart
npm run dev
```

The price ID will now be loaded and the subscription button will work!

## For Production (Cloud Run)

Add the environment variable to Google Cloud Secret Manager:

```bash
# Create the secret
echo -n "price_your_actual_price_id_here" | gcloud secrets create STRIPE_PRICE_ID_PRO --data-file=-

# Grant access
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding STRIPE_PRICE_ID_PRO \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Update `cloudbuild.yaml` to include the new secret:

```yaml
- '--update-secrets'
- 'NEXT_PUBLIC_STRIPE_PRICE_ID_PRO=STRIPE_PRICE_ID_PRO:latest,...'
```

## Testing Without Stripe

The application gracefully handles missing Stripe configuration:

1. Sign in to the app
2. Click "Upgrade Now"
3. You'll see: "Stripe is not configured yet. Please set up your Stripe Price IDs."
4. No errors, no crashes - just a clear message

## Adding More Plans

To add more subscription tiers:

### 1. Update the STRIPE_PRICE_IDS object:

```typescript
const STRIPE_PRICE_IDS = {
  pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO || '',
  enterprise: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE || '',
};
```

### 2. Add environment variable:

```bash
NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE=price_your_enterprise_plan_id
```

### 3. Use in your component:

```typescript
<button onClick={() => handleSubscribe('enterprise', STRIPE_PRICE_IDS.enterprise)}>
  Subscribe to Enterprise
</button>
```

## Why This Approach is Better

### ❌ BAD - Hardcoded Placeholders:
```typescript
// NEVER DO THIS!
onClick={() => handleSubscribe('pro', 'price_placeholder')}
```

Problems:
- Will fail when clicked
- Sends invalid data to Stripe
- Confusing error messages
- Requires code changes to configure

### ✅ GOOD - Environment Variables:
```typescript
// ALWAYS DO THIS!
onClick={() => handleSubscribe('pro', STRIPE_PRICE_IDS.pro)}
```

Benefits:
- ✅ Fails gracefully with clear message
- ✅ No invalid data sent anywhere
- ✅ Easy to configure without code changes
- ✅ Different configs for dev/staging/production
- ✅ Keeps sensitive IDs out of codebase

## Security Best Practices

1. **Price IDs are PUBLIC** - They can be safely exposed in frontend code
2. **Secret Keys MUST be server-side only** - Never expose `sk_live_` or `sk_test_`
3. **Use environment variables** - Never hardcode any Stripe values
4. **Test mode for development** - Use `pk_test_` and `price_test_` IDs locally
5. **Production mode for production** - Use `pk_live_` and live price IDs in production

## Troubleshooting

### Button doesn't work after adding Price ID

1. **Check environment variable name:**
   ```bash
   # Must be exactly this:
   NEXT_PUBLIC_STRIPE_PRICE_ID_PRO=price_xxx
   ```

2. **Restart dev server:**
   ```bash
   # Stop with Ctrl+C, then:
   npm run dev
   ```

3. **Verify in browser console:**
   ```javascript
   console.log(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO)
   ```

### Still seeing "not configured" message

- Check `.env.local` file exists
- Check the environment variable name is correct
- Check there are no typos in the price ID
- Ensure you restarted the server after adding the variable

### Price ID format

- Test mode: `price_test_xxxxxxxxxxxxxxxxxxxxx`
- Live mode: `price_xxxxxxxxxxxxxxxxxxxxx`
- Always starts with `price_`
- Case-sensitive

## Files Modified

| File | Change |
|------|--------|
| `app/page.tsx` | Removed hardcoded placeholder, added environment variable loading and validation |
| `.env.example` | Added `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO` example |
| `next.config.js` | Added price ID to exposed environment variables |
| `STRIPE_SETUP.md` | Updated instructions to use environment variables |

## Verification

Run this to verify no placeholders exist:

```bash
grep -r "placeholder" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules | grep -v ".next"
```

Should only show UI placeholders (like form input placeholders), not hardcoded values!

---

**Remember:** Never hardcode API keys, secrets, or configuration values. Always use environment variables! 🔐
