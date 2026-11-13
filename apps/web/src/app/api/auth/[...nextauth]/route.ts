import { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { getRequestLearningSite } from "@/lib/learning-site-request";

function onLearningSite(handler: typeof handlers.GET) {
  return async (request: NextRequest) => {
    const site = await getRequestLearningSite();
    if (!site || request.nextUrl.origin === site.origin) return handler(request);

    // Next's dev server can give a .localhost alias the localhost request URL.
    // Auth.js uses that URL to decide whether this is the OAuth forwarding host.
    const url = new URL(site.origin);
    url.pathname = request.nextUrl.pathname;
    url.search = request.nextUrl.search;
    return handler(new NextRequest(url, request));
  };
}

export const GET = onLearningSite(handlers.GET);
export const POST = onLearningSite(handlers.POST);
