import wixConfig from "../../wix.config.json";
import appConfig from "../../app-config.json";

const appNamespace = appConfig.namespace?.trim() || wixConfig.projectId?.trim() || "returnflow-pro";

export const collectionSuffixes = {
  settings: "returnflow-settings",
  orders: "returnflow-orders",
  returns: "returnflow-returns",
  refunds: "returnflow-refunds",
  exchanges: "returnflow-exchanges",
  storeCredits: "returnflow-store-credits",
  lookupTokens: "returnflow-lookup-tokens",
} as const;

export const collectionIds = {
  settings: `${appNamespace}/${collectionSuffixes.settings}`,
  orders: `${appNamespace}/${collectionSuffixes.orders}`,
  returns: `${appNamespace}/${collectionSuffixes.returns}`,
  refunds: `${appNamespace}/${collectionSuffixes.refunds}`,
  exchanges: `${appNamespace}/${collectionSuffixes.exchanges}`,
  storeCredits: `${appNamespace}/${collectionSuffixes.storeCredits}`,
  lookupTokens: `${appNamespace}/${collectionSuffixes.lookupTokens}`,
} as const;

export const fallbackCollectionIds = {
  settings: collectionSuffixes.settings,
  orders: collectionSuffixes.orders,
  returns: collectionSuffixes.returns,
  refunds: collectionSuffixes.refunds,
  exchanges: collectionSuffixes.exchanges,
  storeCredits: collectionSuffixes.storeCredits,
  lookupTokens: collectionSuffixes.lookupTokens,
} as const;

export const collectionIdCandidates = {
  settings: [collectionIds.settings, fallbackCollectionIds.settings],
  orders: [collectionIds.orders, fallbackCollectionIds.orders],
  returns: [collectionIds.returns, fallbackCollectionIds.returns],
  refunds: [collectionIds.refunds, fallbackCollectionIds.refunds],
  exchanges: [collectionIds.exchanges, fallbackCollectionIds.exchanges],
  storeCredits: [collectionIds.storeCredits, fallbackCollectionIds.storeCredits],
  lookupTokens: [collectionIds.lookupTokens, fallbackCollectionIds.lookupTokens],
} as const;
