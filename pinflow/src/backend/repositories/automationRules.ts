import { COLLECTIONS } from "@/consts";
import type { AutomationRule, AutomationSource } from "@/types";
import { items, removeItem, runElevated, saveItem } from "backend/data";

const COL = COLLECTIONS.automationRules;

export async function listRules(): Promise<AutomationRule[]> {
  const res = await runElevated(() => items.query(COL).descending("_createdDate").find());
  return res.items as unknown as AutomationRule[];
}

/** Enabled rules that should fire for a given source + lifecycle moment. */
export async function getActiveRules(
  accountId: string,
  source: AutomationSource,
  moment: "create" | "update",
): Promise<AutomationRule[]> {
  const res = await runElevated(() =>
    items
      .query(COL)
      .eq("accountId", accountId)
      .eq("source", source)
      .eq("enabled", true)
      .eq(moment === "create" ? "onCreate" : "onUpdate", true)
      .find(),
  );
  return res.items as unknown as AutomationRule[];
}

export async function saveRule(rule: AutomationRule): Promise<AutomationRule> {
  return (await saveItem(COL, rule)) as unknown as AutomationRule;
}

export async function removeRule(id: string): Promise<void> {
  const res = await runElevated(() => items.query(COL).eq("_id", id).limit(1).find());
  const existing = res.items[0] as unknown as AutomationRule;
  if (!existing?._id) throw new Error(`Automation rule ${id} not found`);
  await removeItem(COL, id);
}
