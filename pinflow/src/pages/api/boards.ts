import type { APIRoute } from "astro";
import type { Board } from "@/types";
import { badRequest, json, requireDashboardAuth, serverError } from "backend/http";
import { createBoard, listBoards as listPinterestBoards } from "backend/pinterest/client";
import { getValidAccessToken } from "backend/pinterest/tokens";
import { applyTokenPatch, getAccount, getPrimaryAccount } from "backend/repositories/accounts";
import { listBoards, syncBoards, upsertBoard } from "backend/repositories/boards";
import { oneOf, optionalOneOf, optionalText, requiredText } from "backend/validation";

const PRIVACY = ["PUBLIC", "PROTECTED", "SECRET"] as const;
const CONTENT_TYPE = ["product", "blog", "none"] as const;

async function resolveAccount(accountId: string | null) {
  return accountId ? getAccount(accountId) : getPrimaryAccount();
}

/**
 * List locally-mirrored boards. With `?sync=true`, first pull the latest boards
 * from Pinterest for the (primary or `?accountId`) account and upsert them.
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    const authResponse = await requireDashboardAuth();
    if (authResponse) return authResponse;

    const url = new URL(request.url);
    const accountId = optionalText(url.searchParams.get("accountId"), "accountId", 100);
    const sync = url.searchParams.get("sync") === "true";

    if (sync) {
      const account = await resolveAccount(accountId ?? null);
      if (!account?._id) return badRequest("No connected account to sync boards for");
      const resolvedAccountId = account._id;
      const token = await getValidAccessToken(account, (patch) =>
        applyTokenPatch(resolvedAccountId, patch),
      );
      const remote = await listPinterestBoards(token);
      const mapped: Board[] = remote.map((b) => ({
        accountId: resolvedAccountId,
        pinterestBoardId: b.id,
        name: b.name,
        description: b.description,
        privacy: b.privacy,
        pinCount: b.pin_count,
      }));
      await syncBoards(resolvedAccountId, mapped);
    }

    const boards = await listBoards(accountId ?? undefined);
    return json({ boards });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Failed to list boards");
  }
};

/** Create a new board on Pinterest and mirror it locally. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const authResponse = await requireDashboardAuth();
    if (authResponse) return authResponse;

    const body = await request.json().catch(() => null);
    let name: string;
    let description: string | undefined;
    let privacy: Board["privacy"];
    let accountId: string | undefined;
    let assignedContentType: Board["assignedContentType"];
    try {
      name = requiredText(body?.name, "name", 180);
      description = optionalText(body?.description, "description", 500);
      privacy = oneOf(body?.privacy, PRIVACY, "privacy", "PUBLIC");
      accountId = optionalText(body?.accountId, "accountId", 100);
      assignedContentType = optionalOneOf(body?.assignedContentType, CONTENT_TYPE, "assignedContentType") ?? "none";
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : "Invalid board request");
    }

    const account = await resolveAccount(accountId ?? null);
    if (!account?._id) return badRequest("No connected account to create a board for");
    const resolvedAccountId = account._id;

    const token = await getValidAccessToken(account, (patch) =>
      applyTokenPatch(resolvedAccountId, patch),
    );
    const remote = await createBoard(token, {
      name,
      description,
      privacy,
    });

    const board = await upsertBoard({
      accountId: resolvedAccountId,
      pinterestBoardId: remote.id,
      name: remote.name,
      description: remote.description,
      privacy: remote.privacy,
      pinCount: remote.pin_count,
      assignedContentType,
    });
    return json({ board });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Failed to create board");
  }
};
