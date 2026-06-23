/**
 * Shared constants for PinFlow.
 *
 * ⚠️ APP_NAMESPACE must be replaced with your real app namespace from Wix Dev Center
 * (Settings → App Namespace, format like `@your-company/pinflow`). The Wix Data APIs
 * resolve collections by the fully-scoped id `<namespace>/<idSuffix>`, so this value
 * has to match the namespace the data-collections extension is published under.
 */
export const APP_NAMESPACE = "@pinflow/pinflow";

/**
 * Collection id suffixes — these are the `idSuffix` values used in the
 * data-collection extension files under `src/extensions/backend/data-collections`.
 */
export const COLLECTION_SUFFIX = {
  pinterestAccounts: "pinterest-accounts",
  boards: "boards",
  automationRules: "automation-rules",
  productMappings: "product-mappings",
  publishedPins: "published-pins",
  scheduledPins: "scheduled-pins",
  analyticsEvents: "analytics-events",
  settings: "settings",
} as const;

/** Fully-scoped collection ids for use in `@wix/data` API calls. */
export const COLLECTIONS = {
  pinterestAccounts: `${APP_NAMESPACE}/${COLLECTION_SUFFIX.pinterestAccounts}`,
  boards: `${APP_NAMESPACE}/${COLLECTION_SUFFIX.boards}`,
  automationRules: `${APP_NAMESPACE}/${COLLECTION_SUFFIX.automationRules}`,
  productMappings: `${APP_NAMESPACE}/${COLLECTION_SUFFIX.productMappings}`,
  publishedPins: `${APP_NAMESPACE}/${COLLECTION_SUFFIX.publishedPins}`,
  scheduledPins: `${APP_NAMESPACE}/${COLLECTION_SUFFIX.scheduledPins}`,
  analyticsEvents: `${APP_NAMESPACE}/${COLLECTION_SUFFIX.analyticsEvents}`,
  settings: `${APP_NAMESPACE}/${COLLECTION_SUFFIX.settings}`,
} as const;

/** Pinterest API v5 base + OAuth endpoints. */
export const PINTEREST = {
  apiBaseUrl: "https://api.pinterest.com/v5",
  oauthAuthorizeUrl: "https://www.pinterest.com/oauth/",
  oauthTokenUrl: "https://api.pinterest.com/v5/oauth/token",
  /** Scopes requested during OAuth. Trim to what your Pinterest app is approved for. */
  scopes: [
    "user_accounts:read",
    "boards:read",
    "boards:write",
    "pins:read",
    "pins:write",
  ],
} as const;

/**
 * Secret names stored in Wix Secrets Manager. Never hard-code the values.
 * See README → "Manual setup".
 */
export const SECRET_NAMES = {
  pinterestClientId: "PINFLOW_PINTEREST_CLIENT_ID",
  pinterestClientSecret: "PINFLOW_PINTEREST_CLIENT_SECRET",
  /** Shared secret that an external scheduler must send to call /api/scheduler/run. */
  schedulerToken: "PINFLOW_SCHEDULER_TOKEN",
} as const;

/** Billing tiers and their monthly quotas (enforced via appInstances + counts). */
export type TierId = "free" | "starter" | "pro" | "business" | "enterprise";

export interface TierLimits {
  maxAccounts: number;
  maxPinsPerMonth: number;
  scheduling: boolean;
  automations: boolean;
}

export const TIER_LIMITS: Record<TierId, TierLimits> = {
  free: { maxAccounts: 1, maxPinsPerMonth: 50, scheduling: false, automations: false },
  starter: { maxAccounts: 1, maxPinsPerMonth: 500, scheduling: true, automations: true },
  pro: { maxAccounts: 3, maxPinsPerMonth: 2000, scheduling: true, automations: true },
  business: { maxAccounts: 10, maxPinsPerMonth: 10000, scheduling: true, automations: true },
  enterprise: {
    maxAccounts: Number.MAX_SAFE_INTEGER,
    maxPinsPerMonth: Number.MAX_SAFE_INTEGER,
    scheduling: true,
    automations: true,
  },
};

/** Default UTM parameters appended to product/blog pin destination links. */
export const DEFAULT_UTM = {
  source: "pinterest",
  medium: "social",
  campaign: "pinflow",
} as const;
