import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import type {
  CustomerOrder,
  ExchangeRecord,
  RefundRecord,
  ReturnFlowSettings,
  ReturnRequest,
  StoreCreditRecord,
} from "../types";
import { collectionIds } from "./collections";

const SETTINGS_RECORD_ID = "returnflow-settings";
const STORAGE_RETRY_DELAYS_MS = [250, 1_000, 2_500];

export interface ReturnFlowState {
  settings: ReturnFlowSettings;
  orders: CustomerOrder[];
  returns: ReturnRequest[];
  refunds: RefundRecord[];
  exchanges: ExchangeRecord[];
  storeCredits: StoreCreditRecord[];
}

interface PayloadRecord {
  _id: string;
  payload?: unknown;
  updatedAt?: Date;
}

interface LookupTokenRecord {
  _id: string;
  orderId?: unknown;
  expiresAt?: unknown;
}

const getItem = auth.elevate(items.get);
const saveItem = auth.elevate(items.save);
const queryItems = auth.elevate(items.query);
const getLookupTokenItem = auth.elevate(items.get);
const insertLookupTokenItem = auth.elevate(items.insert);
const removeLookupTokenItem = auth.elevate(items.remove);
const queryLookupTokenItems = auth.elevate(items.query);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSettings(value: unknown): value is ReturnFlowSettings {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.instanceId === "string" &&
    typeof value.billingPlan === "string" &&
    (typeof value.monthlyReturnLimit === "number" || value.monthlyReturnLimit === "unlimited") &&
    typeof value.portalEnabled === "boolean" &&
    typeof value.autoApproveLowRisk === "boolean" &&
    typeof value.defaultReturnWindowDays === "number" &&
    typeof value.storeCreditBonusPercent === "number" &&
    typeof value.primaryLocale === "string" &&
    isStringArray(value.enabledCarriers)
  );
}

function hasStringFields(value: unknown, fields: string[]): value is Record<string, unknown> {
  return isRecord(value) && fields.every((field) => typeof value[field] === "string");
}

function isOrder(value: unknown): value is CustomerOrder {
  return hasStringFields(value, ["id", "orderNumber", "customerEmail", "customerName", "createdAt", "fulfilledAt", "country", "currency"]) &&
    Array.isArray(value.lineItems);
}

function isReturn(value: unknown): value is ReturnRequest {
  return hasStringFields(value, ["id", "rmaNumber", "orderId", "orderNumber", "customerEmail", "customerName", "status", "requestedAt", "updatedAt", "currency"]) &&
    Array.isArray(value.items) &&
    Array.isArray(value.timeline);
}

function isRefund(value: unknown): value is RefundRecord {
  return hasStringFields(value, ["id", "returnRequestId", "status", "refundType", "currency", "nativeRefundUrl", "createdAt"]) &&
    typeof value.amount === "number";
}

function isExchange(value: unknown): value is ExchangeRecord {
  return hasStringFields(value, ["id", "returnRequestId", "status", "originalSku", "replacementSku"]) &&
    typeof value.priceDeltaAmount === "number";
}

function isStoreCredit(value: unknown): value is StoreCreditRecord {
  return hasStringFields(value, ["id", "returnRequestId", "status", "currency", "creditCode"]) &&
    typeof value.baseAmount === "number" &&
    typeof value.bonusAmount === "number" &&
    typeof value.totalAmount === "number";
}

