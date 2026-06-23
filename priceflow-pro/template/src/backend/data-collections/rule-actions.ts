import { collection, numberField, objectField, referenceField, textField, instanceIndex } from "./shared";

export const collectionIdSuffix = "rule-actions";

export default collection(
  collectionIdSuffix,
  "Rule Actions",
  "actionType",
  [
    referenceField("rule", "Rule", "pricing-rules"),
    textField("actionType", "Action Type"),
    numberField("amount", "Amount"),
    objectField("tiers", "Quantity Tiers"),
    objectField("bogoConfig", "BOGO Config"),
    textField("currency", "Currency"),
  ],
  [instanceIndex("actionType")]
);

