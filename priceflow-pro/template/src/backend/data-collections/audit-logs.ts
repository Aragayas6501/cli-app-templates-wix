import { collection, dateTimeField, objectField, textField, instanceIndex } from "./shared";

export const collectionIdSuffix = "audit-logs";

export default collection(
  collectionIdSuffix,
  "Audit Logs",
  "action",
  [
    textField("entityType", "Entity Type"),
    textField("entityId", "Entity ID"),
    textField("action", "Action"),
    textField("actor", "Actor"),
    objectField("before", "Before"),
    objectField("after", "After"),
    dateTimeField("occurredAt", "Occurred At"),
  ],
  [instanceIndex("occurredAt"), instanceIndex("entityId")]
);

