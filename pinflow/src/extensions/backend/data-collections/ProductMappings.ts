import type { DataCollection } from "@wix/astro/builders";

export const collectionIdSuffix = "product-mappings";

export default {
  idSuffix: collectionIdSuffix,
  displayName: "Product Mappings",
  displayField: "wixEntityId",
  fields: [
    { key: "accountId", displayName: "Account ID", type: "TEXT" },
    { key: "source", displayName: "Source", type: "TEXT" },
    { key: "wixEntityId", displayName: "Wix Entity ID", type: "TEXT" },
    { key: "pinterestPinId", displayName: "Pinterest Pin ID", type: "TEXT" },
    { key: "lastPublishedAt", displayName: "Last Published At", type: "NUMBER" },
  ],
  dataPermissions: {
    itemRead: "PRIVILEGED",
    itemInsert: "PRIVILEGED",
    itemUpdate: "PRIVILEGED",
    itemRemove: "PRIVILEGED",
  },
  indexes: [
    {
      fields: [{ path: "accountId" }, { path: "source" }, { path: "wixEntityId" }],
      unique: true,
    },
  ],
  initialData: [],
} satisfies DataCollection;
