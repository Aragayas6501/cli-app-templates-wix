import type { ReturnStatus } from "../types";

const allowedTransitions: Record<ReturnStatus, ReturnStatus[]> = {
  requested: ["pending_approval", "approved", "rejected"],
  pending_approval: ["approved", "rejected", "needs_information"],
  needs_information: ["pending_approval", "rejected"],
  approved: ["label_generated", "awaiting_customer_shipment", "refund_pending", "exchange_pending", "store_credit_pending", "closed"],
  label_generated: ["in_transit", "awaiting_customer_shipment", "exception"],
  awaiting_customer_shipment: ["in_transit", "closed"],
  in_transit: ["received", "exception"],
  received: ["inspected"],
  inspected: ["refund_pending", "exchange_pending", "store_credit_pending", "rejected"],
  refund_pending: ["refunded", "exception"],
  exchange_pending: ["exchange_shipped", "exception"],
  store_credit_pending: ["store_credit_issued", "exception"],
  refunded: ["closed"],
  exchange_shipped: ["closed"],
  store_credit_issued: ["closed"],
  rejected: ["closed"],
  exception: [
    "pending_approval",
    "approved",
    "label_generated",
    "refund_pending",
    "exchange_pending",
    "store_credit_pending",
    "closed",
  ],
  closed: [],
};

export function canTransition(from: ReturnStatus, to: ReturnStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function assertTransition(from: ReturnStatus, to: ReturnStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Cannot transition return from ${from} to ${to}.`);
  }
}

export function statusLabel(status: ReturnStatus): string {
  return status
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
