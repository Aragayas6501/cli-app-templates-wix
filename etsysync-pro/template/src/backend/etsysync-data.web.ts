import { webMethod, Permissions } from "@wix/web-methods";
import type { Conflict, ManualSyncScope, SyncProfile } from "../types";
import {
  getEtsySyncData,
  resolveConflict as resolveConflictRecord,
  runManualSync as queueManualSync,
  updateSyncProfile as updateSyncProfileRecord,
} from "./database";
import { getWixSiteReadiness } from "./wix-readiness";
import type { WixSiteReadiness } from "../types";

async function getVerifiedSiteReadiness(): Promise<WixSiteReadiness> {
  const siteReadiness = await getWixSiteReadiness();

  if (siteReadiness.instanceStatus !== "Confirmed" || !siteReadiness.instanceId.trim()) {
    throw new Error("Wix app instance identity could not be verified. Tenant-scoped dashboard data is unavailable.");
  }

  return siteReadiness;
}

export const getDashboardData = webMethod(Permissions.Admin, async () => {
  const siteReadiness = await getVerifiedSiteReadiness();

  return await getEtsySyncData(siteReadiness);
});

export const saveSyncProfile = webMethod(
  Permissions.Admin,
  async (profile: SyncProfile) => {
    const siteReadiness = await getVerifiedSiteReadiness();

    return await updateSyncProfileRecord(profile, siteReadiness);
  }
);

export const runManualSync = webMethod(Permissions.Admin, async (scope: ManualSyncScope) => {
  const siteReadiness = await getVerifiedSiteReadiness();

  return await queueManualSync(scope, siteReadiness);
});

export const resolveConflict = webMethod(
  Permissions.Admin,
  async (conflictId: string, resolution: Conflict["recommendation"]) => {
    const siteReadiness = await getVerifiedSiteReadiness();

    return await resolveConflictRecord(conflictId, resolution, siteReadiness);
  }
);
