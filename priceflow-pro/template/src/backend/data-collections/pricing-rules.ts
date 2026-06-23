import {
  arrayStringField,
  booleanField,
  collection,
  dateTimeField,
  numberField,
  objectField,
  referenceField,
  textField,
  uniqueIndex,
  instanceIndex,
} from "./shared";

export const collectionIdSuffix = "pricing-rules";

export default collection(
  collectionIdSuffix,
  "Pricing Rules",
  "name",
  [
    textField("name", "Rule Name"),
    textField("status", "Status"),
    textField("scopeType", "Scope Type"),
    textField("ruleType", "Rule Type"),
    numberField("priority", "Priority"),
    booleanField("stackable", "Stackable"),
    arrayStringField("productIds", "Product IDs"),
    arrayStringField("collectionIds", "Collection IDs"),
    arrayStringField("customerGroupIds", "Customer Group IDs"),
    numberField("minSubtotal", "Minimum Subtotal"),
    textField("currency", "Currency"),
    dateTimeField("startsAt", "Starts At"),
    dateTimeField("endsAt", "Ends At"),
    objectField("tiers", "Quantity Tiers"),
    textField("actionType", "Action Type"),
    numberField("amount", "Amount"),
    textField("discountId", "Wix Discount ID"),
    textField("syncStatus", "Sync Status"),
    textField("syncError", "Sync Error"),
    numberField("version", "Version"),
    referenceField("promotionEvent", "Promotion Event", "promotion-events"),
  ],
  [instanceIndex("status"), instanceIndex("scopeType"), uniqueIndex("instanceId", "discountId")]
);

