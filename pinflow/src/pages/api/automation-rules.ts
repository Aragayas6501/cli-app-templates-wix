import type { APIRoute } from "astro";
import type { AutomationRule } from "@/types";
import { badRequest, json, requireDashboardAuth, serverError } from "backend/http";
import { listRules, saveRule } from "backend/repositories/automationRules";
import { getBoardByPinterestId } from "backend/repositories/boards";
import { oneOf, optionalBoolean, optionalText, requiredText } from "backend/validation";

const SOURCE = ["product", "blog"] as const;

/** List automation rules (source → board mappings). */
export const GET: APIRoute = async () => {
  try {
    const authResponse = await requireDashboardAuth();
    if (authResponse) return authResponse;

    const rules = await listRules();
    return json({ rules });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Failed to list rules");
  }
};

/** Create or update an automation rule. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const authResponse = await requireDashboardAuth();
    if (authResponse) return authResponse;

    const body = (await request.json().catch(() => null)) as Partial<AutomationRule> | null;
    let accountId: string;
    let source: AutomationRule["source"];
    let boardId: string;
    let id: string | undefined;
    let titleTemplate: string | undefined;
    let descriptionTemplate: string | undefined;
    let enabled: boolean;
    let onCreate: boolean;
    let onUpdate: boolean;
    try {
      id = optionalText(body?._id, "_id", 100);
      accountId = requiredText(body?.accountId, "accountId", 100);
      source = oneOf(body?.source, SOURCE, "source");
      boardId = requiredText(body?.boardId, "boardId", 100);
      enabled = optionalBoolean(body?.enabled, true);
      onCreate = optionalBoolean(body?.onCreate, true);
      onUpdate = optionalBoolean(body?.onUpdate, false);
      titleTemplate = optionalText(body?.titleTemplate, "titleTemplate", 250);
      descriptionTemplate = optionalText(body?.descriptionTemplate, "descriptionTemplate", 500);
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : "Invalid automation rule");
    }

    const board = await getBoardByPinterestId(accountId, boardId);
    if (!board) {
      return badRequest("boardId must belong to the selected Pinterest account");
    }
    const rule: AutomationRule = {
      _id: id,
      accountId,
      source,
      boardId,
      enabled,
      onCreate,
      onUpdate,
      titleTemplate,
      descriptionTemplate,
    };
    const saved = await saveRule(rule);
    return json({ rule: saved });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Failed to save rule");
  }
};
