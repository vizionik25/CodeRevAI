import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)']);

/**
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export default clerkMiddleware(async (auth, request) => {
  // Generate request ID for tracing
  const requestId = generateRequestId();
  
  // Protect non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
  
  // Clone the response and add request ID header
  const response = NextResponse.next();
  response.headers.set('X-Request-ID', requestId);
  
  // Add request ID to request headers for API routes to access
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('X-Request-ID', requestId);
  
  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
