import type {
  AnalyticsOverview,
  AutomationRule,
  CustomerOrder,
  EligibilityResult,
  ExchangeRecord,
  ProductInsight,
  RefundRecord,
  ReturnFlowDashboardData,
  ReturnFlowSettings,
  ReturnPolicy,
  ReturnReason,
  ReturnRequest,
  ReturnStatus,
  PortalOrderSummary,
  StoreCreditRecord,
  TimelineEvent,
} from "../types";
import { assertTransition } from "./status-engine";
import { loadReturnFlowState, saveReturnFlowState, type ReturnFlowState } from "./storage";
import { findVerifiedWixOrder } from "./wix-orders";

const MS_PER_DAY = 86_400_000;
const MAX_COMMENT_LENGTH = 600;
const MAX_SELECTED_ITEMS = 25;
const duplicateBlockingStatuses = new Set<ReturnStatus>([
  "requested",
  "pending_approval",
  "needs_information",
  "approved",
  "label_generated",
  "awaiting_customer_shipment",
  "in_transit",
  "received",
  "inspected",
  "refund_pending",
  "exchange_pending",
  "store_credit_pending",
  "refunded",
  "exchange_shipped",
  "store_credit_issued",
  "exception",
]);

const isoDaysAgo = (days: number, hour = 12): string => {
  const date = new Date(Date.now() - days * MS_PER_DAY);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
};

const now = (): string => new Date().toISOString();

function secureId(prefix: string): string {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure random IDs are unavailable.");
  }

  const values = new Uint32Array(4);
  globalThis.crypto.getRandomValues(values);
  return `${prefix}-${Array.from(values, (value) => value.toString(16).padStart(8, "0")).join("")}`;
}

function rmaNumber(orderNumber: string, requestId: string): string {
  return `RMA-${orderNumber}-${requestId.replace(/^ret-/, "").slice(0, 8).toUpperCase()}`;
}

const reasons: ReturnReason[] = [
  { code: "too-small", label: "Too small", category: "size", requiresPhoto: false, isActive: true, sortOrder: 1 },
  { code: "too-large", label: "Too large", category: "size", requiresPhoto: false, isActive: true, sortOrder: 2 },
  { code: "damaged", label: "Damaged item", category: "quality", requiresPhoto: true, isActive: true, sortOrder: 3 },
  { code: "wrong-item", label: "Wrong item received", category: "fulfillment", requiresPhoto: true, isActive: true, sortOrder: 4 },
  { code: "changed-mind", label: "Changed mind", category: "preference", requiresPhoto: false, isActive: true, sortOrder: 5 },
];

const policies: ReturnPolicy[] = [
  {
    id: "policy-default-30",
    name: "30-day standard return policy",
    isDefault: true,
    isActive: true,
    priority: 10,
    returnWindowDays: 30,
    approvalMode: "conditional",
    exchangeAllowed: true,
    storeCreditAllowed: true,
    excludedSkus: ["FINAL-SALE-SCARF"],
    excludedProductTypes: ["digital", "custom"],
    countries: ["US", "CA", "GB"],
    customerGroups: ["standard", "vip"],
  },
  {
    id: "policy-vip-auto",
    name: "VIP auto-approval",
    isDefault: false,
    isActive: true,
    priority: 1,
    returnWindowDays: 45,
    approvalMode: "auto",
    exchangeAllowed: true,
    storeCreditAllowed: true,
    excludedSkus: [],
    excludedProductTypes: ["digital"],
    countries: ["US", "CA", "GB"],
    customerGroups: ["vip"],
  },
];

let orders: CustomerOrder[] = [];

const timeline = (eventType: string, message: string, occurredAt: string = now()): TimelineEvent => ({
  id: `${eventType}-${occurredAt}`,
  eventType,
  actorType: "system",
  message,
  occurredAt,
});

let returns: ReturnRequest[] = [];

let refunds: RefundRecord[] = [];

let exchanges: ExchangeRecord[] = [];

let storeCredits: StoreCreditRecord[] = [];

