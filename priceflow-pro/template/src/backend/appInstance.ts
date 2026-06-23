import { auth } from "@wix/essentials";
import { appInstances } from "@wix/app-management";
import type { PlanTier } from "../types";

export async function getAppInstanceElevated(): Promise<
  appInstances.AppInstance | undefined
> {
  try {
    const { instance } = await auth.elevate(appInstances.getAppInstance)();
    return instance;
  } catch (error) {
    console.error("Failed loading app instance", error);
    return undefined;
  }
}

export function resolvePlanTier(appInstance?: appInstances.AppInstance): PlanTier {
  if (!appInstance || appInstance.isFree || !appInstance.billing) {
    return "free";
  }

  const billing = appInstance.billing as { packageName?: string; cycle?: string };
  const packageName = (billing.packageName ?? "").toLowerCase();

  if (packageName.includes("enterprise")) {
    return "enterprise";
  }
  if (packageName.includes("business")) {
    return "business";
  }
  if (packageName.includes("pro")) {
    return "pro";
  }
  if (packageName.includes("starter")) {
    return "starter";
  }
  return "starter";
}

export function isPaidInstance(appInstance?: appInstances.AppInstance): boolean {
  return !!appInstance && !appInstance.isFree && !!appInstance.billing;
}

