import type { DataCollection } from "@wix/astro/builders";

export const collectionIdSuffix = "published-pins";

export default {
  idSuffix: collectionIdSuffix,
  displayName: "Published Pins",
  displayField: "title",
  fields: [
    { key: "accountId", displayName: "Account ID", type: "TEXT" },
    { key: "pinterestPinId", displayName: "Pinterest Pin ID", type: "TEXT" },
    { key: "boardId", displayName: "Board ID", type: "TEXT" },
    { key: "source", displayName: "Source", type: "TEXT" },
    { key: "wixEntityId", displayName: "Wix Entity ID", type: "TEXT" },
    { key: "title", displayName: "Title", type: "TEXT" },
    { key: "link", displayName: "Destination Link", type: "URL" },
    { key: "imageUrl", displayName: "Image URL", type: "URL" },
    { key: "status", displayName: "Status", type: "TEXT" },
    { key: "errorMessage", displayName: "Error Message", type: "TEXT" },
    { key: "publishedAt", displayName: "Published At", type: "NUMBER" },
  ],
  dataPermissions: {
    itemRead: "PRIVILEGED",
    itemInsert: "PRIVILEGED",
    itemUpdate: "PRIVILEGED",
    itemRemove: "PRIVILEGED",
  },
  indexes: [
    { fields: [{ path: "status" }, { path: "publishedAt", order: "DESC" }] },
    { fields: [{ path: "accountId" }, { path: "publishedAt", order: "DESC" }] },
    { fields: [{ path: "pinterestPinId" }] },
  ],
  initialData: [],
} satisfies DataCollection;
