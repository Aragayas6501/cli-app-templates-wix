import type {
  ConfiguratorOption,
  ConfigurationSelections,
  PricingResult,
  PricingRule
} from "../types";

const toNumber = (value: string | number | undefined): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (amount: number): string => amount.toFixed(2);

const optionValueLabel = (
  options: ConfiguratorOption[],
  optionKey: string | undefined,
  valueKey: string | undefined
) => {
  const option = options.find((candidate) => candidate.key === optionKey);
  const value = option?.values?.find((candidate) => candidate.key === valueKey);
  return value ? `${option?.label}: ${value.label}` : option?.label ?? "Configurator option";
};

const matchesSelection = (
  rule: PricingRule,
  selections: ConfigurationSelections
) => {
  if (!("optionKey" in rule) || !rule.optionKey) {
    return true;
  }

  const selected = selections[rule.optionKey];
  if (!("valueKey" in rule) || !rule.valueKey) {
    return selected !== undefined && selected !== false && selected !== "";
  }

  return selected === rule.valueKey;
};

export const evaluatePrice = ({
  options,
  pricingRules,
  selections,
  currency
}: {
  options: ConfiguratorOption[];
  pricingRules: PricingRule[];
  selections: ConfigurationSelections;
  currency: string;
}): PricingResult => {
  const lineItems: PricingResult["lineItems"] = [];
  let total = 0;
  const percentageRules: Array<Extract<PricingRule, { type: "percentage" }>> = [];

  for (const rule of pricingRules) {
    if (!rule.enabled || !matchesSelection(rule, selections)) {
      continue;
    }

    if (rule.type === "fixed") {
      const amount = toNumber(rule.amount);
      total += amount;
      if (amount !== 0) {
        lineItems.push({
          label: optionValueLabel(options, rule.optionKey, rule.valueKey),
          amount: formatMoney(amount)
        });
      }
    }

    if (rule.type === "percentage") {
      percentageRules.push(rule);
    }

    if (rule.type === "quantity") {
      const quantity = toNumber(selections[rule.optionKey] as number | undefined);
      const amount = quantity * toNumber(rule.unitAmount);
      total += amount;
      if (amount !== 0) {
        lineItems.push({
          label: rule.name,
          amount: formatMoney(amount)
        });
      }
    }
  }

  const subtotalBeforePercent = total;
  for (const rule of percentageRules) {
    const amount = subtotalBeforePercent * (toNumber(rule.percentage) / 100);
    total += amount;
    if (amount !== 0) {
      lineItems.push({
        label: `${rule.name} (${rule.percentage}%)`,
        amount: formatMoney(amount)
      });
    }
  }

  return {
    totalDelta: formatMoney(total),
    currency,
    lineItems
  };
};

export const validateRequiredSelections = (
  requiredOptionKeys: string[],
  selections: ConfigurationSelections
) =>
  requiredOptionKeys.filter((key) => {
    const selected = selections[key];
    return selected === undefined || selected === "" || selected === false;
  });
