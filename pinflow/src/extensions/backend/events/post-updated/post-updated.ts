import { posts } from "@wix/blog";
import { safeErrorDetails } from "backend/logging";
import { normalizePost } from "backend/pinterest/mappers";
import { publishFromDraft } from "backend/publish";
import { getSettings } from "backend/repositories/settings";

// Wix Blog — a post was updated. Re-pin only if a rule targets updates.
export default posts.onPostUpdated(async (event) => {
  try {
    const settings = await getSettings();
    const draft = normalizePost(event.entity, settings.siteUrl);
    await publishFromDraft(draft, "update");
  } catch (err) {
    console.error("[pinflow] post-updated failed", safeErrorDetails(err));
  }
});
