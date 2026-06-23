import type { APIRoute } from "astro";
import { badRequest, json, requireDashboardAuth, serverError } from "backend/http";
import { disconnectAccount } from "backend/repositories/accounts";
import { requiredText } from "backend/validation";

/** Disconnect (delete) a connected Pinterest account. */
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const authResponse = await requireDashboardAuth();
    if (authResponse) return authResponse;

    const id = requiredText(params.id, "account id", 100);
    await disconnectAccount(id);
    return json({ ok: true });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Failed to disconnect account");
  }
};
