import type { APIRoute } from "astro";
import { badRequest, json, requireDashboardAuth, serverError } from "backend/http";
import { removeRule } from "backend/repositories/automationRules";
import { requiredText } from "backend/validation";

/** Delete an automation rule. */
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const authResponse = await requireDashboardAuth();
    if (authResponse) return authResponse;

    const id = requiredText(params.id, "rule id", 100);
    await removeRule(id);
    return json({ ok: true });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Failed to delete rule");
  }
};
