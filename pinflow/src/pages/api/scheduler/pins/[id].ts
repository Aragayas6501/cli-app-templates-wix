import type { APIRoute } from "astro";
import { badRequest, json, requireDashboardAuth, serverError } from "backend/http";
import { cancelScheduledPin } from "backend/repositories/scheduled";
import { requiredText } from "backend/validation";

/** Cancel a pending scheduled pin. */
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const authResponse = await requireDashboardAuth();
    if (authResponse) return authResponse;

    const id = requiredText(params.id, "scheduled pin id", 100);
    await cancelScheduledPin(id);
    return json({ ok: true });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Failed to cancel scheduled pin");
  }
};
