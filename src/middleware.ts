import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
const locales = ['bg'];

const isProtectedRoute = createRouteMatcher([
  '/:locale/dashboard(.*)',
  '/dashboard(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  const { pathname } = req.nextUrl;

  // CORS headers for API routes
  if (pathname.startsWith('/api')) {
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    return response;
  }
  
  // Избягваме пренасочване на логин/регистрация страниците
  if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')) {
    return;
  }

  if (pathname === '/en' || pathname.startsWith('/en/')) {
    req.nextUrl.pathname = `/bg${pathname.slice(3)}` || '/bg';
    return NextResponse.redirect(req.nextUrl);
  }
  
  // Check if there is any supported locale in the pathname
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
  
  if (!pathnameHasLocale) {
    req.nextUrl.pathname = `/bg${pathname}`;
    return NextResponse.redirect(req.nextUrl);
  }
});

export const config = {
  matcher: [
    // Skip all internal paths (_next) and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
