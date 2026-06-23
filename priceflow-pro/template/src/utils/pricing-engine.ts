import { triggerIds } from "../consts";
import type {
  AppliedRule,
  CartLine,
  PricingContext,
  PricingResult,
  PricingRule,
  QuantityTier,
} from "../types";

function isWithinSchedule(rule: PricingRule, now: Date): boolean {
  const time = now.getTime();
  if (rule.startsAt) {
    const startsAt = new Date(rule.startsAt).getTime();
    if (!Number.isFinite(startsAt) || time < startsAt) {
      return false;
    }
  }
  if (rule.endsAt) {
    const endsAt = new Date(rule.endsAt).getTime();
    if (!Number.isFinite(endsAt) || time >= endsAt) {
      return false;
    }
  }
  return true;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

function ruleMatchesLine(rule: PricingRule, line: CartLine): boolean {
  if (rule.scopeType === "store") {
    return true;
  }
  if (rule.scopeType === "product") {
    return rule.productIds.includes(line.productId);
  }
  const lineCollectionIds = line.collectionIds ?? [];
  return rule.collectionIds.some((collectionId) =>
    lineCollectionIds.includes(collectionId)
  );
}

function selectTier(tiers: QuantityTier[], quantity: number): QuantityTier | undefined {
  return [...tiers]
    .sort((a, b) => b.minQuantity - a.minQuantity)
    .find((tier) => quantity >= tier.minQuantity);
}

function percentForRule(rule: PricingRule, line: CartLine): number {
  if (rule.ruleType === "quantity") {
    const tier = selectTier(rule.tiers, line.quantity);
    return clampPercent(tier?.percentOff ?? 0);
  }
  if (rule.actionType === "percentOff") {
    return clampPercent(rule.amount);
  }
  return 0;
}

function triggerForRule(rule: PricingRule): string {
  if (rule.ruleType === "group") {
    return triggerIds.customerGroup;
  }
  if (rule.ruleType === "promo") {
    return triggerIds.scheduledPromo;
  }
  if (rule.ruleType === "subtotal") {
    return triggerIds.subtotal;
  }
  if (rule.ruleType === "bogo") {
    return triggerIds.bogo;
  }
  return triggerIds.quantityTier;
}

function ruleMatchesContext(rule: PricingRule, context: PricingContext): boolean {
  if (rule.status !== "active" || !isWithinSchedule(rule, context.now)) {
    return false;
  }
  if (rule.currency !== context.currency) {
    return false;
  }
  if (rule.minSubtotal !== undefined && context.subtotal < rule.minSubtotal) {
    return false;
  }
  if (
    rule.customerGroupIds.length > 0 &&
    !rule.customerGroupIds.some((groupId) => context.customerGroupIds.includes(groupId))
  ) {
    return false;
  }
  return context.lineItems.some((line) => ruleMatchesLine(rule, line));
}

function savingsForLine(rule: PricingRule, line: CartLine): number {
  if (!ruleMatchesLine(rule, line)) {
    return 0;
  }
  const percentOff = percentForRule(rule, line);
  if (percentOff <= 0) {
    return 0;
  }
  const unitPrice = Math.max(0, line.unitPrice);
  const quantity = Math.max(1, line.quantity);
  return (unitPrice * quantity * percentOff) / 100;
}

export function evaluatePricing(
  context: PricingContext,
  rules: PricingRule[]
): PricingResult {
  const eligibleRules = rules
    .filter((rule) => ruleMatchesContext(rule, context))
    .sort((a, b) => b.priority - a.priority);

  const selectedRules = eligibleRules.some((rule) => !rule.stackable)
    ? eligibleRules.slice(0, 1)
    : eligibleRules;

  const appliedRules: AppliedRule[] = selectedRules
    .map((rule) => {
      const savingsAmount = context.lineItems.reduce(
        (total, line) => total + savingsForLine(rule, line),
        0
      );
      return {
        ruleId: rule._id,
        triggerId: triggerForRule(rule),
        name: rule.name,
        percentOff: rule.amount,
        savingsAmount,
      };
    })
    .filter((rule) => rule.savingsAmount > 0);

  const displayLines = context.lineItems.map((line) => {
    const bestRule = appliedRules.find((rule) =>
      selectedRules.some((selected) => selected._id === rule.ruleId && ruleMatchesLine(selected, line))
    );
    const selectedRule = selectedRules.find((rule) => rule._id === bestRule?.ruleId);
    const percentOff = selectedRule ? percentForRule(selectedRule, line) : 0;
    const unitPrice = Math.max(0, line.unitPrice);
    const quantity = Math.max(1, line.quantity);
    const savingsAmount = (unitPrice * quantity * percentOff) / 100;
    return {
      productId: line.productId,
      quantity,
      unitPrice,
      currency: line.currency,
      discountedUnitPrice: unitPrice * (1 - percentOff / 100),
      savingsAmount,
      appliedRuleName: selectedRule?.name,
    };
  });

  const savingsAmount = appliedRules.reduce(
    (total, rule) => total + rule.savingsAmount,
    0
  );

  return {
    appliedRules,
    subtotal: context.subtotal,
    savingsAmount,
    totalAfterDiscount: Math.max(0, context.subtotal - savingsAmount),
    displayLines,
  };
}

export function createPreviewContext(productId: string, quantity: number): PricingContext {
  const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  return {
    instanceId: "preview",
    currency: "USD",
    now: new Date(),
    lineItems: [
      {
        productId,
        quantity: normalizedQuantity,
        unitPrice: 25,
        currency: "USD",
      },
    ],
    customerGroupIds: [],
    subtotal: 25 * normalizedQuantity,
  };
}
