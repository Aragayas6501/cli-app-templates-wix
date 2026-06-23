import type { APIRoute } from "astro";
import { isSchedulerAuthorized, json, serverError, unauthorized } from "backend/http";
import { processDuePins } from "backend/publish";

/**
 * Publish all pins whose scheduled time has passed. There is no Wix-native cron,
 * so this endpoint is meant to be called on a schedule by an EXTERNAL scheduler
 * (cloud cron / Lambda / GitHub Actions) that holds the shared scheduler secret.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    if (!(await isSchedulerAuthorized(request))) {
      return unauthorized("Invalid or missing scheduler token");
    }
    const result = await processDuePins();
    return json(result);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Scheduler run failed");
  }
};
