import { NextResponse } from "next/server";

export async function POST(req: Request) {
  void req;
  return NextResponse.json(
    { error: "Google sign-in only. Use /auth/signin." },
    { status: 410 },
  );
}
