import { posts } from "@wix/blog";
import { safeErrorDetails } from "backend/logging";
import { normalizePost } from "backend/pinterest/mappers";
import { publishFromDraft } from "backend/publish";
import { getSettings } from "backend/repositories/settings";

// Wix Blog — a post was published. Auto-pin per active blog automation rules.
export default posts.onPostCreated(async (event) => {
  try {
    const settings = await getSettings();
    const draft = normalizePost(event.entity, settings.siteUrl);
    await publishFromDraft(draft, "create");
  } catch (err) {
    console.error("[pinflow] post-created failed", safeErrorDetails(err));
  }
});
