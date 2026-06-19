// @ts-nocheck
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

const locales = ['bg', 'en'];
const defaultLocale = 'bg';

function getLocale(request: NextRequest): string {
  const headers = new Headers(request.headers);
  const acceptLanguage = headers.get('accept-language');
  if (acceptLanguage) {
    headers.set('accept-language', acceptLanguage.replaceAll('_', '-'));
  }

  const headersObject = Object.fromEntries(headers.entries());
  const languages = new Negotiator({ headers: headersObject }).languages();
  
  try {
    return match(languages, locales, defaultLocale);
  } catch (e) {
    return defaultLocale;
  }
}

const isProtectedRoute = createRouteMatcher([
  '/:locale/dashboard(.*)',
  '/dashboard(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  const { pathname } = req.nextUrl;
  
  // Избягваме пренасочване на логин/регистрация страниците
  if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') || pathname.startsWith('/api')) {
    return;
  }
  
  // Check if there is any supported locale in the pathname
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
  
  if (!pathnameHasLocale) {
    // Redirect if there is no locale
    const locale = getLocale(req);
    req.nextUrl.pathname = `/${locale}${pathname}`;
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
