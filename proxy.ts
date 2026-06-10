import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

// Define paths that are always public
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip static assets, favicon, etc.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 2. Retrieve session cookie
  const sessionCookie = request.cookies.get('session')?.value;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;

  const isPublicPath = PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(path));

  // 3. If authenticated and attempting to visit login, redirect to home
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 4. If unauthenticated and trying to access a protected page
  if (!session && !isPublicPath) {
    // If it's an API request, return 401 Unauthorized
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: '로그인이 필요한 서비스입니다.' },
        { status: 401 }
      );
    }
    
    // Otherwise, redirect to the login page
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all paths except static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
