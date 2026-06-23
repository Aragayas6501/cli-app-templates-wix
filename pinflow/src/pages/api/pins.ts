import type { APIRoute } from "astro";
import type { PinDraft } from "backend/pinterest/mappers";
import { badRequest, json, requireDashboardAuth, serverError } from "backend/http";
import { publishDraft } from "backend/publish";
import { getAccount, getPrimaryAccount } from "backend/repositories/accounts";
import { getBoardByPinterestId } from "backend/repositories/boards";
import { listRecentPins } from "backend/repositories/pins";
import { assertCanPublish, QuotaError } from "backend/tiers";
import { boundedLimit, httpUrl, optionalText, requiredText } from "backend/validation";

/** List recently published pins for the dashboard feed. */
export const GET: APIRoute = async ({ request }) => {
  try {
    const authResponse = await requireDashboardAuth();
    if (authResponse) return authResponse;

    const url = new URL(request.url);
    const pins = await listRecentPins(boundedLimit(url.searchParams.get("limit"), 25, 100));
    return json({ pins });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Failed to list pins");
  }
};

/** Publish a pin immediately from the dashboard (manual). */
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
    let accountId: string | undefined;
    try {
      boardId = requiredText(body?.boardId, "boardId", 100);
      imageUrl = httpUrl(body?.imageUrl, "imageUrl");
      link = httpUrl(body?.link, "link");
      title = requiredText(body?.title, "title", 100);
      description = optionalText(body?.description, "description", 500);
      accountId = optionalText(body?.accountId, "accountId", 100);
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : "Invalid pin request");
    }

    await assertCanPublish();

    const account = accountId
      ? await getAccount(accountId)
      : await getPrimaryAccount();
    if (!account?._id) return badRequest("No connected Pinterest account");
    const board = await getBoardByPinterestId(account._id, boardId);
    if (!board?._id) return badRequest("Board does not belong to the selected Pinterest account");

    const draft: PinDraft = {
      wixEntityId: "",
      source: "product",
      title,
      description: description ?? "",
      imageUrl,
      link,
    };
    const published = await publishDraft(account, boardId, draft, "manual");
    if (published.status === "failed") {
      return json({ error: published.errorMessage ?? "Publish failed", pin: published }, 502);
    }
    return json({ pin: published });
  } catch (err) {
    if (err instanceof QuotaError) return json({ error: err.message }, 402);
    return serverError(err instanceof Error ? err.message : "Failed to publish pin");
  }
};
