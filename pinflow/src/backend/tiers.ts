/**
 * Tier/quota enforcement. These guards throw `QuotaError` which the API routes
 * translate into a 402-style JSON error the dashboard can surface as an upgrade
 * prompt.
 */
import { getLimits } from "backend/appInstance";
import { countPinsThisMonth } from "backend/repositories/pins";
import { countConnectedAccounts } from "backend/repositories/accounts";

export class QuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaError";
  }
}

export async function assertCanPublish(): Promise<void> {
  const limits = await getLimits();
  const used = await countPinsThisMonth();
  if (used >= limits.maxPinsPerMonth) {
    throw new QuotaError(
      `Monthly pin limit reached (${limits.maxPinsPerMonth}). Upgrade your plan to publish more.`,
    );
  }
}

export async function assertCanConnectAccount(): Promise<void> {
  const limits = await getLimits();
  const used = await countConnectedAccounts();
  if (used >= limits.maxAccounts) {
    throw new QuotaError(
      `Account limit reached (${limits.maxAccounts}). Upgrade to connect more Pinterest accounts.`,
    );
  }
}

export async function assertSchedulingAllowed(): Promise<void> {
  const limits = await getLimits();
  if (!limits.scheduling) {
    throw new QuotaError("Scheduling is not available on your plan. Upgrade to schedule pins.");
  }
}

export async function automationsAllowed(): Promise<boolean> {
  const limits = await getLimits();
  return limits.automations;
}
