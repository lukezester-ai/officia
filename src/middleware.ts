// @ts-nocheck
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { defaultLocale, locales } from '@/lib/i18n';

const isProtectedRoute = createRouteMatcher([
  '/:locale/dashboard(.*)',
  '/dashboard(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/register')
  ) {
    return;
  }

  // Legacy Bulgarian paths → Arabic MENA default
  if (pathname.startsWith('/ar/') || pathname === '/bg') {
    req.nextUrl.pathname = pathname.replace(/^\/bg/, `/${defaultLocale}`);
    return NextResponse.redirect(req.nextUrl);
  }

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (!pathnameHasLocale) {
    req.nextUrl.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(req.nextUrl);
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
