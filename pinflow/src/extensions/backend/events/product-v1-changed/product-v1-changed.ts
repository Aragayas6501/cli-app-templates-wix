import { products } from "@wix/stores";
import { safeErrorDetails } from "backend/logging";
import { normalizeProductV1 } from "backend/pinterest/mappers";
import { publishFromDraft } from "backend/publish";
import { getSettings } from "backend/repositories/settings";

// Wix Stores V1 — a product changed (the V1 equivalent of onProductUpdated).
// The V1 "changed" webhook carries only the productId, so the full product is
// fetched before building the pin draft.
export default products.onProductChanged(async (event) => {
  try {
    const productId = event.data?.productId;
    if (!productId) return;
    const { product } = await products.getProduct(productId);
    if (!product) return;
    const settings = await getSettings();
    const draft = normalizeProductV1(product, settings.siteUrl);
    await publishFromDraft(draft, "update");
  } catch (err) {
    console.error("[pinflow] product-v1-changed failed", safeErrorDetails(err));
  }
});
