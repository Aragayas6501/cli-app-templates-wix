import type { DataCollection } from "@wix/astro/builders";
import { collectionSuffixes } from "../../../backend/collections";

export default {
  idSuffix: collectionSuffixes.returns,
  displayName: "ReturnFlow Returns",
  displayField: "title",
  fields: [
    { key: "title", displayName: "Return ID", type: "TEXT" },
    { key: "payload", displayName: "Return Payload", type: "OBJECT", objectOptions: { fields: [] } },
    { key: "updatedAt", displayName: "Updated At", type: "DATETIME" },
  ],
  dataPermissions: {
    itemRead: "PRIVILEGED",
    itemInsert: "PRIVILEGED",
    itemUpdate: "PRIVILEGED",
    itemRemove: "PRIVILEGED",
  },
  indexes: [{ fields: [{ path: "title", order: "ASC" }], unique: true }],
  initialData: [],
} satisfies DataCollection;

