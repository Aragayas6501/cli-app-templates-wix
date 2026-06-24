export type ReturnStatus =
  | "requested"
  | "pending_approval"
  | "needs_information"
  | "approved"
  | "label_generated"
  | "awaiting_customer_shipment"
  | "in_transit"
  | "received"
  | "inspected"
  | "refund_pending"
  | "exchange_pending"
  | "store_credit_pending"
  | "refunded"
  | "exchange_shipped"
  | "store_credit_issued"
  | "rejected"
  | "exception"
  | "closed";

export type ResolutionPreference = "refund" | "exchange" | "storeCredit";
export type ApprovalMode = "auto" | "manual" | "conditional";
export type RiskLevel = "low" | "medium" | "high";
export type DashboardTab =
  | "overview"
  | "returns"
  | "policies"
  | "refunds"
  | "exchanges"
  | "analytics"
  | "fraud"
  | "automations"
  | "settings";

export interface ReturnReason {
  code: string;
  label: string;
  category: "size" | "quality" | "fulfillment" | "preference" | "other";
  requiresPhoto: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface ReturnPolicy {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  priority: number;
  returnWindowDays: number;
  approvalMode: ApprovalMode;
  exchangeAllowed: boolean;
  storeCreditAllowed: boolean;
  excludedSkus: string[];
  excludedProductTypes: string[];
  countries: string[];
  customerGroups: string[];
}

export interface OrderLineItem {
  id: string;
  productId: string;
  variantId?: string;
  sku: string;
  productName: string;
  variantDescription: string;
  quantity: number;
  unitPrice: number;
  productType: "physical" | "digital" | "custom";
  finalSale: boolean;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  createdAt: string;
  fulfilledAt: string;
  country: string;
  currency: string;
  status: "fulfilled" | "partially_fulfilled" | "paid" | "cancelled";
  lineItems: OrderLineItem[];
}

export interface EligibilityItemResult {
  lineItemId: string;
  eligible: boolean;
  reason: string;
  requiresPhoto: boolean;
  maxQuantity: number;
}

export interface EligibilityResult {
  eligible: boolean;
  policyId: string;
  policyName: string;
  evaluatedAt: string;
  items: EligibilityItemResult[];
}

export interface ReturnItem {
  id: string;
  orderLineItemId: string;
  productId: string;
  variantId?: string;
  sku: string;
  productName: string;
  variantDescription: string;
  quantityOrdered: number;
  quantityRequested: number;
  quantityApproved: number;
  reasonCode: string;
  customerComment: string;
  requiresPhoto: boolean;
  mediaCount: number;
  itemAmount: number;
  disposition: "pending" | "restock" | "quarantine" | "dispose" | "return_to_customer";
}

export interface TimelineEvent {
  id: string;
  eventType: string;
  actorType: "customer" | "merchant" | "automation" | "system";
  message: string;
  occurredAt: string;
}

export interface ReturnRequest {
  id: string;
  rmaNumber: string;
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  status: ReturnStatus;
  resolutionPreference: ResolutionPreference;
  policyId: string;
  requestedAt: string;
  updatedAt: string;
  riskScore: number;
  riskLevel: RiskLevel;
  priority: "normal" | "elevated" | "critical";
  currency: string;
  subtotalAmount: number;
  refundEstimateAmount: number;
  exchangeRecoveryAmount: number;
  source: "portal" | "dashboard" | "automation";
  items: ReturnItem[];
  timeline: TimelineEvent[];
}

export interface RefundRecord {
  id: string;
  returnRequestId: string;
  status: "draft" | "merchant_action_required" | "completed" | "failed";
  refundType: "full" | "partial" | "shipping" | "custom";
  amount: number;
  currency: string;
  nativeRefundUrl: string;
  createdAt: string;
}

export interface ExchangeRecord {
  id: string;
  returnRequestId: string;
  status: "requested" | "reserved" | "awaiting_return" | "shipped" | "completed";
  originalSku: string;
  replacementSku?: string;
  priceDeltaAmount: number;
  trackingNumber?: string;
}

export interface StoreCreditRecord {
  id: string;
  returnRequestId: string;
  status: "offered" | "issued" | "redeemed" | "voided";
  baseAmount: number;
  bonusAmount: number;
  totalAmount: number;
  currency: string;
  creditCode: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: "return_submitted" | "reason_selected" | "order_age_checked" | "risk_scored";
  conditionSummary: string;
  actionSummary: string;
  isActive: boolean;
  lastRunAt?: string;
}

export interface AnalyticsOverview {
  returnRate: number;
  exchangeRate: number;
  refundRate: number;
  recoveryRevenue: number;
  storeCreditAdoption: number;
  supportTicketsReduced: number;
}

export interface ProductInsight {
  sku: string;
  productName: string;
  returnRate: number;
  topReason: string;
  requests: number;
  recommendation: string;
}

export interface ReturnFlowSettings {
  instanceId: string;
  billingPlan: "Free" | "Starter" | "Pro" | "Business" | "Enterprise";
  monthlyReturnLimit: number | "unlimited";
  portalEnabled: boolean;
  autoApproveLowRisk: boolean;
  defaultReturnWindowDays: number;
  storeCreditBonusPercent: number;
  primaryLocale: string;
  enabledCarriers: string[];
}

export interface ReturnFlowDashboardData {
  settings: ReturnFlowSettings;
  policies: ReturnPolicy[];
  reasons: ReturnReason[];
  returns: ReturnRequest[];
  refunds: RefundRecord[];
  exchanges: ExchangeRecord[];
  storeCredits: StoreCreditRecord[];
  automations: AutomationRule[];
  analytics: AnalyticsOverview;
  productInsights: ProductInsight[];
}

export interface PortalLookupResult {
  token: string;
  order: PortalOrderSummary;
  eligibility: EligibilityResult;
  reasons: ReturnReason[];
}

export interface PortalOrderLineItemSummary {
  id: string;
  sku: string;
  productName: string;
  variantDescription: string;
  quantity: number;
}

export interface PortalOrderSummary {
  orderNumber: string;
  currency: string;
  lineItems: PortalOrderLineItemSummary[];
}

export interface PortalSubmissionInput {
  token: string;
  selectedLineItemIds: string[];
  resolutionPreference: ResolutionPreference;
  reasonCode: string;
  comment: string;
}