const automations: AutomationRule[] = [
  {
    id: "auto-damaged-evidence",
    name: "Require details for damaged returns",
    trigger: "reason_selected",
    conditionSummary: "If reason is Damaged item or Wrong item received",
    actionSummary: "Require customer-provided damage details and elevate review priority",
    isActive: true,
    lastRunAt: isoDaysAgo(1, 15),
  },
  {
    id: "auto-window-reject",
    name: "Reject requests outside return window",
    trigger: "order_age_checked",
    conditionSummary: "If fulfilled date is older than policy window",
    actionSummary: "Reject with customer-safe policy explanation",
    isActive: true,
    lastRunAt: isoDaysAgo(2, 10),
  },
  {
    id: "auto-low-risk-approve",
    name: "Auto approve low-risk requests",
    trigger: "risk_scored",
    conditionSummary: "If the setting is enabled and return risk is low",
    actionSummary: "Approve the request and approved quantities automatically",
    isActive: true,
  },
];

let settings: ReturnFlowSettings = {
  instanceId: "",
  billingPlan: "Pro",
  monthlyReturnLimit: "unlimited",
  portalEnabled: true,
  autoApproveLowRisk: true,
  defaultReturnWindowDays: 30,
  storeCreditBonusPercent: 10,
  primaryLocale: "en-US",
  enabledCarriers: ["Manual labels", "USPS", "UPS"],
};

function analytics(): AnalyticsOverview {
  const totalReturns = returns.length;
  const totalOrders = orders.length;
  const exchangeReturns = returns.filter((request) => request.resolutionPreference === "exchange").length;
  const refundReturns = returns.filter((request) => request.resolutionPreference === "refund").length;
  const storeCreditReturns = returns.filter((request) => request.resolutionPreference === "storeCredit").length;
  const recoveryRevenue = returns.reduce((sum, request) => sum + request.exchangeRecoveryAmount, 0);

  return {
    returnRate: totalOrders === 0 ? 0 : Math.round((totalReturns / totalOrders) * 100),
    exchangeRate: totalReturns === 0 ? 0 : Math.round((exchangeReturns / totalReturns) * 100),
    refundRate: totalReturns === 0 ? 0 : Math.round((refundReturns / totalReturns) * 100),
    recoveryRevenue,
    storeCreditAdoption: totalReturns === 0 ? 0 : Math.round((storeCreditReturns / totalReturns) * 100),
    supportTicketsReduced: totalReturns === 0 ? 0 : Math.min(60, Math.round((returns.filter((request) => request.source === "portal").length / totalReturns) * 40)),
  };
}

function productInsights(): ProductInsight[] {
  const products = new Map<string, { productName: string; requests: number; reasons: Map<string, number> }>();

  for (const request of returns) {
    for (const item of request.items) {
      const current = products.get(item.sku) ?? {
        productName: item.productName,
        requests: 0,
        reasons: new Map<string, number>(),
      };
      current.requests += 1;
      current.reasons.set(item.reasonCode, (current.reasons.get(item.reasonCode) ?? 0) + 1);
      products.set(item.sku, current);
    }
  }

  return Array.from(products.entries())
    .map(([sku, product]) => {
      const [topReasonCode] = Array.from(product.reasons.entries())
        .sort(([, left], [, right]) => right - left)[0] ?? ["other", 0];
      const reason = reasons.find((candidate) => candidate.code === topReasonCode);
      return {
        sku,
        productName: product.productName,
        returnRate: orders.length === 0 ? 0 : Math.round((product.requests / orders.length) * 100),
        topReason: reason?.label ?? "Other",
        requests: product.requests,
        recommendation: "Review sizing, product content, fulfillment, and policy signals for this recurring return pattern.",
      };
    })
    .sort((left, right) => right.requests - left.requests)
    .slice(0, 5);
}

function effectivePolicies(): ReturnPolicy[] {
  return policies.map((policy) =>
    policy.isDefault
      ? {
          ...policy,
          returnWindowDays: settings.defaultReturnWindowDays,
        }
      : policy
  );
}

