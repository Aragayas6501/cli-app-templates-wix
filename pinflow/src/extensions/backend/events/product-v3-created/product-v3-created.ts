import { productsV3 } from "@wix/stores";
import { normalizeProductV3 } from "backend/pinterest/mappers";
import { publishFromDraft } from "backend/publish";
import { safeErrorDetails } from "backend/logging";
import { getSettings } from "backend/repositories/settings";

// Wix Stores V3 — a product was created. Auto-pin per active automation rules.
export default productsV3.onProductCreated(async (event) => {
  try {
    const settings = await getSettings();
    const draft = normalizeProductV3(event.entity, settings.siteUrl);
    await publishFromDraft(draft, "create");
  } catch (err) {
    console.error("[pinflow] product-v3-created failed", safeErrorDetails(err));
  }
});
