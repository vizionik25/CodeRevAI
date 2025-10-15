'use client';
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

interface Subscription {
  id: string;
  status: string;
  plan: string;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
}

export default function BillingPage() {
  const { user, isSignedIn } = useUser();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch user's subscription from your database
    // For now, we'll just show a placeholder
    setLoading(false);
  }, [user]);

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-200 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to view billing</h1>
          <Link href="/" className="text-indigo-400 hover:text-indigo-300">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      {/* Header */}
      <nav className="bg-gray-800 shadow-md">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">[CodeRevAI]</h1>
          </Link>
          <Link href="/dashboard">
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors">
              Back to Dashboard
            </button>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8">Billing & Subscription</h1>

        {loading ? (
          <div className="bg-gray-800 p-8 rounded-lg">
            <p className="text-gray-400">Loading subscription details...</p>
          </div>
        ) : subscription ? (
          <>
            {/* Current Plan */}
            <div className="bg-gray-800 p-8 rounded-lg mb-8">
              <h2 className="text-2xl font-bold mb-4">Current Plan</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-400 mb-2">Plan</p>
                  <p className="text-xl font-semibold capitalize">{subscription.plan}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-2">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    subscription.status === 'active' 
                      ? 'bg-green-600/20 text-green-400' 
                      : 'bg-gray-600/20 text-gray-400'
                  }`}>
                    {subscription.status}
                  </span>
                </div>
                <div>
                  <p className="text-gray-400 mb-2">Next Billing Date</p>
                  <p className="text-lg">
                    {new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 mb-2">Auto-Renewal</p>
                  <p className="text-lg">
                    {subscription.cancelAtPeriodEnd ? 'Cancelled' : 'Active'}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex gap-4">
                <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors">
                  Update Payment Method
                </button>
                {subscription.cancelAtPeriodEnd ? (
                  <button className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors">
                    Resume Subscription
                  </button>
                ) : (
                  <button className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors">
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>

            {/* Payment History */}
            <div className="bg-gray-800 p-8 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Payment History</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4">Description</th>
                      <th className="text-left py-3 px-4">Amount</th>
                      <th className="text-left py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-700/50">
                      <td className="py-3 px-4 text-gray-400" colSpan={4}>
                        No payment history yet
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* No Subscription */
          <div className="bg-gray-800 p-8 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-4">You're on the Free Plan</h2>
            <p className="text-gray-400 mb-6">
              Upgrade to Pro for unlimited reviews and advanced features
            </p>
            <Link href="/">
              <button className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors">
                View Plans
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
