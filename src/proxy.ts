import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const defaultLocale = 'bg';

const isProtectedRoute = createRouteMatcher([
  '/:locale/dashboard(.*)',
  '/dashboard(.*)',
  '/:locale/practice(.*)',
  '/:locale/mobile(.*)',
]);

const isAuthRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/register(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  if (isAuthRoute(req) || pathname.startsWith('/api')) {
    return;
  }

  if (pathname.startsWith('/en/') || pathname === '/en') {
    req.nextUrl.pathname = pathname.replace(/^\/en/, '/bg');
    return NextResponse.redirect(req.nextUrl);
  }

  const pathnameHasLocale = pathname.startsWith('/bg/') || pathname === '/bg';
  if (!pathnameHasLocale) {
    req.nextUrl.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(req.nextUrl);
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/bg/dashboard',
    '/bg/dashboard/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/bg/practice/:path*',
    '/bg/mobile/:path*',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/register',
    '/api/:path*',
  ],
};
