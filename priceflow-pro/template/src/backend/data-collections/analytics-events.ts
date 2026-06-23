import { collection, dateTimeField, numberField, textField, uniqueIndex, instanceIndex } from "./shared";

export const collectionIdSuffix = "analytics-events";

export default collection(
  collectionIdSuffix,
  "Analytics Events",
  "eventType",
  [
    textField("eventType", "Event Type"),
    textField("ruleId", "Rule ID"),
    textField("triggerId", "Trigger ID"),
    textField("orderId", "Order ID"),
    numberField("savingsAmount", "Savings Amount"),
    numberField("influencedRevenue", "Influenced Revenue"),
    textField("currency", "Currency"),
    dateTimeField("occurredAt", "Occurred At"),
    textField("dedupeKey", "Dedupe Key"),
  ],
  [instanceIndex("occurredAt"), instanceIndex("ruleId"), uniqueIndex("dedupeKey")]
);

