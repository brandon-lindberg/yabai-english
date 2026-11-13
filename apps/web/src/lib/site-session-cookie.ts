/** Matches the host-only session cookie names and defaults used by Auth.js. */
export function siteSessionCookie(origin: string) {
  const secure = new URL(origin).protocol === "https:";
  return {
    name: `${secure ? "__Secure-" : ""}authjs.session-token`,
    options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure },
  };
}
