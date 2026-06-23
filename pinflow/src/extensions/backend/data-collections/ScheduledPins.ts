import type { DataCollection } from "@wix/astro/builders";

export const collectionIdSuffix = "scheduled-pins";

export default {
  idSuffix: collectionIdSuffix,
  displayName: "Scheduled Pins",
  displayField: "title",
  fields: [
    { key: "accountId", displayName: "Account ID", type: "TEXT" },
    { key: "boardId", displayName: "Board ID", type: "TEXT" },
    { key: "title", displayName: "Title", type: "TEXT" },
    { key: "description", displayName: "Description", type: "TEXT" },
    { key: "link", displayName: "Destination Link", type: "URL" },
    { key: "imageUrl", displayName: "Image URL", type: "URL" },
    { key: "scheduledFor", displayName: "Scheduled For", type: "NUMBER" },
    { key: "status", displayName: "Status", type: "TEXT" },
    { key: "attempts", displayName: "Attempts", type: "NUMBER" },
    { key: "lastError", displayName: "Last Error", type: "TEXT" },
    { key: "publishedPinId", displayName: "Published Pin ID", type: "TEXT" },
  ],
  dataPermissions: {
    itemRead: "PRIVILEGED",
    itemInsert: "PRIVILEGED",
    itemUpdate: "PRIVILEGED",
    itemRemove: "PRIVILEGED",
  },
  indexes: [
    { fields: [{ path: "status" }, { path: "scheduledFor", order: "ASC" }] },
    { fields: [{ path: "accountId" }, { path: "scheduledFor", order: "ASC" }] },
  ],
  initialData: [],
} satisfies DataCollection;
