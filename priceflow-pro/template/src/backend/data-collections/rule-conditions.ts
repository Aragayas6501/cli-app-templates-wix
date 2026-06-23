import { collection, numberField, objectField, referenceField, textField, instanceIndex } from "./shared";

export const collectionIdSuffix = "rule-conditions";

export default collection(
  collectionIdSuffix,
  "Rule Conditions",
  "conditionType",
  [
    referenceField("rule", "Rule", "pricing-rules"),
    textField("conditionType", "Condition Type"),
    textField("operator", "Operator"),
    numberField("valueNumber", "Number Value"),
    textField("valueText", "Text Value"),
    objectField("valueJson", "JSON Value"),
  ],
  [instanceIndex("conditionType")]
);

