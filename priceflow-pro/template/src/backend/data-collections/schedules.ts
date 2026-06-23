import { collection, dateTimeField, objectField, referenceField, textField, instanceIndex } from "./shared";

export const collectionIdSuffix = "schedules";

export default collection(
  collectionIdSuffix,
  "Schedules",
  "timezone",
  [
    referenceField("rule", "Rule", "pricing-rules"),
    dateTimeField("startDate", "Start Date"),
    dateTimeField("endDate", "End Date"),
    textField("recurrence", "Recurrence"),
    objectField("recurrenceConfig", "Recurrence Config"),
    textField("timezone", "Timezone"),
  ],
  [instanceIndex("startDate"), instanceIndex("endDate")]
);

