import type { ConfigurationSelections } from "../types";

export type CheckoutConfiguration = {
  optionSetId: string;
  selections: ConfigurationSelections;
  lineItemId?: string;
};

const CONFIGURATION_KEYS = [
  "productConfiguratorPro",
  "productConfigurator",
  "configuratorConfiguration"
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const scalarSelection = (value: unknown) =>
  typeof value === "string" || typeof value === "number" || typeof value === "boolean";

const parseSelections = (value: unknown): ConfigurationSelections | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  return Object.entries(value).reduce<ConfigurationSelections>((selections, [key, entry]) => {
    if (scalarSelection(entry)) {
      selections[key] = entry;
    }
    return selections;
  }, {});
};

const parseConfiguration = (
  value: unknown,
  lineItemId?: string
): CheckoutConfiguration | undefined => {
  if (!isRecord(value) || typeof value.optionSetId !== "string") {
    return undefined;
  }

  const selections = parseSelections(value.selections);
  if (!selections) {
    return undefined;
  }

  return {
    optionSetId: value.optionSetId,
    selections,
    lineItemId
  };
};

const readLineItemId = (value: Record<string, unknown>) => {
  if (typeof value._id === "string") {
    return value._id;
  }
  if (typeof value.id === "string") {
    return value.id;
  }
  return undefined;
};

export const extractCheckoutConfigurations = (payload: unknown): CheckoutConfiguration[] => {
  const configurations: CheckoutConfiguration[] = [];
  const visited = new WeakSet<object>();

  const visit = (value: unknown, lineItemId?: string, depth = 0) => {
    if (!isRecord(value) || visited.has(value) || depth > 8) {
      return;
    }

    visited.add(value);
    const currentLineItemId = lineItemId ?? readLineItemId(value);

    for (const key of CONFIGURATION_KEYS) {
      const configuration = parseConfiguration(value[key], currentLineItemId);
      if (configuration) {
        configurations.push(configuration);
      }
    }

    for (const entry of Object.values(value)) {
      if (Array.isArray(entry)) {
        entry.forEach((item) => visit(item, currentLineItemId, depth + 1));
      } else if (isRecord(entry)) {
        visit(entry, currentLineItemId, depth + 1);
      }
    }
  };

  visit(payload);
  return configurations;
};
