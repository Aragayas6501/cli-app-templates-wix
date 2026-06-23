import { productsV3 } from "@wix/stores";
import { normalizeProductV3 } from "backend/pinterest/mappers";
import { publishFromDraft } from "backend/publish";
import { safeErrorDetails } from "backend/logging";
import { getSettings } from "backend/repositories/settings";

// Wix Stores V3 — a product was updated. Re-pin only if a rule targets updates.
export default productsV3.onProductUpdated(async (event) => {
  try {
    const settings = await getSettings();
    const draft = normalizeProductV3(event.entity, settings.siteUrl);
    await publishFromDraft(draft, "update");
  } catch (err) {
    console.error("[pinflow] product-v3-updated failed", safeErrorDetails(err));
  }
});
