import type { APIRoute } from "astro";
import type { ScheduledPin } from "@/types";
import { badRequest, json, requireDashboardAuth, serverError } from "backend/http";
import { getBoardByPinterestId } from "backend/repositories/boards";
import { getAccount, getPrimaryAccount } from "backend/repositories/accounts";
import { createScheduledPin, listUpcoming } from "backend/repositories/scheduled";
import { assertSchedulingAllowed, QuotaError } from "backend/tiers";
import { boundedLimit, futureEpochMillis, httpUrl, optionalText, requiredText } from "backend/validation";

/** List upcoming scheduled pins. */
export const GET: APIRoute = async ({ request }) => {
  try {
    const authResponse = await requireDashboardAuth();
    if (authResponse) return authResponse;

    const url = new URL(request.url);
    const pins = await listUpcoming(boundedLimit(url.searchParams.get("limit"), 50, 100));
    return json({ pins });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Failed to list scheduled pins");
  }
};

/** Queue a pin for future publishing. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const authResponse = await requireDashboardAuth();
    if (authResponse) return authResponse;

    const body = await request.json().catch(() => null);
    let boardId: string;
    let imageUrl: string;
    let link: string;
    let title: string;
    let description: string | undefined;
    let scheduledFor: number;
    let accountId: string | undefined;
    try {
      boardId = requiredText(body?.boardId, "boardId", 100);
      imageUrl = httpUrl(body?.imageUrl, "imageUrl");
      link = httpUrl(body?.link, "link");
      title = requiredText(body?.title, "title", 100);
      description = optionalText(body?.description, "description", 500);
      scheduledFor = futureEpochMillis(body?.scheduledFor, "scheduledFor");
      accountId = optionalText(body?.accountId, "accountId", 100);
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : "Invalid scheduled pin request");
    }

    await assertSchedulingAllowed();

    const account = accountId
      ? await getAccount(accountId)
      : await getPrimaryAccount();
    if (!account?._id) return badRequest("No connected Pinterest account");
    const board = await getBoardByPinterestId(account._id, boardId);
    if (!board?._id) return badRequest("Board does not belong to the selected Pinterest account");

    const pin: ScheduledPin = {
      accountId: account._id,
      boardId,
      title,
      description,
      link,
      imageUrl,
      scheduledFor,
      status: "pending",
      attempts: 0,
    };
    const created = await createScheduledPin(pin);
    return json({ pin: created });
  } catch (err) {
    if (err instanceof QuotaError) return json({ error: err.message }, 402);
    return serverError(err instanceof Error ? err.message : "Failed to schedule pin");
  }
};
