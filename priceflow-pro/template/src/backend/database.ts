import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { collectionIds, DEFAULT_APP_DATA } from "../consts";
import type { CustomerGroup, PriceFlowAppData, PricingRule, RuleDraft } from "../types";
import { createRuleDiscount, deleteRuleDiscount } from "./discountRules";

type WixDataItem = { _id: string; [key: string]: unknown };

const elevatedQuery = auth.elevate(items.query);
const elevatedSave = auth.elevate(items.save);
const elevatedGet = auth.elevate(items.get);
const elevatedRemove = auth.elevate(items.remove);
const elevatedInsert = auth.elevate(items.insert);

function createRuleId(): string {
  const randomId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  return `priceflow-${randomId}`;
}

function normalizeRule(item: WixDataItem): PricingRule {
  return {
    _id: item._id,
    instanceId: String(item.instanceId ?? "default"),
    name: String(item.name ?? "Untitled rule"),
    status: (item.status as PricingRule["status"]) ?? "draft",
    scopeType: (item.scopeType as PricingRule["scopeType"]) ?? "store",
    ruleType: (item.ruleType as PricingRule["ruleType"]) ?? "quantity",
    priority: Number(item.priority ?? 100),
    stackable: Boolean(item.stackable),
    productIds: Array.isArray(item.productIds) ? item.productIds.map(String) : [],
    collectionIds: Array.isArray(item.collectionIds) ? item.collectionIds.map(String) : [],
    customerGroupIds: Array.isArray(item.customerGroupIds) ? item.customerGroupIds.map(String) : [],
    minSubtotal: typeof item.minSubtotal === "number" ? item.minSubtotal : undefined,
    currency: String(item.currency ?? "USD"),
    startsAt: typeof item.startsAt === "string" ? item.startsAt : undefined,
    endsAt: typeof item.endsAt === "string" ? item.endsAt : undefined,
    tiers: Array.isArray(item.tiers)
      ? item.tiers
          .map((tier) => {
            const value = tier as { minQuantity?: unknown; percentOff?: unknown };
            return {
              minQuantity: Number(value.minQuantity ?? 1),
              percentOff: Number(value.percentOff ?? 0),
            };
          })
          .filter((tier) => tier.minQuantity > 0 && tier.percentOff > 0)
      : [],
    actionType: (item.actionType as PricingRule["actionType"]) ?? "percentOff",
    amount: Number(item.amount ?? 0),
    discountId: typeof item.discountId === "string" ? item.discountId : undefined,
    syncStatus: (item.syncStatus as PricingRule["syncStatus"]) ?? "pending",
    syncError: typeof item.syncError === "string" ? item.syncError : undefined,
    version: Number(item.version ?? 1),
  };
}

function normalizeGroup(item: WixDataItem): CustomerGroup {
  return {
    _id: item._id,
    instanceId: String(item.instanceId ?? "default"),
    name: String(item.name ?? "Customer group"),
    slug: String(item.slug ?? item._id),
    memberIds: Array.isArray(item.memberIds) ? item.memberIds.map(String) : [],
  };
}

export async function listPricingRules(instanceId: string): Promise<PricingRule[]> {
  try {
    const result = await elevatedQuery(collectionIds.pricingRules)
      .eq("instanceId", instanceId)
      .limit(100)
      .find({ consistentRead: true });
    return result.items.map((item) => normalizeRule(item as WixDataItem));
  } catch (error) {
    console.error("Failed listing pricing rules", error);
    return DEFAULT_APP_DATA.rules;
  }
}

export async function listCustomerGroups(instanceId: string): Promise<CustomerGroup[]> {
  try {
    const result = await elevatedQuery(collectionIds.customerGroups)
      .eq("instanceId", instanceId)
      .limit(100)
      .find({ consistentRead: true });
    return result.items.map((item) => normalizeGroup(item as WixDataItem));
  } catch (error) {
    console.error("Failed listing customer groups", error);
    return DEFAULT_APP_DATA.groups;
  }
}

export async function getPriceFlowData(instanceId: string): Promise<PriceFlowAppData> {
  const [rules, groups] = await Promise.all([
    listPricingRules(instanceId),
    listCustomerGroups(instanceId),
  ]);
  return { rules, groups };
}

export async function countPricingRules(instanceId: string): Promise<number> {
  return elevatedQuery(collectionIds.pricingRules)
    .eq("instanceId", instanceId)
    .count({ consistentRead: true });
}

export function validateRuleDraft(draft: RuleDraft): string[] {
  const errors: string[] = [];
  if (!draft.name.trim()) {
    errors.push("Rule name is required.");
  }
  if (draft.name.trim().length > 50) {
    errors.push("Rule name must be 50 characters or fewer.");
  }
  if (draft.minQuantity < 1) {
    errors.push("Minimum quantity must be at least 1.");
  }
  if (draft.percentOff <= 0 || draft.percentOff > 100) {
    errors.push("Percent off must be between 1 and 100.");
  }
  if (draft.scopeType === "product" && draft.productIds.length === 0) {
    errors.push("Choose at least one product for product-scoped rules.");
  }
  if (draft.scopeType === "collection" && draft.collectionIds.length === 0) {
    errors.push("Choose at least one collection for collection-scoped rules.");
  }
  if (draft.scopeType === "collection") {
    errors.push("Collection-scoped checkout discounts are not supported by this rule builder.");
  }
  return errors;
}

export async function saveRuleDraft(
  draft: RuleDraft,
  instanceId: string
): Promise<PricingRule> {
  const errors = validateRuleDraft(draft);
  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  const ruleId = createRuleId();
  const discountId = await createRuleDiscount(draft);

  const rule: PricingRule = {
    _id: ruleId,
    instanceId,
    name: draft.name.trim(),
    status: "active",
    scopeType: draft.scopeType,
    ruleType: draft.ruleType,
    priority: 100,
    stackable: false,
    productIds: draft.productIds,
    collectionIds: draft.collectionIds,
    customerGroupIds: [],
    currency: "USD",
    startsAt: draft.startsAt,
    endsAt: draft.endsAt,
    tiers: [{ minQuantity: draft.minQuantity, percentOff: draft.percentOff }],
    actionType: "percentOff",
    amount: draft.percentOff,
    discountId,
    syncStatus: "synced",
    version: 1,
  };

  try {
    const saved = await elevatedSave(collectionIds.pricingRules, rule);
    try {
      await elevatedInsert(collectionIds.auditLogs, {
        instanceId,
        entityType: "rule",
        entityId: rule._id,
        action: "save",
        after: rule,
        occurredAt: new Date(),
      });
    } catch (auditError) {
      console.error("Failed writing rule audit log", auditError);
    }
    return normalizeRule(saved as WixDataItem);
  } catch (error) {
    console.error("Failed saving rule", error);
    try {
      await deleteRuleDiscount(discountId);
    } catch (rollbackError) {
      console.error("Failed rolling back Wix discount rule", rollbackError);
    }
    throw error;
  }
}

export async function deleteRule(ruleId: string, instanceId: string): Promise<void> {
  try {
    const item = await elevatedGet(collectionIds.pricingRules, ruleId, {
      consistentRead: true,
    });
    if (!item) {
      return;
    }
    const rule = normalizeRule(item as WixDataItem);
    if (rule.instanceId !== instanceId) {
      throw new Error("Pricing rule does not belong to this app instance.");
    }
    await elevatedRemove(collectionIds.pricingRules, ruleId);
    if (rule.discountId) {
      await deleteRuleDiscount(rule.discountId);
    }
  } catch (error) {
    console.error("Failed deleting rule", error);
    throw error;
  }
}
