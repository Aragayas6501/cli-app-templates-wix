import { COLLECTIONS } from "@/consts";
import type { ScheduledPin } from "@/types";
import { getItem, items, removeItem, runElevated, saveItem, updateItem } from "backend/data";

const COL = COLLECTIONS.scheduledPins;

export async function createScheduledPin(pin: ScheduledPin): Promise<ScheduledPin> {
  return (await saveItem(COL, {
    ...pin,
    status: pin.status ?? "pending",
    attempts: pin.attempts ?? 0,
  })) as unknown as ScheduledPin;
}

export async function listUpcoming(limit = 50): Promise<ScheduledPin[]> {
  const res = await runElevated(() =>
    items
      .query(COL)
      .hasSome("status", ["pending", "publishing", "failed"])
      .ascending("scheduledFor")
      .limit(limit)
      .find(),
  );
  return res.items as unknown as ScheduledPin[];
}

/** Pins that are due to publish now (pending + scheduledFor <= now). */
export async function listDuePins(now = Date.now(), limit = 25): Promise<ScheduledPin[]> {
  const res = await runElevated(() =>
    items
      .query(COL)
      .eq("status", "pending")
      .le("scheduledFor", now)
      .ascending("scheduledFor")
      .limit(limit)
      .find(),
  );
  return res.items as unknown as ScheduledPin[];
}

export async function getScheduledPin(id: string): Promise<ScheduledPin | null> {
  return (await getItem(COL, id, { consistentRead: true })) as unknown as ScheduledPin | null;
}

export async function claimPendingPin(pin: ScheduledPin): Promise<ScheduledPin | null> {
  const id = pin._id;
  if (!id) throw new Error("Scheduled pin is missing an id");
  const claimedPin: ScheduledPin & { _id: string } = { ...pin, _id: id, status: "publishing" };
  let condition = items.filter().eq("status", "pending");
  if (pin._updatedDate) condition = condition.eq("_updatedDate", pin._updatedDate);
  try {
    return (await updateItem(COL, claimedPin, {
      condition,
    })) as unknown as ScheduledPin;
  } catch (err) {
    const latest = await getScheduledPin(id);
    if (!latest || latest.status !== "pending") return null;
    throw err;
  }
}

export async function markStatus(
  pin: ScheduledPin,
  status: ScheduledPin["status"],
  patch: Partial<ScheduledPin> = {},
): Promise<ScheduledPin> {
  return (await saveItem(COL, { ...pin, ...patch, status })) as unknown as ScheduledPin;
}

export async function cancelScheduledPin(id: string): Promise<void> {
  const res = await runElevated(() => items.query(COL).eq("_id", id).limit(1).find());
  const existing = res.items[0] as unknown as ScheduledPin;
  if (existing?._id) await saveItem(COL, { ...existing, status: "cancelled" });
}

export async function removeScheduledPin(id: string): Promise<void> {
  const existing = await getScheduledPin(id);
  if (!existing?._id) throw new Error(`Scheduled pin ${id} not found`);
  await removeItem(COL, id);
}
