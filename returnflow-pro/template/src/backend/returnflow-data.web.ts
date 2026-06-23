import { Permissions, webMethod } from "@wix/web-methods";
import type {
  PortalLookupResult,
  PortalSubmissionInput,
  ReturnFlowDashboardData,
  ReturnFlowSettings,
  ReturnRequest,
  ReturnStatus,
} from "../types";
import {
  approveReturn,
  createRefundIntent,
  evaluateEligibility,
  findOrder,
  findOrderById,
  getDashboardData,
  issueStoreCredit,
  rejectReturn,
  submitPortalReturn,
  toPortalOrderSummary,
  updateReturnStatus,
  updateSettings,
} from "./database";
import { getCatalogVersion } from "./catalog-version";
import { consumeLookupToken, pruneExpiredLookupTokens, storeLookupToken } from "./storage";

const LOOKUP_TOKEN_TTL_MS = 15 * 60 * 1000;

function secureToken(): string {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure token generation is unavailable.");
  }
  const values = new Uint32Array(4);
  globalThis.crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(8, "0")).join("");
}

async function createLookupToken(orderId: string): Promise<string> {
  await pruneExpiredLookupTokens();
  const token = secureToken();
  await storeLookupToken(token, orderId, Date.now() + LOOKUP_TOKEN_TTL_MS);
  return token;
}

function normalizeLookup(orderNumber: string, email: string): { orderNumber: string; email: string } {
  const normalizedOrderNumber = typeof orderNumber === "string" ? orderNumber.trim() : "";
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!/^[A-Za-z0-9-]{3,40}$/.test(normalizedOrderNumber)) {
    throw new Error("Enter a valid order number.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
    throw new Error("Enter a valid email address.");
  }
  return { orderNumber: normalizedOrderNumber, email: normalizedEmail };
}

function validateReturnId(id: string): string {
  if (typeof id !== "string" || !/^ret-[A-Za-z0-9-]+$/.test(id)) {
    throw new Error("Return ID is invalid.");
  }
  return id;
}

export const getReturnFlowData = webMethod(
  Permissions.Admin,
  async (): Promise<ReturnFlowDashboardData & { catalogVersion: string }> => {
    const catalogVersion = await getCatalogVersion();
    return {
      ...(await getDashboardData()),
      catalogVersion,
    };
  }
);

export const saveReturnFlowSettings = webMethod(
  Permissions.Admin,
  async (settings: ReturnFlowSettings): Promise<ReturnFlowSettings> => updateSettings(settings)
);

export const transitionReturn = webMethod(
  Permissions.Admin,
  async (id: string, status: ReturnStatus, message: string): Promise<ReturnRequest> =>
    updateReturnStatus(validateReturnId(id), status, typeof message === "string" ? message.trim() : "")
);

export const approveReturnRequest = webMethod(
  Permissions.Admin,
  async (id: string): Promise<ReturnRequest> => approveReturn(validateReturnId(id))
);

export const rejectReturnRequest = webMethod(
  Permissions.Admin,
  async (id: string): Promise<ReturnRequest> => rejectReturn(validateReturnId(id))
);

export const createReturnRefundIntent = webMethod(
  Permissions.Admin,
  async (id: string) => createRefundIntent(validateReturnId(id))
);

export const issueReturnStoreCredit = webMethod(
  Permissions.Admin,
  async (id: string) => issueStoreCredit(validateReturnId(id))
);

export const lookupPortalOrder = webMethod(
  Permissions.Anyone,
  async (orderNumber: string, email: string): Promise<PortalLookupResult> => {
    const data = await getDashboardData();
    if (!data.settings.portalEnabled) {
      throw new Error("The return portal is currently unavailable.");
    }

    const lookup = normalizeLookup(orderNumber, email);
    const order = await findOrder(lookup.orderNumber, lookup.email);
    if (!order) {
      throw new Error("We could not verify an order with those details.");
    }

    const eligibility = evaluateEligibility(order);
    return {
      token: await createLookupToken(order.id),
      order: toPortalOrderSummary(order),
      eligibility,
      reasons: data.reasons.filter((reason) => reason.isActive),
    };
  }
);

export const submitPortalReturnRequest = webMethod(
  Permissions.Anyone,
  async (input: PortalSubmissionInput): Promise<ReturnRequest> => {
    if (!(await getDashboardData()).settings.portalEnabled) {
      throw new Error("The return portal is currently unavailable.");
    }
    if (!input || typeof input.token !== "string") {
      throw new Error("Verify your order before submitting a return.");
    }
    const orderId = await consumeLookupToken(input.token);
    const verifiedOrder = await findOrderById(orderId);

    if (!verifiedOrder) {
      throw new Error("The verified order could not be loaded.");
    }

    return await submitPortalReturn(
      verifiedOrder,
      input.selectedLineItemIds,
      input.reasonCode,
      input.resolutionPreference,
      input.comment
    );
  }
);
