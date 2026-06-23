import { arrayStringField, collection, textField, uniqueIndex } from "./shared";

export const collectionIdSuffix = "customer-groups";

export default collection(
  collectionIdSuffix,
  "Customer Groups",
  "name",
  [
    textField("name", "Name"),
    textField("slug", "Slug"),
    arrayStringField("memberIds", "Member IDs"),
    textField("description", "Description"),
  ],
  [uniqueIndex("instanceId", "slug")]
);