function defaultPolicy(): ReturnPolicy {
  const policy = effectivePolicies().find((candidate) => candidate.isDefault && candidate.isActive);
  if (!policy) {
    throw new Error("No active default return policy is configured.");
  }
  return policy;
}

function currentState(): ReturnFlowState {
  return {
    settings,
    orders,
    returns,
    refunds,
    exchanges,
    storeCredits,
  };
}

let hydrated = false;
let hydratePromise: Promise<void> | undefined;

async function hydrateState(): Promise<void> {
  if (hydrated) {
    return;
  }

  hydratePromise ??= loadReturnFlowState(currentState())
    .then((state) => {
      settings = state.settings;
      orders = state.orders;
      returns = state.returns;
      refunds = state.refunds;
      exchanges = state.exchanges;
      storeCredits = state.storeCredits;
      hydrated = true;
    })
    .catch((error) => {
      hydratePromise = undefined;
      throw error;
    });

  await hydratePromise;
}

async function persistState(): Promise<void> {
  await saveReturnFlowState(currentState());
}

export async function getDashboardData(): Promise<ReturnFlowDashboardData> {
  await hydrateState();
  return {
    settings,
    policies: effectivePolicies(),
    reasons,
    returns,
    refunds,
    exchanges,
    storeCredits,
    automations,
    analytics: analytics(),
    productInsights: productInsights(),
  };
}

export async function findOrder(orderNumber: string, email: string): Promise<CustomerOrder | undefined> {
  await hydrateState();
  const normalizedEmail = email.trim().toLowerCase();
  const verifiedOrder = await findVerifiedWixOrder(orderNumber.trim(), normalizedEmail);
  if (verifiedOrder) {
    orders = [
      verifiedOrder,
      ...orders.filter((order) => order.id !== verifiedOrder.id),
    ];
    await persistState();
    return verifiedOrder;
  }

  return orders.find(
    (order) =>
      order.orderNumber === orderNumber.trim() &&
      order.customerEmail.toLowerCase() === normalizedEmail
  );
}

export async function findOrderById(orderId: string): Promise<CustomerOrder | undefined> {
  await hydrateState();
  return orders.find((order) => order.id === orderId);
}

export function toPortalOrderSummary(order: CustomerOrder): PortalOrderSummary {
  return {
    orderNumber: order.orderNumber,
    currency: order.currency,
    lineItems: order.lineItems.map((lineItem) => ({
      id: lineItem.id,
      sku: lineItem.sku,
      productName: lineItem.productName,
      variantDescription: lineItem.variantDescription,
      quantity: lineItem.quantity,
    })),
  };
}

export function evaluateEligibility(order: CustomerOrder): EligibilityResult {
  const policy = defaultPolicy();
  const fulfilledAt = new Date(order.fulfilledAt);
  const ageMs = Date.now() - fulfilledAt.getTime();
  const ageDays = Math.floor(ageMs / MS_PER_DAY);

  const items = order.lineItems.map((lineItem) => {
    if (order.status === "cancelled") {
      return {
        lineItemId: lineItem.id,
        eligible: false,
        reason: "Cancelled orders cannot be returned.",
        requiresPhoto: false,
        maxQuantity: 0,
      };
    }

    if (order.status === "paid") {
      return {
        lineItemId: lineItem.id,
        eligible: false,
        reason: "This order has not been fulfilled yet.",
        requiresPhoto: false,
        maxQuantity: 0,
      };
    }

    if (lineItem.finalSale || policy.excludedSkus.includes(lineItem.sku)) {
      return {
        lineItemId: lineItem.id,
        eligible: false,
        reason: "This item is marked final sale.",
        requiresPhoto: false,
        maxQuantity: 0,
      };
    }

    if (policy.excludedProductTypes.includes(lineItem.productType)) {
      return {
        lineItemId: lineItem.id,
        eligible: false,
        reason: "This product type is not returnable.",
        requiresPhoto: false,
        maxQuantity: 0,
      };
    }

    if (ageDays > policy.returnWindowDays) {
      return {
        lineItemId: lineItem.id,
        eligible: false,
        reason: `This order is outside the ${policy.returnWindowDays}-day return window.`,
        requiresPhoto: false,
        maxQuantity: 0,
      };
    }

    return {
      lineItemId: lineItem.id,
      eligible: true,
      reason: "Eligible under the standard return policy.",
      requiresPhoto: false,
      maxQuantity: lineItem.quantity,
    };
  });

  return {
    eligible: items.some((item) => item.eligible),
    policyId: policy.id,
    policyName: policy.name,
    evaluatedAt: new Date().toISOString(),
    items,
  };
}

