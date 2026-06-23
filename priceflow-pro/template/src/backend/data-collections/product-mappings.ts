import { collection, dateTimeField, numberField, referenceField, textField, uniqueIndex, instanceIndex } from "./shared";

export const collectionIdSuffix = "product-mappings";

export default collection(
  collectionIdSuffix,
  "Product Mappings",
  "productId",
  [
    referenceField("rule", "Rule", "pricing-rules"),
    textField("productId", "Wix Product ID"),
    textField("catalogVersion", "Catalog Version"),
    numberField("basePrice", "Base Price"),
    textField("currency", "Currency"),
    dateTimeField("lastSyncedDate", "Last Synced Date"),
  ],
  [uniqueIndex("instanceId", "productId"), instanceIndex("catalogVersion")]
);

