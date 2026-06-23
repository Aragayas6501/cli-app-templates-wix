import { appInstances } from "@wix/app-management";
import { auth } from "@wix/essentials";
import { catalogVersioning } from "@wix/stores";
import type { CatalogVersion, ReviewStatus, WixSiteReadiness } from "../types";

function normalizeCatalogVersion(value: unknown): CatalogVersion {
  if (value === "V1_CATALOG" || value === "V3_CATALOG" || value === "STORES_NOT_INSTALLED") {
    return value;
  }

  return "UNKNOWN";
}

function statusForCatalog(catalogVersion: CatalogVersion): ReviewStatus {
  if (catalogVersion === "V1_CATALOG" || catalogVersion === "V3_CATALOG") {
    return "Confirmed";
  }

  if (catalogVersion === "STORES_NOT_INSTALLED") {
    return "Action required";
  }

  return "Needs confirmation";
}

export async function getWixSiteReadiness(): Promise<WixSiteReadiness> {
  let instanceStatus: ReviewStatus = "Needs confirmation";
  let billingStatus: ReviewStatus = "Needs confirmation";
  let identityEvidence = "App instance could not be read in the current preview context.";
  let originInstanceEvidence = "Handle copied sites by treating originInstanceId as a source install when available.";

  try {
    const { instance } = await auth.elevate(appInstances.getAppInstance)();

    if (instance) {
      instanceStatus = "Confirmed";
      billingStatus = instance.isFree || !instance.billing ? "Action required" : "Confirmed";
      identityEvidence = "Dashboard data is loaded through the current Wix app instance context.";
      originInstanceEvidence = "Use originInstanceId during production provisioning to copy eligible settings on site duplication.";
    }
  } catch (error) {
    console.error("Failed to read Wix app instance readiness.", error);
  }

  let catalogVersion: CatalogVersion = "UNKNOWN";

  try {
    const result = await catalogVersioning.getCatalogVersion();
    catalogVersion = normalizeCatalogVersion(result.catalogVersion);
  } catch (error) {
    console.error("Failed to read Wix Stores catalog version.", error);
  }

  const storesStatus = statusForCatalog(catalogVersion);
  const storesEvidence =
    catalogVersion === "STORES_NOT_INSTALLED"
      ? "Wix Stores is required before products, inventory, and orders can sync."
      : catalogVersion === "UNKNOWN"
        ? "Catalog version could not be read. Confirm Stores permissions and installation."
        : `Wix Stores catalog version detected: ${catalogVersion}. Use the matching V1/V3 adapter before catalog writes.`;

  return {
    catalogVersion,
    storesStatus,
    instanceStatus,
    billingStatus,
    identityEvidence,
    storesEvidence,
    originInstanceEvidence,
  };
}
