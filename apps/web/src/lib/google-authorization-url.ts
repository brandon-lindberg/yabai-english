import "server-only";
import { signIn } from "@/auth";

export async function googleAuthorizationUrl(redirectTo: string, authorizationParams?: Record<string, string>) {
  const options = { redirect: false, redirectTo } as const;
  const url = new URL(await (authorizationParams ? signIn("google", options, authorizationParams) : signIn("google", options)));
  if (url.origin !== "https://accounts.google.com") throw new Error("Unexpected Google authorization origin");
  return url.href;
}
