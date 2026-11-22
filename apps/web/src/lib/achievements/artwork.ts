import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Callers include hidden illustrations only after reading the viewer's award.
export async function achievementArtworkSource(id: string, hidden = false) {
  if (!hidden) return `/achievements/${id}.png`;
  const image = await readFile(join(process.cwd(), "data", "teaching-achievement-art", `${id}.png`), "base64");
  return `data:image/png;base64,${image}`;
}
