import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

export async function redirectToCheckout(priceId: string, plan: string) {
  try {
    // Call your API to create a checkout session
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        plan,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout session');
    }

    const { url } = await response.json();

    // Redirect to Stripe Checkout URL directly (modern approach for Stripe API 2025-09-30+)
    if (url) {
      window.location.href = url;
    } else {
      throw new Error('No checkout URL returned from server');
    }
  } catch (error: any) {
    console.error('Error redirecting to checkout:', error);
    alert(error.message || 'Failed to start checkout. Please try again.');
  }
}
