import React from 'react';
import Link from 'next/link';
import { UserButton, SignInButton, SignedIn, SignedOut, useUser } from '@clerk/nextjs';
import { HistoryIcon } from './icons/HistoryIcon';
import { redirectToCheckout } from '@/app/utils/stripeUtils';
import { publicEnv } from '@/app/config/env';

interface HeaderProps {
  onToggleHistory: () => void;
}

export const Header = ({ onToggleHistory }: HeaderProps) => {
  const { user } = useUser();

  // Check if user has a pro subscription
  const isPro = user?.publicMetadata?.plan === 'pro';

  // Get Pro price ID from environment configuration
  const STRIPE_PRICE_IDS = {
    pro: publicEnv.STRIPE_PRICE_ID_PRO,
  };

  const handleUpgradeClick = async () => {
    if (!STRIPE_PRICE_IDS.pro) {
      alert('Stripe is not configured yet. Please set up your Stripe Price IDs.');
      return;
    }

    await redirectToCheckout(STRIPE_PRICE_IDS.pro, 'pro');
  };

  return (
    <header className="bg-gray-800 shadow-md">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" focusable="false">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            [CodeRevAI]
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <SignedIn>
            {isPro ? (
              <>
                <Link href="/billing">
                  <button
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white transition-colors"
                    aria-label="Manage billing and subscription"
                  >
                    Billing
                  </button>
                </Link>
                <Link href="/dashboard/analytics">
                  <button
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white transition-colors"
                    aria-label="View analytics"
                  >
                    Analytics
                  </button>
                </Link>
              </>
            ) : (
              <button
                onClick={handleUpgradeClick}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-white font-semibold transition-colors"
                aria-label="Upgrade to Pro plan"
              >
                Upgrade
              </button>
            )}
          </SignedIn>
          <button
            onClick={onToggleHistory}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            aria-label="View history"
          >
            <HistoryIcon />
          </button>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-white font-semibold transition-colors">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </header>
  );
};
