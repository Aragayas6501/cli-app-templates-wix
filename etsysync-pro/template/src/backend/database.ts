import { items } from "@wix/data";
import { auth } from "@wix/essentials";
import type {
  AutomationRule,
  AppMarketReadinessItem,
  CollectionName,
  Conflict,
  DataCollectionBlueprint,
  EtsyAccount,
  EtsySyncDashboardData,
  ManualSyncJob,
  ManualSyncScope,
  RequiredPermission,
  SyncMode,
  SyncProfile,
  SyncLog,
  SyncStatus,
  WixSiteReadiness,
} from "../types";

export const COLLECTIONS: CollectionName[] = [
  "etsy-accounts",
  "sync-profiles",
  "product-mappings",
  "variant-mappings",
  "inventory-events",
  "order-mappings",
  "customer-mappings",
  "sync-logs",
  "automation-rules",
  "analytics-events",
  "settings",
  "audit-logs",
];

const APP_NAMESPACE = "<app-namespace>";
const SETTINGS_COLLECTION_ID = `${APP_NAMESPACE}/settings`;
const TENANT_STATE_ITEM_ID = "etsysync-dashboard-state";

const DEFAULT_SITE_READINESS: WixSiteReadiness = {
  instanceId: "local-preview-instance",
  catalogVersion: "UNKNOWN",
  storesStatus: "Needs confirmation",
  instanceStatus: "Needs confirmation",
  billingStatus: "Needs confirmation",
  identityEvidence: "Runtime site readiness has not been loaded yet.",
  storesEvidence: "Run inside a Wix site to confirm Wix Stores catalog version.",
  originInstanceEvidence: "Use originInstanceId during production provisioning for copied sites.",
};

interface TenantDashboardState {
  etsyAccounts: EtsyAccount[];
  syncProfiles: SyncProfile[];
  conflicts: Conflict[];
  manualSyncJobs: ManualSyncJob[];
}

const REQUIRED_PERMISSIONS: RequiredPermission[] = [
  {
    id: "stores-catalog-version",
    scope: "SCOPE.STORES.CATALOG_READ_LIMITED",
    reason: "Required before any Stores operation to detect Catalog V1 versus Catalog V3.",
  },
  {
    id: "stores-products-v1",
    scope: "SCOPE.DC-STORES.READ-PRODUCTS",
    reason: "Reads V1 products for legacy Wix Stores sites.",
  },
  {
    id: "stores-products-v3",
    scope: "SCOPE.STORES.PRODUCT_READ_ADMIN",
    reason: "Reads V3 products, including hidden merchant catalog data needed for sync.",
  },
  {
    id: "stores-product-write",
    scope: "SCOPE.DC-STORES.MANAGE-PRODUCTS",
    reason: "Creates, updates, and deletes products and inventory on legacy Catalog V1 sites.",
  },
  {
    id: "stores-product-write-v3",
    scope: "SCOPE.STORES.PRODUCT_WRITE",
    reason: "Creates, updates, and deletes V3 products when exporting Wix products to Etsy or resolving conflicts.",
  },
  {
    id: "stores-inventory-read",
    scope: "SCOPE.STORES.INVENTORY_ITEM_READ",
    reason: "Reads V3 inventory items for inventory sync and oversell prevention.",
  },
  {
    id: "stores-inventory-write",
    scope: "SCOPE.STORES.INVENTORY_ITEM_WRITE",
    reason: "Writes V3 inventory updates after Etsy order and listing changes.",
  },
  {
    id: "stores-orders",
    scope: "SCOPE.DC-STORES.READ-ORDERS",
    reason: "Imports and reconciles Wix and Etsy orders.",
  },
  {
    id: "categories-read",
    scope: "SCOPE.CATEGORIES.CATEGORY_READ",
    reason: "Reads V3 categories for Etsy category and collection mapping.",
  },
  {
    id: "categories-write",
    scope: "SCOPE.CATEGORIES.CATEGORY_WRITE",
    reason: "Creates or updates V3 category mappings when exporting catalog structure.",
  },
  {
    id: "data-read",
    scope: "SCOPE.DC-DATA.READ",
    reason: "Reads app-scoped Wix Data collections for tenant-isolated sync settings and operations state.",
  },
  {
    id: "data-write",
    scope: "SCOPE.DC-DATA.WRITE",
    reason: "Persists admin sync settings, conflict resolution state, manual sync jobs, and audit-ready operational state.",
  },
];

