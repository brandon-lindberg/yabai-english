/**
 * Auth.js error types worth distinguishing on the sign-in page.
 *
 * `retry` is the recoverable bucket: a replayed OAuth callback, a PKCE cookie past
 * its 15-minute TTL, or a transient server fault. Auth.js reports all of these as
 * `Configuration`, because that is its fallback for every error type outside its
 * client-safe allowlist — it does not actually mean the server is misconfigured.
 *
 * `denied` is not recoverable by retrying: the `signIn` callback rejected the
 * account (see `isLoginAllowedForAccountStatus`), so telling the user to try again
 * would loop them.
 */
export type AuthErrorKind = "retry" | "denied";

/**
 * Maps a `?error=` query value to the message the sign-in page should show.
 * Returns `null` for absent or unrecognized values so nothing is rendered.
 */
export function resolveAuthErrorKind(raw: string | undefined | null): AuthErrorKind | null {
  if (!raw) return null;
  switch (raw) {
    case "AccessDenied":
      return "denied";
    case "Configuration":
    case "Verification":
    case "OAuthCallbackError":
    case "OAuthAccountNotLinked":
    case "AccountNotLinked":
      return "retry";
    default:
      return null;
  }
}
