import { webMethod, Permissions } from "@wix/web-methods";
import type { Conflict, SyncProfile } from "../types";
import {
  connectEtsyShop as connectEtsyShopRecord,
  getEtsySyncData,
  resolveConflict as resolveConflictRecord,
  runManualSync as queueManualSync,
  updateSyncProfile as updateSyncProfileRecord,
} from "./database";
import { getWixSiteReadiness } from "./wix-readiness";

export const getDashboardData = webMethod(Permissions.Admin, async () => {
  const siteReadiness = await getWixSiteReadiness();

  return getEtsySyncData(siteReadiness);
});

export const saveSyncProfile = webMethod(
  Permissions.Admin,
  async (profile: SyncProfile) => {
    return updateSyncProfileRecord(profile);
  }
);

export const connectEtsyShop = webMethod(
  Permissions.Admin,
  async (shopName: string) => {
    return connectEtsyShopRecord(shopName);
  }
);

export const runManualSync = webMethod(Permissions.Admin, async (scope: string) => {
  return queueManualSync(scope);
});

export const resolveConflict = webMethod(
  Permissions.Admin,
  async (conflictId: string, resolution: Conflict["recommendation"]) => {
    return resolveConflictRecord(conflictId, resolution);
  }
);
