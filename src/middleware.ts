// @ts-nocheck
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['bg', 'en'];
const defaultLocale = 'bg';

const isProtectedRoute = createRouteMatcher([
  '/:locale/dashboard(.*)',
  '/dashboard(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  const { pathname } = req.nextUrl;

  // Пропускаме auth и api пътища
  if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') || pathname.startsWith('/api')) {
    return;
  }

  // Ако URL-ът е /en/... → пренасочваме към /bg/...
  if (pathname.startsWith('/en/') || pathname === '/en') {
    req.nextUrl.pathname = pathname.replace(/^\/en/, '/bg');
    return NextResponse.redirect(req.nextUrl);
  }

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameHasLocale) {
    // Винаги пренасочваме към /bg/
    req.nextUrl.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(req.nextUrl);
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
