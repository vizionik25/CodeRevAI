import { GoogleGenAI } from '@google/genai';
import Stripe from 'stripe';
import { serverEnv } from '@/app/config/env';

/**
 * Lazy-initialized Gemini AI client
 * Avoids build-time errors by deferring initialization until first use
 * @throws {Error} If GEMINI_API_KEY environment variable is not set
 */
let geminiAI: GoogleGenAI | null = null;

export function getGeminiAI(): GoogleGenAI {
  if (!geminiAI && serverEnv.GEMINI_API_KEY) {
    geminiAI = new GoogleGenAI({ apiKey: serverEnv.GEMINI_API_KEY });
  }
  if (!geminiAI) {
    throw new Error('Gemini API key not configured');
  }
  return geminiAI;
}

/**
 * Lazy-initialized Stripe client
 * Avoids build-time errors by deferring initialization until first use
 * @throws {Error} If STRIPE_SECRET_KEY environment variable is not set
 */
let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient && serverEnv.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover',
    });
  }
  if (!stripeClient) {
    throw new Error('Stripe secret key not configured');
  }
  return stripeClient;
}
