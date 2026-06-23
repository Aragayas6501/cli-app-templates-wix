import { collection, referenceField, textField, uniqueIndex, instanceIndex } from "./shared";

export const collectionIdSuffix = "collection-mappings";

export default collection(
  collectionIdSuffix,
  "Collection Mappings",
  "collectionId",
  [
    referenceField("rule", "Rule", "pricing-rules"),
    textField("collectionId", "Wix Collection ID"),
    textField("catalogVersion", "Catalog Version"),
    textField("title", "Title"),
  ],
  [uniqueIndex("instanceId", "collectionId"), instanceIndex("catalogVersion")]
);

