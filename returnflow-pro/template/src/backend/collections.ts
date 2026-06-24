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
