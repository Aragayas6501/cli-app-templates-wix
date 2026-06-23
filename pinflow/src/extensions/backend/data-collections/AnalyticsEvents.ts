import type { DataCollection } from "@wix/astro/builders";

export const collectionIdSuffix = "analytics-events";

export default {
  idSuffix: collectionIdSuffix,
  displayName: "Analytics Events",
  displayField: "metric",
  fields: [
    { key: "accountId", displayName: "Account ID", type: "TEXT" },
    { key: "pinterestPinId", displayName: "Pinterest Pin ID", type: "TEXT" },
    { key: "metric", displayName: "Metric", type: "TEXT" },
    { key: "value", displayName: "Value", type: "NUMBER" },
    { key: "date", displayName: "Date (YYYY-MM-DD)", type: "TEXT" },
  ],
  dataPermissions: {
    itemRead: "PRIVILEGED",
    itemInsert: "PRIVILEGED",
    itemUpdate: "PRIVILEGED",
    itemRemove: "PRIVILEGED",
  },
  indexes: [
    { fields: [{ path: "accountId" }, { path: "date", order: "DESC" }] },
    { fields: [{ path: "pinterestPinId" }, { path: "metric" }, { path: "date" }], unique: true },
  ],
  initialData: [],
} satisfies DataCollection;
