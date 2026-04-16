import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { buildGoogleConnectUrl } from "@/lib/google/oauth-service";

const querySchema = z.object({
  feature: z.enum(["calendar", "drive", "meet"]).default("calendar"),
  returnTo: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = querySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const url = buildGoogleConnectUrl(req, {
    userId: session.user.id,
    feature: parsed.data.feature,
    returnTo: parsed.data.returnTo,
  });
  if (!url) {
    return NextResponse.redirect(new URL("/dashboard/integrations?google=misconfigured", req.url));
  }

  return NextResponse.redirect(url);
}
