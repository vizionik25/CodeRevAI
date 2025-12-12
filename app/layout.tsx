import React from "react";
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ClerkProvider } from '@clerk/nextjs';
import { validateEnv } from './config/env';
import { WebVitals } from './components/WebVitals';
import "./globals.css";

// Validate environment variables on server startup (skip during build)
if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
  validateEnv();
}

export default function RootLayout({
  children,
}: {
  children: any;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          {children}
          <Analytics />
          <SpeedInsights />
          <WebVitals />
        </body>
      </html>
    </ClerkProvider>
  );
}
