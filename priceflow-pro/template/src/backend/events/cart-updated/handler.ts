import { cart } from "@wix/ecom";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { collectionIds } from "../../../consts";

const elevatedInsert = auth.elevate(items.insert);

export default cart.onCartUpdated(async (event) => {
  try {
    const metadata = (event as { metadata?: { eventId?: string; instanceId?: string } }).metadata;
    if (!metadata?.instanceId) {
      console.error("Skipping PriceFlow cart analytics without app instance metadata");
      return;
    }
    await elevatedInsert(collectionIds.analyticsEvents, {
      instanceId: metadata.instanceId,
      eventType: "cartUpdated",
      dedupeKey: metadata.eventId ?? `cart-${metadata.instanceId}-${Date.now()}`,
      occurredAt: new Date(),
    });
  } catch (error) {
    console.error("Failed recording PriceFlow cart analytics", error);
  }
});
