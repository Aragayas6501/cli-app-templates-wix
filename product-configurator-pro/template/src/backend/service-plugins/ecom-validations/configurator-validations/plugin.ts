import { validations } from "@wix/ecom/service-plugins";
import { extractCheckoutConfigurations } from "../../../checkout-configurations";
import { getAppData } from "../../../database";
import { evaluateRules } from "../../../../core/rules-engine";
import { validateRequiredSelections } from "../../../../core/pricing-engine";

validations.provideHandlers({
  getValidationViolations: async (payload) => {
    try {
      const { optionSets } = await getAppData();
      const configurations = extractCheckoutConfigurations(payload.request);
      if (configurations.length === 0) {
        return { violations: [] };
      }

      const violations = configurations.flatMap((configuration) => {
        const optionSet = optionSets.find(
          (candidate) =>
            candidate.id === configuration.optionSetId && candidate.status === "published"
        );
        if (!optionSet) {
          return [
            {
              description: "This product configuration is no longer available. Reconfigure the product before checkout.",
              severity: validations.Severity.ERROR,
              target: {
                other: {
                  name: validations.NameInOther.OTHER_DEFAULT
                }
              }
            }
          ];
        }

        const evaluation = evaluateRules(optionSet.options, optionSet.rules, configuration.selections);
        const missing = validateRequiredSelections(
          evaluation.requiredOptions,
          configuration.selections
        );

        return missing.map((optionKey) => ({
          description: `Complete the required "${optionKey}" product configuration option before checkout.`,
          severity: validations.Severity.ERROR,
          target: {
            other: {
              name: validations.NameInOther.OTHER_DEFAULT
            }
          }
        }));
      });

      if (violations.length === 0) {
        return { violations: [] };
      }

      return {
        violations
      };
    } catch (error) {
      console.error("Product Configurator Pro validation failed.", error);
      return { violations: [] };
    }
  }
});