function updateReturnStatusInState(id: string, nextStatus: ReturnStatus, message: string): ReturnRequest {
  const request = returns.find((candidate) => candidate.id === id);
  if (!request) {
    throw new Error(`Return ${id} was not found.`);
  }

  assertTransition(request.status, nextStatus);

  const nextRequest: ReturnRequest = {
    ...request,
    status: nextStatus,
    updatedAt: now(),
    timeline: [
      ...request.timeline,
      timeline(`return.${nextStatus}`, message, now()),
    ],
  };

  returns = returns.map((candidate) => (candidate.id === id ? nextRequest : candidate));
  return nextRequest;
}

export async function updateReturnStatus(id: string, nextStatus: ReturnStatus, message: string): Promise<ReturnRequest> {
  await hydrateState();
  const nextRequest = updateReturnStatusInState(id, nextStatus, message);
  await persistState();
  return nextRequest;
}

export async function approveReturn(id: string): Promise<ReturnRequest> {
  await hydrateState();
  updateReturnStatusInState(id, "approved", "Merchant approved the return request.");
  returns = returns.map((candidate) =>
    candidate.id === id
      ? {
          ...candidate,
          items: candidate.items.map((item) => ({
            ...item,
            quantityApproved: item.quantityRequested,
          })),
        }
      : candidate
  );
  const approved = returns.find((candidate) => candidate.id === id);
  if (!approved) {
    throw new Error(`Return ${id} was not found after approval.`);
  }
  await persistState();
  return approved;
}

export async function rejectReturn(id: string): Promise<ReturnRequest> {
  return updateReturnStatus(id, "rejected", "Merchant rejected the return request.");
}

export async function createRefundIntent(id: string): Promise<RefundRecord> {
  await hydrateState();
  const request = returns.find((candidate) => candidate.id === id);
  if (!request) {
    throw new Error(`Return ${id} was not found.`);
  }
  assertTransition(request.status, "refund_pending");
  if (refunds.some((refund) => refund.returnRequestId === id && refund.status !== "failed")) {
    throw new Error("A refund intent already exists for this return.");
  }

  const updatedRequest = updateReturnStatusInState(id, "refund_pending", "Refund intent created and waiting for merchant confirmation.");
  const refund: RefundRecord = {
    id: secureId("refund"),
    returnRequestId: id,
    status: "merchant_action_required",
    refundType: "partial",
    amount: updatedRequest.refundEstimateAmount,
    currency: updatedRequest.currency,
    nativeRefundUrl: `wix-dashboard://orders/refund/${updatedRequest.orderId}`,
    createdAt: now(),
  };

  refunds = [...refunds, refund];
  await persistState();
  return refund;
}

export async function createExchangeIntent(id: string): Promise<ExchangeRecord[]> {
  await hydrateState();
  const request = returns.find((candidate) => candidate.id === id);
  if (!request) {
    throw new Error(`Return ${id} was not found.`);
  }
  if (request.resolutionPreference !== "exchange") {
    throw new Error("Exchange intent can only be created for exchange return requests.");
  }
  assertTransition(request.status, "exchange_pending");
  if (exchanges.some((exchange) => exchange.returnRequestId === id && exchange.status !== "completed")) {
    throw new Error("An exchange intent already exists for this return.");
  }

  const updatedRequest = updateReturnStatusInState(id, "exchange_pending", "Exchange intent created for merchant fulfillment.");
  const exchangeRecords = updatedRequest.items.map((item) => ({
    id: secureId("exchange"),
    returnRequestId: id,
    status: "requested" as const,
    originalSku: item.sku,
    priceDeltaAmount: 0,
  }));

  exchanges = [...exchangeRecords, ...exchanges];
  await persistState();
  return exchangeRecords;
}

