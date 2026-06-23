import type { APIRoute } from "astro";
import type { AppSettings } from "@/types";
import { badRequest, json, requireDashboardAuth, serverError } from "backend/http";
import { getSettings, saveSettings } from "backend/repositories/settings";
import { optionalHttpUrl, optionalText } from "backend/validation";

/** Read the single app settings row. */
export const GET: APIRoute = async () => {
  try {
    const authResponse = await requireDashboardAuth();
    if (authResponse) return authResponse;

    const settings = await getSettings();
    return json({ settings });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Failed to read settings");
  }
};

/**
 * Persist a settings patch. Note: the Pinterest tag parameters are pushed to the
 * embedded script from the Settings dashboard page via `embeddedScripts.embedScript`
 * (documented pattern); this route only owns the Settings collection row.
 */
export const PUT: APIRoute = async ({ request }) => {
  try {
    const authResponse = await requireDashboardAuth();
    if (authResponse) return authResponse;

    const body = (await request.json().catch(() => ({}))) as Partial<AppSettings>;
    let patch: Partial<AppSettings>;
    try {
      patch = {
        pinterestTagId: optionalText(body.pinterestTagId, "pinterestTagId", 100),
        tagEnabled: typeof body.tagEnabled === "boolean" ? body.tagEnabled : undefined,
        siteUrl: optionalHttpUrl(body.siteUrl, "siteUrl"),
        defaultUtmCampaign: optionalText(body.defaultUtmCampaign, "defaultUtmCampaign", 100),
      };
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : "Invalid settings");
    }
    for (const key of Object.keys(patch) as (keyof AppSettings)[]) {
      if (patch[key] === undefined) delete patch[key];
    }
    const current = await getSettings();
    const nextSettings = { ...current, ...patch };
    if (nextSettings.tagEnabled && !nextSettings.pinterestTagId?.trim()) {
      return badRequest("Pinterest tag ID is required when the tag is enabled");
    }

    const settings = await saveSettings(patch);
    return json({ settings });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Failed to save settings");
  }
};