const COLLECTION_PURPOSES: Record<CollectionName, string> = {
  "etsy-accounts": "Stores connected Etsy shop metadata and non-secret account state.",
  "sync-profiles": "Stores sync direction, scope, pricing formula, image, customer, and order rules.",
  "product-mappings": "Maps Wix products to Etsy listings and tracks product-level sync state.",
  "variant-mappings": "Maps Wix variants to Etsy variations and their inventory state.",
  "inventory-events": "Records stock changes, source channel, buffer application, and audit context.",
  "order-mappings": "Maps Etsy and Wix order IDs, fulfillment status, and tracking state.",
  "customer-mappings": "Maps customers across channels while respecting Etsy email limitations.",
  "sync-logs": "Stores sync diagnostics, warnings, failures, and replay context.",
  "automation-rules": "Stores merchant automation triggers, actions, and paused/active state.",
  "analytics-events": "Stores rollup events for channel revenue, order, and conversion dashboards.",
  settings: "Stores merchant settings that are not secrets.",
  "audit-logs": "Stores admin, automation, and lifecycle actions for reviewability.",
};

const DATA_COLLECTION_BLUEPRINTS: DataCollectionBlueprint[] = COLLECTIONS.map((collection) => ({
  idSuffix: collection,
  fullCollectionId: `<app-namespace>/${collection}`,
  purpose: COLLECTION_PURPOSES[collection],
  appNamespaceRequired: true,
}));

function getAppMarketReadiness(siteReadiness: WixSiteReadiness): AppMarketReadinessItem[] {
  return [
    {
      id: "setup-ui",
      area: "Setup",
      requirement: "Provide a usable setup/settings UI.",
      status: "Confirmed",
      evidence: "Dashboard includes onboarding, sync settings, readiness, and billing sections.",
    },
    {
      id: "realistic-demo-data",
      area: "UX",
      requirement: "First install shows realistic demo data, not lorem ipsum.",
      status: "Confirmed",
      evidence: "Seeded data uses realistic handmade, vintage, digital-product, order, and conflict examples.",
    },
    {
      id: "wix-stores-required",
      area: "Stores",
      requirement: "Required Wix apps are checked and missing apps are surfaced clearly.",
      status: siteReadiness.storesStatus,
      evidence: siteReadiness.storesEvidence,
      nextStep:
        siteReadiness.storesStatus === "Action required"
          ? "Install Wix Stores before launching product, inventory, or order synchronization."
          : undefined,
    },
    {
      id: "stores-versioning",
      area: "Stores",
      requirement: "Support both Wix Stores Catalog V1 and Catalog V3.",
      status:
        siteReadiness.catalogVersion === "STORES_NOT_INSTALLED"
          ? "Action required"
          : siteReadiness.catalogVersion === "UNKNOWN"
            ? "Needs confirmation"
            : "Confirmed",
      evidence:
        siteReadiness.catalogVersion === "STORES_NOT_INSTALLED"
          ? "Wix Stores must be installed before catalog-version adapters can be selected."
          : siteReadiness.catalogVersion === "UNKNOWN"
          ? "Catalog version probe is present but needs a Wix Stores site context to confirm."
          : `Detected ${siteReadiness.catalogVersion}; production adapters must branch before every Stores operation.`,
    },
    {
      id: "instance-identity",
      area: "Identity",
      requirement: "Use Wix app instance identity instead of cookies or sessions.",
      status: siteReadiness.instanceStatus,
      evidence: siteReadiness.identityEvidence,
    },
    {
      id: "site-duplication",
      area: "Identity",
      requirement: "Handle site duplication through originInstanceId.",
      status: "Needs confirmation",
      evidence: siteReadiness.originInstanceEvidence,
      nextStep: "Copy eligible app settings and mappings from originInstanceId during production lifecycle provisioning.",
    },
    {
      id: "wix-billing",
      area: "Billing",
      requirement: "Paid subscriptions route through Wix Billing.",
      status: siteReadiness.billingStatus,
      evidence:
        siteReadiness.billingStatus === "Confirmed"
          ? "Current app instance reports billing data."
          : "Configure app plans in Wix Dev Center and route upgrades through Wix Billing before App Market submission.",
      nextStep: "Map Free, Starter, Pro, Business, and Enterprise tiers to Wix App Plans and test checkout for each plan.",
    },
    {
      id: "etsy-oauth-secrets",
      area: "Security",
      requirement: "OAuth tokens and app secrets are encrypted and not stored in cookies.",
      status: "Action required",
      evidence: "The dashboard exposes OAuth setup, but production Etsy token exchange must use Wix Secrets Manager.",
      nextStep: "Store Etsy client secret and refresh tokens in Wix Secrets Manager or encrypted backend storage.",
    },
    {
      id: "xss-inputs",
      area: "Security",
      requirement: "Protect user-entered settings and search input from XSS.",
      status: "Confirmed",
      evidence: "Dashboard renders user-controlled values through React text nodes and does not inject HTML.",
    },
    {
      id: "minimum-permissions",
      area: "Permissions",
      requirement: "Request only minimum necessary permissions.",
      status: "Needs confirmation",
      evidence: "The template lists exact Stores, inventory, orders, and category scopes required by the implemented sync surface.",
      nextStep: "Configure only the listed scopes in Wix Dev Center and remove redundant permissions.",
    },
    {
      id: "data-collections",
      area: "Setup",
      requirement: "App data collections are scoped to the app namespace and back dashboard writes.",
      status: "Action required",
      evidence: "Dashboard mutations fail closed until the <app-namespace>/settings collection is replaced with the real app namespace.",
      nextStep: "Create Data Collection extensions in Wix Dev Center, replace <app-namespace>, and keep the settings idSuffix exactly lower-kebab-case.",
    },
    {
      id: "performance-validation",
      area: "Performance",
      requirement: "Startup, load times, browser support, and console errors are tested before submission.",
      status: "Needs confirmation",
      evidence: "Template typecheck/build validation passes; final hosted preview and browser matrix must be run for the real app.",
      nextStep: "Run Wix preview, test Chrome/Safari/Firefox, and clear dashboard console errors before review.",
    },
  ];
}

