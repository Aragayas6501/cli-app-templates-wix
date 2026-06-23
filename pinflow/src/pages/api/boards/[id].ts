import type { APIRoute } from "astro";
import type { Board } from "@/types";
import { badRequest, json, requireDashboardAuth, serverError } from "backend/http";
import { removeBoard, setAssignedContentType } from "backend/repositories/boards";
import { oneOf, requiredText } from "backend/validation";

const CONTENT_TYPE = ["product", "blog", "none"] as const;

/** Assign which content type (product/blog/none) auto-publishes to this board. */
export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const authResponse = await requireDashboardAuth();
    if (authResponse) return authResponse;

    const id = requiredText(params.id, "board id", 100);
    const body = await request.json().catch(() => null);
    let assignedContentType: Board["assignedContentType"];
    try {
      assignedContentType = oneOf(body?.assignedContentType, CONTENT_TYPE, "assignedContentType");
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : "Invalid board update");
    }
    const board = await setAssignedContentType(id, assignedContentType);
    return json({ board });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Failed to update board");
  }
};

/** Stop mirroring a board locally (does not delete it on Pinterest). */
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const authResponse = await requireDashboardAuth();
    if (authResponse) return authResponse;

    const id = requiredText(params.id, "board id", 100);
    await removeBoard(id);
    return json({ ok: true });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Failed to remove board");
  }
};
