/**
 * Publish core — the single place pins are created on Pinterest and recorded
 * locally. Shared by backend events (automation), the scheduler run endpoint,
 * and manual publishing from the dashboard.
 */
import type { PinterestAccount, PublishedPin, ScheduledPin } from "@/types";
import { createPin } from "backend/pinterest/client";
import { applyUtm, isPublishable, renderTemplate, type PinDraft } from "backend/pinterest/mappers";
import { getValidAccessToken } from "backend/pinterest/tokens";
import * as accountsRepo from "backend/repositories/accounts";
import { getActiveRules } from "backend/repositories/automationRules";
import { getAssignedBoard } from "backend/repositories/boards";
import { getMapping, recordPublishedPin, upsertMapping } from "backend/repositories/pins";
import * as scheduledRepo from "backend/repositories/scheduled";
import { getSettings } from "backend/repositories/settings";
import { assertCanPublish, automationsAllowed } from "backend/tiers";

type PinSource = PublishedPin["source"];
const MAX_SCHEDULED_ATTEMPTS = 3;
const SCHEDULE_RETRY_BASE_DELAY_MS = 5 * 60 * 1000;

interface PublishOptions {
  utmCampaign?: string;
}

/** Create one pin on Pinterest and record the outcome (success or failure). */
export async function publishDraft(
  account: PinterestAccount,
  boardId: string,
  draft: PinDraft,
  source: PinSource,
  options: PublishOptions = {},
): Promise<PublishedPin> {
  const accountId = account._id;
  if (!accountId) throw new Error("Connected Pinterest account is missing an ID");
  const campaign =
    options.utmCampaign ?? (await getSettings()).defaultUtmCampaign;
  const link = applyUtm(draft.link, campaign || undefined);
  const token = await getValidAccessToken(account, (patch) =>
    accountsRepo.applyTokenPatch(accountId, patch),
  );

  try {
    const pin = await createPin(token, {
      boardId,
      title: draft.title,
      description: draft.description,
      link,
      imageUrl: draft.imageUrl,
      altText: draft.title,
    });

    const published = await recordPublishedPin({
      accountId,
      pinterestPinId: pin.id,
      boardId,
      source,
      wixEntityId: draft.wixEntityId || undefined,
      title: draft.title,
      link,
      imageUrl: draft.imageUrl,
      status: "published",
      publishedAt: Date.now(),
    });

    if (draft.wixEntityId && (source === "product" || source === "blog")) {
      await upsertMapping({
        accountId,
        source,
        wixEntityId: draft.wixEntityId,
        pinterestPinId: pin.id,
        lastPublishedAt: Date.now(),
      });
    }
    return published;
  } catch (err) {
    await recordPublishedPin({
      accountId,
      pinterestPinId: "",
      boardId,
      source,
      wixEntityId: draft.wixEntityId || undefined,
      title: draft.title,
      link,
      imageUrl: draft.imageUrl,
      status: "failed",
      errorMessage: err instanceof Error ? err.message : String(err),
      publishedAt: Date.now(),
    });
    throw err;
  }
}

interface ResolvedTarget {
  boardId: string;
  titleTemplate?: string;
  descriptionTemplate?: string;
}

/** Resolve which board(s) a draft should publish to for the given moment. */
async function resolveTargets(
  accountId: string,
  draft: PinDraft,
  moment: "create" | "update",
): Promise<ResolvedTarget[]> {
  const rules = await getActiveRules(accountId, draft.source, moment);
  if (rules.length > 0) {
    return rules
      .filter((r) => r.boardId)
      .map((r) => ({
        boardId: r.boardId,
        titleTemplate: r.titleTemplate,
        descriptionTemplate: r.descriptionTemplate,
      }));
  }
  // Fall back to a board explicitly assigned to this content type.
  const assigned = await getAssignedBoard(accountId, draft.source);
  return assigned?.pinterestBoardId ? [{ boardId: assigned.pinterestBoardId }] : [];
}

function applyTemplates(draft: PinDraft, target: ResolvedTarget): PinDraft {
  const vars = { title: draft.title, description: draft.description };
  return {
    ...draft,
    title: target.titleTemplate ? renderTemplate(target.titleTemplate, vars, 100) : draft.title,
    description: target.descriptionTemplate
      ? renderTemplate(target.descriptionTemplate, vars, 500)
      : draft.description,
  };
}

/**
 * Automation entry point used by Stores/Blog events. Honors tier gating,
 * de-duplicates on create, and publishes to every matching board.
 */
export async function publishFromDraft(
  draft: PinDraft,
  moment: "create" | "update",
): Promise<void> {
  if (!(await automationsAllowed())) return;
  if (!isPublishable(draft)) return;

  const account = await accountsRepo.getPrimaryAccount();
  if (!account?._id) return;

  // On create, skip entities already pinned to avoid duplicates.
  if (moment === "create") {
    const existing = await getMapping(account._id, draft.source, draft.wixEntityId);
    if (existing?.pinterestPinId) return;
  }

  const targets = await resolveTargets(account._id, draft, moment);
  const settings = await getSettings();
  for (const target of targets) {
    await assertCanPublish();
    await publishDraft(
      account,
      target.boardId,
      applyTemplates(draft, target),
      draft.source,
      { utmCampaign: settings.defaultUtmCampaign },
    );
  }
}

/** Publish a single queued pin. Used by the scheduler run endpoint. */
export async function publishScheduledPin(pin: ScheduledPin): Promise<"published" | "failed" | "skipped"> {
  const claimed = await scheduledRepo.claimPendingPin(pin);
  if (!claimed) return "skipped";

  const account = await accountsRepo.getAccount(claimed.accountId);
  if (!account?._id) {
    await scheduledRepo.markStatus(claimed, "failed", {
      lastError: "Connected account not found",
      attempts: (claimed.attempts ?? 0) + 1,
    });
    return "failed";
  }

  try {
    await assertCanPublish();
    const settings = await getSettings();
    const published = await publishDraft(
      account,
      claimed.boardId,
      {
        wixEntityId: "",
        source: "product",
        title: claimed.title,
        description: claimed.description ?? "",
        imageUrl: claimed.imageUrl,
        link: claimed.link,
      },
      "scheduled",
      { utmCampaign: settings.defaultUtmCampaign },
    );
    await scheduledRepo.markStatus(claimed, "published", {
      publishedPinId: published._id,
      attempts: (claimed.attempts ?? 0) + 1,
    });
    return "published";
  } catch (err) {
    const attempts = (claimed.attempts ?? 0) + 1;
    const lastError = err instanceof Error ? err.message : String(err);
    if (attempts < MAX_SCHEDULED_ATTEMPTS) {
      await scheduledRepo.markStatus(claimed, "pending", {
        lastError,
        attempts,
        scheduledFor: Date.now() + SCHEDULE_RETRY_BASE_DELAY_MS * 2 ** (attempts - 1),
      });
    } else {
      await scheduledRepo.markStatus(claimed, "failed", { lastError, attempts });
    }
    return "failed";
  }
}

/** Publish all pins that are due. Returns a small run summary. */
export async function processDuePins(): Promise<{ processed: number; published: number; failed: number; skipped: number }> {
  const due = await scheduledRepo.listDuePins();
  let published = 0;
  let failed = 0;
  let skipped = 0;
  for (const pin of due) {
    const result = await publishScheduledPin(pin);
    if (result === "published") published++;
    else if (result === "failed") failed++;
    else skipped++;
  }
  return { processed: due.length, published, failed, skipped };
}
