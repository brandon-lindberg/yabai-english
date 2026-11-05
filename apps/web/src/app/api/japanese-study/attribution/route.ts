import { readFile } from "node:fs/promises";
import path from "node:path";

/** Public source notice; the reviewed attribution document remains the only copy. */
export async function GET() {
  const notice = await readFile(path.join(process.cwd(), "data/japanese-content/ATTRIBUTION.md"), "utf8");
  return new Response(notice, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
