import { COLLECTIONS } from "@/consts";
import type { ProductMapping, PublishedPin, AutomationSource } from "@/types";
import { insertItem, items, runElevated, saveItem } from "backend/data";

const PINS = COLLECTIONS.publishedPins;
const MAPPINGS = COLLECTIONS.productMappings;

function startOfMonthMillis(now = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

export async function recordPublishedPin(pin: PublishedPin): Promise<PublishedPin> {
  return (await insertItem(PINS, pin)) as unknown as PublishedPin;
}

export async function listRecentPins(limit = 25): Promise<PublishedPin[]> {
  const res = await runElevated(() =>
    items.query(PINS).descending("publishedAt").limit(limit).find(),
  );
  return res.items as unknown as PublishedPin[];
}

/** Count successfully published pins in the current calendar month (quota). */
export async function countPinsThisMonth(): Promise<number> {
  const res = await runElevated(() =>
    items
      .query(PINS)
      .eq("status", "published")
      .ge("publishedAt", startOfMonthMillis())
      .find(),
  );
  return res.totalCount ?? res.items.length;
}

export async function getMapping(
  accountId: string,
  source: AutomationSource,
  wixEntityId: string,
): Promise<ProductMapping | null> {
  const res = await runElevated(() =>
    items
      .query(MAPPINGS)
      .eq("accountId", accountId)
      .eq("source", source)
      .eq("wixEntityId", wixEntityId)
      .limit(1)
      .find(),
  );
  return (res.items[0] as unknown as ProductMapping) ?? null;
}

export async function upsertMapping(mapping: ProductMapping): Promise<ProductMapping> {
  const existing = await getMapping(mapping.accountId, mapping.source, mapping.wixEntityId);
  const merged = existing?._id ? { ...existing, ...mapping, _id: existing._id } : mapping;
  return (await saveItem(MAPPINGS, merged)) as unknown as ProductMapping;
}
