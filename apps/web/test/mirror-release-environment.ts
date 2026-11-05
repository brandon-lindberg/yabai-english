const secret = "mirror-isolated-test-secret";
/** Shared only by the disposable browser runner and its owned web server. */
export const MIRROR_RELEASE_AUTH_ENV = { AUTH_SECRET: secret, NEXTAUTH_SECRET: secret, LEARNING_SITES_ENABLED: "false" };

/** Browser fixtures intercept the Google navigation before it leaves the test. */
export const MIRROR_GOOGLE_AUTH_ENV = {
  AUTH_GOOGLE_ID: "mirror-qa.apps.googleusercontent.com", AUTH_GOOGLE_SECRET: "mirror-qa-placeholder",
  AUTH_REDIRECT_PROXY_URL: "",
};
