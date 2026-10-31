import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { GET as connectGoogle } from "@/app/api/integrations/google/connect/route";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Legacy entry points share the canonical connection and its state checks.
  return connectGoogle(req);
}
