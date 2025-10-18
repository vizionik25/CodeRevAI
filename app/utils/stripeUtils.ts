/**
 * Stripe Checkout Utilities
 * Handles redirecting users to Stripe Checkout using the modern API (2025-09-30+)
 * No Stripe.js dependency needed - uses direct URL redirect as per Stripe's migration guide
 * @see https://docs.stripe.com/changelog/clover/2025-09-30/remove-redirect-to-checkout
 */

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
    // This replaces the deprecated stripe.redirectToCheckout() method
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
