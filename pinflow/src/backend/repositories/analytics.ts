import { COLLECTIONS } from "@/consts";
import type { AnalyticsEvent } from "@/types";
import { items, runElevated, saveItem } from "backend/data";

const COL = COLLECTIONS.analyticsEvents;

/** Upsert a daily metric keyed by (pinterestPinId, metric, date) to avoid dupes. */
export async function upsertDailyMetric(event: AnalyticsEvent): Promise<AnalyticsEvent> {
  const res = await runElevated(() =>
    items
      .query(COL)
      .eq("pinterestPinId", event.pinterestPinId)
      .eq("metric", event.metric)
      .eq("date", event.date)
      .limit(1)
      .find(),
  );
  const existing = res.items[0] as unknown as AnalyticsEvent | undefined;
  const merged = existing?._id ? { ...existing, ...event, _id: existing._id } : event;
  return (await saveItem(COL, merged)) as unknown as AnalyticsEvent;
}

export type MetricTotals = Record<AnalyticsEvent["metric"], number>;

/** Aggregate metric totals since a YYYY-MM-DD date. */
export async function summarize(sinceDate: string): Promise<MetricTotals> {
  const totals: MetricTotals = {
    impression: 0,
    save: 0,
    pin_click: 0,
    outbound_click: 0,
  };
  let res = await runElevated(() =>
    items.query(COL).ge("date", sinceDate).limit(1000).find(),
  );
  for (;;) {
    for (const item of res.items as unknown as AnalyticsEvent[]) {
      if (item.metric in totals) totals[item.metric] += item.value ?? 0;
    }
    if (!res.hasNext?.()) break;
    res = await runElevated(() => res.next());
  }
  return totals;
}
