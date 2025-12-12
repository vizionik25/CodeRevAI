import { GoogleGenAI } from '@google/genai';
import Stripe from 'stripe';
import { serverEnv } from '@/app/config/env';
import { AppError } from '@/app/types/errors';

/**
 * Lazy-initialized Gemini AI client
 * Avoids build-time errors by deferring initialization until first use
 * @throws {AppError} If GEMINI_API_KEY environment variable is not set
 */
let geminiAI: GoogleGenAI | null = null;

export function getGeminiAI(): GoogleGenAI {
  if (!geminiAI && serverEnv.GEMINI_API_KEY) {
    geminiAI = new GoogleGenAI({ apiKey: serverEnv.GEMINI_API_KEY });
  }
  if (!geminiAI) {
    throw new AppError(
      'SERVICE_UNAVAILABLE',
      'Gemini API key not configured',
      'Environment variable GEMINI_API_KEY is missing.'
    );
  }
  return geminiAI;
}

/**
 * Lazy-initialized Stripe client
 * Avoids build-time errors by deferring initialization until first use
 * @throws {AppError} If STRIPE_SECRET_KEY environment variable is not set
 */
let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient && serverEnv.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
    });
  }
  if (!stripeClient) {
    throw new AppError(
      'SERVICE_UNAVAILABLE',
      'Stripe secret key not configured',
      'Environment variable STRIPE_SECRET_KEY is missing.'
    );
  }
  return stripeClient;
}
