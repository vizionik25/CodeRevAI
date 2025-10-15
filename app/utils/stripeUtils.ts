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
    const stripe = await getStripe();
    
    if (!stripe) {
      throw new Error('Stripe failed to load');
    }

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

    const { sessionId } = await response.json();

    // Redirect to Stripe Checkout using the newer API
    // @ts-ignore - redirectToCheckout exists but TypeScript types may be outdated
    const result = await stripe.redirectToCheckout({
      sessionId,
    });

    if (result?.error) {
      throw result.error;
    }
  } catch (error: any) {
    console.error('Error redirecting to checkout:', error);
    alert(error.message || 'Failed to start checkout. Please try again.');
  }
}
