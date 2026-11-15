import { authenticatedPrivateApi } from "../private-api";
import { learningResponse } from "../learning-runtime";
export { readPrivateApiJson as japanesePlacementJson } from "../private-api";

export function japanesePlacementHttp(req: Request, run: Parameters<typeof authenticatedPrivateApi>[1]) {
  return learningResponse(req, "placement.japanese", () => authenticatedPrivateApi(req, run));
}