const SEEDED_ETSY_ACCOUNTS: EtsyAccount[] = [
  {
    id: "etsy-shop-001",
    shopName: "Northstar Handmade",
    shopUrl: "https://www.etsy.com/shop/northstarhandmade",
    status: "healthy",
    scopes: ["listings_r", "listings_w", "transactions_r", "shops_r"],
    lastConnectedAt: "2026-06-22T14:04:00.000Z",
    productLimit: 5000,
    connectedBy: "Store owner",
  },
  {
    id: "etsy-shop-002",
    shopName: "Northstar Vintage",
    shopUrl: "https://www.etsy.com/shop/northstarvintage",
    status: "warning",
    scopes: ["listings_r", "transactions_r"],
    lastConnectedAt: "2026-06-20T09:24:00.000Z",
    productLimit: 500,
    connectedBy: "Agency admin",
  },
];

const SEEDED_SYNC_PROFILES: SyncProfile[] = [
  {
    id: "profile-primary",
    name: "Two-way catalog operations",
    mode: "two-way",
    status: "syncing",
    productScope: "All active Wix products and Etsy listings",
    inventoryBuffer: 3,
    pricingFormula: "Wix price + 10%",
    syncImages: true,
    syncOrders: true,
    syncCustomers: true,
    updatedAt: "2026-06-23T04:34:00.000Z",
  },
  {
    id: "profile-digital",
    name: "Digital downloads",
    mode: "wix-to-etsy",
    status: "healthy",
    productScope: "Digital files collection",
    inventoryBuffer: 0,
    pricingFormula: "Wix price",
    syncImages: true,
    syncOrders: true,
    syncCustomers: false,
    updatedAt: "2026-06-22T16:18:00.000Z",
  },
];

const SEEDED_CONFLICTS: Conflict[] = [
  {
    id: "conflict-101",
    type: "Inventory",
    object: "Walnut ring dish / SKU WRD-08",
    wixValue: "18 in stock",
    etsyValue: "12 in stock",
    recommendation: "Wix wins",
    impact: "6 units are at risk of stale availability on Etsy.",
  },
  {
    id: "conflict-102",
    type: "Price",
    object: "Custom birth flower print / SKU BFP-11",
    wixValue: "$36.00",
    etsyValue: "$39.60",
    recommendation: "Etsy wins",
    impact: "Pricing rule has already applied the marketplace uplift.",
  },
];

function cloneEtsyAccount(account: EtsyAccount): EtsyAccount {
  return { ...account, scopes: [...account.scopes] };
}

function cloneSyncProfile(profile: SyncProfile): SyncProfile {
  return { ...profile };
}

function cloneConflict(conflict: Conflict): Conflict {
  return { ...conflict };
}

function createTenantState(): TenantDashboardState {
  return {
    etsyAccounts: SEEDED_ETSY_ACCOUNTS.map(cloneEtsyAccount),
    syncProfiles: SEEDED_SYNC_PROFILES.map(cloneSyncProfile),
    conflicts: SEEDED_CONFLICTS.map(cloneConflict),
    manualSyncJobs: [],
  };
}

