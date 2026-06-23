import type {
  ConditionGroup,
  RuleCondition,
  ConditionalRule,
  ConfigurationSelections,
  RuleEvaluation,
  ConfiguratorOption
} from "../types";

const isCondition = (node: RuleCondition | ConditionGroup): node is RuleCondition =>
  "optionKey" in node;

const readSelection = (selections: ConfigurationSelections, key: string) =>
  selections[key];

const evaluateCondition = (
  condition: RuleCondition,
  selections: ConfigurationSelections
) => {
  const selected = readSelection(selections, condition.optionKey);
  switch (condition.operator) {
    case "equals":
      return selected === condition.value;
    case "notEquals":
      return selected !== condition.value;
    case "contains":
      return typeof selected === "string" && typeof condition.value === "string"
        ? selected.includes(condition.value)
        : false;
    case "isEmpty":
      return selected === undefined || selected === "" || selected === false;
    case "isNotEmpty":
      return selected !== undefined && selected !== "" && selected !== false;
    default: {
      const exhaustive: never = condition.operator;
      return exhaustive;
    }
  }
};

const evaluateNode = (
  node: RuleCondition | ConditionGroup,
  selections: ConfigurationSelections
): boolean => {
  if (isCondition(node)) {
    return evaluateCondition(node, selections);
  }

  if (node.all) {
    return node.all.every((child) => evaluateNode(child, selections));
  }

  if (node.any) {
    return node.any.some((child) => evaluateNode(child, selections));
  }

  return true;
};

export const evaluateRules = (
  options: ConfiguratorOption[],
  rules: ConditionalRule[],
  selections: ConfigurationSelections
): RuleEvaluation => {
  const visibleOptions = new Set(options.map((option) => option.key));
  const requiredOptions = new Set(
    options.filter((option) => option.required).map((option) => option.key)
  );
  const disabledValues: Record<string, string[]> = {};

  for (const rule of rules) {
    if (!rule.enabled || !evaluateNode(rule.conditionTree, selections)) {
      continue;
    }

    for (const action of rule.actions) {
      switch (action.type) {
        case "show":
          visibleOptions.add(action.optionKey);
          break;
        case "hide":
          visibleOptions.delete(action.optionKey);
          requiredOptions.delete(action.optionKey);
          break;
        case "require":
          requiredOptions.add(action.optionKey);
          break;
        case "disableValue": {
          const current = disabledValues[action.optionKey] ?? [];
          disabledValues[action.optionKey] = [...current, action.valueKey];
          break;
        }
        default: {
          const exhaustive: never = action;
          void exhaustive;
          break;
        }
      }
    }
  }

  return {
    visibleOptions: Array.from(visibleOptions),
    requiredOptions: Array.from(requiredOptions),
    disabledValues
  };
};
