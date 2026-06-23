import { orders } from "@wix/ecom";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { collectionIds } from "../../../consts";

const elevatedInsert = auth.elevate(items.insert);

export default orders.onOrderCreated(async (event) => {
  try {
    const metadata = (event as { metadata?: { eventId?: string; instanceId?: string } }).metadata;
    if (!metadata?.instanceId) {
      console.error("Skipping PriceFlow order analytics without app instance metadata");
      return;
    }
    await elevatedInsert(collectionIds.analyticsEvents, {
      instanceId: metadata.instanceId,
      eventType: "orderCreated",
      dedupeKey: metadata.eventId ?? `order-${metadata.instanceId}-${Date.now()}`,
      occurredAt: new Date(),
    });
  } catch (error) {
    console.error("Failed recording PriceFlow order analytics", error);
  }
});
