import { customTriggers } from "@wix/ecom/service-plugins";
import { triggerIds } from "../../../../consts";
import type { CartLine, PricingContext } from "../../../../types";
import { evaluatePricing } from "../../../../utils/pricing-engine";
import { getPriceFlowData } from "../../../database";
import { getAppInstanceElevated } from "../../../appInstance";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : {};
}

function readNumber(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function extractLines(request: unknown): CartLine[] {
  const record = asRecord(request);
  const lineItems = Array.isArray(record.lineItems) ? record.lineItems : [];
  return lineItems
    .map((line, index) => {
      const item = asRecord(line);
      const price = asRecord(item.price);
      const catalogReference = asRecord(item.catalogReference);
      const productId = String(item.productId ?? catalogReference.catalogItemId ?? "");
      const unitPrice = Math.max(0, readNumber(price.amount, readNumber(item.price, 0)));
      const quantity = Math.max(1, readNumber(item.quantity, 1));
      return {
        productId: productId || `line-${index}`,
        variantId: typeof item.variantId === "string" ? item.variantId : undefined,
        quantity,
        unitPrice,
        currency: String(price.currency ?? record.currency ?? "USD"),
      };
    })
    .filter((line) => line.unitPrice > 0);
}

customTriggers.provideHandlers({
  listTriggers: async () => ({
    customTriggers: [
      { _id: triggerIds.quantityTier, name: "PriceFlow quantity tier" },
    ],
  }),

  getEligibleTriggers: async ({ request, metadata }) => {
    try {
      const appInstance = await getAppInstanceElevated();
      const instanceId = appInstance?.instanceId;
      if (!instanceId) {
        return { eligibleTriggers: [] };
      }
      const lineItems = extractLines(request);
      const currency = String(asRecord(metadata).currency ?? lineItems[0]?.currency ?? "USD");
      const subtotal = lineItems.reduce(
        (sum, line) => sum + line.unitPrice * line.quantity,
        0
      );
      const data = await getPriceFlowData(instanceId);
      const context: PricingContext = {
        instanceId,
        currency,
        now: new Date(),
        lineItems,
        customerGroupIds: [],
        subtotal,
      };
      const result = evaluatePricing(context, data.rules);
      return {
        eligibleTriggers: result.appliedRules.map((rule) => ({
          customTriggerId: rule.triggerId,
          identifier: rule.ruleId,
        })),
      };
    } catch (error) {
      console.error("PriceFlow trigger evaluation failed", error);
      return { eligibleTriggers: [] };
    }
  },
});
