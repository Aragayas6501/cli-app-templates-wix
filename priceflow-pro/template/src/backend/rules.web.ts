import { appInstances } from "@wix/app-management";
import { webMethod, Permissions } from "@wix/web-methods";
import { PLAN_LIMITS } from "../consts";
import type { PricingContext, RuleDraft } from "../types";
import { evaluatePricing, createPreviewContext } from "../utils/pricing-engine";
import { countPricingRules, getPriceFlowData, saveRuleDraft, deleteRule } from "./database";
import { resolvePlanTier } from "./appInstance";
import { getProductForPricing } from "./stores/catalog";

async function getInstanceId(): Promise<string> {
  const { instance } = await appInstances.getAppInstance();
  if (!instance?.instanceId) {
    throw new Error("Unable to resolve the current Wix app instance.");
  }
  return instance.instanceId;
}

export const getPriceFlowDashboardData = webMethod(Permissions.Admin, async () => {
  const { instance } = await appInstances.getAppInstance();
  if (!instance?.instanceId) {
    throw new Error("Unable to resolve the current Wix app instance.");
  }
  const instanceId = instance.instanceId;
  const data = await getPriceFlowData(instanceId);
  const planTier = resolvePlanTier(instance);
  return {
    instanceId,
    ...data,
    planTier,
    ruleLimit: PLAN_LIMITS[planTier].rules,
    freeTrialAvailable: Boolean(instance?.freeTrialAvailable),
  };
});

export const savePricingRule = webMethod(
  Permissions.Admin,
  async (draft: RuleDraft) => {
    const instanceId = await getInstanceId();
    const { instance } = await appInstances.getAppInstance();
    const planTier = resolvePlanTier(instance);
    const ruleLimit = PLAN_LIMITS[planTier].rules;
    const currentRuleCount = await countPricingRules(instanceId);

    if (Number.isFinite(ruleLimit) && currentRuleCount >= ruleLimit) {
      throw new Error("Your current plan has reached its pricing rule limit.");
    }

    return saveRuleDraft(draft, instanceId);
  }
);

export const removePricingRule = webMethod(Permissions.Admin, async (ruleId: string) => {
  const instanceId = await getInstanceId();
  await deleteRule(ruleId, instanceId);
  return { deleted: true };
});

export const previewPricing = webMethod(
  Permissions.Admin,
  async (productId: string, quantity: number) => {
    const instanceId = await getInstanceId();
    const data = await getPriceFlowData(instanceId);
    return evaluatePricing(createPreviewContext(productId || "preview-product", quantity), data.rules);
  }
);

export const getDisplayPrice = webMethod(
  Permissions.Anyone,
  async (productId: string, quantity: number) => {
    const instanceId = await getInstanceId();
    const product = await getProductForPricing(productId);
    if (!product) {
      return evaluatePricing(
        {
          instanceId,
          currency: "USD",
          now: new Date(),
          lineItems: [],
          customerGroupIds: [],
          subtotal: 0,
        },
        []
      );
    }
    const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    const context: PricingContext = {
      instanceId,
      currency: product.currency,
      now: new Date(),
      lineItems: [
        {
          productId: product.id,
          quantity: normalizedQuantity,
          unitPrice: product.price,
          currency: product.currency,
        },
      ],
      customerGroupIds: [],
      subtotal: product.price * normalizedQuantity,
    };
    const data = await getPriceFlowData(instanceId);
    return evaluatePricing(context, data.rules);
  }
);
