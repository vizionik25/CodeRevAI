import React from "react";
import { ClerkProvider } from '@clerk/nextjs';
import { validateEnv } from './config/env';
import "./globals.css";

// Validate environment variables on server startup (skip during build)
if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
  validateEnv();
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
