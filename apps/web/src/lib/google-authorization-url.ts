import "server-only";
import { signIn } from "@/auth";

export async function googleAuthorizationUrl(redirectTo: string) {
  const url = new URL(await signIn("google", { redirect: false, redirectTo }));
  if (url.origin !== "https://accounts.google.com") throw new Error("Unexpected Google authorization origin");
  return url.href;
}
