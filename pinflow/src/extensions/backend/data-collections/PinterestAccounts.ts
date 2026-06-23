import type { DataCollection } from "@wix/astro/builders";

export const collectionIdSuffix = "pinterest-accounts";

export default {
  idSuffix: collectionIdSuffix,
  displayName: "Pinterest Accounts",
  displayField: "username",
  fields: [
    { key: "pinterestUserId", displayName: "Pinterest User ID", type: "TEXT" },
    { key: "username", displayName: "Username", type: "TEXT" },
    { key: "status", displayName: "Status", type: "TEXT" },
    { key: "accessToken", displayName: "Access Token", type: "TEXT", encrypted: true },
    { key: "refreshToken", displayName: "Refresh Token", type: "TEXT", encrypted: true },
    { key: "tokenExpiresAt", displayName: "Token Expires At", type: "NUMBER" },
    { key: "isBusiness", displayName: "Is Business Account", type: "BOOLEAN" },
    { key: "scopes", displayName: "Granted Scopes", type: "ARRAY_STRING" },
  ],
  dataPermissions: {
    itemRead: "PRIVILEGED",
    itemInsert: "PRIVILEGED",
    itemUpdate: "PRIVILEGED",
    itemRemove: "PRIVILEGED",
  },
  indexes: [{ fields: [{ path: "pinterestUserId" }], unique: true }],
  initialData: [],
} satisfies DataCollection;
