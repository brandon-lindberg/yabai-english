const secret = "mirror-isolated-test-secret";
/** Shared only by the disposable browser runner and its owned web server. */
export const MIRROR_RELEASE_AUTH_ENV = { AUTH_SECRET: secret, NEXTAUTH_SECRET: secret, LEARNING_SITES_ENABLED: "false" };
