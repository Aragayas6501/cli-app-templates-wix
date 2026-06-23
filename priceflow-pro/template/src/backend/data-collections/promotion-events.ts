import { collection, dateTimeField, objectField, textField, instanceIndex } from "./shared";

export const collectionIdSuffix = "promotion-events";

export default collection(
  collectionIdSuffix,
  "Promotion Events",
  "name",
  [
    textField("name", "Name"),
    textField("status", "Status"),
    dateTimeField("startDate", "Start Date"),
    dateTimeField("endDate", "End Date"),
    objectField("bannerConfig", "Banner Config"),
  ],
  [instanceIndex("status")]
);

