/**
 * App instance + billing helpers. Tier gating mirrors the `appInstances`
 * pattern: a paid instance has `billing` set and `isFree === false`. The plan's
 * package name maps onto PinFlow's tier ladder.
 */
import { auth } from "@wix/essentials";
import { appInstances } from "@wix/app-management";
import { TIER_LIMITS, type TierId, type TierLimits } from "@/consts";

export async function getAppInstance() {
  return auth.elevate(appInstances.getAppInstance)();
}

export async function isPremium(): Promise<boolean> {
  const { instance } = await getAppInstance();
  return Boolean(instance?.billing) && instance?.isFree === false;
}

/** Map the active billing package name onto a PinFlow tier. */
export async function getTier(): Promise<TierId> {
  const { instance } = await getAppInstance();
  if (!instance?.billing || instance.isFree) return "free";
  const name = (instance.billing.packageName ?? "").toLowerCase();
  if (name.includes("enterprise")) return "enterprise";
  if (name.includes("business")) return "business";
  if (name.includes("pro")) return "pro";
  if (name.includes("starter")) return "starter";
  // Any other paid plan is treated as at least Starter.
  return "starter";
}

export async function getLimits(): Promise<TierLimits> {
  return TIER_LIMITS[await getTier()];
}
