import type { DataCollection } from "@wix/astro/builders";
import { collectionSuffixes } from "../../../backend/collections";

export default {
  idSuffix: collectionSuffixes.settings,
  displayName: "ReturnFlow Settings",
  displayField: "title",
  fields: [
    { key: "title", displayName: "Title", type: "TEXT" },
    { key: "payload", displayName: "Settings Payload", type: "OBJECT", objectOptions: { fields: [] } },
    { key: "updatedAt", displayName: "Updated At", type: "DATETIME" },
  ],
  dataPermissions: {
    itemRead: "PRIVILEGED",
    itemInsert: "PRIVILEGED",
    itemUpdate: "PRIVILEGED",
    itemRemove: "PRIVILEGED",
  },
  indexes: [],
  initialData: [],
} satisfies DataCollection;
