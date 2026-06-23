import { collection, dateTimeField, objectField, referenceField, textField, instanceIndex } from "./shared";

export const collectionIdSuffix = "ab-tests";

export default collection(
  collectionIdSuffix,
  "AB Tests",
  "name",
  [
    textField("name", "Name"),
    textField("status", "Status"),
    referenceField("variantARule", "Variant A Rule", "pricing-rules"),
    referenceField("variantBRule", "Variant B Rule", "pricing-rules"),
    objectField("splitConfig", "Split Config"),
    dateTimeField("startDate", "Start Date"),
    dateTimeField("endDate", "End Date"),
    objectField("results", "Results"),
  ],
  [instanceIndex("status")]
);

