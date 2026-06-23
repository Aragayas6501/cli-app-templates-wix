import type { PriceFlowAppData } from "./types";

export const APP_NAMESPACE = "<app-namespace>";

export const collectionIds = {
  pricingRules: `${APP_NAMESPACE}/pricing-rules`,
  ruleConditions: `${APP_NAMESPACE}/rule-conditions`,
  ruleActions: `${APP_NAMESPACE}/rule-actions`,
  customerGroups: `${APP_NAMESPACE}/customer-groups`,
  productMappings: `${APP_NAMESPACE}/product-mappings`,
  collectionMappings: `${APP_NAMESPACE}/collection-mappings`,
  schedules: `${APP_NAMESPACE}/schedules`,
  promotionEvents: `${APP_NAMESPACE}/promotion-events`,
  analyticsEvents: `${APP_NAMESPACE}/analytics-events`,
  abTests: `${APP_NAMESPACE}/ab-tests`,
  settings: `${APP_NAMESPACE}/settings`,
  auditLogs: `${APP_NAMESPACE}/audit-logs`,
} as const;

export const triggerIds = {
  quantityTier: "priceflow-quantity-tier",
  customerGroup: "priceflow-customer-group",
  scheduledPromo: "priceflow-scheduled-promo",
  subtotal: "priceflow-subtotal",
  bogo: "priceflow-bogo",
} as const;

export enum WixPageId {
  MANAGE_APPS = "ad471122-7305-4007-9210-2a764d2e5e57",
  PRODUCTS_LIST = "0845ada2-467f-4cab-ba40-2f07c812343d",
  AUTOMATIC_DISCOUNTS = "ed0163bf-ddeb-4dbe-8042-648b44bcbaac",
}

export const DEFAULT_APP_DATA: PriceFlowAppData = {
  rules: [],
  groups: [],
};

export const PLAN_LIMITS = {
  free: { rules: 1 },
  starter: { rules: 10 },
  pro: { rules: Number.POSITIVE_INFINITY },
  business: { rules: Number.POSITIVE_INFINITY },
  enterprise: { rules: Number.POSITIVE_INFINITY },
} as const;
