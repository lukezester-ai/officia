import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

  // Старите английски адреси се пренасочват към единствения поддържан език.
  if (pathname.startsWith('/en/') || pathname === '/en') {
    req.nextUrl.pathname = pathname.replace(/^\/en/, '/bg');
    return NextResponse.redirect(req.nextUrl);
  }

  const pathnameHasLocale = pathname.startsWith('/bg/') || pathname === '/bg';

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
