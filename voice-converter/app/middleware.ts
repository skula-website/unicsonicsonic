import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiter
// For production: brug Redis eller database
const rateLimit = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 timer
const MAX_REQUESTS = 3; // 3 filer per dag

function getClientIP(request: NextRequest): string {
  // Check various headers for real IP (bag reverse proxy)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  // Fallback
  return 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimit.get(ip);
  
  // Ingen tidligere requests eller window udløbet
  if (!record || now > record.resetTime) {
    const resetTime = now + RATE_LIMIT_WINDOW;
    rateLimit.set(ip, { count: 1, resetTime });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetTime };
  }
  
  // Inden for window
  if (record.count < MAX_REQUESTS) {
    record.count++;
    return { allowed: true, remaining: MAX_REQUESTS - record.count, resetTime: record.resetTime };
  }
  
  // Over limit
  return { allowed: false, remaining: 0, resetTime: record.resetTime };
}

export function middleware(request: NextRequest) {
  // Kun rate limit Remover (ikke Analyzer)
  // Analyzer er ubegrænset gratis - kun Remover tæller mod daily limit
  if (request.nextUrl.pathname.startsWith('/api/clean-audio')) {
    
    const ip = getClientIP(request);
    const { allowed, remaining, resetTime } = checkRateLimit(ip);
    
    if (!allowed) {
      const hoursUntilReset = Math.ceil((resetTime - Date.now()) / (60 * 60 * 1000));
      
      return NextResponse.json(
        {
          error: 'Daily limit reached',
          message: `You've reached your daily limit of ${MAX_REQUESTS} files. Try again in ${hoursUntilReset} hours.`,
          resetTime: new Date(resetTime).toISOString(),
          waitlistUrl: '/waitlist'
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString(),
            'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }
    
    // Tilføj rate limit headers til response
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', MAX_REQUESTS.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', resetTime.toString());
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};

