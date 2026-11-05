import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRequestLearningSite } from "./learning-site-request";
import { PrivateApiFailure } from "./private-api-error";

const reply = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store" },
});

export async function authenticatedPrivateApi(req: Request, run: (actorId: string) => Promise<unknown>) {
  try {
    const session = await auth();
    if (!session?.user?.id) return reply({ error: "UNAUTHORIZED" }, 401);
    if (req.method === "POST") {
      const origin = req.headers.get("Origin");
      // Next can normalize a local alias to localhost in req.url. Use the
      // same allowlisted site that owns this request's session and learning path.
      const site = origin ? await getRequestLearningSite() : null;
      const expectedOrigin = site?.origin ?? new URL(req.url).origin;
      if (req.headers.get("Sec-Fetch-Site") === "cross-site" || (origin && origin !== expectedOrigin)) {
        return reply({ error: "CROSS_SITE_REQUEST" }, 403);
      }
      if (req.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
        return reply({ error: "JSON_REQUIRED" }, 415);
      }
    }
    // The service rereads the account. Session role/subject fields never authorize data access.
    return reply(await run(session.user.id));
  } catch (error) {
    if (error instanceof PrivateApiFailure) return reply({ error: error.code }, error.status);
    console.error("Private API request failed", error);
    return reply({ error: "INTERNAL_ERROR" }, 500);
  }
}

/** Shared bounded JSON reader; domain services validate the accepted fields. */
export async function readPrivateApiJson(req: Request): Promise<unknown> {
  if (!req.body) throw new PrivateApiFailure(400, "INVALID_JSON");
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 16_384) {
        await reader.cancel();
        throw new PrivateApiFailure(413, "BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof PrivateApiFailure) throw error;
    throw new PrivateApiFailure(400, "INVALID_JSON");
  } finally { reader.releaseLock(); }
}
