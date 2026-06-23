import type { DataCollection } from "@wix/astro/builders";

export const collectionIdSuffix = "automation-rules";

export default {
  idSuffix: collectionIdSuffix,
  displayName: "Automation Rules",
  displayField: "source",
  fields: [
    { key: "accountId", displayName: "Account ID", type: "TEXT" },
    { key: "source", displayName: "Source", type: "TEXT" },
    { key: "boardId", displayName: "Target Board ID", type: "TEXT" },
    { key: "enabled", displayName: "Enabled", type: "BOOLEAN" },
    { key: "onCreate", displayName: "Publish On Create", type: "BOOLEAN" },
    { key: "onUpdate", displayName: "Publish On Update", type: "BOOLEAN" },
    { key: "titleTemplate", displayName: "Title Template", type: "TEXT" },
    { key: "descriptionTemplate", displayName: "Description Template", type: "TEXT" },
  ],
  dataPermissions: {
    itemRead: "PRIVILEGED",
    itemInsert: "PRIVILEGED",
    itemUpdate: "PRIVILEGED",
    itemRemove: "PRIVILEGED",
  },
  indexes: [
    { fields: [{ path: "accountId" }, { path: "source" }, { path: "enabled" }] },
    { fields: [{ path: "accountId" }, { path: "boardId" }] },
  ],
  initialData: [],
} satisfies DataCollection;
