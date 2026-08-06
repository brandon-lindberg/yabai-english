import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { buildGoogleConnectUrl } from "@/lib/google/oauth-service";
import { DASHBOARD_GOOGLE_SETTINGS_PATH } from "@/lib/dashboard-google-settings-path";

/*
  Connecting Google is one action.

  `feature` used to select which scopes to request. It is no longer part of the
  schema — zod strips unknown keys, so the older `?feature=calendar` links that
  still exist (the booking calendar recovery prompt, lesson rows) keep working
  and simply grant everything, which is what their user wanted anyway.
*/
const querySchema = z.object({
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
    returnTo: parsed.data.returnTo,
  });
  if (!url) {
    return NextResponse.redirect(new URL(`${DASHBOARD_GOOGLE_SETTINGS_PATH}?google=misconfigured`, req.url));
  }

  return NextResponse.redirect(url);
}
