export type RuleStatus = "draft" | "active" | "scheduled" | "paused" | "expired";
export type RuleScopeType = "product" | "collection" | "store";
export type RuleType = "quantity" | "group" | "promo" | "subtotal" | "bogo";
export type ActionType = "percentOff" | "amountOff" | "fixedPrice" | "bogo";
export type PlanTier = "free" | "starter" | "pro" | "business" | "enterprise";

export interface QuantityTier {
  minQuantity: number;
  percentOff: number;
}

export interface PricingRule {
  _id: string;
  instanceId: string;
  name: string;
  status: RuleStatus;
  scopeType: RuleScopeType;
  ruleType: RuleType;
  priority: number;
  stackable: boolean;
  productIds: string[];
  collectionIds: string[];
  customerGroupIds: string[];
  minSubtotal?: number;
  currency: string;
  startsAt?: string;
  endsAt?: string;
  tiers: QuantityTier[];
  actionType: ActionType;
  amount: number;
  discountId?: string;
  syncStatus: "pending" | "synced" | "error";
  syncError?: string;
  version: number;
}

export interface CustomerGroup {
  _id: string;
  instanceId: string;
  name: string;
  slug: string;
  memberIds: string[];
}

export interface CartLine {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  collectionIds?: string[];
}

export interface PricingContext {
  instanceId: string;
  currency: string;
  now: Date;
  lineItems: CartLine[];
  customerGroupIds: string[];
  subtotal: number;
}

export interface AppliedRule {
  ruleId: string;
  triggerId: string;
  name: string;
  percentOff: number;
  savingsAmount: number;
}

export interface PricingResult {
  appliedRules: AppliedRule[];
  subtotal: number;
  savingsAmount: number;
  totalAfterDiscount: number;
  displayLines: {
    productId: string;
    quantity: number;
    unitPrice: number;
    currency: string;
    discountedUnitPrice: number;
    savingsAmount: number;
    appliedRuleName?: string;
  }[];
}

export interface PriceFlowAppData {
  rules: PricingRule[];
  groups: CustomerGroup[];
}

export interface RuleDraft {
  name: string;
  scopeType: RuleScopeType;
  ruleType: RuleType;
  productIds: string[];
  collectionIds: string[];
  minQuantity: number;
  percentOff: number;
  startsAt?: string;
  endsAt?: string;
}
