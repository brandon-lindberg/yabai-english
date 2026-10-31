import { auth } from "@/auth";
import { GET as googleCallback } from "@/app/api/integrations/google/callback/route";
import { googleConnectRedirect } from "@/lib/google/connect-state";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TEACHER") {
    return googleConnectRedirect(req, new URL("/dashboard?calendar=forbidden", req.url));
  }

  return googleCallback(req);
}
