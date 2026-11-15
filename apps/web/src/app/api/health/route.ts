import { reportLearningRuntime } from "@/lib/learning-runtime";

export const dynamic = "force-dynamic";

/** Process liveness only; database health is observed separately in runtime logs. */
export function GET() {
  reportLearningRuntime("health");
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
