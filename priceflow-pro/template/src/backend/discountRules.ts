import { discountRules } from "@wix/ecom";
import { auth } from "@wix/essentials";
import { appId } from "../../wix.config.json";
import { triggerIds } from "../consts";
import type { RuleDraft } from "../types";

const WIX_STORES_CATALOG_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";

const elevatedCreateDiscountRule = auth.elevate(discountRules.createDiscountRule);
const elevatedDeleteDiscountRule = auth.elevate(discountRules.deleteDiscountRule);

function catalogScopes(draft: RuleDraft): discountRules.Scope[] {
  if (draft.scopeType === "collection") {
    throw new Error("Collection-scoped checkout discounts are not supported by this rule builder.");
  }

  const catalogItemFilter: discountRules.CatalogItemFilter = {
    catalogAppId: WIX_STORES_CATALOG_APP_ID,
  };

  if (draft.scopeType === "product") {
    catalogItemFilter.catalogItemIds = draft.productIds;
  }

  return [
    {
      _id: draft.scopeType === "product" ? "selected-products" : "all-store-products",
      type: "CATALOG_ITEM",
      catalogItemFilter,
    },
  ];
}

function activeTimeInfo(draft: RuleDraft): discountRules.ActiveTimeInfo | undefined {
  const start = draft.startsAt ? new Date(draft.startsAt) : undefined;
  const end = draft.endsAt ? new Date(draft.endsAt) : undefined;

  if (!start && !end) {
    return undefined;
  }

  return {
    ...(start ? { start } : {}),
    ...(end ? { end } : {}),
  };
}

export async function createRuleDiscount(
  draft: RuleDraft
): Promise<string> {
  const scopes = catalogScopes(draft);
  const discountRule = await elevatedCreateDiscountRule({
    active: true,
    name: draft.name.slice(0, 50),
    trigger: {
      triggerType: "AND",
      and: {
        triggers: [
          {
            triggerType: "CUSTOM",
            customTrigger: {
              _id: triggerIds.quantityTier,
              appId,
            },
          },
          {
            triggerType: "ITEM_QUANTITY_RANGE",
            itemQuantityRange: {
              from: draft.minQuantity,
              scopes,
            },
          },
        ],
      },
    },
    activeTimeInfo: activeTimeInfo(draft),
    discounts: {
      values: [
        {
          discountType: "PERCENTAGE",
          percentage: draft.percentOff,
          targetType: "SPECIFIC_ITEMS",
          specificItemsInfo: { scopes },
        },
      ],
    },
  });

  if (!discountRule._id) {
    throw new Error("Wix discount rule was created without an ID.");
  }

  return discountRule._id;
}

export async function deleteRuleDiscount(discountId: string): Promise<void> {
  await elevatedDeleteDiscountRule(discountId);
}
