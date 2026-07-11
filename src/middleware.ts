import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

console.log('Middleware - CLERK_SECRET_KEY:', process.env.CLERK_SECRET_KEY);

const locales = ['bg'];

const isProtectedRoute = createRouteMatcher([
  '/:locale/dashboard(.*)',
  '/dashboard(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  console.log('Middleware request URL:', req.nextUrl.pathname);
  console.log('Secret key during request:', process.env.CLERK_SECRET_KEY);
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  const { pathname } = req.nextUrl;
  
  // Избягваме пренасочване на логин/регистрация страниците
  if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') || pathname.startsWith('/api')) {
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
