import type { APIRoute } from "astro";
import { json, requireDashboardAuth, serverError } from "backend/http";
import { summarize } from "backend/repositories/analytics";
import { countPinsThisMonth } from "backend/repositories/pins";
import { boundedLimit } from "backend/validation";

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Aggregate metric totals for the dashboard overview + analytics page. */
export const GET: APIRoute = async ({ request }) => {
  try {
    const authResponse = await requireDashboardAuth();
    if (authResponse) return authResponse;

    const url = new URL(request.url);
    const days = boundedLimit(url.searchParams.get("sinceDays"), 30, 365);
    const sinceDate = isoDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000));

    const [totals, pinsThisMonth] = await Promise.all([
      summarize(sinceDate),
      countPinsThisMonth(),
    ]);

    return json({ sinceDate, totals, pinsThisMonth });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Failed to summarize analytics");
  }
};
