import { NextResponse } from "next/server";

/**
 * Diagnostic: nothing in this app speaks socket.io.
 *
 * The socket.io client was removed in `24ae875` when realtime moved to SSE
 * (`/api/realtime/stream`), yet a client on this machine still long-polls this
 * path several times a second and takes a full Next 404 render each time. This
 * route names the culprit instead of guessing at it: the `Referer` says which
 * document loaded the script, and `Sec-Fetch-Site` separates a page's own fetch
 * from an extension's.
 *
 * Delete this once the source is identified.
 */

/** One line per distinct caller — this path is hit several times a second. */
const seen = new Set<string>();

export function GET(request: Request) {
  const h = request.headers;
  const fingerprint = [
    h.get("referer") ?? "no-referer",
    h.get("origin") ?? "no-origin",
    h.get("sec-fetch-site") ?? "no-sec-fetch-site",
  ].join(" | ");

  if (!seen.has(fingerprint)) {
    seen.add(fingerprint);
    console.warn(
      [
        "",
        "┌─ socket.io poll — who is calling? ─────────────────────────",
        `│ referer        : ${h.get("referer") ?? "(none)"}`,
        `│ origin         : ${h.get("origin") ?? "(none)"}`,
        `│ sec-fetch-site : ${h.get("sec-fetch-site") ?? "(none)"}`,
        `│ sec-fetch-mode : ${h.get("sec-fetch-mode") ?? "(none)"}`,
        `│ sec-fetch-dest : ${h.get("sec-fetch-dest") ?? "(none)"}`,
        `│ user-agent     : ${h.get("user-agent") ?? "(none)"}`,
        "└────────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
  }

  // Same 404 the client already gets, minus the full page render it was costing.
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
