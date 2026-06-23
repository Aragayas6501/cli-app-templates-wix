import { products } from "@wix/stores";
import { safeErrorDetails } from "backend/logging";
import { normalizeProductV1 } from "backend/pinterest/mappers";
import { publishFromDraft } from "backend/publish";
import { getSettings } from "backend/repositories/settings";

// Wix Stores V1 — a product was created. Dual V1/V3 support is required for
// App Market listing; this handles sites still on the V1 catalog.
export default products.onProductCreated(async (event) => {
  try {
    const settings = await getSettings();
    const draft = normalizeProductV1(event.data, settings.siteUrl);
    await publishFromDraft(draft, "create");
  } catch (err) {
    console.error("[pinflow] product-v1-created failed", safeErrorDetails(err));
  }
});
