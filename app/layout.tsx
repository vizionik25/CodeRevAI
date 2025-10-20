import React from "react";
import { ClerkProvider } from '@clerk/nextjs';
import { validateEnv } from './config/env';
import "./globals.css";

// Validate environment variables on server startup
if (typeof window === 'undefined') {
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