function assertPersistenceConfigured() {
  if (SETTINGS_COLLECTION_ID.includes("<app-namespace>")) {
    throw new Error(
      "EtsySync Pro requires a real app namespace and the app-scoped settings data collection before dashboard data can be read or changed."
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requireStringField(record: Record<string, unknown>, fieldName: string): string {
  const value = record[fieldName];

  if (typeof value !== "string") {
    throw new Error(`Persisted field ${fieldName} is invalid.`);
  }

  return value;
}

function requireNumberField(record: Record<string, unknown>, fieldName: string): number {
  const value = record[fieldName];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Persisted field ${fieldName} is invalid.`);
  }

  return value;
}

function requireBooleanField(record: Record<string, unknown>, fieldName: string): boolean {
  const value = record[fieldName];

  if (typeof value !== "boolean") {
    throw new Error(`Persisted field ${fieldName} is invalid.`);
  }

  return value;
}

function requireStringArrayField(record: Record<string, unknown>, fieldName: string): string[] {
  const value = record[fieldName];

  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    throw new Error(`Persisted field ${fieldName} is invalid.`);
  }

  return [...value];
}

function parsePersistedArray<T>(
  value: unknown,
  fieldName: string,
  parser: (record: Record<string, unknown>) => T,
): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`Persisted field ${fieldName} is invalid.`);
  }

  return value.map((entry) => {
    if (!isRecord(entry)) {
      throw new Error(`Persisted field ${fieldName} contains an invalid entry.`);
    }

    return parser(entry);
  });
}

function parseEtsyAccount(record: Record<string, unknown>): EtsyAccount {
  return {
    id: requireStringField(record, "id"),
    shopName: requireStringField(record, "shopName"),
    shopUrl: requireStringField(record, "shopUrl"),
    status: assertSyncStatus(requireStringField(record, "status")),
    scopes: requireStringArrayField(record, "scopes"),
    lastConnectedAt: requireStringField(record, "lastConnectedAt"),
    productLimit: requireNumberField(record, "productLimit"),
    connectedBy: requireStringField(record, "connectedBy"),
  };
}

function parseSyncProfile(record: Record<string, unknown>): SyncProfile {
  return {
    id: requireStringField(record, "id"),
    name: requireStringField(record, "name"),
    mode: assertSyncMode(requireStringField(record, "mode")),
    status: assertSyncStatus(requireStringField(record, "status")),
    productScope: requireStringField(record, "productScope"),
    inventoryBuffer: requireNumberField(record, "inventoryBuffer"),
    pricingFormula: requireStringField(record, "pricingFormula"),
    syncImages: requireBooleanField(record, "syncImages"),
    syncOrders: requireBooleanField(record, "syncOrders"),
    syncCustomers: requireBooleanField(record, "syncCustomers"),
    updatedAt: requireStringField(record, "updatedAt"),
  };
}

function parseConflict(record: Record<string, unknown>): Conflict {
  const type = requireStringField(record, "type");
  const recommendation = requireStringField(record, "recommendation");

  if (type !== "Price" && type !== "Inventory" && type !== "Listing" && type !== "Variant") {
    throw new Error("Persisted conflict type is invalid.");
  }

  if (recommendation !== "Wix wins" && recommendation !== "Etsy wins" && recommendation !== "Manual review") {
    throw new Error("Persisted conflict recommendation is invalid.");
  }

  return {
    id: requireStringField(record, "id"),
    type,
    object: requireStringField(record, "object"),
    wixValue: requireStringField(record, "wixValue"),
    etsyValue: requireStringField(record, "etsyValue"),
    recommendation,
    impact: requireStringField(record, "impact"),
  };
}

function parseManualSyncJob(record: Record<string, unknown>): ManualSyncJob {
  const status = requireStringField(record, "status");

  if (status !== "syncing" && status !== "failed") {
    throw new Error("Persisted manual sync job status is invalid.");
  }

  return {
    id: requireStringField(record, "id"),
    scope: assertManualSyncScope(requireStringField(record, "scope")),
    status,
    message: requireStringField(record, "message"),
    queuedAt: requireStringField(record, "queuedAt"),
    affectedRecords: requireNumberField(record, "affectedRecords"),
  };
}

async function saveTenantState(state: TenantDashboardState, siteReadiness: WixSiteReadiness) {
  assertPersistenceConfigured();

  await auth.elevate(items.save)(SETTINGS_COLLECTION_ID, {
    _id: TENANT_STATE_ITEM_ID,
    instanceId: siteReadiness.instanceId,
    originInstanceId: siteReadiness.originInstanceId ?? "",
    etsyAccounts: state.etsyAccounts,
    syncProfiles: state.syncProfiles,
    conflicts: state.conflicts,
    manualSyncJobs: state.manualSyncJobs,
  });
}

async function getTenantState(siteReadiness: WixSiteReadiness = DEFAULT_SITE_READINESS): Promise<TenantDashboardState> {
  assertPersistenceConfigured();

  const persistedState = await auth.elevate(items.get)(SETTINGS_COLLECTION_ID, TENANT_STATE_ITEM_ID);

  if (!persistedState) {
    const createdState = createTenantState();
    await saveTenantState(createdState, siteReadiness);
    return createdState;
  }

  if (!isRecord(persistedState)) {
    throw new Error("Persisted EtsySync state is invalid.");
  }

  const persistedInstanceId = requireStringField(persistedState, "instanceId");

  if (persistedInstanceId !== siteReadiness.instanceId) {
    throw new Error("Persisted EtsySync state does not belong to this Wix app instance.");
  }

  return {
    etsyAccounts: parsePersistedArray(persistedState.etsyAccounts, "etsyAccounts", parseEtsyAccount),
    syncProfiles: parsePersistedArray(persistedState.syncProfiles, "syncProfiles", parseSyncProfile),
    conflicts: parsePersistedArray(persistedState.conflicts, "conflicts", parseConflict),
    manualSyncJobs: parsePersistedArray(persistedState.manualSyncJobs, "manualSyncJobs", parseManualSyncJob),
  };
}

const automationRules: AutomationRule[] = [
  {
    id: "auto-001",
    trigger: "When Product Created",
    action: "Publish to Etsy with selected shipping profile",
    status: "Active",
    lastRunAt: "2026-06-23T04:25:00.000Z",
    runCount: 184,
  },
  {
    id: "auto-002",
    trigger: "When Inventory Changes",
    action: "Sync inventory with buffer and reservation protection",
    status: "Active",
    lastRunAt: "2026-06-23T04:31:00.000Z",
    runCount: 8612,
  },
  {
    id: "auto-003",
    trigger: "When Etsy Order Arrives",
    action: "Create Wix order and customer mapping",
    status: "Active",
    lastRunAt: "2026-06-23T04:18:00.000Z",
    runCount: 347,
  },
  {
    id: "auto-004",
    trigger: "When Product Updated",
    action: "Queue manual review for SEO fields",
    status: "Paused",
    lastRunAt: "2026-06-21T12:12:00.000Z",
    runCount: 42,
  },
];

const VALID_SYNC_MODES: SyncMode[] = ["wix-to-etsy", "etsy-to-wix", "two-way"];
const VALID_SYNC_STATUSES: SyncStatus[] = ["healthy", "syncing", "warning", "failed", "paused", "stale"];
const VALID_MANUAL_SYNC_SCOPES: ManualSyncScope[] = [
  "full-catalog",
  "filtered-catalog",
  "priority-conflicts",
];

function assertNonEmptyString(value: unknown, fieldName: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string.`);
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error(`${fieldName} is required.`);
  }

  if (trimmedValue.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or less.`);
  }

  return trimmedValue;
}

function assertIntegerInRange(value: unknown, fieldName: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${fieldName} must be an integer between ${min} and ${max}.`);
  }

  return value;
}

