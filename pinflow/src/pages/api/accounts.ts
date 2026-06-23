import type { APIRoute } from "astro";
import { json, requireDashboardAuth, serverError } from "backend/http";
import { listConnectedAccounts } from "backend/repositories/accounts";

/** List connected Pinterest accounts (tokens stripped from the response). */
export const GET: APIRoute = async () => {
  try {
    const authResponse = await requireDashboardAuth();
    if (authResponse) return authResponse;

    const accounts = await listConnectedAccounts();
    const safe = accounts.map((a) => ({
      id: a._id,
      pinterestUserId: a.pinterestUserId,
      username: a.username,
      status: a.status,
      isBusiness: a.isBusiness ?? false,
      scopes: a.scopes ?? [],
      tokenExpiresAt: a.tokenExpiresAt,
    }));
    return json({ accounts: safe });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Failed to list accounts");
  }
};
