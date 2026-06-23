export type SyncMode = "wix-to-etsy" | "etsy-to-wix" | "two-way";

export type SyncStatus =
  | "healthy"
  | "syncing"
  | "warning"
  | "failed"
  | "paused"
  | "stale";

export type PlanTier = "Free" | "Starter" | "Pro" | "Business" | "Enterprise";

export type ReviewStatus = "Confirmed" | "Action required" | "Needs confirmation" | "Not applicable";

export type CatalogVersion = "V1_CATALOG" | "V3_CATALOG" | "STORES_NOT_INSTALLED" | "UNKNOWN";

export type CollectionName =
  | "EtsyAccounts"
  | "SyncProfiles"
  | "ProductMappings"
  | "VariantMappings"
  | "InventoryEvents"
  | "OrderMappings"
  | "CustomerMappings"
  | "SyncLogs"
  | "AutomationRules"
  | "AnalyticsEvents"
  | "Settings"
  | "AuditLogs";

export interface EtsyAccount {
  id: string;
  shopName: string;
  shopUrl: string;
  status: SyncStatus;
  scopes: string[];
  lastConnectedAt: string;
  productLimit: number;
  connectedBy: string;
}

export interface SyncProfile {
  id: string;
  name: string;
  mode: SyncMode;
  status: SyncStatus;
  productScope: string;
  inventoryBuffer: number;
  pricingFormula: string;
  syncImages: boolean;
  syncOrders: boolean;
  syncCustomers: boolean;
  updatedAt: string;
}

export interface ProductMapping {
  id: string;
  wixProductId: string;
  etsyListingId: string;
  title: string;
  sku: string;
  channel: "Wix" | "Etsy" | "Both";
  price: number;
  etsyPrice: number;
  inventory: number;
  reservedInventory: number;
  status: SyncStatus;
  lastSyncedAt: string;
  variations: number;
  images: number;
  category: string;
}

export interface VariantMapping {
  id: string;
  productMappingId: string;
  wixVariant: string;
  etsyVariation: string;
  sku: string;
  inventory: number;
  status: SyncStatus;
}

export interface InventoryEvent {
  id: string;
  productTitle: string;
  source: "Wix" | "Etsy" | "Automation";
  previousQuantity: number;
  newQuantity: number;
  bufferApplied: number;
  createdAt: string;
}

export interface OrderMapping {
  id: string;
  source: "Wix" | "Etsy";
  orderNumber: string;
  customerName: string;
  total: number;
  status: "Open" | "Fulfilled" | "Needs tracking" | "Imported";
  items: number;
  createdAt: string;
  trackingNumber?: string;
}

export interface CustomerMapping {
  id: string;
  name: string;
  emailAvailability: "Available" | "Unavailable by Etsy";
  lifetimeValue: number;
  orderCount: number;
  tags: string[];
}

export interface SyncLog {
  id: string;
  level: "Info" | "Warning" | "Failed";
  event: string;
  object: string;
  createdAt: string;
  diagnosticId?: string;
}

export interface AutomationRule {
  id: string;
  trigger: string;
  action: string;
  status: "Active" | "Paused";
  lastRunAt: string;
  runCount: number;
}

export interface AnalyticsMetric {
  id: string;
  label: string;
  value: string;
  caption: string;
  trend: string;
}

export interface AnalyticsEvent {
  id: string;
  channel: "Wix" | "Etsy" | "Combined";
  revenue: number;
  orders: number;
  topProduct: string;
  conversionTrend: string;
}

export interface Conflict {
  id: string;
  type: "Price" | "Inventory" | "Listing" | "Variant";
  object: string;
  wixValue: string;
  etsyValue: string;
  recommendation: "Wix wins" | "Etsy wins" | "Manual review";
  impact: string;
}

export interface Settings {
  activePlan: PlanTier;
  syncUpdateTargetSeconds: number;
  importTargetMinutes: number;
  auditLogsEnabled: boolean;
  secretsManagerRequired: boolean;
  lowStockAlertThreshold: number;
  marketplaceReadyChecklist: string[];
}

export interface AppMarketReadinessItem {
  id: string;
  area: "Billing" | "Setup" | "Identity" | "Stores" | "Security" | "UX" | "Performance" | "Permissions";
  requirement: string;
  status: ReviewStatus;
  evidence: string;
  nextStep?: string;
}

export interface RequiredPermission {
  id: string;
  scope: string;
  reason: string;
}

export interface DataCollectionBlueprint {
  idSuffix: CollectionName;
  fullCollectionId: string;
  purpose: string;
  appNamespaceRequired: boolean;
}

export interface WixSiteReadiness {
  catalogVersion: CatalogVersion;
  storesStatus: ReviewStatus;
  instanceStatus: ReviewStatus;
  billingStatus: ReviewStatus;
  identityEvidence: string;
  storesEvidence: string;
  originInstanceEvidence: string;
}

export interface PricingPlan {
  name: PlanTier;
  price: string;
  limit: string;
  features: string[];
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  object: string;
  createdAt: string;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  status: "Complete" | "Current" | "Pending";
}

export interface ShippingProfile {
  id: string;
  name: string;
  carriers: string[];
  processingTime: string;
  status: SyncStatus;
}

export interface EtsySyncDashboardData {
  etsyAccounts: EtsyAccount[];
  syncProfiles: SyncProfile[];
  productMappings: ProductMapping[];
  variantMappings: VariantMapping[];
  inventoryEvents: InventoryEvent[];
  orderMappings: OrderMapping[];
  customerMappings: CustomerMapping[];
  syncLogs: SyncLog[];
  automationRules: AutomationRule[];
  analyticsMetrics: AnalyticsMetric[];
  analyticsEvents: AnalyticsEvent[];
  conflicts: Conflict[];
  settings: Settings;
  pricingPlans: PricingPlan[];
  auditLogs: AuditLog[];
  onboardingSteps: OnboardingStep[];
  shippingProfiles: ShippingProfile[];
  dataCollectionBlueprints: DataCollectionBlueprint[];
  appMarketReadiness: AppMarketReadinessItem[];
  requiredPermissions: RequiredPermission[];
  wixSiteReadiness: WixSiteReadiness;
}
