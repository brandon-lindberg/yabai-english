/** Server-only: which sign-in methods are active (mirrors auth.ts). */
export function getAuthMode() {
  const hasGoogleOAuth = !!(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  );
  const devEmailSignIn =
    process.env.NODE_ENV !== "production" && !hasGoogleOAuth;
  return { hasGoogleOAuth, devEmailSignIn };
}