function assertSyncMode(value: unknown): SyncMode {
  if (VALID_SYNC_MODES.includes(value as SyncMode)) {
    return value as SyncMode;
  }

  throw new Error("Sync mode is invalid.");
}

function assertSyncStatus(value: unknown): SyncStatus {
  if (VALID_SYNC_STATUSES.includes(value as SyncStatus)) {
    return value as SyncStatus;
  }

  throw new Error("Sync status is invalid.");
}

function assertManualSyncScope(value: unknown): ManualSyncScope {
  if (VALID_MANUAL_SYNC_SCOPES.includes(value as ManualSyncScope)) {
    return value as ManualSyncScope;
  }

  throw new Error("Manual sync scope is invalid.");
}

function syncJobsToLogs(jobs: ManualSyncJob[]): SyncLog[] {
  return jobs.map((job) => ({
    id: `log-${job.id}`,
    level: job.status === "failed" ? "Failed" : "Info",
    event: job.scope === "priority-conflicts" ? "Priority conflict sync queued" : "Manual sync queued",
    object: `${job.affectedRecords} record(s) / ${job.scope}`,
    createdAt: job.queuedAt,
    diagnosticId: job.id,
  }));
}

export async function getEtsySyncData(
  siteReadiness: WixSiteReadiness = DEFAULT_SITE_READINESS,
): Promise<EtsySyncDashboardData> {
  const tenantState = await getTenantState(siteReadiness);

  return {
    etsyAccounts: tenantState.etsyAccounts,
    syncProfiles: tenantState.syncProfiles,
    productMappings: [
      {
        id: "mapping-001",
        wixProductId: "wix-prod-1084",
        etsyListingId: "etsy-listing-774291",
        title: "Walnut ring dish",
        sku: "WRD-08",
        channel: "Both",
        price: 42,
        etsyPrice: 46.2,
        inventory: 18,
        reservedInventory: 2,
        status: "warning",
        lastSyncedAt: "2026-06-23T04:27:00.000Z",
        variations: 4,
        images: 8,
        category: "Home Decor",
      },
      {
        id: "mapping-002",
        wixProductId: "wix-prod-2085",
        etsyListingId: "etsy-listing-883002",
        title: "Custom birth flower print",
        sku: "BFP-11",
        channel: "Both",
        price: 36,
        etsyPrice: 39.6,
        inventory: 96,
        reservedInventory: 0,
        status: "healthy",
        lastSyncedAt: "2026-06-23T04:31:00.000Z",
        variations: 12,
        images: 6,
        category: "Art",
      },
      {
        id: "mapping-003",
        wixProductId: "wix-prod-3024",
        etsyListingId: "etsy-listing-448610",
        title: "Printable weekly planner",
        sku: "PWP-04",
        channel: "Both",
        price: 12,
        etsyPrice: 12,
        inventory: 9999,
        reservedInventory: 0,
        status: "healthy",
        lastSyncedAt: "2026-06-23T04:22:00.000Z",
        variations: 3,
        images: 5,
        category: "Digital Products",
      },
      {
        id: "mapping-004",
        wixProductId: "wix-prod-4311",
        etsyListingId: "etsy-listing-908771",
        title: "Vintage brass candlestick",
        sku: "VBC-02",
        channel: "Etsy",
        price: 64,
        etsyPrice: 64,
        inventory: 1,
        reservedInventory: 1,
        status: "stale",
        lastSyncedAt: "2026-06-22T11:14:00.000Z",
        variations: 1,
        images: 10,
        category: "Vintage",
      },
    ],
    variantMappings: [
      {
        id: "variant-001",
        productMappingId: "mapping-002",
        wixVariant: "Size: 8x10 / Frame: None",
        etsyVariation: "Dimensions: 8x10 / Finish: Digital",
        sku: "BFP-11-810-D",
        inventory: 72,
        status: "healthy",
      },
      {
        id: "variant-002",
        productMappingId: "mapping-001",
        wixVariant: "Material: Walnut / Finish: Oil",
        etsyVariation: "Wood: Walnut / Finish: Natural oil",
        sku: "WRD-08-W-O",
        inventory: 12,
        status: "warning",
      },
    ],
    inventoryEvents: [
      {
        id: "inventory-001",
        productTitle: "Walnut ring dish",
        source: "Etsy",
        previousQuantity: 20,
        newQuantity: 18,
        bufferApplied: 3,
        createdAt: "2026-06-23T04:29:00.000Z",
      },
      {
        id: "inventory-002",
        productTitle: "Custom birth flower print",
        source: "Wix",
        previousQuantity: 91,
        newQuantity: 96,
        bufferApplied: 0,
        createdAt: "2026-06-23T03:58:00.000Z",
      },
      {
        id: "inventory-003",
        productTitle: "Vintage brass candlestick",
        source: "Automation",
        previousQuantity: 2,
        newQuantity: 1,
        bufferApplied: 1,
        createdAt: "2026-06-22T11:16:00.000Z",
      },
    ],
    orderMappings: [
      {
        id: "order-001",
        source: "Etsy",
        orderNumber: "ETSY-20491",
        customerName: "Maya R.",
        total: 92.4,
        status: "Imported",
        items: 2,
        createdAt: "2026-06-23T04:11:00.000Z",
        trackingNumber: "Pending",
      },
      {
        id: "order-002",
        source: "Wix",
        orderNumber: "WIX-1184",
        customerName: "Noah K.",
        total: 36,
        status: "Fulfilled",
        items: 1,
        createdAt: "2026-06-22T17:43:00.000Z",
        trackingNumber: "940011189922",
      },
      {
        id: "order-003",
        source: "Etsy",
        orderNumber: "ETSY-20472",
        customerName: "Iris B.",
        total: 64,
        status: "Needs tracking",
        items: 1,
        createdAt: "2026-06-22T11:09:00.000Z",
      },
    ],
    customerMappings: [
      {
        id: "customer-001",
        name: "Maya R.",
        emailAvailability: "Unavailable by Etsy",
        lifetimeValue: 184.8,
        orderCount: 3,
        tags: ["Etsy", "Repeat buyer"],
      },
      {
        id: "customer-002",
        name: "Noah K.",
        emailAvailability: "Available",
        lifetimeValue: 132,
        orderCount: 2,
        tags: ["Wix", "Digital"],
      },
    ],
    syncLogs: [
      ...syncJobsToLogs(tenantState.manualSyncJobs),
      {
        id: "log-001",
        level: "Info",
        event: "Product images optimized and pushed",
        object: "Custom birth flower print",
        createdAt: "2026-06-23T04:31:00.000Z",
      },
      {
        id: "log-002",
        level: "Warning",
        event: "Inventory mismatch requires review",
        object: "Walnut ring dish",
        createdAt: "2026-06-23T04:29:00.000Z",
        diagnosticId: "SYNC-49281",
      },
      {
        id: "log-003",
        level: "Info",
        event: "Etsy order imported into Wix",
        object: "ETSY-20491",
        createdAt: "2026-06-23T04:13:00.000Z",
      },
    ],
    automationRules,
    analyticsMetrics: [
      {
        id: "metric-001",
        label: "Products synced",
        value: "4,812",
        caption: "Across Wix and Etsy",
        trend: "+12.4% in 7 days",
      },
      {
        id: "metric-002",
        label: "Inventory updates",
        value: "18,442",
        caption: "Oversell prevention active",
        trend: "3 conflicts open",
      },
      {
        id: "metric-003",
        label: "Orders synced",
        value: "347",
        caption: "Etsy orders imported",
        trend: "+8.1% month over month",
      },
      {
        id: "metric-004",
        label: "Sync latency",
        value: "3.8s",
        caption: "Target below 5 seconds",
        trend: "Within SLA",
      },
    ],
    analyticsEvents: [
      {
        id: "analytics-001",
        channel: "Etsy",
        revenue: 28412,
        orders: 224,
        topProduct: "Custom birth flower print",
        conversionTrend: "+9.2%",
      },
      {
        id: "analytics-002",
        channel: "Wix",
        revenue: 14220,
        orders: 123,
        topProduct: "Printable weekly planner",
        conversionTrend: "+4.6%",
      },
      {
        id: "analytics-003",
        channel: "Combined",
        revenue: 42632,
        orders: 347,
        topProduct: "Custom birth flower print",
        conversionTrend: "+7.5%",
      },
    ],
    conflicts: tenantState.conflicts,
    manualSyncJobs: tenantState.manualSyncJobs,
    settings: {
      activePlan: "Pro",
      syncUpdateTargetSeconds: 5,
      importTargetMinutes: 10,
      auditLogsEnabled: true,
      secretsManagerRequired: true,
      lowStockAlertThreshold: 8,
      marketplaceReadyChecklist: [
        "OAuth authentication",
        "Encrypted Etsy tokens",
        "Inventory buffers",
        "Audit logs",
        "Mobile responsive dashboard",
        "No critical conflicts",
      ],
    },
    pricingPlans: [
      {
        name: "Free",
        price: "$0",
        limit: "25 products",
        features: ["Manual sync", "Basic import"],
      },
      {
        name: "Starter",
        price: "$19/mo",
        limit: "500 products",
        features: ["Inventory sync", "Order sync"],
      },
      {
        name: "Pro",
        price: "$49/mo",
        limit: "5,000 products",
        features: ["Two-way sync", "Bulk operations", "Advanced automation"],
      },
      {
        name: "Business",
        price: "$99/mo",
        limit: "Unlimited products",
        features: ["Priority sync", "Advanced analytics", "Multi-shop"],
      },
      {
        name: "Enterprise",
        price: "$299/mo",
        limit: "Unlimited everything",
        features: ["API access", "White label", "Dedicated support"],
      },
    ],
    auditLogs: [
      {
        id: "audit-001",
        actor: "Store owner",
        action: "Updated price formula",
        object: "Two-way catalog operations",
        createdAt: "2026-06-23T03:42:00.000Z",
      },
      {
        id: "audit-002",
        actor: "Automation",
        action: "Reserved inventory",
        object: "Vintage brass candlestick",
        createdAt: "2026-06-22T11:16:00.000Z",
      },
    ],
    onboardingSteps: [
      {
        id: "step-wix",
        title: "Connect Wix Store",
        description: "Read catalog, inventory, orders, customers, and fulfillment data.",
        status: "Complete",
      },
      {
        id: "step-etsy",
        title: "Connect Etsy Shop",
        description: "Authorize listings, transactions, images, and shop metadata.",
        status: "Complete",
      },
      {
        id: "step-import",
        title: "Import Settings",
        description: "Choose all listings, selected listings, category, tag, or collection.",
        status: "Complete",
      },
      {
        id: "step-rules",
        title: "Sync Rules",
        description: "Set direction, buffers, pricing formula, and conflict policy.",
        status: "Current",
      },
      {
        id: "step-launch",
        title: "Launch",
        description: "Start real-time sync and monitor the first sync cycle.",
        status: "Pending",
      },
    ],
    shippingProfiles: [
      {
        id: "ship-001",
        name: "Domestic handmade parcels",
        carriers: ["USPS", "UPS", "FedEx"],
        processingTime: "2-4 business days",
        status: "healthy",
      },
      {
        id: "ship-002",
        name: "International tracked",
        carriers: ["DHL", "Royal Mail", "Canada Post"],
        processingTime: "5-9 business days",
        status: "syncing",
      },
    ],
    dataCollectionBlueprints: DATA_COLLECTION_BLUEPRINTS,
    appMarketReadiness: getAppMarketReadiness(siteReadiness),
    requiredPermissions: REQUIRED_PERMISSIONS,
    wixSiteReadiness: siteReadiness,
  };
}

