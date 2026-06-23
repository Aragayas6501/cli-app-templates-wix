import { auth } from "@wix/essentials";
import { catalogVersioning, products, productsV3 } from "@wix/stores";

export type CatalogVersion = "V1_CATALOG" | "V3_CATALOG" | "STORES_NOT_INSTALLED";

export interface ProductOption {
  id: string;
  name: string;
  price: number;
  currency: string;
}

let cachedCatalogVersion: CatalogVersion | undefined;

export async function getCatalogVersion(): Promise<CatalogVersion> {
  if (cachedCatalogVersion) {
    return cachedCatalogVersion;
  }
  try {
    const response = await auth.elevate(catalogVersioning.getCatalogVersion)();
    cachedCatalogVersion = (response.catalogVersion ?? "STORES_NOT_INSTALLED") as CatalogVersion;
    return cachedCatalogVersion;
  } catch (error) {
    console.error("Failed resolving Wix Stores catalog version", error);
    cachedCatalogVersion = "STORES_NOT_INSTALLED";
    return cachedCatalogVersion;
  }
}

function normalizeV1Product(product: {
  _id?: string | null;
  name?: string | null;
  priceData?: { price?: number | null; currency?: string | null } | null;
} | undefined): ProductOption | undefined {
  if (!product?._id) {
    return undefined;
  }
  return {
    id: product._id,
    name: product.name ?? "Untitled product",
    price: product.priceData?.price ?? 0,
    currency: product.priceData?.currency ?? "USD",
  };
}

function normalizeV3Product(product: {
  _id?: string | null;
  name?: string | null;
  actualPriceRange?: { minValue?: { amount?: string | null } | null } | null;
  currency?: string | null;
}): ProductOption | undefined {
  if (!product._id) {
    return undefined;
  }
  return {
    id: product._id,
    name: product.name ?? "Untitled product",
    price: Number(product.actualPriceRange?.minValue?.amount ?? 0),
    currency: product.currency ?? "USD",
  };
}

export async function listProductsForPicker(limit = 50): Promise<ProductOption[]> {
  const version = await getCatalogVersion();
  if (version === "STORES_NOT_INSTALLED") {
    return [];
  }
  if (version === "V3_CATALOG") {
    const result = await auth.elevate(productsV3.queryProducts)().limit(limit).find();
    return result.items
      .map((product) => normalizeV3Product(product))
      .filter((product): product is ProductOption => product !== undefined);
  }
  const result = await auth.elevate(products.queryProducts)().limit(limit).find();
  return result.items
    .map((product) => normalizeV1Product(product))
    .filter((product): product is ProductOption => product !== undefined);
}

export async function getProductForPricing(
  productId: string
): Promise<ProductOption | undefined> {
  if (!productId) {
    return undefined;
  }

  const version = await getCatalogVersion();
  if (version === "STORES_NOT_INSTALLED") {
    return undefined;
  }

  if (version === "V3_CATALOG") {
    const product = await auth.elevate(productsV3.getProduct)(productId);
    return normalizeV3Product(product);
  }

  const response = await auth.elevate(products.getProduct)(productId);
  return normalizeV1Product(response.product);
}
