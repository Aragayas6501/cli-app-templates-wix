import type { APIRoute } from "astro";
import { isSchedulerAuthorized, json, requireDashboardAuth, serverError, unauthorized } from "backend/http";
import { getPinAnalytics } from "backend/pinterest/client";
import { getValidAccessToken } from "backend/pinterest/tokens";
import { applyTokenPatch, listConnectedAccounts } from "backend/repositories/accounts";
import { upsertDailyMetric } from "backend/repositories/analytics";
import { listRecentPins } from "backend/repositories/pins";

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Pull recent Pinterest metrics into the AnalyticsEvents collection. Callable
 * from the dashboard (authenticated via fetchWithAuth) or, for scheduled pulls,
 * by the external scheduler with the shared token. Idempotent (upserts per day).
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    if (request.headers.get("x-pinflow-scheduler-token")) {
      if (!(await isSchedulerAuthorized(request))) return unauthorized("Invalid scheduler token");
    } else {
      const authResponse = await requireDashboardAuth();
      if (authResponse) return authResponse;
    }

    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startDate = isoDate(start);
    const endDate = isoDate(end);

    const accounts = await listConnectedAccounts();
    const recent = await listRecentPins(100);
    let updated = 0;

    for (const account of accounts) {
      if (!account._id || account.status !== "connected") continue;
      const accountId = account._id;
      const pins = recent.filter(
        (p) => p.accountId === accountId && p.status === "published",
      );
      if (pins.length === 0) continue;

      const token = await getValidAccessToken(account, (patch) =>
        applyTokenPatch(accountId, patch),
      );

      for (const pin of pins) {
        try {
          const metrics = await getPinAnalytics(token, pin.pinterestPinId, startDate, endDate);
          for (const m of metrics) {
            await upsertDailyMetric({
              accountId,
              pinterestPinId: pin.pinterestPinId,
              metric: m.metric,
              value: m.value,
              date: m.date,
            });
            updated++;
          }
        } catch (err) {
          console.error("[pinflow] analytics pull skipped pin", {
            pinterestPinId: pin.pinterestPinId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    return json({ updated });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Analytics pull failed");
  }
};
