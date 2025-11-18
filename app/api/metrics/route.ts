import { NextResponse } from 'next/server';
import { logger } from '@/app/utils/logger';

export async function POST(req: Request) {
  const requestId = req.headers.get('X-Request-ID') || `vitals_${Date.now()}`;
  try {
    const metric = await req.json();
    // Log the metric to Google Cloud Logging in production
    logger.info('Web Vitals Metric', metric, requestId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error('Error receiving web vitals metric', error, requestId);
    return new NextResponse('Error receiving metric', { status: 500 });
  }
}
