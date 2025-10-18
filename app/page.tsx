'use client';
import React from 'react';
import Link from 'next/link';
import { SignInButton, SignedIn, SignedOut, useUser } from '@clerk/nextjs';
import { redirectToCheckout } from './utils/stripeUtils';
import { logger } from '@/app/utils/logger';

export default function LandingPage() {
  const { isSignedIn } = useUser();

  // Stripe Price IDs - Configure these in your environment or here
  // Get these from your Stripe Dashboard after creating products
  const STRIPE_PRICE_IDS = {
    pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO || '',
  };

  const handleSubscribe = async (plan: string, priceId: string) => {
    if (!isSignedIn) {
      alert('Please sign in first to subscribe');
      return;
    }
    
    if (!priceId) {
      alert('Stripe is not configured yet. Please set up your Stripe Price IDs.');
      logger.error('Missing Stripe Price ID for plan:', plan);
      return;
    }
    
    await redirectToCheckout(priceId, plan);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      {/* Navigation */}
      <nav className="bg-gray-800 shadow-md">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">[CodeRevAI]</h1>
          </div>
          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-white font-semibold transition-colors">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-white font-semibold transition-colors">
                  Go to Dashboard
                </button>
              </Link>
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 md:px-6 lg:px-8 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Elevate Your Code Quality with AI
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-8">
            Get instant, intelligent code reviews powered by advanced AI. Catch bugs, improve performance, and maintain best practices effortlessly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-semibold text-lg transition-colors shadow-lg">
                  Get Started Free
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-semibold text-lg transition-colors shadow-lg">
                  Go to Dashboard
                </button>
              </Link>
            </SignedIn>
            <a href="#features">
              <button className="px-8 py-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-semibold text-lg transition-colors">
                Learn More
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-gray-800 py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-12">Powerful Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-700 p-6 rounded-lg">
              <div className="bg-indigo-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered Analysis</h3>
              <p className="text-gray-400">Advanced AI detects bugs, security issues, and performance bottlenecks in your code.</p>
            </div>

            <div className="bg-gray-700 p-6 rounded-lg">
              <div className="bg-purple-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Instant Feedback</h3>
              <p className="text-gray-400">Get comprehensive code reviews in seconds, not hours or days.</p>
            </div>

            <div className="bg-gray-700 p-6 rounded-lg">
              <div className="bg-pink-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Security Focused</h3>
              <p className="text-gray-400">Identify security vulnerabilities and get recommendations for secure coding practices.</p>
            </div>

            <div className="bg-gray-700 p-6 rounded-lg">
              <div className="bg-green-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Multiple Sources</h3>
              <p className="text-gray-400">Review code from GitHub repositories, local files, or paste directly.</p>
            </div>

            <div className="bg-gray-700 p-6 rounded-lg">
              <div className="bg-blue-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Custom Review Modes</h3>
              <p className="text-gray-400">Choose from comprehensive, security-focused, performance-optimized, and more review modes.</p>
            </div>

            <div className="bg-gray-700 p-6 rounded-lg">
              <div className="bg-yellow-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Detailed Reports</h3>
              <p className="text-gray-400">Get markdown-formatted reports with code suggestions and explanations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
          <p className="text-center text-gray-400 mb-12 text-lg">Choose the plan that fits your needs</p>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="bg-gray-800 p-8 rounded-lg border border-gray-700">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-gray-400">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  10 reviews per month
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Basic review modes
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  GitHub integration
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Community support
                </li>
              </ul>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-semibold transition-colors">
                    Get Started
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard">
                  <button className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-semibold transition-colors">
                    Get Started
                  </button>
                </Link>
              </SignedIn>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-b from-indigo-600 to-purple-600 p-8 rounded-lg shadow-xl transform scale-105">
              <div className="bg-yellow-500 text-gray-900 text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">
                POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">$29</span>
                <span className="text-gray-200">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited reviews
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  All review modes
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Priority support
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Advanced analytics
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Custom instructions
                </li>
              </ul>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="w-full px-6 py-3 bg-white text-indigo-600 hover:bg-gray-100 rounded-lg font-semibold transition-colors">
                    Start Free Trial
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <button 
                  onClick={() => handleSubscribe('pro', STRIPE_PRICE_IDS.pro)}
                  className="w-full px-6 py-3 bg-white text-indigo-600 hover:bg-gray-100 rounded-lg font-semibold transition-colors"
                >
                  Upgrade Now
                </button>
              </SignedIn>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-gray-800 p-8 rounded-lg border border-gray-700">
              <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">Custom</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Everything in Pro
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Dedicated support
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Custom integrations
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Team collaboration
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  SLA guarantee
                </li>
              </ul>
              <button className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-semibold transition-colors">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Improve Your Code Quality?</h2>
          <p className="text-xl mb-8 text-gray-100">
            Join thousands of developers using [CodeRevAI] to write better code.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-8 py-4 bg-white text-indigo-600 hover:bg-gray-100 rounded-lg font-semibold text-lg transition-colors shadow-lg">
                  Get Started Free
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <button className="px-8 py-4 bg-white text-indigo-600 hover:bg-gray-100 rounded-lg font-semibold text-lg transition-colors shadow-lg">
                  Go to Dashboard
                </button>
              </Link>
            </SignedIn>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 py-8">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 text-center text-gray-400">
          <p>&copy; 2025 [CodeRevAI]. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
