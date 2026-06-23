import { additionalFees } from "@wix/ecom/service-plugins";
import { extractCheckoutConfigurations } from "../../../checkout-configurations";
import { getAppData } from "../../../database";
import { evaluatePrice } from "../../../../core/pricing-engine";

additionalFees.provideHandlers({
  calculateAdditionalFees: async ({ request, metadata }) => {
    try {
      const { optionSets } = await getAppData();
      const currency = metadata.currency ?? "USD";
      const configurations = extractCheckoutConfigurations(request);

      if (configurations.length === 0) {
        return { additionalFees: [], currency };
      }

      const fees = configurations.flatMap((configuration) => {
        const optionSet = optionSets.find(
          (candidate) =>
            candidate.id === configuration.optionSetId && candidate.status === "published"
        );
        if (!optionSet) {
          return [];
        }

        const pricing = evaluatePrice({
          options: optionSet.options,
          pricingRules: optionSet.pricingRules,
          selections: configuration.selections,
          currency
        });

        if (Number(pricing.totalDelta) <= 0) {
          return [];
        }

        return [
          {
            code: `product-configurator-pro-${optionSet.id}`,
            name: "Product configuration",
            translatedName: "Product configuration",
            price: pricing.totalDelta,
            taxDetails: { taxable: true },
            ...(configuration.lineItemId ? { lineItemIds: [configuration.lineItemId] } : {})
          }
        ];
      });

      if (fees.length === 0) {
        return { additionalFees: [], currency };
      }

      return {
        additionalFees: fees,
        currency
      };
    } catch (error) {
      console.error("Product Configurator Pro fee calculation failed.", error);
      return { additionalFees: [], currency: metadata.currency ?? "USD" };
    }
  }
});
