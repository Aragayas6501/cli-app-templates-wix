import { catalogVersioning } from "@wix/stores";

export type CatalogVersion = "V1_CATALOG" | "V3_CATALOG" | "STORES_NOT_INSTALLED";

let cachedVersion: CatalogVersion | undefined;

export async function getCatalogVersion(): Promise<CatalogVersion> {
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    const { catalogVersion } = await catalogVersioning.getCatalogVersion();
    if (catalogVersion === "V1_CATALOG" || catalogVersion === "V3_CATALOG") {
      cachedVersion = catalogVersion;
      return cachedVersion;
    }
  } catch {
    cachedVersion = "STORES_NOT_INSTALLED";
    return cachedVersion;
  }

  cachedVersion = "STORES_NOT_INSTALLED";
  return cachedVersion;
}
