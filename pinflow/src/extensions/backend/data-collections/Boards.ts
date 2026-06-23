import type { DataCollection } from "@wix/astro/builders";

export const collectionIdSuffix = "boards";

export default {
  idSuffix: collectionIdSuffix,
  displayName: "Boards",
  displayField: "name",
  fields: [
    { key: "accountId", displayName: "Account ID", type: "TEXT" },
    { key: "pinterestBoardId", displayName: "Pinterest Board ID", type: "TEXT" },
    { key: "name", displayName: "Board Name", type: "TEXT" },
    { key: "description", displayName: "Description", type: "TEXT" },
    { key: "privacy", displayName: "Privacy", type: "TEXT" },
    { key: "assignedContentType", displayName: "Assigned Content Type", type: "TEXT" },
    { key: "pinCount", displayName: "Pin Count", type: "NUMBER" },
  ],
  dataPermissions: {
    itemRead: "PRIVILEGED",
    itemInsert: "PRIVILEGED",
    itemUpdate: "PRIVILEGED",
    itemRemove: "PRIVILEGED",
  },
  indexes: [
    { fields: [{ path: "accountId" }, { path: "pinterestBoardId" }], unique: true },
    { fields: [{ path: "accountId" }, { path: "name", order: "ASC" }] },
  ],
  initialData: [],
} satisfies DataCollection;
