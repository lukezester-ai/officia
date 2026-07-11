export function logClerkEnv() {
  // Client-side environment variables (public)
  console.log('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  console.log('NEXT_PUBLIC_CLERK_SIGN_IN_URL:', process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL);
  // Server-side secret (will be undefined on client, but logged when imported in server context)
  if (typeof window === 'undefined') {
    console.log('CLERK_SECRET_KEY (server):', process.env.CLERK_SECRET_KEY);
  }
}
