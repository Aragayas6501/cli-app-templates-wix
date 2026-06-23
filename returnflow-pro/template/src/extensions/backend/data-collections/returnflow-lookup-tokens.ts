import type { DataCollection } from "@wix/astro/builders";
import { collectionSuffixes } from "../../../backend/collections";

export default {
  idSuffix: collectionSuffixes.lookupTokens,
  displayName: "ReturnFlow Lookup Tokens",
  displayField: "orderId",
  fields: [
    { key: "orderId", displayName: "Order ID", type: "TEXT", encrypted: true },
    { key: "expiresAt", displayName: "Expires At", type: "DATETIME" },
  ],
  dataPermissions: {
    itemRead: "PRIVILEGED",
    itemInsert: "PRIVILEGED",
    itemUpdate: "PRIVILEGED",
    itemRemove: "PRIVILEGED",
  },
  indexes: [
    {
      fields: [{ path: "expiresAt", order: "ASC" }],
      unique: false,
    },
  ],
  initialData: [],
} satisfies DataCollection;