export async function updateSyncProfile(
  updatedProfile: SyncProfile,
  siteReadiness: WixSiteReadiness = DEFAULT_SITE_READINESS,
): Promise<SyncProfile> {
  const tenantState = await getTenantState(siteReadiness);
  const profileId = assertNonEmptyString(updatedProfile.id, "Sync profile ID", 80);
  const existingProfile = tenantState.syncProfiles.find((profile) => profile.id === profileId);

  if (!existingProfile) {
    throw new Error(`Sync profile ${profileId} was not found.`);
  }

  const sanitizedProfile: SyncProfile = {
    ...existingProfile,
    name: assertNonEmptyString(updatedProfile.name, "Profile name", 80),
    mode: assertSyncMode(updatedProfile.mode),
    status: assertSyncStatus(updatedProfile.status),
    productScope: assertNonEmptyString(updatedProfile.productScope, "Product scope", 160),
    inventoryBuffer: assertIntegerInRange(updatedProfile.inventoryBuffer, "Inventory buffer", 0, 9999),
    pricingFormula: assertNonEmptyString(updatedProfile.pricingFormula, "Pricing formula", 120),
    syncImages: Boolean(updatedProfile.syncImages),
    syncOrders: Boolean(updatedProfile.syncOrders),
    syncCustomers: Boolean(updatedProfile.syncCustomers),
    updatedAt: new Date().toISOString(),
  };

  tenantState.syncProfiles = tenantState.syncProfiles.map((profile) =>
    profile.id === sanitizedProfile.id ? sanitizedProfile : profile
  );
  await saveTenantState(tenantState, siteReadiness);

  return sanitizedProfile;
}

