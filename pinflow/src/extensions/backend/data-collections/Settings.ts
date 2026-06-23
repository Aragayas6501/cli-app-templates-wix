import type { DataCollection } from "@wix/astro/builders";

export const collectionIdSuffix = "settings";

export default {
  idSuffix: collectionIdSuffix,
  displayName: "Settings",
  displayField: "pinterestTagId",
  fields: [
    { key: "pinterestTagId", displayName: "Pinterest Tag ID", type: "TEXT" },
    { key: "tagEnabled", displayName: "Tag Enabled", type: "BOOLEAN" },
    { key: "siteUrl", displayName: "Site URL", type: "URL" },
    { key: "defaultUtmCampaign", displayName: "Default UTM Campaign", type: "TEXT" },
    { key: "tier", displayName: "Tier", type: "TEXT" },
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
