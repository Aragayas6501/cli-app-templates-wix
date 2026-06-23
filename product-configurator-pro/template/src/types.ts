export type PlanTier = "free" | "starter" | "pro" | "business" | "enterprise";

export type OptionType =
  | "select"
  | "swatch"
  | "text"
  | "number"
  | "file"
  | "checkbox"
  | "section";

export type OptionValue = {
  key: string;
  label: string;
  priceDelta?: string;
  assetUrl?: string;
};

export type ConfiguratorOption = {
  key: string;
  label: string;
  type: OptionType;
  required: boolean;
  helpText?: string;
  values?: OptionValue[];
  defaultValue?: string | number | boolean;
  sectionKey?: string;
};

export type ConditionOperator = "equals" | "notEquals" | "contains" | "isEmpty" | "isNotEmpty";

export type RuleCondition = {
  optionKey: string;
  operator: ConditionOperator;
  value?: string | number | boolean;
};

export type ConditionGroup = {
  all?: Array<RuleCondition | ConditionGroup>;
  any?: Array<RuleCondition | ConditionGroup>;
};

export type RuleAction =
  | { type: "show"; optionKey: string }
  | { type: "hide"; optionKey: string }
  | { type: "require"; optionKey: string }
  | { type: "disableValue"; optionKey: string; valueKey: string };

export type ConditionalRule = {
  id: string;
  name: string;
  enabled: boolean;
  conditionTree: ConditionGroup;
  actions: RuleAction[];
};

export type PricingRule =
  | { id: string; name: string; enabled: boolean; type: "fixed"; amount: string; optionKey?: string; valueKey?: string }
  | { id: string; name: string; enabled: boolean; type: "percentage"; percentage: number; optionKey?: string; valueKey?: string }
  | { id: string; name: string; enabled: boolean; type: "quantity"; optionKey: string; unitAmount: string };

export type OptionSetStatus = "draft" | "published" | "archived";

export type OptionSet = {
  id: string;
  name: string;
  slug: string;
  status: OptionSetStatus;
  version: number;
  options: ConfiguratorOption[];
  rules: ConditionalRule[];
  pricingRules: PricingRule[];
  updatedAt: string;
};

export type ProductMapping = {
  id: string;
  optionSetId: string;
  productId: string;
  productName: string;
  active: boolean;
};

export type ConfigurationSelections = Record<string, string | number | boolean | undefined>;

export type PricingResult = {
  totalDelta: string;
  currency: string;
  lineItems: Array<{ label: string; amount: string }>;
};

export type RuleEvaluation = {
  visibleOptions: string[];
  requiredOptions: string[];
  disabledValues: Record<string, string[]>;
};

export type AppData = {
  optionSets: OptionSet[];
  productMappings: ProductMapping[];
};