export async function issueStoreCredit(id: string): Promise<StoreCreditRecord> {
  await hydrateState();
  const request = returns.find((candidate) => candidate.id === id);
  if (!request) {
    throw new Error(`Return ${id} was not found.`);
  }
  assertTransition(request.status, "store_credit_pending");
  const updatedRequest = updateReturnStatusInState(id, "store_credit_pending", "Store credit issued for merchant confirmation.");
  const existingCredit = storeCredits.find((credit) => credit.returnRequestId === id && credit.status !== "voided");
  if (existingCredit) {
    const issuedCredit: StoreCreditRecord = {
      ...existingCredit,
      status: "issued",
    };
    storeCredits = storeCredits.map((credit) => (credit.id === issuedCredit.id ? issuedCredit : credit));
    await persistState();
    return issuedCredit;
  }

  const bonusAmount = Number((updatedRequest.refundEstimateAmount * settings.storeCreditBonusPercent / 100).toFixed(2));
  const credit: StoreCreditRecord = {
    id: secureId("credit"),
    returnRequestId: id,
    status: "issued",
    baseAmount: updatedRequest.refundEstimateAmount,
    bonusAmount,
    totalAmount: updatedRequest.refundEstimateAmount + bonusAmount,
    currency: updatedRequest.currency,
    creditCode: `RFC-${updatedRequest.rmaNumber.replace(/[^A-Z0-9]/g, "")}`,
  };

  storeCredits = [...storeCredits, credit];
  await persistState();
  return credit;
}

function normalizeReasonCode(reasonCode: string): ReturnReason {
  const reason = reasons.find((candidate) => candidate.isActive && candidate.code === reasonCode.trim());
  if (!reason) {
    throw new Error("Select a valid return reason.");
  }
  return reason;
}

function normalizeComment(comment: string): string {
  if (typeof comment !== "string") {
    throw new Error("Return comments must be text.");
  }
  return comment.trim().slice(0, MAX_COMMENT_LENGTH);
}