export async function runManualSync(
  scope: ManualSyncScope,
  siteReadiness: WixSiteReadiness = DEFAULT_SITE_READINESS,
): Promise<ManualSyncJob> {
  const tenantState = await getTenantState(siteReadiness);
  const sanitizedScope = assertManualSyncScope(scope);
  const affectedRecords =
    sanitizedScope === "priority-conflicts" ? tenantState.conflicts.length : 4;
  const job: ManualSyncJob = {
    id: `manual-sync-${Date.now()}-${tenantState.manualSyncJobs.length + 1}`,
    scope: sanitizedScope,
    status: "syncing",
    message: "Manual sync queued. Existing data remains unchanged until the job completes.",
    queuedAt: new Date().toISOString(),
    affectedRecords,
  };

  tenantState.manualSyncJobs = [job, ...tenantState.manualSyncJobs].slice(0, 25);
  await saveTenantState(tenantState, siteReadiness);

  return {
    ...job,
  };
}

export async function resolveConflict(
  conflictId: string,
  resolution: Conflict["recommendation"],
  siteReadiness: WixSiteReadiness = DEFAULT_SITE_READINESS,
): Promise<Conflict & { resolution: Conflict["recommendation"]; resolvedAt: string }> {
  const tenantState = await getTenantState(siteReadiness);
  const sanitizedConflictId = assertNonEmptyString(conflictId, "Conflict ID", 80);
  const conflict = tenantState.conflicts.find((item) => item.id === sanitizedConflictId);

  if (!conflict) {
    throw new Error(`Conflict ${sanitizedConflictId} was not found.`);
  }

  if (resolution !== conflict.recommendation) {
    throw new Error("Conflict resolution must match the recommended safe action.");
  }

  tenantState.conflicts = tenantState.conflicts.filter((item) => item.id !== sanitizedConflictId);
  await saveTenantState(tenantState, siteReadiness);

  return {
    ...conflict,
    resolution,
    resolvedAt: new Date().toISOString(),
  };
}
