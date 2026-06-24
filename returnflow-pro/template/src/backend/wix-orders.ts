import { orders as ecomOrders } from "@wix/ecom";
import type { orders as EcomOrders } from "@wix/ecom";
import type { CustomerOrder, OrderLineItem } from "../types";
import { getCatalogVersion } from "./catalog-version";

type EcomOrder = EcomOrders.Order;
type EcomLineItem = NonNullable<EcomOrder["lineItems"]>[number];

function dateToIso(value: Date | string | null | undefined): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return new Date().toISOString();
}

function customerName(order: EcomOrder): string {
  const contact = order.billingInfo?.contactDetails ?? order.shippingInfo?.logistics?.shippingDestination?.contactDetails;
  const name = [contact?.firstName, contact?.lastName]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" ")
    .trim();
  return name || "Customer";
}

function orderStatus(order: EcomOrder): CustomerOrder["status"] {
  if (order.status === "CANCELED" || order.status === "REJECTED") {
    return "cancelled";
  }
  if (order.fulfillmentStatus === "FULFILLED") {
    return "fulfilled";
  }
  if (order.fulfillmentStatus === "PARTIALLY_FULFILLED") {
    return "partially_fulfilled";
  }
  return "paid";
}

function productType(lineItem: EcomLineItem): OrderLineItem["productType"] {
  if (lineItem.itemType?.preset === "DIGITAL") {
    return "digital";
  }
  if (lineItem.itemType?.preset === "SERVICE" || lineItem.itemType?.preset === "GIFT_CARD") {
    return "custom";
  }
  return "physical";
}

function variantDescription(lineItem: EcomLineItem): string {
  const descriptions = lineItem.descriptionLines
    ?.map((line) => line.plainText?.translated ?? line.plainText?.original)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return descriptions && descriptions.length > 0 ? descriptions.join(" / ") : "Default";
}

function variantId(lineItem: EcomLineItem): string | undefined {
  const options = lineItem.catalogReference?.options;
  const candidate = typeof options?.variantId === "string"
    ? options.variantId
    : typeof options?.variant_id === "string"
      ? options.variant_id
      : undefined;
  return candidate && candidate.trim() ? candidate : undefined;
}

function lineItemPrice(lineItem: EcomLineItem): number {
  const rawAmount = lineItem.price?.amount ?? lineItem.lineItemPrice?.amount ?? lineItem.totalPriceAfterTax?.amount;
  const amount = typeof rawAmount === "number"
    ? rawAmount
    : typeof rawAmount === "string"
      ? Number(rawAmount)
      : Number.NaN;
  return Number.isFinite(amount) ? amount : 0;
}

function mapLineItem(lineItem: EcomLineItem, index: number, orderId: string): OrderLineItem | undefined {
  const productId = lineItem.catalogReference?.catalogItemId;
  const productName = lineItem.productName?.translated ?? lineItem.productName?.original;
  const lineItemId = lineItem._id ?? `${orderId}-${index}`;

  if (!productId || !productName || !lineItemId) {
    return undefined;
  }

  return {
    id: lineItemId,
    productId,
    variantId: variantId(lineItem),
    sku: lineItem.physicalProperties?.sku ?? productId,
    productName,
    variantDescription: variantDescription(lineItem),
    quantity: lineItem.quantity ?? 1,
    unitPrice: lineItemPrice(lineItem),
    productType: productType(lineItem),
    finalSale: false,
  };
}

function mapOrder(order: EcomOrder, verifiedEmail: string): CustomerOrder | undefined {
  if (!order._id || !order.number || !order.buyerInfo?.email) {
    return undefined;
  }

  const lineItems = order.lineItems
    ?.map((lineItem, index) => mapLineItem(lineItem, index, order._id ?? order.number ?? "order"))
    .filter((lineItem): lineItem is OrderLineItem => Boolean(lineItem)) ?? [];

  if (lineItems.length === 0 || order.buyerInfo.email.toLowerCase() !== verifiedEmail.toLowerCase()) {
    return undefined;
  }

  return {
    id: order._id,
    orderNumber: order.number,
    customerEmail: order.buyerInfo.email,
    customerName: customerName(order),
    createdAt: dateToIso(order._createdDate),
    fulfilledAt: dateToIso(order._updatedDate ?? order._createdDate),
    country: order.shippingInfo?.logistics?.shippingDestination?.address?.country ??
      order.billingInfo?.address?.country ??
      "",
    currency: order.currency ?? "USD",
    status: orderStatus(order),
    lineItems,
  };
}

export async function findVerifiedWixOrder(orderNumber: string, email: string): Promise<CustomerOrder | undefined> {
  const catalogVersion = await getCatalogVersion();
  if (catalogVersion === "STORES_NOT_INSTALLED") {
    return undefined;
  }

  const response = await ecomOrders.searchOrders({
    cursorPaging: { limit: 5 },
    filter: {
      number: { $eq: orderNumber },
      "buyerInfo.email": { $eq: email },
    },
  });

  return response.orders
    ?.map((order) => mapOrder(order, email))
    .find((order): order is CustomerOrder => Boolean(order));
}
