/** Google is the application's sign-in provider. */
export function isGoogleSignInConfigured() {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}