function stateRecordPayload(record: PayloadRecord | null): unknown {
  return record && isRecord(record) ? record.payload : undefined;
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withStorageRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (const delay of [0, ...STORAGE_RETRY_DELAYS_MS]) {
    if (delay > 0) {
      await wait(delay);
    }
    try {
      return await operation();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("ReturnFlow storage operation failed.");
}

export async function loadReturnFlowState(seedState: ReturnFlowState): Promise<ReturnFlowState> {
  const settingsRecord = await withStorageRetry(
    () => getItem(collectionIds.settings, SETTINGS_RECORD_ID) as Promise<PayloadRecord | null>
  );
  const settingsPayload = stateRecordPayload(settingsRecord);
  const state: ReturnFlowState = {
    settings: isSettings(settingsPayload) ? settingsPayload : seedState.settings,
    orders: await loadPayloads(collectionIds.orders, isOrder),
    returns: await loadPayloads(collectionIds.returns, isReturn),
    refunds: await loadPayloads(collectionIds.refunds, isRefund),
    exchanges: await loadPayloads(collectionIds.exchanges, isExchange),
    storeCredits: await loadPayloads(collectionIds.storeCredits, isStoreCredit),
  };

  if (!isSettings(settingsPayload)) {
    await saveReturnFlowState(state);
  }

  return state;
}

export async function saveReturnFlowState(state: ReturnFlowState): Promise<void> {
  await Promise.all([
    withStorageRetry(() => saveItem(collectionIds.settings, {
      _id: SETTINGS_RECORD_ID,
      title: "ReturnFlow Settings",
      payload: state.settings,
      updatedAt: new Date(),
    })),
    savePayloads(collectionIds.orders, state.orders),
    savePayloads(collectionIds.returns, state.returns),
    savePayloads(collectionIds.refunds, state.refunds),
    savePayloads(collectionIds.exchanges, state.exchanges),
    savePayloads(collectionIds.storeCredits, state.storeCredits),
  ]);
}

async function loadPayloads<T extends { id: string }>(
  collectionId: string,
  guard: (value: unknown) => value is T
): Promise<T[]> {
  let page = await withStorageRetry(() => queryItems(collectionId).limit(1000).find());
  const values: T[] = [];

  while (true) {
    values.push(
      ...page.items
        .map((item) => stateRecordPayload(item as PayloadRecord))
        .filter(guard)
    );

    if (!page.hasNext()) {
      return values;
    }

    page = await withStorageRetry(() => page.next());
  }
}

async function savePayloads<T extends { id: string }>(collectionId: string, records: T[]): Promise<void> {
  await Promise.all(
    records.map((record) =>
      withStorageRetry(() => saveItem(collectionId, {
        _id: record.id,
        title: record.id,
        payload: record,
        updatedAt: new Date(),
      }))
    )
  );
}

export async function storeLookupToken(token: string, orderId: string, expiresAt: number): Promise<void> {
  await withStorageRetry(() => insertLookupTokenItem(collectionIds.lookupTokens, {
    _id: token,
    orderId,
    expiresAt: new Date(expiresAt),
  }));
}

export async function consumeLookupToken(token: string): Promise<string> {
  const record = await withStorageRetry(
    () => getLookupTokenItem(collectionIds.lookupTokens, token) as Promise<LookupTokenRecord | null>
  );
  if (!record || typeof record.orderId !== "string") {
    throw new Error("Lookup token is invalid or expired.");
  }

  const expiresAt = record.expiresAt instanceof Date
    ? record.expiresAt.getTime()
    : typeof record.expiresAt === "string"
      ? Date.parse(record.expiresAt)
      : Number.NaN;

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    await withStorageRetry(() => removeLookupTokenItem(collectionIds.lookupTokens, token));
    throw new Error("Lookup token is invalid or expired.");
  }

  await withStorageRetry(() => removeLookupTokenItem(collectionIds.lookupTokens, token));
  return record.orderId;
}

export async function pruneExpiredLookupTokens(): Promise<void> {
  const result = await withStorageRetry(() =>
    queryLookupTokenItems(collectionIds.lookupTokens)
      .lt("expiresAt", new Date())
      .limit(100)
      .find()
  );

  const expiredIds = result.items
    .map((item) => item._id)
    .filter((id): id is string => typeof id === "string");

  await Promise.all(
    expiredIds.map((id) => withStorageRetry(() => removeLookupTokenItem(collectionIds.lookupTokens, id)))
  );
}