export async function submitPortalReturn(
  order: CustomerOrder,
  selectedLineItemIds: string[],
  reasonCode: string,
  resolutionPreference: "refund" | "exchange" | "storeCredit",
  comment: string
): Promise<ReturnRequest> {
  await hydrateState();
  const reason = normalizeReasonCode(reasonCode);
  if (!Array.isArray(selectedLineItemIds) || selectedLineItemIds.length === 0) {
    throw new Error("Select at least one eligible item.");
  }
  if (selectedLineItemIds.length > MAX_SELECTED_ITEMS) {
    throw new Error(`Select no more than ${MAX_SELECTED_ITEMS} items per return request.`);
  }
  const selectedLineItemIdSet = new Set(selectedLineItemIds.filter((id) => typeof id === "string"));
  if (selectedLineItemIdSet.size !== selectedLineItemIds.length) {
    throw new Error("Selected item IDs are invalid.");
  }

  const eligibility = evaluateEligibility(order);
  const eligibleLineIds = new Set(
    eligibility.items.filter((item) => item.eligible).map((item) => item.lineItemId)
  );
  const validLineIds = new Set(order.lineItems.map((lineItem) => lineItem.id));
  const invalidLineIds = Array.from(selectedLineItemIdSet).filter((id) => !validLineIds.has(id));
  if (invalidLineIds.length > 0) {
    throw new Error("Selected item IDs are invalid.");
  }
  const ineligibleLineIds = Array.from(selectedLineItemIdSet).filter((id) => !eligibleLineIds.has(id));
  if (ineligibleLineIds.length > 0) {
    throw new Error("All selected items must be eligible for return.");
  }
  const duplicateLineIds = Array.from(selectedLineItemIdSet).filter((lineItemId) =>
    returns.some(
      (request) =>
        request.orderId === order.id &&
        duplicateBlockingStatuses.has(request.status) &&
        request.items.some((item) => item.orderLineItemId === lineItemId)
    )
  );
  if (duplicateLineIds.length > 0) {
    throw new Error("A return request already exists for one or more selected items.");
  }
  const selectedItems = order.lineItems.filter(
    (lineItem) => selectedLineItemIdSet.has(lineItem.id) && eligibleLineIds.has(lineItem.id)
  );

  if (selectedItems.length === 0) {
    throw new Error("Select at least one eligible item.");
  }

  const subtotalAmount = selectedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const submittedAt = now();
  const safeComment = normalizeComment(comment);
  if (reason.requiresPhoto && safeComment.length < 10) {
    throw new Error("Add a short description of the damage or incorrect item before submitting.");
  }
  const requestId = secureId("ret");
  const riskScore = reason.code === "damaged" || reason.code === "wrong-item" ? 32 : 18;
  const riskLevel = riskScore >= 30 ? "medium" : "low";
  const autoApproved = settings.autoApproveLowRisk && riskLevel === "low" && defaultPolicy().approvalMode !== "manual";
  const returnRequest: ReturnRequest = {
    id: requestId,
    rmaNumber: rmaNumber(order.orderNumber, requestId),
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerEmail: order.customerEmail,
    customerName: order.customerName,
    status: autoApproved ? "approved" : "pending_approval",
    resolutionPreference,
    policyId: eligibility.policyId,
    requestedAt: submittedAt,
    updatedAt: submittedAt,
    riskScore,
    riskLevel,
    priority: riskLevel === "medium" ? "elevated" : "normal",
    currency: order.currency,
    subtotalAmount,
    refundEstimateAmount: subtotalAmount,
    exchangeRecoveryAmount: resolutionPreference === "exchange" ? subtotalAmount : 0,
    source: "portal",
    items: selectedItems.map((item, index) => ({
      id: `${requestId}-item-${index + 1}`,
      orderLineItemId: item.id,
      productId: item.productId,
      variantId: item.variantId,
      sku: item.sku,
      productName: item.productName,
      variantDescription: item.variantDescription,
      quantityOrdered: item.quantity,
      quantityRequested: item.quantity,
      quantityApproved: autoApproved ? item.quantity : 0,
      reasonCode: reason.code,
      customerComment: safeComment,
      requiresPhoto: reason.requiresPhoto,
      mediaCount: 0,
      itemAmount: item.unitPrice * item.quantity,
      disposition: "pending",
    })),
    timeline: [
      timeline("return.requested", "Customer submitted the return request.", submittedAt),
      timeline("eligibility.evaluated", `${eligibility.policyName} matched this request.`, submittedAt),
      ...(autoApproved
        ? [timeline("approval.auto_approved", "Low-risk request auto-approved by ReturnFlow settings.", submittedAt)]
        : []),
    ],
  };

  returns = [returnRequest, ...returns];
  await persistState();
  return returnRequest;
}

export async function updateSettings(nextSettings: ReturnFlowSettings): Promise<ReturnFlowSettings> {
  await hydrateState();
  settings = {
    ...settings,
    portalEnabled: Boolean(nextSettings.portalEnabled),
    autoApproveLowRisk: Boolean(nextSettings.autoApproveLowRisk),
    defaultReturnWindowDays: Math.min(365, Math.max(1, Number(nextSettings.defaultReturnWindowDays) || settings.defaultReturnWindowDays)),
    storeCreditBonusPercent: Math.min(100, Math.max(0, Number(nextSettings.storeCreditBonusPercent) || 0)),
    primaryLocale: typeof nextSettings.primaryLocale === "string" && nextSettings.primaryLocale.trim()
      ? nextSettings.primaryLocale.trim()
      : settings.primaryLocale,
    enabledCarriers: Array.isArray(nextSettings.enabledCarriers)
      ? nextSettings.enabledCarriers.filter((carrier) => typeof carrier === "string" && carrier.trim()).slice(0, 12)
      : settings.enabledCarriers,
  };
  await persistState();
  return settings;
}
